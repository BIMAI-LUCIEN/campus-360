import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

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

const chatSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.string().default('user'),
            content: z.string().default(''),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
    documentType: z.string().default('stage'),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = chatSchema.safeParse(body);
    const { messages, documentType } = parsed.success
      ? parsed.data
      : { messages: [], documentType: 'stage' };

    const apiKey = process.env.OPENROUTER_API_KEY;

    const systemPrompt = [
      `Tu es l'Assistant d'Onboarding Intelligent et Pédagogique de Campus 360.`,
      `Ton rôle est d'avoir un dialogue rapide, bienveillant et ciblé avec un étudiant pour collecter toutes les informations nécessaires à la rédaction de son document (${documentType}).`,
      '',
      `DIRECTIVES :`,
      `- Pose UNE SEULE question claire à la fois.`,
      `- Demande les détails essentiels : sujet/thématique, établissement/filière, stage effectué ou non, missions ou projets clés réalisés.`,
      `- Sois chaleureux, dynamique et stimulant en français.`,
      `- Dès que tu as rassemblé 3 ou 4 informations utiles, invite poliment l'étudiant à cliquer sur le bouton "Générer le rapport" ou "Lancer la rédaction".`,
      `- Si l'étudiant indique qu'il n'a pas fait de stage, rassure-le chaleureusement en lui disant que l'IA élaborera un rapport théorique et méthodologique complet de haut niveau.`,
    ].join('\n');

    const formattedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));

    if (!apiKey) {
      return withCors(
        NextResponse.json({
          reply: `Parfait ! Peux-tu me préciser ton sujet principal et les points majeurs que tu souhaites aborder dans ton ${documentType} ?`,
        }),
        request,
      );
    }

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
            'X-Title': 'Campus 360 Onboarding Chat',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...formattedMessages.filter((m) => m.content.trim().length > 0),
            ],
            temperature: 0.6,
            max_tokens: 800,
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return withCors(NextResponse.json({ reply }), request);
        }
      } catch {
        // try next model
      }
    }

    return withCors(
      NextResponse.json({
        reply: `Très bien ! As-tu d'autres précisions ou missions clés à ajouter, ou souhaites-tu lancer la rédaction complète dès maintenant ?`,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
