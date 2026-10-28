import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileErrorResponse, requireMobileUser, MobileApiError, withCors } from '@/lib/mobile-access';
import { enforceAiQuota } from '@/lib/ai-quota';
import { callLlm, isLlmConfigured } from '@/lib/llm';

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

// Scraped reports often lack a field, company or level: null is accepted like a missing value.
const requestSchema = z.object({
  title: z.string().trim().min(3).max(300),
  field: z.string().trim().nullish().transform((v) => v || 'Informatique / Général'),
  company: z.string().trim().nullish().transform((v) => v || undefined),
  level: z.string().trim().nullish().transform((v) => v || 'Licence'),
  abstract: z.string().trim().max(4000).nullish().transform((v) => v || undefined),
  tableOfContents: z.array(z.string().max(300)).max(40).nullish().transform((v) => v ?? undefined),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);

    await enforceAiQuota(request, { userId: access.user.id, route: 'defense-coach' });

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Données de document invalides.', 400);
    }

    const { title, field, company, level, abstract, tableOfContents } = parsed.data;

    if (!isLlmConfigured()) {
      throw new MobileApiError('Coach indisponible pour le moment.', 503);
    }

    const prompt = `
Tu es l'Agent Coach IA de Soutenance Académique de Campus 360 (Cameroun & Afrique Francophone).
Travail de l'étudiant :
Titre : ${title}
Filière : ${field}
Niveau : ${level}
Entreprise : ${company || 'Entreprise'}
Résumé : ${abstract || 'Rapport de stage académique'}
Sommaire : ${(tableOfContents || []).join(', ')}

Génère en JSON strict sans balises markdown :
{
  "presentation_plan": [
    {
      "slide_number": 1,
      "title": "Titre",
      "timing_minutes": 2.0,
      "bullet_points": ["point 1", "point 2"],
      "speaker_notes": "Ce que l'étudiant doit dire au jury..."
    }
  ],
  "jury_simulation": [
    {
      "question": "Question piège du jury",
      "trap_context": "Ce que le jury cherche à vérifier",
      "recommended_answer": "La réponse idéale pour obtenir 18/20"
    }
  ],
  "defense_tips": [
    "Conseil 1", "Conseil 2"
  ]
}
`;

    const raw = await callLlm([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      maxTokens: 2500,
      title: 'Campus 360 Defense Coach API',
    });

    if (raw) {
      const cleaned = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      try {
        const parsedJson = JSON.parse(cleaned);
        return withCors(NextResponse.json({ success: true, coaching: parsedJson }), request);
      } catch {
        // Fallback si formatage invalide
      }
    }

    return withCors(
      NextResponse.json({
        success: true,
        coaching: getStaticCoaching(title, field, company, level),
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}

function getStaticCoaching(title: string, field: string, company?: string, level?: string) {
  return {
    presentation_plan: [
      {
        slide_number: 1,
        title: 'Page de Garde & Introduction',
        timing_minutes: 1.5,
        bullet_points: [title, `Entreprise : ${company || 'Accueil'}`, `Filière : ${field}`],
        speaker_notes: "Monsieur le Président du jury, chers membres du jury, bonjour. J'ai le privilège de vous présenter mes travaux...",
      },
      {
        slide_number: 2,
        title: 'Problématique & Contexte',
        timing_minutes: 2.5,
        bullet_points: ['Contexte organisationnel', 'Problème identifié', 'Objectif fixé'],
        speaker_notes: "Le problème central de mon intervention réside dans l'optimisation des processus...",
      },
      {
        slide_number: 3,
        title: 'Méthodologie & Travail Réalisé',
        timing_minutes: 3.5,
        bullet_points: ['Démarche adoptée', 'Outils & technologies', 'Livrables'],
        speaker_notes: 'Pour répondre à ce défi, la méthodologie mise en place comprend trois phases clés...',
      },
      {
        slide_number: 4,
        title: 'Résultats & Impact',
        timing_minutes: 2.0,
        bullet_points: ['Résultats mesurables', 'Bénéfices entreprise', 'Limites'],
        speaker_notes: "Les résultats obtenus attestent de l'efficacité de la solution...",
      },
      {
        slide_number: 5,
        title: 'Conclusion & Perspectives',
        timing_minutes: 1.5,
        bullet_points: ['Apports professionnels', 'Perspectives d’évolution', 'Remerciements'],
        speaker_notes: "Ce stage a consolidé mes compétences techniques et humaines. Je vous remercie pour votre attention et suis prêt pour vos questions.",
      },
    ],
    jury_simulation: [
      {
        question: "Quelle a été votre valeur ajoutée personnelle réelle dans ce projet, par rapport au travail de l'équipe ?",
        trap_context: "Le jury vérifie que l'étudiant n'a pas simplement regardé ou cosigné le travail d'un tuteur.",
        recommended_answer: "J'ai personnellement pris en charge la phase d'analyse des besoins et l'implémentation du module central. Mon tuteur assurait la validation de l'architecture, mais le code et les tests étaient sous ma responsabilité directe.",
      },
      {
        question: "Si vous deviez recommencer ce projet aujourd'hui avec votre recul, que feriez-vous différemment ?",
        trap_context: 'Le jury teste la maturité réflexive et la capacité à reconnaître ses erreurs avec lucidité.',
        recommended_answer: "J'anticiperais davantage la phase de recueil des données en amont. Nous avons perdu une semaine sur l'accès aux environnements, ce qu'une préparation plus rigoureuse aurait évité.",
      },
      {
        question: "Quelles limites techniques avez-vous rencontrées et comment les justifiez-vous ?",
        trap_context: 'Le jury évalue votre maîtrise des contraintes du monde réel.',
        recommended_answer: "La contrainte majeure était le temps et la compatibilité avec l'infrastructure existante. J'ai dû faire un compromis entre exhaustivité et stabilité pour garantir la mise en production.",
      },
    ],
    defense_tips: [
      'Regardez tous les membres du jury, pas seulement le président.',
      'Ne lisez jamais vos diapositives : elles illustrent, vous expliquez.',
      'En cas de question déstabilisante, marquez 2 secondes de silence avant de répondre posément.',
      'Préparez 2 diapositives de réserve (annexes) avec des détails techniques approfondis.',
    ],
  };
}
