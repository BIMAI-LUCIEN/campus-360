import { sanitizeHtml, stripCodeFence } from '@/lib/sanitize-html';
import { isFreeLaunch } from '@/lib/free-launch';
import { enforceAiQuota } from '@/lib/ai-quota';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { corsPreflight, requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { normalizeHeadings } from '@/lib/document-render';
import { llmRewrite } from '@/lib/llm';
import { HTML_FORMAT_RULE, polishAiTics, stripRepeatedTitle, studentVoiceRules } from '@/lib/writing-rules';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;

const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash-lite',
  'minimax/minimax-01',
];

const aiPromptSchema = z
  .object({
    action: z.enum(['draft', 'improve']).default('draft'),
    prompt: z.string().trim().min(1).max(3000),
    text: z.string().trim().max(20000).optional().default(''),
    sectionTitle: z.string().trim().max(300).default('Section sans titre'),
  })
  .passthrough();

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    await enforceAiQuota(request, { userId: user.id, route: 'ai-editor' });

    const body = await request.json().catch(() => ({}));
    const parsed = aiPromptSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: "Donnees d'entree invalides." }, { status: 400 }), request);
    }

    const { action, prompt, text, sectionTitle } = parsed.data;

    let remainingCredits = 50;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[AI Editor] OPENROUTER_API_KEY is not set');
      return withCors(
        NextResponse.json({ error: "L'assistant IA est momentanément indisponible. Réessaie plus tard." }, { status: 503 }),
        request,
      );
    }

    // One credit per request, given back below when the AI produces nothing.
    // A database failure refuses the request (fail closed) instead of answering for free.
    let charged = false;
    if (user.id) {
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

          const free = isFreeLaunch();
          if (!free && wallet.ia_credits <= 0) {
            await client.query('rollback');
            return withCors(
              NextResponse.json({ error: "Tu n'as plus de crédits IA." }, { status: 402 }),
              request,
            );
          }

          if (!free) {
            await client.query(
              'update public.app_wallets set ia_credits = greatest(0, ia_credits - 1), updated_at = now() where user_id = $1',
              [user.id],
            );
            remainingCredits = Math.max(0, wallet.ia_credits - 1);
            charged = true;
          } else {
            remainingCredits = Number(wallet.ia_credits ?? 0);
          }

          await client.query(
            `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
             values ($1, 'purchase', 0, 'ia_editor_prompt', 'success')`,
            [user.id],
          );

          await client.query('commit');
        } catch (dbErr) {
          await client.query('rollback').catch(() => {});
          throw dbErr;
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.error('[AI Editor] Wallet update failed:', dbErr);
        return withCors(
          NextResponse.json({ error: 'Service momentanément indisponible. Réessaie dans un instant.' }, { status: 503 }),
          request,
        );
      }
    }

    const systemPrompt = [
      `Tu aides un étudiant à écrire la section « ${sectionTitle.replace(/["«»]/g, '')} » de son document.`,
      `Tu pars uniquement de sa consigne et de son texte : le résultat doit pouvoir passer pour le sien.`,
      '',
      studentVoiceRules('je'),
      '',
      HTML_FORMAT_RULE,
      `- Pas de balise <head>, <script>, ni de bloc de code markdown. Renvoie directement le fragment HTML.`,
    ].join('\n');

    const userPrompt =
      action === 'improve' && text
        ? `Consigne de réécriture / amélioration :\n${prompt}\n\nTexte de l'étudiant à améliorer (garde ses faits et ses chiffres, corrige la langue, clarifie, n'ajoute rien d'inventé) :\n${text}`
        : `Consigne de rédaction :\n${prompt}`;

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    let safeHtml = '';
    for (const model of modelsToTry) {
      try {
        const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
            'X-Title': 'Campus 360 Editor',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 2000,
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (!openrouterRes.ok) {
          console.warn(`[AI Editor] Model ${model} returned status: ${openrouterRes.status}`);
          continue;
        }

        const aiData = (await openrouterRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = aiData.choices?.[0]?.message?.content ?? '';
        const cleaned = sanitizeHtml(stripCodeFence(raw));
        if (cleaned) {
          safeHtml = cleaned;
          break;
        }
      } catch (err) {
        console.warn(`[AI Editor] Model ${model} error:`, err);
      }
    }

    if (!safeHtml) {
      if (charged) {
        await databasePool
          .query('update public.app_wallets set ia_credits = ia_credits + 1, updated_at = now() where user_id = $1', [user.id])
          .catch((refundErr) => console.error('[AI Editor] Credit refund failed:', refundErr));
      }
      return withCors(
        NextResponse.json({ error: "L'IA n'a pas pu répondre. Ton crédit t'a été rendu, réessaie." }, { status: 503 }),
        request,
      );
    } else {
      safeHtml = sanitizeHtml(stripCodeFence(normalizeHeadings(stripRepeatedTitle((await polishAiTics(safeHtml, llmRewrite)).html, sectionTitle)))) || safeHtml;
    }

    return withCors(
      NextResponse.json({
        html: safeHtml,
        remainingCredits,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
