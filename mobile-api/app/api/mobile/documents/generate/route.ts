import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { getDocumentById } from '@/lib/documents-db';
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
  formData: z.record(z.string(), z.any()).optional(),
  answers: z.record(z.string(), z.any()).optional(),
  documentId: z.string().uuid(),
  generationId: z.string().trim().min(8).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response || !access.user) return withCors(access.response!, request);
    const user = access.user;

    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: 'Données invalides.' }, { status: 400 }), request);
    }

    const { type, documentId, generationId } = parsed.data;
    const formData = parsed.data.formData || parsed.data.answers || {};
    const document = await getDocumentById(documentId, user.id);
    if (!document || document.template_type !== type) {
      return withCors(NextResponse.json({ error: 'Document introuvable.' }, { status: 404 }), request);
    }

    const sectionTitle = type === 'cv' ? 'CV généré' : 'Lettre de motivation';
    const previous = await databasePool.query(
      `select w.ia_credits, s.content_html
         from public.app_wallet_transactions tx
         join public.app_wallets w on w.user_id = tx.user_id
         left join public.app_document_sections s
           on s.document_id = $3 and lower(s.title) = lower($4)
        where tx.user_id = $1
          and tx.type = 'ai_generation'
          and tx.reference_id = $2
          and tx.status = 'success'
        limit 1`,
      [user.id, generationId, documentId, sectionTitle],
    );
    if (previous.rows[0]) {
      return withCors(
        NextResponse.json({
          html: String(previous.rows[0].content_html || ''),
          remainingCredits: Number(previous.rows[0].ia_credits ?? 0),
          creditsUsed: 0,
          idempotentReplay: true,
        }),
        request,
      );
    }

    const walletCheck = await databasePool.query(
      'select ia_credits from public.app_wallets where user_id = $1 limit 1',
      [user.id],
    );
    const availableCredits = Number(walletCheck.rows[0]?.ia_credits ?? 0);
    if (availableCredits < IA_CREDITS_PER_GENERATION) {
      return withCors(
        NextResponse.json(
          { error: 'Crédits IA insuffisants.', code: 'INSUFFICIENT_AI_CREDITS' },
          { status: 402 },
        ),
        request,
      );
    }

    const conversation = String(formData.conversation || '').trim();
    const apiKey = process.env.OPENROUTER_API_KEY;
    let systemPrompt: string;
    let userPrompt: string;

    if (type === 'cv') {
      systemPrompt = [
        `Tu es un rédacteur professionnel de CV en français.`,
        `Produis un CV moderne d'une à deux pages, factuel et compatible avec les logiciels de recrutement.`,
        `Structure attendue : identité et coordonnées, titre ciblé, profil, expériences et projets, formation, compétences, langues et certifications.`,
        `N'invente aucune expérience, compétence, date, entreprise ou certification.`,
        `Utilise uniquement les balises HTML TipTap autorisées et ne retourne aucun markdown.`,
      ].join('\n');
      userPrompt = `Rédige le CV à partir de cette conversation guidée et du profil confirmé.\n\nConversation :\n${conversation}\n\nProfil :\n${JSON.stringify(formData)}`;
    } else {
      systemPrompt = [
        `Tu es un rédacteur professionnel de lettres de motivation en français.`,
        `Produis une lettre personnalisée, convaincante et normalement limitée à une page.`,
        `Structure attendue : expéditeur, destinataire, date, objet, salutation, entreprise, candidat, collaboration, conclusion et signature.`,
        `N'invente aucune expérience, compétence, entreprise ou motivation.`,
        `Utilise uniquement les balises HTML TipTap autorisées et ne retourne aucun markdown.`,
      ].join('\n');
      userPrompt = `Rédige la lettre à partir de cette conversation guidée et du profil confirmé.\n\nConversation :\n${conversation}\n\nProfil :\n${JSON.stringify(formData)}`;
    }

    let safeHtml = '';
    if (apiKey) {
      const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
      const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

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
              temperature: 0.45,
              max_tokens: 2800,
            }),
          });
          if (!openrouterRes.ok) continue;
          const aiData = (await openrouterRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          safeHtml = sanitizeHtmlFragment(aiData.choices?.[0]?.message?.content ?? '');
          if (safeHtml) break;
        } catch (error) {
          console.warn(`[AI Generate] Model ${model} error:`, error);
        }
      }

      if (!safeHtml) {
        throw new MobileApiError('Le service IA est momentanément indisponible.', 503);
      }
    } else {
      throw new MobileApiError('Le service IA n’est pas configuré.', 503);
    }

    const client = await databasePool.connect();
    let remainingCredits = availableCredits;
    try {
      await client.query('begin');
      const walletResult = await client.query(
        'select ia_credits from public.app_wallets where user_id = $1 for update',
        [user.id],
      );
      const walletCredits = Number(walletResult.rows[0]?.ia_credits ?? 0);

      const replay = await client.query(
        `select id from public.app_wallet_transactions
          where user_id = $1 and type = 'ai_generation' and reference_id = $2 and status = 'success'
          limit 1`,
        [user.id, generationId],
      );

      if (replay.rows.length === 0) {
        if (walletCredits < IA_CREDITS_PER_GENERATION) {
          throw new MobileApiError('Crédits IA insuffisants.', 402);
        }
        remainingCredits = walletCredits - IA_CREDITS_PER_GENERATION;
        await client.query(
          'update public.app_wallets set ia_credits = $2, updated_at = now() where user_id = $1',
          [user.id, remainingCredits],
        );
        await client.query(
          `insert into public.app_wallet_transactions
             (user_id, type, amount_coins, reference_id, status)
           values ($1, 'ai_generation', 0, $2, 'success')`,
          [user.id, generationId],
        );
      } else {
        remainingCredits = walletCredits;
      }

      const updated = await client.query(
        `update public.app_document_sections
            set content_html = $3, updated_at = now()
          where id = (
            select id from public.app_document_sections
             where document_id = $1 and lower(title) = lower($2)
             order by sort_order asc
             limit 1
          )
          returning id`,
        [documentId, sectionTitle, safeHtml],
      );
      if (updated.rows.length === 0) {
        await client.query(
          `insert into public.app_document_sections
             (document_id, title, content_html, sort_order, is_system)
           values ($1, $2, $3, 0, false)`,
          [documentId, sectionTitle, safeHtml],
        );
      }
      await client.query(
        'update public.app_documents set updated_at = now() where id = $1 and user_id = $2',
        [documentId, user.id],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    } finally {
      client.release();
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
