import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  documentType: z.string().default('stage')
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de chat invalides.' }, { status: 400 });
    }

    const { messages, documentType } = parsed.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

    if (!apiKey) {
      throw new MobileApiError('Service IA momentanément indisponible.', 503);
    }

    const systemPrompt = 
      `Tu es l'assistant d'onboarding intelligent pour l'application Campus 360.\n` +
      `Ton rôle est d'avoir une conversation rapide et ciblée avec un étudiant pour collecter toutes les informations nécessaires à la rédaction de son document (${documentType}).\n\n` +
      `Directives :\n` +
      `- Pose UNE SEULE question claire à la fois.\n` +
      `- Demande des précisions clés : thème, université, stage effectué ou non, nom de l'entreprise, missions ou projets clés.\n` +
      `- Sois chaleureux, encourageant et professionnel.\n` +
      `- Dès que tu as collecté les informations clés (environ 3 à 5 questions), propose poliment de cliquer sur le bouton "Générer le rapport" ou "Lancer la rédaction".\n` +
      `- Si l'étudiant indique qu'il n'a pas fait de stage, rassure-le en lui disant que tu feras des recherches en ligne et académiques pour lui générer un excellent rapport théorique et méthodologique.`;

    const referer = process.env.BETTER_AUTH_URL ?? 'https://campus-360.local';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-Title': 'Campus 360 Onboarding Chat',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new MobileApiError('Erreur de communication avec l\'IA.', 502);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Désolé, je n\'ai pas compris.';

    return NextResponse.json({ reply });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
