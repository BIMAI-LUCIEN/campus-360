import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

import { allExams } from './exams_data.mjs';
import { buildExamPdf } from './generate_authentic_cameroon_exams.mjs';

const require = createRequire(import.meta.url);
const pg = require('../mobile-api/node_modules/pg');
const { Pool } = pg;

const cloudName = 'dngtng7d4';
const apiKey = '477236452447892';
const apiSecret = 'VPm-MMHKLgEy1aZUyPHpITD6T7k';

let dbUrl = '';
for (const envFile of ['mobile-api/.env.local', 'mobile-api/.env', '.env.local', '.env']) {
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf8').match(/DATABASE_URL=([^\r\n]+)/);
    if (match) { dbUrl = match[1].replace(/['"]/g, '').trim(); break; }
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL introuvable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function uploadPdfBufferToCloudinary(pdfBuffer, publicId) {
  const base64Data = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = 'campus-360/annales';

  const params = {
    folder,
    public_id: publicId,
    timestamp: timestamp.toString(),
    overwrite: 'true',
    invalidate: 'true',
  };

  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map((key) => `${key}=${params[key]}`).join('&') + apiSecret;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  const formData = new URLSearchParams();
  formData.append('file', base64Data);
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  for (const [k, v] of Object.entries(params)) {
    formData.append(k, v);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  const pdfUrl = data.secure_url;
  const previewImgUrl = pdfUrl.replace('/image/upload/', '/image/upload/pg_1/').replace(/\.pdf$/i, '.jpg');

  return { pdfUrl, previewImgUrl, bytes: data.bytes };
}

async function main() {
  console.log(`=== Génération & Téléversement de ${allExams.length} épreuves réelles multi-pages ===\n`);

  let successCount = 0;

  for (let i = 0; i < allExams.length; i++) {
    const exam = allExams[i];
    console.log(`[${i + 1}/${allExams.length}] Génération PDF pour ${exam.id}...`);

    const { pdfBytes, pageCount } = await buildExamPdf(exam);
    const pdfBuffer = Buffer.from(pdfBytes);
    const localPath = path.join('public/annales', `${exam.id}.pdf`);
    fs.writeFileSync(localPath, pdfBuffer);
    if (fs.existsSync('dist/annales')) {
      fs.writeFileSync(path.join('dist/annales', `${exam.id}.pdf`), pdfBuffer);
    }
    console.log(`  -> Fichier local sauvegardé (${pageCount} pages, ${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    console.log(`  -> Téléversement vers Cloudinary...`);
    const { pdfUrl, previewImgUrl, bytes } = await uploadPdfBufferToCloudinary(pdfBuffer, exam.id);
    console.log(`  -> URL Cloudinary PDF : ${pdfUrl}`);
    console.log(`  -> URL Aperçu Page 1 : ${previewImgUrl}`);

    // Update in database
    await pool.query(
      `UPDATE public.documents
       SET file_path = $1,
           preview_path = $2,
           page_count = $3,
           file_size = $4,
           status = 'published',
           always_free = true,
           price_coins = 0,
           updated_at = NOW()
       WHERE id = $5`,
      [pdfUrl, previewImgUrl, pageCount, `${(pdfBuffer.length / 1024).toFixed(0)} KB`, exam.id]
    );
    console.log(`  -> Base de données PostgreSQL mise à jour avec succès.\n`);
    successCount++;
  }

  console.log(`\n========================================`);
  console.log(`RÉSULTAT GLOBAL : ${successCount}/${allExams.length} épreuves réelles générées, uploadées sur Cloudinary et synchronisées en DB !`);
  console.log(`========================================`);
}

main()
  .catch((err) => {
    console.error('Erreur critique :', err);
    process.exit(1);
  })
  .finally(() => pool.end());
