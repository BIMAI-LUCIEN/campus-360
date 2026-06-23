import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv(path.join(root, '.env.local'));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in admin-app/.env.local');
}

const sourcePdf = path.join(
  process.env.USERPROFILE ?? '',
  'Downloads',
  "Idées d'applications rentables au Cameroun - Google Gemini.pdf",
);

if (!fs.existsSync(sourcePdf)) {
  throw new Error(`Missing source PDF: ${sourcePdf}`);
}

const publicDir = path.join(root, 'public', 'uploads', 'pdfs');
fs.mkdirSync(publicDir, { recursive: true });
const targetFileName = 'idees-applications-rentables-cameroun.pdf';
const targetPath = path.join(publicDir, targetFileName);
fs.copyFileSync(sourcePdf, targetPath);

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const id = 'pdf-test-idees-cameroun';
const stats = fs.statSync(targetPath);

await db.query(
  `
    insert into public.documents (
      id, title, description, university, faculty, subject, teacher, level, academic_year,
      price_coins, page_count, file_path, file_size, status, commission_rate, rating,
      sales_count, downloads_count, ai_summary, ai_tags, ai_difficulty, suggested_price_coins,
      quality_score, ai_study_plan, ai_quiz, updated_at
    )
    values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, 'published', $14, 4.8,
      0, 0, $15, $16::jsonb, 'standard', $10,
      85, $17::jsonb, $18::jsonb, now()
    )
    on conflict (id) do update
    set title = excluded.title,
        description = excluded.description,
        university = excluded.university,
        faculty = excluded.faculty,
        subject = excluded.subject,
        teacher = excluded.teacher,
        level = excluded.level,
        academic_year = excluded.academic_year,
        price_coins = excluded.price_coins,
        page_count = excluded.page_count,
        file_path = excluded.file_path,
        file_size = excluded.file_size,
        status = 'published',
        commission_rate = excluded.commission_rate,
        rating = excluded.rating,
        ai_summary = excluded.ai_summary,
        ai_tags = excluded.ai_tags,
        ai_difficulty = excluded.ai_difficulty,
        suggested_price_coins = excluded.suggested_price_coins,
        quality_score = excluded.quality_score,
        ai_study_plan = excluded.ai_study_plan,
        ai_quiz = excluded.ai_quiz,
        updated_at = now()
  `,
  [
    id,
    "Idees d'applications rentables au Cameroun",
    "Document d'analyse pour identifier des idees d'applications rentables et utiles au contexte camerounais.",
    'Universite de Douala',
    'Entrepreneuriat numerique',
    'Business digital',
    'Google Gemini',
    'Tous niveaux',
    '2025-2026',
    300,
    8,
    `admin/${targetFileName}`,
    `${Math.round(stats.size / 1024)} Ko`,
    20,
    "Ce PDF aide a brainstormer des applications rentables au Cameroun, avec des angles business, etudiants, services locaux et monetisation.",
    JSON.stringify(['business', 'applications', 'Cameroun', 'startup', 'monetisation']),
    JSON.stringify([
      'Lire les idees et regrouper par secteur.',
      'Choisir une idee simple a tester en MVP.',
      'Evaluer le cout, le public cible et le canal de paiement.',
      'Transformer la meilleure idee en backlog produit.',
    ]),
    JSON.stringify([
      {
        question: "Quel probleme local l'application doit-elle resoudre ?",
        answer: 'Un probleme frequent, douloureux et monétisable.',
      },
      {
        question: 'Comment valider une idee rapidement ?',
        answer: 'Tester un MVP simple avec un petit groupe d’utilisateurs.',
      },
    ]),
  ],
);

await db.end();

console.log(JSON.stringify({ ok: true, id, targetPath }, null, 2));
