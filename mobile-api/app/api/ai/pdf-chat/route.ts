import { consumeAiAllowance } from '@/lib/ai-allowance';
import { enforceAiQuota } from '@/lib/ai-quota';
import { buildZoneUserContent, parsePdfZone, PdfZoneError, visionModelsToTry, ZONE_SYSTEM_RULE, type PdfZone } from '@/lib/pdf-zone';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { corsPreflight, MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

const bodySchema = z
  .object({
    question: z.string().optional().default('Explique ce cours'),
    // What the student asked for: counted against the 3 free AI actions of the day.
    action: z.enum(['summary', 'sheet', 'quiz', 'question']).optional().default('question'),
    pdfContext: z.any().optional(),
    // Zone circled on a page (Module 30), checked by parsePdfZone.
    zone: z.unknown().optional(),
    messages: z
      .array(
        z
          .object({
            role: z.string().optional().default('user'),
            content: z.string().optional().default(''),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
  })
  .passthrough();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'minimax/minimax-01',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}


export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    await enforceAiQuota(request, { userId, route: 'ai-pdf-chat' });

    const raw = (await request.json().catch(() => ({}))) as unknown;
    const parsed = bodySchema.safeParse(raw);
    const { question, pdfContext, messages, action } = parsed.success
      ? parsed.data
      : { question: 'Explique ce cours', pdfContext: '', messages: [], action: 'question' as const };
    const rawZone = parsed.success ? parsed.data.zone : undefined;
    let zone: PdfZone | null = null;
    if (rawZone !== undefined && rawZone !== null) {
      try {
        zone = parsePdfZone(rawZone);
      } catch (error) {
        if (error instanceof PdfZoneError) throw new MobileApiError(error.message, 400);
        throw error;
      }
    }
    const allowance = await consumeAiAllowance(userId, action);

    const apiKey = process.env.OPENROUTER_API_KEY;

    let contextStr = '';
    if (typeof pdfContext === 'string') {
      contextStr = pdfContext;
    } else if (typeof pdfContext === 'object' && pdfContext !== null) {
      contextStr = [
        `Titre : ${pdfContext.title ?? 'Document académique'}`,
        `Matière : ${pdfContext.subject ?? 'Non spécifiée'}`,
        `Niveau : ${pdfContext.level ?? 'Universitaire'}`,
        pdfContext.aiSummary ? `Résumé analytique : ${pdfContext.aiSummary}` : '',
        pdfContext.aiStudyPlan?.length
          ? `Plan d'étude structuré : \n${pdfContext.aiStudyPlan.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
          : '',
        pdfContext.aiQuiz?.length
          ? `Questions et concepts clés du document : \n${pdfContext.aiQuiz.map((q: any, i: number) => `Q${i + 1}: ${q.question} -> R: ${q.answer}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const systemPrompt = [
      'Tu es le tuteur IA de Campus 360 : tu expliques le PDF de l’étudiant simplement et précisément.',
      'Ton rôle est d’apporter des explications limpides, intelligentes, rigoureuses et parfaitement adaptées à la demande de l’étudiant et à son cours universitaire.',
      '',
      'DIRECTIVES PÉDAGOGIQUES MAJEURES :',
      '1. INTERDICTION DE RÉPONSES GÉNÉRIQUES OU BANALES. Analyse le contenu réel du document et réponds avec précision.',
      '2. RIGOUREUX & ANALYTIQUE : Explique le "pourquoi" et le "comment", cite les concepts, définitions, formules et méthodes du cours.',
      '3. PÉDAGOGIE STRUCTURÉE : Formate ta réponse en Markdown soigné (mots clés en gras, étapes numérotées, exemples concrets, analogies pédagogiques).',
      '4. ADAPTATION : Si la question est courte (ex: "OK", "J"), demande-lui avec bienveillance sur quel chapitre, notion ou exercice du cours il souhaite travailler.',
      '5. Réponds toujours en français chaleureux, encourageant et stimulant.',
      zone ? ZONE_SYSTEM_RULE : '',
      '',
      '=== CONTEXTE ACADÉMIQUE DU COURS ===',
      contextStr || 'Document de cours académique.',
      '====================================',
    ]
      .filter(Boolean)
      .join('\n');

    const formattedMessages = (messages ?? []).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages.filter((m) => m.content.trim().length > 0),
      {
        role: 'user',
        content: zone ? buildZoneUserContent(question || 'Explique cette partie', zone) : question || 'Explique ce cours',
      },
    ];

    if (!apiKey) {
      return withCors(
        NextResponse.json({ error: "L'assistant est indisponible pour le moment." }, { status: 503 }),
        request,
      );
    }

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = zone
      ? visionModelsToTry(process.env.OPENROUTER_MODEL)
      : Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    let lastError: unknown = null;
    for (const model of modelsToTry) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
            'X-OpenRouter-Title': 'Campus 360 AI Tutor',
          },
          body: JSON.stringify({
            model,
            messages: conversation,
            temperature: 0.4,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          console.warn(`[ai/pdf-chat] Model ${model} returned status: ${response.status}`);
          continue;
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const aiAnswer = payload.choices?.[0]?.message?.content;
        if (aiAnswer) {
          return withCors(
            NextResponse.json({
              answer: aiAnswer,
              model,
              freeActionsLeft: allowance.remaining,
              passActive: allowance.pass,
            }),
            request,
          );
        }
      } catch (err) {
        lastError = err;
        console.warn(`[ai/pdf-chat] Model ${model} error:`, err);
      }
    }

    console.warn('[ai/pdf-chat] All AI models failed:', lastError);
    const unavailable = zone
      ? "L'IA ne peut pas lire cette zone pour le moment. Réessaie dans un instant."
      : "L'assistant est indisponible pour le moment.";
    return withCors(
      NextResponse.json({ error: unavailable }, { status: 503 }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
