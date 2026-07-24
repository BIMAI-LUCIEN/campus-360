import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';
import { getDocumentById, getDocumentSections } from '@/lib/documents-db';

export const runtime = 'nodejs';

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(6000),
      }),
    )
    .min(1)
    .max(30),
  currentSectionTitle: z.string().max(200).optional(),
});

// Keep section context bounded so the prompt stays small and cheap.
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de chat invalides.' }, { status: 400 });
    }

    const document = await getDocumentById(id, access.user.id);
    if (!document) throw new MobileApiError('Document introuvable.', 404);
    const sections = await getDocumentSections(id);

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
    if (!apiKey) throw new MobileApiError('Service IA momentanément indisponible.', 503);

    const outline = sections
      .map((s, i) => {
        const excerpt = stripHtml(s.content_html || '').slice(0, 220);
        return `${i + 1}. ${s.title}${excerpt ? ` — ${excerpt}${excerpt.length >= 220 ? '…' : ''}` : ' — (vide)'}`;
      })
      .join('\n');

    const systemPrompt =
      `Tu es un assistant de rédaction académique pour l'application Campus 360. ` +
      `Tu aides un étudiant à rédiger et améliorer son document en cours de création.\n\n` +
      `Contexte du document :\n` +
      `- Titre : ${document.title || 'Sans titre'}\n` +
      `- Type : ${document.template_type || 'document'}\n` +
      (parsed.data.currentSectionTitle
        ? `- Section en cours d'édition : « ${parsed.data.currentSectionTitle} »\n`
        : '') +
      `- Plan et contenu actuel :\n${outline || '(aucune section)'}\n\n` +
      `Directives :\n` +
      `- Réponds toujours en français, de façon claire, concise et professionnelle.\n` +
      `- Aide l'étudiant à structurer ses idées, rédiger, reformuler, corriger et enrichir son document.\n` +
      `- Quand tu proposes un passage à insérer, écris-le directement (texte propre, sans balises HTML ni Markdown lourd), prêt à être collé dans la section.\n` +
      `- Appuie-toi sur le plan ci-dessus pour rester cohérent avec le reste du document.\n` +
      `- Reste factuel ; si une information manque, pose une question ciblée plutôt que d'inventer.`;

    const referer = process.env.BETTER_AUTH_URL ?? 'https://campus-360.local';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-Title': 'Campus 360 Editor Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...parsed.data.messages],
        temperature: 0.6,
      }),
    });

    if (!response.ok) throw new MobileApiError("Erreur de communication avec l'IA.", 502);
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre.";

    return NextResponse.json({ reply });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
