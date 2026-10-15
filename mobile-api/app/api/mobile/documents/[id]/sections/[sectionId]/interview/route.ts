import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { DEFAULT_FIELD, fieldFromProfile, isStudyField, type StudyField } from '@/lib/document-outlines';
import { normalizeHeadings } from '@/lib/document-render';
import { getDocumentById, getSectionForInterview, saveSectionInterview } from '@/lib/documents-db';
import {
  buildDraftMessages,
  cleanAnswers,
  interviewAnswersSchema,
  interviewQuestionsFor,
  type InterviewAnswers,
} from '@/lib/interview';
import { callLlm, isLlmConfigured, llmRewrite } from '@/lib/llm';
import { mobileErrorResponse, requireMobileUser, withCors, type MobileUser } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { markCited, retrieveSourcesContext } from '@/lib/source-context';
import { polishAiTics, stripRepeatedTitle } from '@/lib/writing-rules';

export const runtime = 'nodejs';
export const maxDuration = 120;

// "Rédiger avec moi": GET the questions and saved answers, PUT the answers,
// POST to draft the section from the answers and the ticked sources.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string; sectionId: string }> };

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

const putSchema = z.object({ answers: interviewAnswersSchema });
const draftSchema = z.object({
  answers: interviewAnswersSchema.optional(),
  sourceIds: z.array(z.string().uuid()).max(50).optional(),
});

const notFound = (request: NextRequest) =>
  withCors(NextResponse.json({ error: 'Section introuvable.' }, { status: 404 }), request);

const storedAnswers = (value: unknown): InterviewAnswers => {
  const answers = (value as { answers?: unknown } | null)?.answers;
  const parsed = interviewAnswersSchema.safeParse(answers ?? {});
  return parsed.success ? parsed.data : {};
};

// Resolves the document (owned by the user), the section and its questions.
const load = async (context: RouteContext, user: MobileUser) => {
  const { id, sectionId } = await context.params;
  if (!UUID.test(id) || !UUID.test(sectionId)) return null;
  const document = await getDocumentById(id, user.id);
  if (!document) return null;
  const section = await getSectionForInterview(id, sectionId);
  if (!section) return null;
  const field: StudyField = isStudyField(document.field)
    ? document.field
    : fieldFromProfile(user.faculty, user.level) ?? DEFAULT_FIELD;
  const kind = document.template_type || 'stage';
  const questions = interviewQuestionsFor(section.title, kind, field);
  return { document, section, field, kind, questions, answers: storedAnswers(section.interview_answers) };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const loaded = await load(context, access.user);
    if (!loaded) return notFound(request);
    return withCors(
      NextResponse.json({
        sectionTitle: loaded.section.title,
        field: loaded.field,
        questions: loaded.questions,
        answers: cleanAnswers(loaded.questions, loaded.answers),
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    await enforceRateLimit(request, { bucket: 'section-interview-save', max: 120, windowMs: 10 * 60_000, userId: access.user.id });

    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Réponses invalides.' }, { status: 400 }), request);
    }
    const loaded = await load(context, access.user);
    if (!loaded) return notFound(request);

    const answers = cleanAnswers(loaded.questions, parsed.data.answers);
    await saveSectionInterview(loaded.document.id, loaded.section.id, {
      questions: loaded.questions,
      answers,
      updatedAt: new Date().toISOString(),
    });
    return withCors(NextResponse.json({ answers }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const userId = access.user.id;
    await enforceRateLimit(request, { bucket: 'section-interview-draft', max: 20, windowMs: 10 * 60_000, userId });

    const parsed = draftSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }), request);
    }
    const loaded = await load(context, access.user);
    if (!loaded) return notFound(request);

    // Answers sent with the request win over the stored ones, and are saved.
    const answers = cleanAnswers(loaded.questions, parsed.data.answers ?? loaded.answers);
    if (Object.keys(answers).length === 0) {
      return withCors(
        NextResponse.json({ error: 'Réponds au moins à une question pour que je puisse rédiger.' }, { status: 400 }),
        request,
      );
    }
    if (parsed.data.answers) {
      await saveSectionInterview(loaded.document.id, loaded.section.id, {
        questions: loaded.questions,
        answers,
        updatedAt: new Date().toISOString(),
      });
    }
    if (!isLlmConfigured()) {
      return withCors(NextResponse.json({ error: 'Le service de rédaction n’est pas configuré.' }, { status: 503 }), request);
    }

    const retrieved = await retrieveSourcesContext({
      documentId: loaded.document.id,
      userId,
      sourceIds: parsed.data.sourceIds,
      question: `${loaded.section.title} ${Object.values(answers).join(' ')}`.slice(0, 2000),
    });

    const messages = buildDraftMessages({
      sectionTitle: loaded.section.title,
      documentTitle: loaded.document.title || 'Sans titre',
      kind: loaded.kind,
      field: loaded.field,
      questions: loaded.questions,
      answers,
      sourcesContext: retrieved?.context,
    });
    const raw = await callLlm(messages, { temperature: 0.4, maxTokens: 2200, title: 'Campus 360 Interview Draft' });
    if (!raw) {
      return withCors(NextResponse.json({ error: 'La rédaction a échoué, réessaie dans un instant.' }, { status: 502 }), request);
    }
    const unfenced = raw.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    const polished = await polishAiTics(unfenced, llmRewrite);
    const html = sanitizeHtml(normalizeHeadings(stripRepeatedTitle(polished.html, loaded.section.title)));

    return withCors(
      NextResponse.json(retrieved ? { html, citations: markCited(html, retrieved.citations) } : { html }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}
