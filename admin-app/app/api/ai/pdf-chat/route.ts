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

function localPdfAnswer(question: string, context?: z.infer<typeof bodySchema>['pdfContext']): string {
  const q = question.toLowerCase();
  const isObj = typeof context === 'object' && context !== null;
  const title = isObj ? (context.title ?? 'ce document') : 'ce document';
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
    return `💡 **Concernant "${title}" :**\n\n${summary}\n\n*Pose-moi une question précise sur un concept, un exercice ou une formule pour approfondir.*`;
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
        max: 40,
        windowMs: 60_000,
        userId,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
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
            `Titre : ${pdfContext?.title ?? 'Document académique'}`,
            `Matière : ${pdfContext?.subject ?? 'Non spécifiée'}`,
            `Niveau : ${pdfContext?.level ?? 'Universitaire'}`,
            pdfContext?.aiSummary ? `Résumé analytique : ${pdfContext.aiSummary}` : '',
            pdfContext?.aiStudyPlan?.length
              ? `Plan d'étude structuré : \n${pdfContext.aiStudyPlan.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
              : '',
            pdfContext?.aiQuiz?.length
              ? `Questions et concepts clés du document : \n${pdfContext.aiQuiz.map((q, i) => `Q${i + 1}: ${q.question} -> R: ${q.answer}`).join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n');

    const systemPrompt = [
      'Tu es le Professeur et Tuteur IA d’Élite de Campus 360.',
      'Ton objectif fondamental est de rendre l’étudiant brillant dans sa matière grâce à des explications percutantes, intelligentes, rigoureuses et adaptées à son niveau universitaire.',
      '',
      'DIRECTIVES PÉDAGOGIQUES MAJEURES :',
      '1. INTERDICTION FORMELLE DE RÉPONDRE DE FAÇON GÉNÉRIQUE OU BANALE. Adapte-toi immédiatement à la question de l’étudiant et au document étudié.',
      '2. RIGOUREUX & ANALYTIQUE : Explique le "pourquoi" et le "comment", cite les notions théoriques, définitions clés et méthodes pratiques mentionnées dans le cours.',
      '3. PÉDAGOGIE STRUCTURÉE : Utilise une mise en page claire en Markdown (titres en gras, listes à puces, exemples concrets, analogies mnémotechniques, étapes numérotées pour les calculs ou raisonnements).',
      '4. SI L’ÉTUDIANT DEMANDE UN RÉSUMÉ : Rédige une synthèse percutante avec les grands axes, les formules/notions clés et les pièges classiques d’examen.',
      '5. SI L’ÉTUDIANT DEMANDE UN QUIZ : Propose des questions stimulantes qui testent la compréhension profonde (pas seulement le par cœur).',
      '6. SI L’ÉTUDIANT POSE UNE QUESTION PRÉCISE : Réponds avec précision, donne un exemple concret et vérifie sa compréhension.',
      '7. Réponds toujours en français élégant, bienveillant et stimulant.',
      '',
      '=== CONTEXTE ACADÉMIQUE DU COURS ===',
      contextStr,
      '====================================',
    ]
      .filter(Boolean)
      .join('\n');

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...(messages ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_FREE_MODEL;

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
        console.warn('[ai/pdf-chat] OpenRouter call failed:', response.status);
        const res = NextResponse.json(
          {
            answer: localPdfAnswer(question, pdfContext),
            local: true,
          },
          { status: 200 },
        );
        return withCors(res, request);
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
        return withCors(res, request);
      }

      const res = NextResponse.json({
        answer: aiAnswer,
        model,
      });
      return withCors(res, request);
    } catch (apiError) {
      console.warn('[ai/pdf-chat] OpenRouter network error, using fallback:', apiError);
      const res = NextResponse.json(
        {
          answer: localPdfAnswer(question, pdfContext),
          local: true,
        },
        { status: 200 },
      );
      return withCors(res, request);
    }
  } catch (error) {
    const status = error instanceof MobileApiError ? error.status : 500;
    const message = error instanceof MobileApiError ? error.message : 'Erreur lors du traitement IA.';
    return withCors(NextResponse.json({ error: message }, { status }), request);
  }
}
