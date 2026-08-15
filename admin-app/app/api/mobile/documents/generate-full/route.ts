import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError, withCors } from '@/lib/mobile-access';
import { sendPushToUser } from '@/lib/push';

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

const generateSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string().default('user'),
      content: z.string().default(''),
    }),
  ),
  documentId: z.string(),
  documentType: z.string().default('stage'),
});

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR', 'IMG', 'BLOCKQUOTE',
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    if (tag.toUpperCase() === 'IMG') return match;
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  return html.trim();
};

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const COVER_KEYS = [
  'school',
  'title',
  'subtitle',
  'studentName',
  'company',
  'tutorCorporate',
  'tutorAcademic',
  'year',
] as const;

type ChatMessage = { role: string; content: string };

const formatConversation = (messages: ChatMessage[]) =>
  messages.map((m) => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n');

async function extractCoverData(
  messages: ChatMessage[],
  documentTitle: string,
  apiKey: string,
): Promise<Record<string, string>> {
  if (!apiKey) return {};
  const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
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
        model: preferredModel,
        messages: [
          {
            role: 'system',
            content:
              `Tu extrais les métadonnées de page de garde d'un document académique. ` +
              `Réponds UNIQUEMENT par un objet JSON valide contenant exactement ces clés : ` +
              `${COVER_KEYS.join(', ')}. Mets "" quand l'information est absente. ` +
              `N'invente jamais un nom ou une entreprise. Aucun texte en dehors du JSON.`,
          },
          {
            role: 'user',
            content: `Titre du document : ${documentTitle}\n\nConversation :\n${formatConversation(messages)}`,
          },
        ],
        temperature: 0.1,
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const raw = String(data.choices?.[0]?.message?.content ?? '');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsedJson = JSON.parse(match[0]) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const key of COVER_KEYS) {
      const value = parsedJson[key];
      if (typeof value === 'string' && value.trim()) {
        out[key] = value.trim().slice(0, 300);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 }), request);
    }

    const { messages, documentId, documentType } = parsed.data;

    let remainingCredits = 45;

    let docTitle = 'Document académique';
    let sections: Array<{ id: string; title: string }> = [];

    if (user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          await client.query('begin');

          const walletRes = await client.query(
            'select id, ia_credits from public.app_wallets where user_id = $1 for update',
            [user.id],
          );
          let wallet = walletRes.rows[0];

          if (!wallet) {
            const newWallet = await client.query(
              'insert into public.app_wallets (user_id, ia_credits, balance_coins) values ($1, 50, 0) returning id, ia_credits',
              [user.id],
            );
            wallet = newWallet.rows[0];
          }

          if (wallet.ia_credits < IA_CREDITS_PER_GENERATION) {
            await client.query(
              'update public.app_wallets set ia_credits = 20, updated_at = now() where user_id = $1',
              [user.id],
            );
            wallet.ia_credits = 20;
          }

          await client.query(
            'update public.app_wallets set ia_credits = greatest(0, ia_credits - $1), updated_at = now() where user_id = $2',
            [IA_CREDITS_PER_GENERATION, user.id],
          );
          remainingCredits = Math.max(0, wallet.ia_credits - IA_CREDITS_PER_GENERATION);

          const docRes = await client.query(
            'select id, title from public.app_documents where id = $1 and user_id = $2 limit 1',
            [documentId, user.id],
          );
          if (docRes.rows.length > 0) {
            docTitle = docRes.rows[0].title;
          }

          const sectionsRes = await client.query(
            'select id, title from public.app_document_sections where document_id = $1 order by sort_order asc',
            [documentId],
          );
          sections = sectionsRes.rows;

          await client.query('commit');
        } catch (dbErr) {
          await client.query('rollback').catch(() => {});
          console.warn('[AI Full Gen] DB error:', dbErr);
        } finally {
          client.release();
        }
      } catch (poolErr) {
        console.warn('[AI Full Gen] Pool error:', poolErr);
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    const userMessagesText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.toLowerCase())
      .join(' \n ');
    const hasStage =
      /\b(stage|stagiaire|entreprise|mission|alternance|cdd|cdi|emploi|poste)\b/.test(userMessagesText) &&
      !/(pas de stage|aucun stage|sans stage|n['’]ai pas)/i.test(userMessagesText);

    const editableSections = sections.filter((s) => {
      const t = String(s.title).toLowerCase();
      return t !== 'page de garde' && t !== 'sommaire';
    });

    const stageGuidance = hasStage
      ? `L'étudiant a effectué un stage en milieu professionnel. Rédige chaque section de manière concrète en te basant sur ses missions réelles, les outils utilisés et les enseignements tirés.`
      : `L'étudiant n'a pas effectué de stage. Rédige un rapport académique solide, avec une revue de la littérature approfondie, un cadre théorique clair et une méthodologie d'analyse rigoureuse.`;

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    const buildSection = async (section: { id: string; title: string }) => {
      const systemPrompt = [
        `Tu es le Rédacteur Universitaire d'Élite de Campus 360.`,
        `Rédige le contenu complet, rigoureux et structuré pour la section : "${section.title}" du document "${docTitle}" (${documentType}).`,
        stageGuidance,
        `Directives :`,
        `- Utilise des sous-titres <h2> et <h3> pour structurer les parties.`,
        `- Rédige des paragraphes complets, détaillés et riches (4-6 phrases par paragraphe).`,
        `- Formate EXCLUSIVEMENT en HTML TipTap propre : <p>, <strong>, <em>, <h2>, <h3>, <ul>, <li>, <br>.`,
        `- Ne mets JAMAIS de balises <html>, <body>, <head>, ni de code markdown (\`\`\`html).`,
      ].join('\n');

      const userPrompt = [
        `Informations de la discussion :`,
        messages.map((m) => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n'),
        `\n\nRédige maintenant le texte complet pour la section "${section.title}".`,
      ].join('\n');

      if (!apiKey) {
        return {
          id: section.id,
          html: `<p><strong>${section.title}</strong></p><p>Ce chapitre développe les notions clés relatives à ${docTitle}.</p>`,
        };
      }

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
              temperature: 0.5,
              max_tokens: 2500,
            }),
          });

          if (!openrouterRes.ok) continue;
          const aiData = await openrouterRes.json();
          const rawContent = aiData.choices?.[0]?.message?.content ?? '';
          const cleaned = sanitizeHtmlFragment(rawContent);
          if (cleaned) {
            return { id: section.id, html: cleaned };
          }
        } catch {
          // try next model
        }
      }

      return {
        id: section.id,
        html: `<p><strong>${section.title}</strong></p><p>Analyse et développement de la partie ${section.title}.</p>`,
      };
    };

    const [generatedSections, coverData] = await Promise.all([
      runWithConcurrency(editableSections, GENERATION_CONCURRENCY, buildSection),
      extractCoverData(messages, docTitle, apiKey || ''),
    ]);

    if (user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          await client.query('begin');

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

          await client.query('commit');
        } catch (updateErr) {
          await client.query('rollback').catch(() => {});
          console.warn('[AI Full Gen] Section save error:', updateErr);
        } finally {
          client.release();
        }
      } catch (poolErr) {
        console.warn('[AI Full Gen] Pool error:', poolErr);
      }
    }

    if (user.id !== 'guest-student') {
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
