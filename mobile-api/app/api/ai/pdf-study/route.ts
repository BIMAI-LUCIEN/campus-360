import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeAiAllowance, refundAiAllowance } from '@/lib/ai-allowance';
import type { AiActionKind, Allowance } from '@/lib/ai-allowance-core';
import { enforceAiQuota } from '@/lib/ai-quota';
import { loadCatalogPdfText } from '@/lib/catalog-pdf';
import { databasePool } from '@/lib/database';
import { corsPreflight, MobileApiError, mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import {
  buildStudyMessages,
  MAX_AVOID,
  parseStudyOutput,
  pickCourseText,
  StudyOutputError,
  type StudyKind,
  type StudyResult,
} from '@/lib/pdf-study';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  documentId: z.string().trim().min(1).max(128),
  kind: z.enum(['summary', 'plan', 'quiz']),
  // Questions of the quizzes already taken, so the next one asks something else.
  avoid: z.array(z.string().max(500)).max(MAX_AVOID).optional().default([]),
});

type DocumentRow = {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string | null;
  file_path: string | null;
  ai_summary: string | null;
  ai_study_plan: unknown;
};

// A summary is 1 action, a plan counts as a revision sheet, a quiz as a quiz (contexte.md §19).
const ACTION_OF: Record<StudyKind, AiActionKind> = { summary: 'summary', plan: 'sheet', quiz: 'quiz' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CANDIDATE_MODELS = ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct:free'];
// Under this, the PDF is a scan or nearly empty: the metadata alone is used if it says enough.
const MIN_COURSE_CHARS = 300;

const UNAVAILABLE = "L'IA n'a pas pu préparer ce contenu. Réessaie dans un instant.";

const storedResult = (kind: StudyKind, row: DocumentRow): StudyResult | null => {
  if (kind === 'summary' && row.ai_summary?.trim()) return { kind, summary: row.ai_summary.trim() };
  if (kind === 'plan' && Array.isArray(row.ai_study_plan) && row.ai_study_plan.length > 0) {
    return { kind, plan: row.ai_study_plan.map(String) };
  }
  return null;
};

const callModel = async (messages: { role: string; content: string }[], kind: StudyKind, apiKey: string, avoid: string[]) => {
  const preferred = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
  for (const model of Array.from(new Set([preferred, ...CANDIDATE_MODELS]))) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
          'X-OpenRouter-Title': 'Campus 360 Revision',
        },
        body: JSON.stringify({ model, messages, temperature: kind === 'quiz' ? 0.8 : 0.3, max_tokens: 3000 }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        console.warn(`[ai/pdf-study] Model ${model} returned status: ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) continue;
      // An unusable answer moves on to the next model instead of failing.
      return parseStudyOutput(kind, content, avoid);
    } catch (error) {
      console.warn(`[ai/pdf-study] Model ${model} failed:`, error instanceof StudyOutputError ? error.message : error);
    }
  }
  return null;
};

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new MobileApiError('Demande invalide.', 400);
    const { documentId, kind, avoid } = parsed.data;

    const { rows } = await databasePool.query<DocumentRow>(
      `select id, title, subject, level, description, file_path, ai_summary, ai_study_plan
       from public.documents
       where id::text = $1 and coalesce(status, 'published') <> 'archived'
       limit 1`,
      [documentId],
    );
    const document = rows[0];
    if (!document) throw new MobileApiError('Document non trouve.', 404);

    // A summary or a plan already written for this PDF is shared with every reader, free.
    const stored = storedResult(kind, document);
    if (stored) return withCors(NextResponse.json({ ...stored, stored: true }), request);

    await enforceAiQuota(request, { userId, route: 'ai-pdf-study' });
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return withCors(NextResponse.json({ error: "L'assistant est indisponible pour le moment." }, { status: 503 }), request);
    }

    const allowance: Allowance = await consumeAiAllowance(userId, ACTION_OF[kind]);
    try {
      const pages = document.file_path ? await loadCatalogPdfText(document.id, document.file_path) : [];
      let courseText = pickCourseText(pages);
      if (courseText.length < MIN_COURSE_CHARS) {
        const description = document.description?.trim() ?? '';
        if (description.length < 120) {
          throw new MobileApiError(
            "Ce PDF ne contient pas de texte lisible (document scanné) : l'IA ne peut pas en tirer ce contenu.",
            422,
          );
        }
        courseText = `${courseText}\n${description}`.trim();
      }

      const result = await callModel(
        buildStudyMessages(
          kind,
          { title: document.title, subject: document.subject, level: document.level, description: document.description ?? '' },
          courseText,
          avoid,
        ),
        kind,
        apiKey,
        avoid,
      );
      if (!result) throw new MobileApiError(UNAVAILABLE, 503);

      // Kept for the next readers; never overwrites what the admin wrote meanwhile.
      if (result.kind === 'summary') {
        await databasePool.query(
          `update public.documents set ai_summary = $2, updated_at = now() where id::text = $1 and coalesce(ai_summary, '') = ''`,
          [document.id, result.summary],
        );
      } else if (result.kind === 'plan') {
        await databasePool.query(
          `update public.documents set ai_study_plan = $2::jsonb, updated_at = now()
           where id::text = $1 and jsonb_array_length(coalesce(ai_study_plan, '[]'::jsonb)) = 0`,
          [document.id, JSON.stringify(result.plan)],
        );
      }

      return withCors(
        NextResponse.json({ ...result, freeActionsLeft: allowance.remaining, passActive: allowance.pass }),
        request,
      );
    } catch (error) {
      // The student only pays for content they received.
      await refundAiAllowance(userId, allowance);
      throw error;
    }
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
