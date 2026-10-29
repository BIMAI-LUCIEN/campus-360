import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enforceAiQuota } from '@/lib/ai-quota';
import { buildCvImportMessages, parseCvImport } from '@/lib/cv-background';
import { callLlm, isLlmConfigured } from '@/lib/llm';
import { MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { ExtractionError, extractSource } from '@/lib/source-extraction';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

// Either an existing CV file (base64) or pasted text.
const importSchema = z.union([
  z.object({ mime: z.enum(MIMES), base64: z.string().min(10).max(Math.ceil(MAX_FILE_BYTES * 1.4)) }),
  z.object({ text: z.string().trim().min(30).max(20000) }),
]);

// Reads an existing CV and returns the background it contains. Nothing is saved
// here: the app shows it for review, then saves it with PUT /cv-background.
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const parsed = importSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new MobileApiError('Envoie un CV en PDF, Word (.docx) ou texte, 5 Mo au plus.', 400);
    if (!isLlmConfigured()) throw new MobileApiError("L'IA n'est pas disponible pour le moment.", 503);

    let cvText: string;
    if ('text' in parsed.data) {
      cvText = parsed.data.text;
    } else {
      const data = Buffer.from(parsed.data.base64, 'base64');
      if (data.length > MAX_FILE_BYTES) throw new MobileApiError('Fichier trop lourd : 5 Mo au plus.', 413);
      try {
        const extracted = await extractSource(data, parsed.data.mime);
        cvText = extracted.pages.map((p) => p.text).join('\n');
      } catch (error) {
        if (error instanceof ExtractionError) {
          throw new MobileApiError("Impossible de lire ce fichier. S'il s'agit d'un scan ou d'une photo, colle plutôt le texte de ton CV.", 422);
        }
        throw error;
      }
    }

    await enforceAiQuota(request, { userId: access.user.id, route: 'cv-import' });
    const raw = await callLlm(buildCvImportMessages(cvText), {
      temperature: 0.1,
      maxTokens: 2500,
      title: 'Campus 360 Import CV',
      timeoutMs: 60_000,
    });
    const background = parseCvImport(raw);
    if (!background) throw new MobileApiError("L'IA n'a rien trouvé d'exploitable dans ce CV. Vérifie le fichier ou remplis ton parcours à la main.", 422);

    return withCors(NextResponse.json({ background }), request);
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
