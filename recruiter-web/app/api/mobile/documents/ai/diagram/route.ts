import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { SVG_DIAGRAMS, ACADEMIC_TABLE_SAMPLE } from '@/lib/academic-stage-template';

export const runtime = 'nodejs';

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

const diagramSchema = z.object({
  type: z.enum(['architecture', 'use_case', 'database', 'table', 'custom']),
  prompt: z.string().optional().default(''),
  title: z.string().optional().default('Diagramme Technique'),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));

    const body = await request.json().catch(() => ({}));
    const parsed = diagramSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 }), request);
    }

    const { type, prompt, title } = parsed.data;

    let htmlSnippet = '';
    if (type === 'architecture') {
      htmlSnippet = SVG_DIAGRAMS.architecture;
    } else if (type === 'use_case') {
      htmlSnippet = SVG_DIAGRAMS.useCase;
    } else if (type === 'database') {
      htmlSnippet = SVG_DIAGRAMS.databaseSchema;
    } else if (type === 'table') {
      htmlSnippet = ACADEMIC_TABLE_SAMPLE;
    } else {
      // Custom AI SVG generator via OpenRouter if key is available
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey && prompt) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
              'X-Title': 'Campus 360 AI Diagram Generator',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content:
                    `Tu es un ingénieur expert en modélisation et graphiques SVG universitaires. ` +
                    `Génère un schéma SVG vectoriel propre, moderne, professionnel, avec des dimensions viewBox="0 0 650 250", ` +
                    `encapsulé dans <div class="figure-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">...</div> ` +
                    `avec une légende <div style="font-size: 10pt; font-style: italic; color: #475569; margin-top: 8px;"><strong>Figure :</strong> ${title}</div>. ` +
                    `Réponds UNIQUEMENT par le code HTML/SVG sans balises markdown ni texte autour.`,
                },
                {
                  role: 'user',
                  content: `Sujet du diagramme : ${prompt}`,
                },
              ],
              temperature: 0.3,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const raw = String(data.choices?.[0]?.message?.content ?? '').trim();
            htmlSnippet = raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
          }
        } catch {}
      }

      if (!htmlSnippet) {
        htmlSnippet = SVG_DIAGRAMS.architecture;
      }
    }

    return withCors(
      NextResponse.json({
        success: true,
        html: htmlSnippet,
        title,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
