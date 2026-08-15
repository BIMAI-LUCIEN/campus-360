import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError, withCors } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const IA_CREDITS_PER_GENERATION = 5;

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

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR', 'BLOCKQUOTE',
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html.trim();
};

const buildCvPrompt = (formData: Record<string, any>): string => {
  const {
    fullName = '',
    university = '',
    faculty = '',
    level = '',
    targetPosition = '',
    skills = [],
    languages = [],
    experiences = [],
    phone = '',
    email = '',
  } = formData;

  const skillsStr = Array.isArray(skills) ? skills.join(', ') : (skills || '');
  const languagesStr = Array.isArray(languages) ? languages.join(', ') : (languages || '');

  let expSection = '';
  if (Array.isArray(experiences) && experiences.length > 0) {
    const expLines = experiences
      .map((e: string) => {
        if (typeof e !== 'string') return '';
        const parts = e.split('|');
        const [company = '', position = '', duration = ''] = parts;
        if (!company) return '';
        return `<p><strong>${position || 'Poste'}</strong> — ${company}${duration ? ` (${duration})` : ''}</p>`;
      })
      .join('');
    expSection = expLines ? `<h2>Expériences professionnelles</h2>${expLines}` : '';
  }

  return `<h1>${fullName || 'Nom du candidat'}</h1>
<p>${[targetPosition, university, faculty, level].filter(Boolean).join(' · ')}</p>
${phone || email ? `<p>${[phone, email].filter(Boolean).join(' · ')}</p>` : ''}

<h2>Profil professionnel</h2>
<p>Étudiant(e) motivé(e) et dynamique en ${faculty || 'formation supérieure'}, actuellement en ${level || 'cursus universitaire'}, visant le poste de ${targetPosition || 'débutant'}. Rigoureux(se), autonome et passionné(e).</p>

<h2>Compétences clés</h2>
<p>${skillsStr || 'Compétences techniques et relationnelles'}</p>

<h2>Langues</h2>
<p>${languagesStr || 'Français (Langue de travail)'}</p>

${expSection}

<h2>Formation académique</h2>
<p><strong>${university || 'Université'}</strong> — ${faculty || 'Filière'} — ${level || 'Niveau d\'études'}</p>`;
};

const buildLettrePrompt = (formData: Record<string, any>): string => {
  const {
    fullName = '',
    university = '',
    faculty = '',
    level = '',
    targetPosition = '',
    company = '',
    sector = '',
    motivation = '',
    email = '',
    phone = '',
  } = formData;

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<p style="text-align: right;">${today}</p>
<p><strong>${fullName || '[Nom de l\'étudiant]'}</strong><br/>${phone ? `${phone} · ` : ''}${email || '[Email]'}</p>
<p><strong>À l'attention de la Direction du Recrutement</strong><br/>${company || '[Nom de l\'entreprise]'}<br/>${sector || 'Secteur d\'activité'}</p>

<p><strong>Objet : Candidature spontanée / Réponse pour le poste de ${targetPosition || '[Intitulé du Poste]'}</strong></p>

<p>Madame, Monsieur,</p>
<p>Actuellement étudiant(e) en ${level || 'formation universitaire'} à ${university || '[Université / Établissement]'} en ${faculty || '[Filière / Spécialité]'}, je me permets de vous soumettre ma candidature pour le poste de ${targetPosition || '[Intitulé du Poste]'}.</p>
${motivation ? `<p>${motivation}</p>` : '<p>Votre structure se distingue par son dynamisme et son excellence dans son domaine d\'activité. Intégrer vos équipes représente pour moi une opportunité unique d\'apporter mon énergie, ma rigueur méthodologique et ma motivation sans faille.</p>'}
<p>Au cours de mon parcours, j'ai su développer une grande capacité d'apprentissage, un esprit d'équipe prononcé et un sens aigu de la responsabilité. Je suis convaincu(e) de pouvoir être rapidement opérationnel(le) et de contribuer positivement aux objectifs de vos projets.</p>
<p>Je me tiens à votre entière disposition pour convenir d'un entretien afin d'échanger plus en détail sur l'adéquation de mon profil avec vos attentes.</p>
<p>Dans cette attente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations les plus distinguées.</p>
<br/>
<p><strong>${fullName || '[Nom et Prénom]'}</strong></p>`;
};

const generateSchema = z.object({
  type: z.enum(['cv', 'lettre_motivation']),
  formData: z.record(z.string(), z.any()),
  documentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: "Données invalides." }, { status: 400 }), request);
    }

    const { type, formData, documentId } = parsed.data;

    let remainingCredits = 45;

    // Database wallet handling
    if (user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          await client.query('begin');
          const walletRes = await client.query(
            'select id, ia_credits from public.app_wallets where user_id = $1 for update',
            [user.id],
          );
          let wallet = walletRes.rows[0];

          if (!wallet) {
            const newWallet = await client.query(
              'insert into public.app_wallets (user_id, ia_credits, balance_coins) values ($1, 50, 0) returning id, ia_credits',
              [user.id],
            );
            wallet = newWallet.rows[0];
          }

          if (wallet.ia_credits < IA_CREDITS_PER_GENERATION) {
            await client.query(
              'update public.app_wallets set ia_credits = 20, updated_at = now() where user_id = $1',
              [user.id],
            );
            wallet.ia_credits = 20;
          }

          await client.query(
            'update public.app_wallets set ia_credits = greatest(0, ia_credits - $1), updated_at = now() where user_id = $2',
            [IA_CREDITS_PER_GENERATION, user.id],
          );
          remainingCredits = Math.max(0, wallet.ia_credits - IA_CREDITS_PER_GENERATION);

          await client.query(
            `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
             values ($1, 'purchase', 0, 'ia_document_generate_${type}', 'success')`,
            [user.id],
          );

          await client.query('commit');
        } catch (dbErr) {
          await client.query('rollback').catch(() => {});
          console.warn('[AI Generate] Wallet error:', dbErr);
        } finally {
          client.release();
        }
      } catch (poolErr) {
        console.warn('[AI Generate] Pool error:', poolErr);
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    let systemPrompt: string;
    let userPrompt: string;

    if (type === 'cv') {
      systemPrompt = [
        `Tu es un Rédacteur Professionnel de CV (Curriculum Vitae) d'Élite en français.`,
        `Tu génères un CV moderne, percutant et très soigné.`,
        `Règles de rédaction :`,
        `- Valorise les compétences et parcours académiques avec des verbes d'action.`,
        `- Structure avec clarté : Titre / En-tête, Profil Professionnel, Compétences Clés, Expériences Professionnelles, Formation, Langues.`,
        `- Utilise exclusivement les balises HTML TipTap : <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <br>.`,
        `- Pas de <html>, <body>, <head>, ni de code markdown (\`\`\`html). Retourne directement le HTML propre.`,
      ].join('\n');

      const userData = buildCvPrompt(formData);
      userPrompt = `Rédige un CV hautement professionnel à partir des informations suivantes :\n\n${userData}`;
    } else {
      systemPrompt = [
        `Tu es un Expert en Recrutement et Rédacteur Professionnel de Lettres de Motivation en français.`,
        `Tu rédiges des lettres de motivation percutantes, élégantes, convaincantes et parfaitement structurées.`,
        `Règles de rédaction :`,
        `- Structure exemplaire : Date, Destinataire, Objet, Salutation, 3 paragraphes captivants (Entreprise, Candidat, Collaboration), Formule de politesse et Signature.`,
        `- Utilise exclusivement les balises HTML TipTap : <h1>, <h2>, <p>, <strong>, <em>, <br>.`,
        `- Pas de <html>, <body>, <head>, ni de code markdown (\`\`\`html). Retourne directement le HTML propre.`,
      ].join('\n');

      const userData = buildLettrePrompt(formData);
      userPrompt = `Rédige une lettre de motivation convaincante et formelle à partir de ces informations :\n\n${userData}`;
    }

    if (!apiKey) {
      const fallbackHtml = type === 'cv' ? buildCvPrompt(formData) : buildLettrePrompt(formData);
      return withCors(
        NextResponse.json({
          html: fallbackHtml,
          remainingCredits,
          creditsUsed: IA_CREDITS_PER_GENERATION,
        }),
        request,
      );
    }

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    let safeHtml = '';
    for (const model of modelsToTry) {
      try {
        const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
            'X-Title': 'Campus 360 Document Generator',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 2500,
          }),
        });

        if (!openrouterRes.ok) {
          console.warn(`[AI Generate] Model ${model} returned status: ${openrouterRes.status}`);
          continue;
        }

        const aiData = (await openrouterRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = aiData.choices?.[0]?.message?.content ?? '';
        const cleaned = sanitizeHtmlFragment(raw);
        if (cleaned) {
          safeHtml = cleaned;
          break;
        }
      } catch (err) {
        console.warn(`[AI Generate] Model ${model} error:`, err);
      }
    }

    if (!safeHtml) {
      safeHtml = type === 'cv' ? buildCvPrompt(formData) : buildLettrePrompt(formData);
    }

    // If documentId provided, insert section
    if (documentId && user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          const sectionTitle = type === 'cv' ? 'CV généré' : 'Lettre de motivation';
          await client.query(
            `insert into public.app_document_sections (document_id, title, content_html, sort_order, is_system)
             values ($1, $2, $3, 0, false)
             on conflict do nothing`,
            [documentId, sectionTitle, safeHtml],
          );
        } finally {
          client.release();
        }
      } catch (insertErr) {
        console.warn('[AI Generate] Section insert error:', insertErr);
      }
    }

    return withCors(
      NextResponse.json({
        html: safeHtml,
        remainingCredits,
        creditsUsed: IA_CREDITS_PER_GENERATION,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
