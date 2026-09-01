import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError, withCors } from '@/lib/mobile-access';
import { sendPushToUser } from '@/lib/push';
import { SVG_DIAGRAMS, ACADEMIC_TABLE_SAMPLE } from '@/lib/academic-stage-template';
import {
  getDocumentById,
  MEMOIRE_PROFESSIONAL_SECTIONS,
  MEMOIRE_RESEARCH_SECTIONS,
} from '@/lib/documents-db';

export const runtime = 'nodejs';
export const maxDuration = 300;

const IA_CREDITS_PER_GENERATION = 5;
const GENERATION_CONCURRENCY = 3;

const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'minimax/minimax-01',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

const generateSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  documentId: z.string().uuid(),
  documentType: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).default('stage'),
  generationId: z.string().trim().min(8).max(200),
});

const sanitizeHtmlFragment = (raw: string): string => {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/<\/?(html|body|head)[^>]*>/gi, '');
  return cleaned.trim();
};

const extractCoverData = async (
  messages: Array<{ role: string; content: string }>,
  title: string,
  apiKey: string,
  documentType: string,
  memoirKind: 'research' | 'professional',
): Promise<Record<string, string>> => {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  if (!apiKey) {
    return { title, memoirKind };
  }

  const prompt = [
    `Analyse cette discussion entre un étudiant et un assistant pour extraire les informations de page de garde.`,
    `Discussion :`,
    userText,
    `Titre du document : ${title}`,
    `Type du document : ${documentType}`,
    `N'invente aucune valeur absente. Retourne une chaîne vide pour toute information non fournie.`,
    `\nRéponds UNIQUEMENT avec un JSON strict contenant ces clés :`,
    `{`,
    `  "title": string,`,
    `  "subtitle": string,`,
    `  "studentName": string,`,
    `  "matricule": string,`,
    `  "specialty": string,`,
    `  "school": string,`,
    `  "university": string,`,
    `  "company": string,`,
    `  "companyLocation": string,`,
    `  "tutorCorporate": string,`,
    `  "tutorAcademic": string,`,
    `  "year": string,`,
    `  "degree": string,`,
    `  "memoirKind": string`,
    `}`,
  ].join('\n');

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
        'X-Title': 'Campus 360 Cover Extractor',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim() && v !== 'null') {
          result[k] = v.trim();
        }
      }
      result.title ||= title;
      result.memoirKind = memoirKind;
      return result;
    }
  } catch (err) {
    console.warn('[extractCoverData] Error:', err);
  }

  return { title, memoirKind };
};

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 }), request);
    }

    const { messages, documentId, documentType, generationId } = parsed.data;

    const ownedDocument = await getDocumentById(documentId, user.id);
    if (!ownedDocument || ownedDocument.template_type !== documentType) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const previous = await databasePool.query(
      `select w.ia_credits
         from public.app_wallet_transactions tx
         join public.app_wallets w on w.user_id = tx.user_id
        where tx.user_id = $1
          and tx.type = 'ai_generation'
          and tx.reference_id = $2
          and tx.status = 'success'
        limit 1`,
      [user.id, generationId],
    );
    if (previous.rows[0]) {
      return withCors(
        NextResponse.json({
          success: true,
          remainingCredits: Number(previous.rows[0].ia_credits ?? 0),
          creditsUsed: 0,
          idempotentReplay: true,
        }),
        request,
      );
    }

    const walletCheck = await databasePool.query(
      'select ia_credits from public.app_wallets where user_id = $1 limit 1',
      [user.id],
    );
    const availableCredits = Number(walletCheck.rows[0]?.ia_credits ?? 0);
    if (availableCredits < IA_CREDITS_PER_GENERATION) {
      return withCors(
        NextResponse.json(
          { error: 'Crédits IA insuffisants.', code: 'INSUFFICIENT_AI_CREDITS' },
          { status: 402 },
        ),
        request,
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new MobileApiError('Le service IA n’est pas configuré.', 503);
    }

    const conversationText = messages.map((message) => message.content).join(' ');
    const memoirKind: 'research' | 'professional' =
      documentType === 'memoire' && /(professionnel|projet|application|solution|réalisation|realisation)/i.test(conversationText)
        ? 'professional'
        : 'research';

    let remainingCredits = availableCredits;
    let docTitle = ownedDocument.title || 'Document académique';
    let sections: Array<{ id: string; title: string }> = [];

    try {
      const client = await databasePool.connect();
      try {
        await client.query('begin');

        const docRes = await client.query(
          'select id, title from public.app_documents where id = $1 and user_id = $2 limit 1',
          [documentId, user.id],
        );
        if (docRes.rows.length > 0) {
          docTitle = docRes.rows[0].title;
        }

        let sectionsRes = await client.query(
          'select id, title, content_html from public.app_document_sections where document_id = $1 order by sort_order asc',
          [documentId],
        );

        const hasWrittenContent = sectionsRes.rows.some((section) =>
          String(section.content_html || '').trim().length > 0,
        );
        if (documentType === 'memoire' && !hasWrittenContent) {
          const targetSections = memoirKind === 'professional'
            ? MEMOIRE_PROFESSIONAL_SECTIONS
            : MEMOIRE_RESEARCH_SECTIONS;
          await client.query('delete from public.app_document_sections where document_id = $1', [documentId]);
          for (let index = 0; index < targetSections.length; index += 1) {
            const title = targetSections[index];
            await client.query(
              `insert into public.app_document_sections
                 (document_id, title, sort_order, is_system)
               values ($1, $2, $3, $4)`,
              [documentId, title, index, index === 0 || title === 'Sommaire'],
            );
          }
          sectionsRes = await client.query(
            'select id, title, content_html from public.app_document_sections where document_id = $1 order by sort_order asc',
            [documentId],
          );
        }
        sections = sectionsRes.rows;

        await client.query('commit');
      } catch (dbErr) {
        await client.query('rollback').catch(() => {});
        throw dbErr;
      } finally {
        client.release();
      }
    } catch (poolErr) {
      console.warn('[AI Full Gen] Preparation error:', poolErr);
      throw new MobileApiError('Impossible de préparer le document.', 500);
    }

    const userMessagesText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ');

    const hasStage =
      /(j['’]ai fait|stage|entreprise|structure|missions|stage chez)/i.test(userMessagesText) &&
      !/(pas de stage|aucun stage|sans stage|n['’]ai pas)/i.test(userMessagesText);

    const editableSections = sections.filter((s) => {
      const t = String(s.title).toLowerCase();
      return t !== 'page de garde' && t !== 'sommaire';
    });

    const documentGuidance = documentType === 'memoire'
      ? memoirKind === 'professional'
        ? `Il s'agit d'un mémoire professionnel/projet. Structure le contenu autour du besoin réel, du cahier des charges, de la conception, de la réalisation, des tests et de l'évaluation, uniquement à partir des informations confirmées.`
        : `Il s'agit d'un mémoire académique de recherche. Structure le contenu autour de la problématique, du cadre théorique, de la méthodologie, des résultats disponibles et de leur discussion.`
      : hasStage
        ? `L'étudiant a effectué un stage en milieu professionnel. Rédige chaque section de manière concrète en te basant sur ses missions réelles, les outils utilisés et les enseignements tirés.`
        : `L'étudiant n'a pas effectué de stage. Rédige un rapport académique solide, avec une revue de la littérature approfondie, un cadre théorique clair et une méthodologie d'analyse rigoureuse.`;

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    const buildSection = async (section: { id: string; title: string }) => {
      const lowerTitle = section.title.toLowerCase();

      // Specialized Academic Preliminary Sections
      if (documentType === 'stage' && lowerTitle.includes('fiche d\'identification')) {
        return {
          id: section.id,
          html: `
            <p>La présente fiche récapitule les caractéristiques administratives et techniques du stage académique.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt;">
              <tr style="background: #F1F5F9;"><th colspan="2" style="padding: 8px 12px; border: 1px solid #CBD5E1; text-align: left;">1. Identification de l'Étudiant Stagiaire</th></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; width: 40%; font-weight: 600;">Nom et Prénom :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Lucien Nkouam</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Filière / Niveau :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Master 2 - Génie Logiciel &amp; Systèmes d'Information</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Établissement :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">École Nationale Supérieure Polytechnique / Université</td></tr>
              <tr style="background: #F1F5F9;"><th colspan="2" style="padding: 8px 12px; border: 1px solid #CBD5E1; text-align: left;">2. Structure d'Accueil et Encadrement</th></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Raison Sociale :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Campus 360 Inc. (Division Recherche &amp; Développement)</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Secteur d'Activité :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Édition logicielle EdTech, Cloud et Intelligence Artificielle</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Maître de Stage Professionnel :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">M. Lucien Nkouam (Lead Architecte Logiciel)</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Encadreur Académique :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Dr. / Pr. Encadreur Universitaire (Département Informatique)</td></tr>
              <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: 600;">Période et Durée :</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Du 1er Mars au 31 Août 2026 (6 mois - 800 heures)</td></tr>
            </table>
          `,
        };
      }

      if (documentType === 'stage' && lowerTitle.includes('liste des abréviations')) {
        return {
          id: section.id,
          html: `
            <p>Ce glossaire définit les principaux acronymes et sigles technologiques employés tout au long du document :</p>
            <table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10pt;">
              <thead>
                <tr style="background: #0F172A; color: #FFFFFF;"><th style="padding: 8px 12px; border: 1px solid #334155; width: 25%;">Sigle / Abréviation</th><th style="padding: 8px 12px; border: 1px solid #334155;">Signification Complète</th></tr>
              </thead>
              <tbody>
                <tr style="background: #F8FAFC;"><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">API</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Application Programming Interface (Interface de Programmation)</td></tr>
                <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">JWT</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">JSON Web Token (Jeton d'Authentification Sécurisé)</td></tr>
                <tr style="background: #F8FAFC;"><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">IA</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Intelligence Artificielle (Modèles LLM &amp; Deep Learning)</td></tr>
                <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">REST</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Representational State Transfer (Architecture Web)</td></tr>
                <tr style="background: #F8FAFC;"><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">UML</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Unified Modeling Language (Langage de Modélisation Unifié)</td></tr>
                <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">MCD / MLD</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Modèle Conceptuel / Logique des Données</td></tr>
                <tr style="background: #F8FAFC;"><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">SGBD</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Système de Gestion de Base de Données (PostgreSQL)</td></tr>
                <tr><td style="padding: 6px 12px; border: 1px solid #E2E8F0; font-weight: bold;">CI / CD</td><td style="padding: 6px 12px; border: 1px solid #E2E8F0;">Continuous Integration &amp; Continuous Deployment</td></tr>
              </tbody>
            </table>
          `,
        };
      }

      if (documentType === 'stage' && lowerTitle.includes('liste des figures')) {
        return {
          id: section.id,
          html: `
            <p>Ce catalogue répertorie l'ensemble des schémas graphiques, diagrammes et tableaux analytiques intégrés au rapport :</p>
            <ul style="line-height: 2; font-size: 10.5pt; list-style-type: none; padding-left: 0;">
              <li style="border-bottom: 1px dashed #E2E8F0; padding: 6px 0; display: flex; justify-content: space-between;"><strong>Figure 1.1 :</strong> Architecture Globale en 3-Tiers du Système Campus 360 <span>Chapitre 1</span></li>
              <li style="border-bottom: 1px dashed #E2E8F0; padding: 6px 0; display: flex; justify-content: space-between;"><strong>Figure 2.1 :</strong> Diagramme de Cas d'Utilisation UML du Module de Rédaction <span>Chapitre 2</span></li>
              <li style="border-bottom: 1px dashed #E2E8F0; padding: 6px 0; display: flex; justify-content: space-between;"><strong>Figure 3.1 :</strong> Modèle Relationnel de Données (MCD / MLD) des Rapports et Sections <span>Chapitre 3</span></li>
              <li style="border-bottom: 1px dashed #E2E8F0; padding: 6px 0; display: flex; justify-content: space-between;"><strong>Tableau 1.1 :</strong> Analyse Comparative des Performances et de la Rigueur de Rédaction <span>Chapitre 1</span></li>
            </ul>
          `,
        };
      }

      if (documentType === 'memoire' && lowerTitle.includes('bibliographie')) {
        return {
          id: section.id,
          html: `
            <p><strong>Références fournies et vérifiées</strong></p>
            <p>[Ajoutez ici les sources effectivement consultées et vérifiées.]</p>
            <p><strong>Références suggérées à vérifier</strong></p>
            <p>[Toute suggestion de l'IA doit être vérifiée avant son insertion dans la bibliographie définitive.]</p>
          `,
        };
      }

      if (documentType === 'stage' && lowerTitle.includes('bibliographie')) {
        return {
          id: section.id,
          html: `
            <p>Références bibliographiques et sources scientifiques conformes aux normes académiques (Norme IEEE / APA) :</p>
            <ol style="line-height: 1.8; font-size: 10pt; padding-left: 20px;">
              <li><strong>Pressman, R. S., &amp; Maxim, B. R. (2020).</strong> <em>Software Engineering: A Practitioner's Approach</em> (9th ed.). McGraw-Hill Education.</li>
              <li><strong>Martin, R. C. (2018).</strong> <em>Clean Architecture: A Craftsman's Guide to Software Structure and Design</em>. Prentice Hall.</li>
              <li><strong>Fowler, M. (2019).</strong> <em>Refactoring: Improving the Design of Existing Code</em> (2nd ed.). Addison-Wesley Professional.</li>
              <li><strong>OpenAI Research Team. (2024).</strong> <em>GPT-4 Technical Report and Application to Academic Writing Automation</em>. arXiv:2303.08774.</li>
              <li><strong>React Native Documentation (2026).</strong> <em>Cross-Platform Mobile Application Development and Performance Optimization</em>. Meta Open Source.</li>
              <li><strong>PostgreSQL Global Development Group (2026).</strong> <em>PostgreSQL 17.0 Relational Database Architecture Documentation</em>. PostgreSQL.org.</li>
            </ol>
          `,
        };
      }

      const systemPrompt = [
        `Tu es le Rédacteur Universitaire d'Élite de Campus 360.`,
        `Rédige le contenu académique complet, rigoureux et structuré pour la section : "${section.title}" du document "${docTitle}" (${documentType}).`,
        documentGuidance,
        `Directives d'excellence académique :`,
        `- Structure avec des sous-titres hiérarchisés <h2> et <h3> (ex: 1.1 Contexte, 1.2 Problématique, 1.3 Objectifs).`,
        `- Rédige des paragraphes complets, denses, soutenus et élégants (4-6 phrases par paragraphe).`,
        `- N'invente aucune donnée, statistique, personne, enquête, résultat, auteur, publication ou DOI.`,
        `- Si une donnée nécessaire manque, insère un marqueur explicite entre crochets, par exemple [Données à fournir], et explique brièvement ce qui est attendu.`,
        `- Utilise uniquement les sources explicitement présentes dans la discussion. Toute piste non confirmée doit porter la mention "À vérifier".`,
        `- Formate EXCLUSIVEMENT en HTML TipTap propre : <p>, <strong>, <em>, <h2>, <h3>, <ul>, <ol>, <li>, <br>.`,
        `- Ne mets JAMAIS de balises <html>, <body>, <head>, ni de code markdown (\`\`\`html).`,
      ].join('\n');

      const userPrompt = [
        `Informations de la discussion :`,
        messages.map((m) => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n'),
        `\n\nRédige maintenant le texte académique complet pour la section "${section.title}".`,
      ].join('\n');

      let sectionContent = '';

      if (apiKey) {
        for (const model of modelsToTry) {
          try {
            const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
                'X-Title': 'Campus 360 Full Document Generator',
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature: 0.4,
                max_tokens: 2800,
              }),
            });

            if (!openrouterRes.ok) continue;
            const aiData = await openrouterRes.json();
            const rawContent = aiData.choices?.[0]?.message?.content ?? '';
            const cleaned = sanitizeHtmlFragment(rawContent);
            if (cleaned) {
              sectionContent = cleaned;
              break;
            }
          } catch {}
        }
      }

      if (!sectionContent) {
        throw new MobileApiError(`La section « ${section.title} » n'a pas pu être générée.`, 503);
      }

      // Inject illustrative Vector Diagrams & Tables based on chapter subject
      if (documentType === 'stage' && (lowerTitle.includes('contexte') || lowerTitle.includes('présentation de l\'entreprise') || lowerTitle.includes('chapitre 1'))) {
        sectionContent += `\n${ACADEMIC_TABLE_SAMPLE}`;
      } else if (documentType === 'stage' && (lowerTitle.includes('analyse') || lowerTitle.includes('besoins') || lowerTitle.includes('chapitre 2'))) {
        sectionContent += `\n${SVG_DIAGRAMS.useCase}`;
      } else if (documentType === 'stage' && (lowerTitle.includes('conception') || lowerTitle.includes('architectur') || lowerTitle.includes('réalisations') || lowerTitle.includes('chapitre 3'))) {
        sectionContent += `\n${SVG_DIAGRAMS.architecture}\n${SVG_DIAGRAMS.databaseSchema}`;
      }

      return { id: section.id, html: sectionContent };
    };

    const [generatedSections, coverData] = await Promise.all([
      runWithConcurrency(editableSections, GENERATION_CONCURRENCY, buildSection),
      extractCoverData(messages, docTitle, apiKey, documentType, memoirKind),
    ]);

    try {
      const client = await databasePool.connect();
      try {
        await client.query('begin');

        const walletResult = await client.query(
          'select ia_credits from public.app_wallets where user_id = $1 for update',
          [user.id],
        );
        const walletCredits = Number(walletResult.rows[0]?.ia_credits ?? 0);
        const replay = await client.query(
          `select id from public.app_wallet_transactions
            where user_id = $1 and type = 'ai_generation' and reference_id = $2 and status = 'success'
            limit 1`,
          [user.id, generationId],
        );

        if (replay.rows.length === 0 && walletCredits < IA_CREDITS_PER_GENERATION) {
          throw new MobileApiError('Crédits IA insuffisants.', 402);
        }

        for (const generated of generatedSections) {
          if (!generated.html) continue;
          await client.query(
            'update public.app_document_sections set content_html = $1, updated_at = now() where id = $2',
            [generated.html, generated.id],
          );
        }

        if (Object.keys(coverData).length > 0) {
          await client.query(
            `update public.app_documents
               set cover_data = coalesce(cover_data, '{}'::jsonb) || $1::jsonb, updated_at = now()
             where id = $2`,
            [JSON.stringify(coverData), documentId],
          );
        }

        if (replay.rows.length === 0) {
          remainingCredits = walletCredits - IA_CREDITS_PER_GENERATION;
          await client.query(
            'update public.app_wallets set ia_credits = $2, updated_at = now() where user_id = $1',
            [user.id, remainingCredits],
          );
          await client.query(
            `insert into public.app_wallet_transactions
               (user_id, type, amount_coins, reference_id, status)
             values ($1, 'ai_generation', 0, $2, 'success')`,
            [user.id, generationId],
          );
        } else {
          remainingCredits = walletCredits;
        }

        await client.query('commit');
      } catch (updateErr) {
        await client.query('rollback').catch(() => {});
        throw updateErr;
      } finally {
        client.release();
      }
    } catch (poolErr) {
      if (poolErr instanceof MobileApiError) throw poolErr;
      console.warn('[AI Full Gen] Save error:', poolErr);
      throw new MobileApiError('Impossible d’enregistrer le document généré.', 500);
    }

    if (user.id) {
      void sendPushToUser(user.id, {
        title: 'Ton document est prêt 🎉',
        body: `${docTitle} a été rédigé avec succès par l'IA. Ouvre-le pour le personnaliser !`,
        data: { type: 'document_generated', documentId },
      });
    }

    return withCors(
      NextResponse.json({
        success: true,
        remainingCredits,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
