import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections, getDocumentSources } from '@/lib/documents-db';

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
    currentSectionTitle: z.string().max(300).optional(),
    action: z.enum(['chat', 'draft_section']).optional().default('chat'),
  })
  .passthrough();

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = chatSchema.safeParse(body);
    const { messages, currentSectionTitle, action } = parsed.success
      ? parsed.data
      : { messages: [], currentSectionTitle: '', action: 'chat' };

    let documentTitle = 'Document académique';
    let documentType = 'document';
    let outline = '';
    let sourcesContext = '';

    if (userId) {
      try {
        const document = await getDocumentById(id, userId);
        if (document) {
          documentTitle = document.title || 'Sans titre';
          documentType = document.template_type || 'document';
        }
        const sections = await getDocumentSections(id);
        outline = sections
          .map((s, i) => {
            const excerpt = stripHtml(s.content_html || '').slice(0, 220);
            return `${i + 1}. ${s.title}${excerpt ? ` — ${excerpt}${excerpt.length >= 220 ? '…' : ''}` : ' — (vide)'}`;
          })
          .join('\n');

        const sources = await getDocumentSources(id, userId);
        if (sources.length > 0) {
          sourcesContext = sources
            .map((src, idx) => {
              const textSample = (src.extracted_text || src.summary || '').slice(0, 1500);
              return `[Source ${idx + 1} : ${src.file_name} (${src.file_type})]\n${textSample || '(aucun extrait disponible)'}`;
            })
            .join('\n\n');
        }
      } catch (err) {
        console.warn('[Doc Chat] Metadata error:', err);
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    const systemPrompt = [
      `Tu es l'Assistant de Rédaction Universitaire d'Élite de Campus 360.`,
      `Tu aides l'étudiant à rédiger, structurer, corriger, reformuler et enrichir son rapport de stage / mémoire académique.`,
      '',
      `Contexte du document :`,
      `- Titre : ${documentTitle}`,
      `- Type : ${documentType}`,
      currentSectionTitle ? `- Section en cours d'édition : « ${currentSectionTitle} »` : '',
      outline ? `- Plan et aperçu actuel :\n${outline}` : '',
      sourcesContext ? `\n--- SOURCES ET PIÈCES JOINTES DE L'ÉTUDIANT (À UTILISER EN PRIORITÉ) ---\n${sourcesContext}\n--- FIN DES SOURCES ---` : '',
      '',
      action === 'draft_section'
        ? `IMPORTANT : L'étudiant te demande de GÉNÉRER LE CONTENU COMPLET pour la section « ${currentSectionTitle} » en t'appuyant sur les sources et les échanges. Produis directement du code HTML académique propre et complet (balises <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <blockquote>, ou <table> si pertinent). Ne mets AUCUNE balise <html>, <body> ni de bloc de code markdown. Réponds directement en HTML prêt à l'insertion.`
        : `Directives pédagogiques :
- Réponds toujours en français chaleureux, précis et professionnel.
- Quand tu proposes du texte à insérer, fournis des paragraphes rédigés de qualité supérieure, prêts à être insérés dans la section.
- Si des sources sont fournies, cite fidèlement les chiffres, faits et noms de l'entreprise mentionnés dans les sources.
- Propose des transitions logiques, des arguments percutants et des exemples concrets.`,
    ]
      .filter(Boolean)
      .join('\n');

    const formattedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));

    if (!apiKey) {
      return withCors(
        NextResponse.json({
          reply: `Bonjour ! Je suis ton assistant pour la section « ${currentSectionTitle || documentTitle} ». Que souhaites-tu rédiger ou améliorer ?`,
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
            'X-Title': 'Campus 360 Editor Assistant',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...formattedMessages.filter((m) => m.content.trim().length > 0),
            ],
            temperature: 0.5,
            max_tokens: 1500,
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
        reply: `Voici une suggestion pour la section « ${currentSectionTitle || documentTitle} » : concentre-toi sur la définition des objectifs clés, l'analyse détaillée des résultats et les perspectives d'amélioration.`,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
