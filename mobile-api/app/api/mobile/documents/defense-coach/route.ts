import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileErrorResponse, requireMobileUser, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const requestSchema = z.object({
  title: z.string().trim().min(3).max(300),
  field: z.string().trim().default('Informatique / Général'),
  company: z.string().trim().optional(),
  level: z.string().trim().default('Licence'),
  abstract: z.string().trim().optional(),
  tableOfContents: z.array(z.string()).optional(),
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Données de document invalides.', 400);
    }

    const { title, field, company, level, abstract, tableOfContents } = parsed.data;

    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json({
        success: true,
        coaching: getStaticCoaching(title, field, company, level),
      });
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

    const aiRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://campus360b.site',
        'X-Title': 'Campus 360 Defense Coach API',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const raw = aiData.choices?.[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      try {
        const parsedJson = JSON.parse(cleaned);
        return NextResponse.json({ success: true, coaching: parsedJson });
      } catch {
        // Fallback si formatage invalide
      }
    }

    return NextResponse.json({
      success: true,
      coaching: getStaticCoaching(title, field, company, level),
    });
  } catch (error) {
    return mobileErrorResponse(error);
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
        title: 'Problématique & Objectifs',
        timing_minutes: 2.5,
        bullet_points: ['Contexte initial', 'Problématique centrale', 'Objectifs du projet'],
        speaker_notes: 'La problématique essentielle à laquelle répond ce projet réside dans...',
      },
      {
        slide_number: 3,
        title: 'Solution & Résultats Mesurables',
        timing_minutes: 5.0,
        bullet_points: ['Architecture retenue', 'Déploiement et tests', 'Gains concrets'],
        speaker_notes: 'Sur le plan technique et opérationnel, nous avons mis en œuvre...',
      },
      {
        slide_number: 4,
        title: 'Conclusion & Perspectives',
        timing_minutes: 2.0,
        bullet_points: ['Bilan des compétences', 'Limites identifiées', 'Perspectives d avenir'],
        speaker_notes: 'En conclusion, ce stage m a permis de confronter les acquis théoriques aux réalités du terrain...',
      },
    ],
    jury_simulation: [
      {
        question: 'Comment avez-vous validé la fiabilité de votre méthodologie face aux contraintes du terrain ?',
        trap_context: 'Le jury veut évaluer votre sens critique et votre rigueur scientifique.',
        recommended_answer: 'Nous avons mis en place une phase pilote avec des jeux de données réels et un retour utilisateur continu...',
      },
      {
        question: 'Quelles sont les limites majeures de votre travail que vous corrigeriez avec plus de temps ?',
        trap_context: 'Teste votre honnêteté intellectuelle et votre capacité de recul.',
        recommended_answer: 'Avec davantage de temps, nous aurions approfondi le volet scalabilité et automatisation de...',
      },
    ],
    defense_tips: [
      'Respirez calmement avant d entrer en salle et posez votre voix.',
      'Maintenez un contact visuel équilibré entre tous les membres du jury.',
      'Chronométrez votre discours pour terminer 1 minute avant le temps imparti.',
    ],
  };
}
