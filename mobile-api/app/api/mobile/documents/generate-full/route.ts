import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';
import { sendPushToUser } from '@/lib/push';

export const runtime = 'nodejs';
// Generating every section takes far longer than the platform default (~10-15s):
// 6 sections for a "stage", 9 for a "mémoire", at several seconds per LLM call.
// Without this the request is killed mid-generation and nothing is ever written.
export const maxDuration = 300;

const IA_CREDITS_PER_GENERATION = 5;
// Sections are generated concurrently, but kept low so the free OpenRouter tier
// doesn't rate-limit us.
const GENERATION_CONCURRENCY = 3;

const generateSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  documentId: z.string().uuid(),
  documentType: z.string().default('stage')
});

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR', 'IMG'
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    // Keep img tags as placeholders
    if (tag.toUpperCase() === 'IMG') return match;
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  return html.trim();
};

// Run an async mapper over items with a bounded number of workers, preserving
// order. Used so the LLM calls overlap without hammering the free tier.
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

// Keys mirror the cover form rendered in the mobile editor (renderCoverPage).
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

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

const formatConversation = (messages: ChatMessage[]) =>
  messages.map((m) => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n');

// Ask the model to pull the cover-page fields out of the onboarding chat so the
// student doesn't have to retype them. Best-effort: any failure returns {}.
async function extractCoverData(
  messages: ChatMessage[],
  documentTitle: string,
  apiKey: string,
  model: string,
): Promise<Record<string, string>> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://campus-360.local',
        'X-Title': 'Campus 360 Cover Extractor',
      },
      body: JSON.stringify({
        model,
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
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const { messages, documentId, documentType } = parsed.data;

    const client = await databasePool.connect();
    try {
      await client.query('begin');

      // Check IA credits
      const walletRes = await client.query(
        'select id, ia_credits from public.app_wallets where user_id = $1 for update',
        [user.id],
      );
      const wallet = walletRes.rows[0];

      if (!wallet || wallet.ia_credits < IA_CREDITS_PER_GENERATION) {
        throw new MobileApiError(
          `Crédits insuffisants. Il vous faut ${IA_CREDITS_PER_GENERATION} crédits IA.`,
          403,
        );
      }

      // Verify document ownership
      const docRes = await client.query(
        'select id, title from public.app_documents where id = $1 and user_id = $2 limit 1',
        [documentId, user.id],
      );
      if (docRes.rows.length === 0) {
        throw new MobileApiError("Document introuvable.", 404);
      }
      const document = docRes.rows[0];

      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

      if (!apiKey) {
        throw new MobileApiError('Service IA indisponible.', 503);
      }

      // Fetch document sections to update
      const sectionsRes = await client.query(
        'select id, title from public.app_document_sections where document_id = $1 order by sort_order asc',
        [documentId]
      );
      const sections = sectionsRes.rows;

      // Heuristic: detect whether the student mentioned a stage / internship.
      // We scan the user messages for keywords. If none found, we switch the
      // system prompt to a "theoretical" mode that compensates with deeper
      // academic research / literature review / methodology framing.
      //
      // This is a coarse signal but matches what the chat d'onboarding asks:
      // "as-tu effectué un stage ?" is the very first question it poses.
      const userMessagesText = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content.toLowerCase())
        .join(' \n ');
      const hasStage =
        /\b(stage|stagiaire|entreprise|mission|alternance|cdd|cdi|emploi|poste)\b/.test(userMessagesText) &&
        !/(pas de stage|aucun stage|sans stage|pas de stage|n['’]ai pas (fait|effectué))/i.test(userMessagesText);

      // Generate every editable section with bounded concurrency, then persist.
      // DB writes stay sequential on purpose: they share a single pooled client
      // inside this transaction and must not be issued in parallel.
      const editableSections = sections.filter((s) => {
        const t = String(s.title).toLowerCase();
        return t !== 'page de garde' && t !== 'sommaire';
      });

      const stageGuidance = hasStage
        ? `L'étudiant a effectué un stage. Rédige cette section en te basant sur son vécu en entreprise : cite des missions concrètes, des outils utilisés, des difficultés rencontrées et les compétences développées. Évite le générique ; ancre chaque paragraphe dans le contexte fourni dans le chat d'onboarding.\n`
        : `L'étudiant n'a PAS effectué de stage. Rédige cette section de manière académique et théorique : mobilise des références bibliographiques types (auteurs reconnus du domaine), construis une revue de littérature structurée, propose une méthodologie hypothétique rigoureuse, et replace le sujet dans son cadre scientifique. Sois particulièrement détaillé sur les concepts clés et les modèles théoriques pertinents.\n`;

      const buildSection = async (section: { id: string; title: string }) => {
        const systemPrompt =
          `Tu es un rédacteur universitaire et professionnel chevronné.\n` +
          `Rédige le contenu complet de la section : "${section.title}" pour le document "${document.title}" (${documentType}).\n` +
          `Prends en compte les informations fournies dans la discussion d'onboarding ci-dessous.\n\n` +
          `${stageGuidance}\n` +
          `Règles de mise en page :\n` +
          `- Si un organigramme, un graphique, une photo d'équipe ou un schéma est utile dans ce chapitre, insère un placeholder d'image exactement sous cette forme :\n` +
          `  <div class="image-placeholder bg-slate-900 border border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer my-4" data-caption="[METS ICI LA LÉGENDE DE L'IMAGE]">\n` +
          `     <span class="text-2xl">📷</span><p class="text-xs text-slate-400 mt-1 font-sans">Cliquez pour insérer l'image : [METS ICI LE TITRE DE L'IMAGE]</p>\n` +
          `  </div>\n` +
          `- Retourne UNIQUEMENT du HTML propre et structuré. Pas de blocs de code markdown.\n` +
          `- Sois extrêmement complet, rigoureux et universitaire dans ton écriture. Utilise des sous-titres <h2> et <h3> pour structurer les longs passages.\n` +
          `- Les paragraphes doivent faire au moins 4-6 phrases chacun. Évite les listes à puces pour le contenu narratif — privilégie-les uniquement pour les étapes procédurales.`;

        const userPrompt = 
          `Voici la discussion d'onboarding contenant toutes les informations :\n` +
          messages.map(m => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n') +
          `\n\nIdentifie et rédige le contenu spécifique de la section "${section.title}".`;

        try {
          const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://campus-360.local',
              'X-Title': 'Campus 360 Full Document Generator',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
            }),
          });

          if (!openrouterRes.ok) return { id: section.id, html: '' };
          const aiData = await openrouterRes.json();
          const rawContent = aiData.choices?.[0]?.message?.content ?? '';
          return { id: section.id, html: sanitizeHtmlFragment(rawContent) };
        } catch {
          // One failed section must not abort the whole document.
          return { id: section.id, html: '' };
        }
      };

      // Section bodies and the cover-page extraction run together.
      const [generatedSections, coverData] = await Promise.all([
        runWithConcurrency(editableSections, GENERATION_CONCURRENCY, buildSection),
        extractCoverData(messages, String(document.title ?? ''), apiKey, model),
      ]);

      for (const generated of generatedSections) {
        if (!generated.html) continue;
        await client.query(
          'update public.app_document_sections set content_html = $1, updated_at = now() where id = $2',
          [generated.html, generated.id],
        );
      }

      // Merge extracted cover fields into whatever the student already filled in.
      if (Object.keys(coverData).length > 0) {
        await client.query(
          `update public.app_documents
             set cover_data = coalesce(cover_data, '{}'::jsonb) || $1::jsonb, updated_at = now()
           where id = $2`,
          [JSON.stringify(coverData), documentId],
        );
      }

      // Deduct credits
      await client.query(
        'update public.app_wallets set ia_credits = ia_credits - $1, updated_at = now() where user_id = $2',
        [IA_CREDITS_PER_GENERATION, user.id],
      );

      // Log transaction
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'purchase', 0, 'ia_document_full_generate', 'success')`,
        [user.id],
      );

      await client.query('commit');

      // Generation takes ~30-60s; the student may have left the app. Fire-and-forget.
      void sendPushToUser(user.id, {
        title: 'Ton document est prêt 🎉',
        body: `${document.title} a été rédigé par l'IA. Ouvre-le pour le personnaliser.`,
        data: { type: 'document_generated', documentId },
      });

      return NextResponse.json({
        success: true,
        remainingCredits: wallet.ia_credits - IA_CREDITS_PER_GENERATION
      });
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
