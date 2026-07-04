import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const IA_CREDITS_PER_GENERATION = 5;

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  // Strip markdown code-fence wrappers.
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  // Drop any tags we don't want in TipTap.
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR',
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html.trim();
};

// ─── CV prompt builder ───────────────────────────────────────────────────────
const buildCvPrompt = (formData: Record<string, string | string[]>): string => {
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
<p>Étudiant(e) motivé(e) en ${faculty || 'informatique'}, actuellement en ${level || 'formation'}, à la recherche d'un poste de ${targetPosition || 'débutant'}.</p>

<h2>Compétences</h2>
<p>${skillsStr || 'Compétences à compléter'}</p>

<h2>Langues</h2>
<p>${languagesStr || 'Français (Langue maternelle)'}${languagesStr ? ', Anglais (conversationnel)' : ''}</p>

${expSection}

<h2>Formation</h2>
<p><strong>${university || 'Université'}</strong> — ${faculty || 'Filière'} — ${level || 'Niveau'}</p>`;
};

// ─── Lettre de motivation prompt builder ────────────────────────────────────
const buildLettrePrompt = (formData: Record<string, string | string[]>): string => {
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
  } = formData;

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<p>${today}</p>
<br>
<p><strong>${company || '[Nom de l\'entreprise]'}</strong></p>
<p>${sector || 'Secteur'}</p>
<br>
<p><strong>Objet : Candidature pour le poste de ${targetPosition || '[Poste]'}</strong></p>
<br>
<p>Madame, Monsieur,</p>
<p>Actuellement étudiant(e) en ${level || 'formation'} à ${university || '[Université]'} dans la filière ${faculty || '[Filière]'}, je suis à la recherche d'un poste de ${targetPosition || '[Poste]'} et je souhaite vous soumettre ma candidature.</p>
${motivation ? `<p>${motivation}</p>` : '<p>Votre entreprise m\'intéresse particulièrement pour [raison à compléter]. Je suis convaincu(e) que mon profil correspond aux attentes du poste.</p>'}
<p>Je me tiens à votre disposition pour un entretien au cours duquel je pourrai vous exposer plus en détail mes motivations et mon parcours.</p>
<p>Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
<br>
<p>${fullName || '[Nom]'}</p>
<p>${email || '[Email]'}</p>`;
};

const generateSchema = z.object({
  type: z.enum(['cv', 'lettre_motivation']),
  formData: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  documentId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const { type, formData, documentId } = parsed.data;

    const client = await databasePool.connect();
    try {
      await client.query('begin');

      // Check IA credits
      const walletRes = await client.query(
        'select id, ia_credits from public.app_wallets where user_id = $1 for update',
        [user.id],
      );
      const wallet = walletRes.rows[0];

      if (!wallet || wallet.ia_credits < IA_CREDITS_PER_GENERATION) {
        throw new MobileApiError(
          `Il vous faut au moins ${IA_CREDITS_PER_GENERATION} crédits IA pour générer un document. Vous avez ${wallet?.ia_credits ?? 0} crédit(s).`,
          403,
        );
      }

      // If documentId provided, verify ownership
      if (documentId) {
        const docRes = await client.query(
          'select id from public.app_documents where id = $1 and user_id = $2 limit 1',
          [documentId, user.id],
        );
        if (docRes.rows.length === 0) {
          throw new MobileApiError("Document introuvable.", 404);
        }
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

      if (!apiKey) {
        throw new MobileApiError('Service IA momentanément indisponible.', 503);
      }

      const referer = process.env.BETTER_AUTH_URL ?? 'https://campus360b.site';

      let systemPrompt: string;
      let userPrompt: string;

      if (type === 'cv') {
        systemPrompt =
          `Tu es un rédacteur professionnel de CV en français.\n` +
          `Tu génères un CV structuré, professionnel, adapté au contexte étudiant camerounais.\n` +
          `Règles strictes :\n` +
          `- Retourne UNIQUEMENT du HTML utilisant <h1>, <h2>, <p>, <strong>, <ul>, <li>, <br>.\n` +
          `- N'utilise PAS <html>, <body>, <head>, <script>, <style>.\n` +
          `- Pas de blocs markdown.\n` +
          `- Sois concis et professionnel.\n` +
          `- Pour les expériences vides, omets la section ou mets un placeholder entre crochets.\n`;

        const userData = buildCvPrompt(formData);
        userPrompt =
          `Génère un CV professionnel en HTML pour l'étudiant camerounais décrit ci-dessous.\n` +
          `IMPORTANT : Retourne uniquement le HTML, sans préambule ni explication.\n\n` +
          `${userData}`;

      } else {
        // lettre_motivation
        systemPrompt =
          `Tu es un rédacteur professionnel de lettres de motivation en français.\n` +
          `Tu génères une lettre formelle, claire, adaptée au contexte camerounais et à un poste de débutant/stagiaire.\n` +
          `Règles strictes :\n` +
          `- Retourne UNIQUEMENT du HTML utilisant <p>, <strong>, <br>, <h1>, <h2>.\n` +
          `- N'utilise PAS <html>, <body>, <head>, <script>, <style>.\n` +
          `- Pas de blocs markdown.\n` +
          `- La date doit être au format français (jour mois année).\n` +
          `- Ton courtois mais direct. 3-4 paragraphes maximum.\n`;

        const userData = buildLettrePrompt(formData);
        userPrompt =
          `Génère une lettre de motivation professionnelle en HTML pour le candidat décrit ci-dessous.\n` +
          `IMPORTANT : Retourne uniquement le HTML, sans préambule ni explication.\n\n` +
          `${userData}`;
      }

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': referer,
          'X-Title': 'Campus-Bordes Document Generator',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!openrouterRes.ok) {
        const errText = await openrouterRes.text();
        console.error('[AI Generate] OpenRouter error:', errText.slice(0, 500));
        throw new MobileApiError("Erreur de communication avec le fournisseur d'IA.", 502);
      }

      const aiData = (await openrouterRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };
      const raw = aiData.choices?.[0]?.message?.content ?? '';
      const safeHtml = sanitizeHtmlFragment(raw);

      if (!safeHtml) {
        throw new MobileApiError(
          "L'IA a renvoyé une réponse vide. Veuillez réessayer.",
          500,
        );
      }

      // Deduct credits
      await client.query(
        'update public.app_wallets set ia_credits = ia_credits - $1, updated_at = now() where user_id = $2',
        [IA_CREDITS_PER_GENERATION, user.id],
      );

      // Log usage
      await client.query(
        `insert into public.app_ia_usage_logs (user_id, tokens_used) values ($1, $2)`,
        [user.id, aiData.usage?.total_tokens ?? 500],
      );

      // Log transaction
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'purchase', 0, 'ia_document_generate_${type}', 'success')`,
        [user.id],
      );

      // If documentId provided, insert the generated content as the first section
      if (documentId) {
        const sectionTitle = type === 'cv' ? 'CV généré' : 'Lettre de motivation';
        await client.query(
          `insert into public.app_document_sections (document_id, title, content_html, sort_order, is_system)
           values ($1, $2, $3, 0, false)`,
          [documentId, sectionTitle, safeHtml],
        );
      }

      await client.query('commit');

      return NextResponse.json({
        html: safeHtml,
        remainingCredits: wallet.ia_credits - IA_CREDITS_PER_GENERATION,
        creditsUsed: IA_CREDITS_PER_GENERATION,
      });
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}
