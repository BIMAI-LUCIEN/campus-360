import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, MobileApiError, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const MAX_BODY_BYTES = 64 * 1024;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  question: z.string().trim().min(1).max(2000),
  pdfContext: z
    .union([
      z.string(),
      z.object({
        documentId: z.string().optional(),
        title: z.string().optional(),
        subject: z.string().optional(),
        level: z.string().optional(),
        pageCount: z.number().optional(),
        previewText: z.string().optional(),
        aiSummary: z.string().optional(),
        aiStudyPlan: z.array(z.string()).optional(),
        aiQuiz: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
      }),
    ])
    .optional(),
  messages: z.array(messageSchema).max(20).optional().default([]),
});

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

function localPdfAnswer(question: string, context?: z.infer<typeof bodySchema>['pdfContext']): string {
  const q = question.toLowerCase();
  const isObj = typeof context === 'object' && context !== null;
  const title = isObj ? (context.title ?? 'ce cours') : 'ce cours';
  const summary = isObj ? (context.aiSummary ?? '') : (typeof context === 'string' ? context : '');
  const plan = isObj ? (context.aiStudyPlan ?? []) : [];

  if (q.includes('plan') || q.includes('reviser') || q.includes('revision')) {
    if (plan.length > 0) {
      return `Voici le plan de révision suggéré pour ${title} :\n\n${plan.map((step: string, idx: number) => `${idx + 1}. ${step}`).join('\n')}`;
    }
  }

  if (q.includes('resume') || q.includes('résumé') || q.includes('synthèse')) {
    if (summary) {
      return `Résumé pour ${title} :\n\n${summary}`;
    }
  }

  if (summary) {
    return `Concernant "${title}" :\n\n${summary}\n\nN'hésite pas à me poser une question précise sur un chapitre ou un exercice !`;
  }

  return `Je suis ton tuteur IA pour le document "${title}". Pose-moi une question sur le contenu, la méthodologie ou des exercices !`;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }));
    }

    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const userId = access?.user?.id ?? 'guest-student';

    try {
      await enforceRateLimit(request, {
        bucket: 'ai-pdf-chat',
        max: 30,
        windowMs: 60_000,
        userId,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response);
      throw error;
    }

    const raw = (await request.json().catch(() => null)) as unknown;
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new MobileApiError('Requete IA invalide.', 400);
    }
    const { question, pdfContext, messages } = parsed.data;

    const apiKey = process.env.OPENROUTER_API_KEY;

    const contextStr =
      typeof pdfContext === 'string'
        ? pdfContext
        : [
            `Titre : ${pdfContext?.title ?? 'Document de cours'}`,
            `Matière : ${pdfContext?.subject ?? 'Non spécifiée'}`,
            `Niveau : ${pdfContext?.level ?? 'Universitaire'}`,
            pdfContext?.aiSummary ? `Résumé du cours : ${pdfContext.aiSummary}` : '',
            pdfContext?.aiStudyPlan?.length
              ? `Plan d'étude : \n${pdfContext.aiStudyPlan.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
              : '',
            pdfContext?.aiQuiz?.length
              ? `Quiz du cours : \n${pdfContext.aiQuiz.map((q, i) => `Q${i + 1}: ${q.question} -> R: ${q.answer}`).join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n');

    const systemPrompt = [
      'Tu es le tuteur d’apprentissage interactif officiel de Campus 360.',
      'Ton rôle est d’aider l’étudiant à comprendre en profondeur, réviser, et tester ses connaissances sur son document académique.',
      'Réponds en français, avec clarté, rigueur pédagogique et encouragement.',
      'Utilise le contexte du cours ci-dessous pour formuler des réponses précises et adaptées au niveau de l’étudiant.',
      '',
      '=== CONTEXTE DU DOCUMENT ===',
      contextStr,
      '============================',
    ]
      .filter(Boolean)
      .join('\n');

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...(messages ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_FREE_MODEL;

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
          'X-OpenRouter-Title': 'Campus 360',
        },
        body: JSON.stringify({
          model,
          messages: conversation,
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        console.warn('[ai/pdf-chat] OpenRouter call failed:', response.status);
        const res = NextResponse.json(
          {
            answer: localPdfAnswer(question, pdfContext),
            local: true,
          },
          { status: 200 },
        );
        return withCors(res);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const aiAnswer = payload.choices?.[0]?.message?.content;
      if (!aiAnswer) {
        const res = NextResponse.json(
          {
            answer: localPdfAnswer(question, pdfContext),
            local: true,
          },
          { status: 200 },
        );
        return withCors(res);
      }

      const res = NextResponse.json({
        answer: aiAnswer,
        model,
      });
      return withCors(res);
    } catch (apiError) {
      console.warn('[ai/pdf-chat] OpenRouter network error, using fallback:', apiError);
      const res = NextResponse.json(
        {
          answer: localPdfAnswer(question, pdfContext),
          local: true,
        },
        { status: 200 },
      );
      return withCors(res);
    }
  } catch (error) {
    const status = error instanceof MobileApiError ? error.status : 500;
    const message = error instanceof MobileApiError ? error.message : 'Erreur lors du traitement IA.';
    return withCors(NextResponse.json({ error: message }, { status }));
  }
}
