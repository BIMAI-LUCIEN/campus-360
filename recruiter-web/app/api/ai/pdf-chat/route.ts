import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, MobileApiError, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'minimax/minimax-01',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

const MAX_BODY_BYTES = 128 * 1024;

const bodySchema = z
  .object({
    question: z.string().optional().default('Explique ce cours'),
    pdfContext: z.any().optional(),
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

function localPdfAnswer(question: string, context?: any): string {
  const q = (question || '').toLowerCase();
  const isObj = typeof context === 'object' && context !== null;
  const title = isObj ? (context.title ?? 'ce cours') : 'ce cours';
  const summary = isObj ? (context.aiSummary ?? '') : (typeof context === 'string' ? context : '');
  const plan = isObj ? (context.aiStudyPlan ?? []) : [];

  if (q.includes('plan') || q.includes('reviser') || q.includes('revision')) {
    if (plan.length > 0) {
      return `📌 **Plan de révision recommandé pour ${title} :**\n\n${plan.map((step: string, idx: number) => `**Étape ${idx + 1} :** ${step}`).join('\n')}`;
    }
  }

  if (q.includes('resume') || q.includes('résumé') || q.includes('synthèse')) {
    if (summary) {
      return `📖 **Synthèse du cours — ${title} :**\n\n${summary}`;
    }
  }

  if (summary) {
    return `💡 **Point clé sur "${title}" :**\n\n${summary}\n\n*Pose-moi une question sur une notion ou un calcul pour approfondir.*`;
  }

  return `Bonjour ! Je suis ton tuteur IA pour **${title}**. Pose-moi une question sur le contenu, un exercice ou une notion difficile à comprendre.`;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const userId = access?.user?.id ?? 'guest-student';

    try {
      await enforceRateLimit(request, {
        bucket: 'ai-pdf-chat',
        max: 60,
        windowMs: 60_000,
        userId,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const raw = (await request.json().catch(() => ({}))) as unknown;
    const parsed = bodySchema.safeParse(raw);
    const { question, pdfContext, messages } = parsed.success
      ? parsed.data
      : { question: 'Explique ce cours', pdfContext: '', messages: [] };

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
      'Tu es le Professeur et Tuteur IA d’Élite de Campus 360.',
      'Ton rôle est d’apporter des explications limpides, intelligentes, rigoureuses et parfaitement adaptées à la demande de l’étudiant et à son cours universitaire.',
      '',
      'DIRECTIVES PÉDAGOGIQUES MAJEURES :',
      '1. INTERDICTION DE RÉPONSES GÉNÉRIQUES OU BANALES. Analyse le contenu réel du document et réponds avec précision.',
      '2. RIGOUREUX & ANALYTIQUE : Explique le "pourquoi" et le "comment", cite les concepts, définitions, formules et méthodes du cours.',
      '3. PÉDAGOGIE STRUCTURÉE : Formate ta réponse en Markdown soigné (mots clés en gras, étapes numérotées, exemples concrets, analogies pédagogiques).',
      '4. ADAPTATION : Si la question est courte (ex: "OK", "J"), demande-lui avec bienveillance sur quel chapitre, notion ou exercice du cours il souhaite travailler.',
      '5. Réponds toujours en français chaleureux, encourageant et stimulant.',
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
      { role: 'user', content: question || 'Explique ce cours' },
    ];

    if (!apiKey) {
      const res = NextResponse.json(
        {
          answer: localPdfAnswer(question, pdfContext),
          local: true,
        },
        { status: 200 },
      );
      return withCors(res, request);
    }

    // Try primary model (gpt-4o-mini or minimax-01) with fallback chain
    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

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
            }),
            request,
          );
        }
      } catch (err) {
        lastError = err;
        console.warn(`[ai/pdf-chat] Model ${model} error:`, err);
      }
    }

    console.warn('[ai/pdf-chat] All AI models failed, using fallback:', lastError);
    const res = NextResponse.json(
      {
        answer: localPdfAnswer(question, pdfContext),
        local: true,
      },
      { status: 200 },
    );
    return withCors(res, request);
  } catch (error) {
    const status = error instanceof MobileApiError ? error.status : 500;
    const message = error instanceof MobileApiError ? error.message : 'Erreur lors du traitement IA.';
    return withCors(NextResponse.json({ error: message }, { status }), request);
  }
}
