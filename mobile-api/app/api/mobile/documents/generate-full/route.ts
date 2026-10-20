import { sanitizeHtml, stripCodeFence } from '@/lib/sanitize-html';
import { enforceAiQuota } from '@/lib/ai-quota';
import { aiCost } from '@/lib/free-launch';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError, withCors } from '@/lib/mobile-access';
import { sendPushToUser } from '@/lib/push';
import { isStudyField, outlineFor } from '@/lib/document-outlines';
import { escapeHtml, normalizeHeadings } from '@/lib/document-render';
import { llmRewrite } from '@/lib/llm';
import { HTML_FORMAT_RULE, polishAiTics, stripRepeatedTitle, studentVoiceRules } from '@/lib/writing-rules';
import {
  getDocumentById,
  MEMOIRE_PROFESSIONAL_SECTIONS,
  MEMOIRE_RESEARCH_SECTIONS,
} from '@/lib/documents-db';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Free during the V1 launch (see lib/free-launch.ts).
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
    const creditCost = aiCost('fullDoc');
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    await enforceAiQuota(request, { userId: user.id, route: 'generate-full' });

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
    if (availableCredits < creditCost) {
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
          // Documents created with a field keep that field's outline.
          const targetSections = isStudyField(ownedDocument.field)
            ? outlineFor('memoire', ownedDocument.field)
            : memoirKind === 'professional'
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

    // Cover fields first: the identification sheet is filled from them.
    const coverData = await extractCoverData(messages, docTitle, apiKey, documentType, memoirKind);

    const buildSection = async (section: { id: string; title: string }) => {
      const lowerTitle = section.title.toLowerCase();
      const missing = (label: string) => `[${label}]`;
      const field = (key: string, label: string) => escapeHtml(coverData[key] || missing(label));

      // Identification sheet: only what the student gave, brackets for the rest.
      if (documentType === 'stage' && lowerTitle.includes('fiche d')) {
        const row = (label: string, value: string) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`;
        return {
          id: section.id,
          html: [
            '<table><tbody>',
            row('Nom et prénom', field('studentName', 'nom et prénom')),
            row('Matricule', field('matricule', 'matricule')),
            row('Filière / niveau', field('specialty', 'filière et niveau')),
            row('Établissement', field('school', 'établissement')),
            row('Structure d’accueil', field('company', 'entreprise')),
            row('Lieu', field('companyLocation', 'ville')),
            row('Encadreur professionnel', field('tutorCorporate', 'encadreur professionnel')),
            row('Encadreur académique', field('tutorAcademic', 'encadreur académique')),
            row('Période du stage', missing('du … au …')),
            '</tbody></table>',
          ].join(''),
        };
      }

      // Acronyms: a two-column table the student fills in.
      if (lowerTitle.includes('abréviation') || lowerTitle.includes('sigle')) {
        return {
          id: section.id,
          html: '<table><thead><tr><th>Sigle</th><th>Signification</th></tr></thead><tbody><tr><td>[sigle]</td><td>[signification]</td></tr></tbody></table>',
        };
      }

      // Lists of figures and tables are generated at export from the real captions.
      if (lowerTitle.includes('liste des figures') || lowerTitle.includes('liste des tableaux')) {
        return { id: section.id, html: '' };
      }

      // References: never invented.
      if (lowerTitle.includes('bibliographie') || lowerTitle.includes('webographie') || lowerTitle.includes('références')) {
        return {
          id: section.id,
          html: '<p>[Ajoute ici les ouvrages, articles et sites que tu as réellement consultés, au format demandé par ton établissement.]</p>',
        };
      }

      const systemPrompt = [
        `Tu écris la section « ${section.title} » du ${documentType === 'memoire' ? 'mémoire' : 'rapport de stage'} « ${docTitle} » d'un étudiant, à partir de votre discussion.`,
        documentGuidance,
        '',
        studentVoiceRules('je'),
        `- Utilise uniquement ce que l'étudiant a dit dans la discussion. Une piste non confirmée porte la mention « à vérifier ».`,
        `- Longueur adaptée à ce que tu sais : mieux vaut une section courte et vraie, avec des crochets, qu'une section longue et vague.`,
        '',
        HTML_FORMAT_RULE,
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
            const cleaned = sanitizeHtml(stripCodeFence(rawContent));
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
      sectionContent = sanitizeHtml(stripCodeFence(normalizeHeadings(stripRepeatedTitle((await polishAiTics(sectionContent, llmRewrite)).html, section.title))));

      return { id: section.id, html: sectionContent };
    };

    const generatedSections = await runWithConcurrency(editableSections, GENERATION_CONCURRENCY, buildSection);

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

        if (replay.rows.length === 0 && walletCredits < creditCost) {
          throw new MobileApiError('Crédits IA insuffisants.', 402);
        }

        for (const generated of generatedSections) {
          if (!generated.html && !/liste des (figures|tableaux)/i.test(sections.find((x) => x.id === generated.id)?.title || '')) continue;
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
          remainingCredits = walletCredits - creditCost;
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
        body: `${docTitle} a son premier jet. Ouvre-le pour compléter les passages entre crochets.`,
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
