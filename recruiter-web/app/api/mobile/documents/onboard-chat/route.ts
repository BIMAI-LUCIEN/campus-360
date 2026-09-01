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
    documentType: z.enum(['stage', 'memoire', 'cv', 'lettre_motivation', 'blank']).default('stage'),
    profileContext: z.record(z.string(), z.string()).optional().default({}),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    const body = await request.json().catch(() => ({}));
    const parsed = chatSchema.safeParse(body);
    const { messages, documentType, profileContext } = parsed.success
      ? parsed.data
      : { messages: [], documentType: 'stage' as const, profileContext: {} };

    const apiKey = process.env.OPENROUTER_API_KEY;

    const scenarioDirectives: Record<string, string[]> = {
      cv: [
        `Collecte le poste recherché, le résumé professionnel, les formations, expériences et projets, les compétences, langues et certifications.`,
        `Ne pose pas de question académique sur une page de garde, un stage obligatoire ou un sommaire.`,
        `Après au moins trois réponses utiles, propose une synthèse courte et invite à générer le CV.`,
      ],
      lettre_motivation: [
        `Collecte l'opportunité visée, l'entreprise, le contexte de candidature, les motivations, les expériences pertinentes et la disponibilité.`,
        `Vérifie les coordonnées du candidat et les informations du destinataire.`,
        `Après au moins trois réponses utiles, propose une synthèse courte et invite à générer la lettre.`,
      ],
      memoire: [
        `Commence par identifier s'il s'agit d'un mémoire académique de recherche ou d'un mémoire professionnel/projet.`,
        `Collecte ensuite la discipline, le niveau, le sujet, la problématique, les objectifs, les questions ou hypothèses, la méthodologie, le terrain, les données disponibles et les contraintes de l'établissement.`,
        `Demande quelles sources l'étudiant possède déjà et quel style bibliographique est requis (APA, IEEE ou autre).`,
        `Ne fabrique jamais de données, résultats, participants, auteurs, publications ou DOI. Toute référence seulement suggérée doit être annoncée comme "à vérifier".`,
        `Après au moins sept réponses utiles, propose un plan adapté au type de mémoire et demande explicitement à l'étudiant de le confirmer ou de le corriger avant de lancer la rédaction.`,
      ],
      stage: [`Collecte l'établissement, l'entreprise, la période, les missions, outils et apprentissages du stage.`],
      blank: [`Collecte le sujet, le public cible, l'objectif et la structure attendue du document.`],
    };

    const systemPrompt = [
      `Tu es l'Assistant d'Onboarding Intelligent et Pédagogique de Campus 360.`,
      `Ton rôle est d'avoir un dialogue rapide, bienveillant et ciblé avec un étudiant pour collecter toutes les informations nécessaires à la rédaction de son document (${documentType}).`,
      '',
      `DIRECTIVES :`,
      `- Pose UNE SEULE question claire à la fois.`,
      `- Utilise les informations de profil déjà connues sans les redemander inutilement : ${JSON.stringify(profileContext)}.`,
      ...(scenarioDirectives[documentType] ?? scenarioDirectives.blank).map((directive) => `- ${directive}`),
      `- Sois chaleureux, dynamique et stimulant en français.`,
      `- Ne fabrique aucune information personnelle, expérience, compétence ou entreprise.`,
    ].join('\n');

    const formattedMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));

    if (!apiKey) {
      return withCors(
        NextResponse.json({
          reply: documentType === 'memoire'
            ? `Commençons par le type de mémoire : s'agit-il d'un mémoire académique de recherche ou d'un mémoire professionnel/projet ?`
            : `Parfait ! Peux-tu me préciser ton sujet principal et les points majeurs que tu souhaites aborder dans ton ${documentType} ?`,
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
        reply: documentType === 'memoire'
          ? `Très bien. Vérifie maintenant que le type de mémoire, la problématique, les objectifs, la méthodologie, les données et les sources sont bien précisés avant de valider le plan.`
          : `Très bien ! As-tu d'autres précisions ou missions clés à ajouter, ou souhaites-tu lancer la rédaction complète dès maintenant ?`,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
