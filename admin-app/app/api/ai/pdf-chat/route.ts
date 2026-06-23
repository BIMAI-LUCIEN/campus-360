import { NextRequest, NextResponse } from 'next/server';

import { databasePool } from '@/lib/database';
import { requireMobileUser, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODEL = 'openrouter/free';

const localPdfAnswer = (question: string, pdfContext: string) => {
  const normalized = question.toLowerCase();
  const contextLines = pdfContext
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title = contextLines.find((line) => line.startsWith('Titre:'))?.replace('Titre:', '').trim() || 'ce PDF';
  const subject =
    contextLines.find((line) => line.startsWith('Matiere:'))?.replace('Matiere:', '').trim() || 'le cours';
  const summary =
    contextLines.find((line) => line.startsWith('Resume IA:'))?.replace('Resume IA:', '').trim() ||
    contextLines.find((line) => line.startsWith('Description:'))?.replace('Description:', '').trim();

  if (normalized.includes('quiz') || normalized.includes('question')) {
    return `Quiz rapide sur ${title}: 1) Quel est le theme principal du document ? 2) Cite deux notions importantes de ${subject}. 3) Quelle methode utiliserais-tu pour reviser ce chapitre ?`;
  }

  if (normalized.includes('plan') || normalized.includes('revision') || normalized.includes('etud')) {
    return `Plan de revision: 1) Lis le resume de ${title}. 2) Note les definitions cles de ${subject}. 3) Fais une fiche courte. 4) Entraine-toi avec 3 questions. 5) Revois les erreurs avant l'examen.`;
  }

  if (normalized.includes('resume') || normalized.includes('resumer')) {
    return `Resume rapide: ${summary || `${title} est un document de ${subject}. Utilise-le pour identifier les notions cles, faire une fiche et t'entrainer avec des questions courtes.`}`;
  }

  return `Je peux t'aider sur ${title}. Demande-moi un resume, un plan de revision, un quiz ou une explication precise d'une notion du PDF.`;
};

export async function POST(request: NextRequest) {
  const access = await requireMobileUser(request);
  if (access.response) return access.response;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { answer: "OpenRouter n'est pas encore configure. Ajoute OPENROUTER_API_KEY cote serveur." },
      { status: 200 },
    );
  }

  const { question, pdfContext, messages } = (await request.json()) as {
    question?: string;
    pdfContext?: string;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!question || !pdfContext) {
    return NextResponse.json({ error: 'question and pdfContext are required' }, { status: 400 });
  }

  const client = await databasePool.connect();
  try {
    await client.query('begin');
    
    // Check credits
    const walletRes = await client.query(
      'select ia_credits from public.app_wallets where user_id = $1 for update',
      [access.user.id]
    );
    const credits = walletRes.rows[0]?.ia_credits ?? 0;
    
    if (credits <= 0) {
      await client.query('rollback');
      return NextResponse.json(
        { error: 'CREDITS_EXHAUSTED', message: "Vous n'avez plus de credits IA. Veuillez recharger." },
        { status: 403 }
      );
    }

    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_FREE_MODEL;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
        'X-OpenRouter-Title': 'Campus-Bordes',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un assistant pedagogique pour etudiants camerounais. Reponds en francais simple, avec explications courtes, exemples et questions de revision. Tu ne dois pas inventer un contenu absent du contexte PDF.',
          },
          {
            role: 'user',
            content: `Contexte PDF:\n${pdfContext}\n\nHistorique:\n${JSON.stringify(messages ?? [])}\n\nQuestion:\n${question}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      await client.query('rollback');
      const body = await response.text();
      return NextResponse.json(
        {
          answer: localPdfAnswer(question, pdfContext),
          model,
          fallback: true,
          warning: body || 'OpenRouter request failed',
        },
        { status: 200 },
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    
    // Consume credit and log
    await client.query(
      'update public.app_wallets set ia_credits = ia_credits - 1, updated_at = now() where user_id = $1',
      [access.user.id]
    );
    
    await client.query(
      'insert into public.app_ia_usage_logs (user_id, tokens_used) values ($1, $2)',
      [access.user.id, 1] // Can track actual tokens later if OpenRouter payload provides it
    );
    
    await client.query('commit');

    return NextResponse.json({
      answer: payload.choices?.[0]?.message?.content ?? "Je n'ai pas pu produire une reponse.",
      model,
    });
  } catch (error) {
    await client.query('rollback');
    console.error('AI error', error);
    return NextResponse.json({ error: 'Erreur lors du traitement IA.' }, { status: 500 });
  } finally {
    client.release();
  }
}
