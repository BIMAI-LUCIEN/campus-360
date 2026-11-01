import { enforceAiQuota } from '@/lib/ai-quota';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { careerContextText, careerOfferSchema } from '@/lib/career-context';
import { cvBackgroundSchema } from '@/lib/cv-background';
import { getCvBackground } from '@/lib/cv-background-db';
import { CV_MODELS, modelRequestOptions } from '@/lib/llm';
import { corsPreflight, requireMobileUser, mobileErrorResponse, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash-lite',
  'minimax/minimax-01',
];

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
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
    // CV and letter only: the offer aimed at, and an old CV just imported.
    offer: careerOfferSchema.nullish(),
    background: cvBackgroundSchema.nullish(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    await enforceAiQuota(request, { userId: access.user.id, route: 'onboard-chat' });

    const body = await request.json().catch(() => ({}));
    const parsed = chatSchema.safeParse(body);
    const { messages, documentType, profileContext, offer, background } = parsed.success
      ? parsed.data
      : { messages: [], documentType: 'stage' as const, profileContext: {}, offer: null, background: null };

    // A CV or a letter starts from what the student already has: the old CV just
    // imported, else the background saved on the account, and the offer aimed at.
    const isCareer = documentType === 'cv' || documentType === 'lettre_motivation';
    const careerContext = isCareer
      ? careerContextText(background ?? (await getCvBackground(access.user.id).catch(() => null)), offer)
      : '';

    const apiKey = process.env.OPENROUTER_API_KEY;

    const scenarioDirectives: Record<string, string[]> = {
      cv: [
        `Collecte le poste recherché, le résumé professionnel, les formations, expériences et projets, les compétences, langues et certifications.`,
        `Si le parcours de l'étudiant est fourni, ne redemande pas ce qu'il contient : fais-le confirmer en une phrase, puis complète seulement ce qui manque ou reste vague.`,
        `Si une offre est fournie, cible le CV sur elle : demande des exemples concrets pour les exigences de l'offre que le parcours ne couvre pas encore.`,
        `Ne pose pas de question académique sur une page de garde, un stage obligatoire ou un sommaire.`,
        `Après au moins trois réponses utiles, propose une synthèse courte et invite à générer le CV.`,
      ],
      lettre_motivation: [
        `Collecte l'opportunité visée, l'entreprise, le contexte de candidature, les motivations, les expériences pertinentes et la disponibilité.`,
        `Si une offre est fournie, ne redemande ni le poste ni l'entreprise : demande pourquoi cette entreprise et quelles expériences du parcours répondent à ses exigences.`,
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
      `Tu prépares la rédaction du document (${documentType}) d'un étudiant en lui posant des questions courtes.`,
      `Ce qu'il te répond servira de matière au texte : plus ses réponses sont concrètes (dates, chiffres, noms d'outils, exemples vécus), plus le document sera le sien.`,
      '',
      `DIRECTIVES :`,
      `- Pose UNE SEULE question claire à la fois.`,
      `- Utilise les informations de profil déjà connues sans les redemander inutilement : ${JSON.stringify(profileContext)}.`,
      ...(scenarioDirectives[documentType] ?? scenarioDirectives.blank).map((directive) => `- ${directive}`),
      `- Tutoie l'étudiant, reste simple et direct. Pas de compliments ni de formules d'enthousiasme.`,
      `- Si une réponse reste vague (« j'ai fait plusieurs tâches »), demande un exemple précis avant de passer à la suite.`,
      `- Ne fabrique aucune information personnelle, expérience, compétence ou entreprise.`,
      ...(careerContext ? ['', careerContext] : []),
    ].join('\n');

    const formattedMessages = messages
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }))
      .filter((m) => m.content.trim().length > 0);
    // Opening turn (after an import or an offer) the assistant speaks first; the
    // models want a user turn before it, so the opening request stays in front.
    if (formattedMessages[0]?.role !== 'user') {
      formattedMessages.unshift({
        role: 'user',
        content: careerContext
          ? 'Voici ce que tu sais déjà de moi. Résume-le en deux phrases, dis-moi ce qui manque, puis pose ta première question.'
          : 'Commence par ta première question.',
      });
    }

    if (!apiKey) {
      return withCors(
        NextResponse.json({
          reply: documentType === 'memoire'
            ? `Commençons par le type de mémoire : s'agit-il d'un mémoire académique de recherche ou d'un mémoire professionnel/projet ?`
            : `Quel est le sujet de ton ${documentType}, et quels sont les deux ou trois points que tu veux absolument y mettre ?`,
        }),
        request,
      );
    }

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = isCareer ? CV_MODELS : Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

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
              ...formattedMessages,
            ],
            temperature: 0.6,
            max_tokens: 800,
            ...modelRequestOptions(model),
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
