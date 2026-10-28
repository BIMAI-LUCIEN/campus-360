import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

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

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function uploadFileToCloudinary(filePath, publicId) {
  const bytes = fs.readFileSync(filePath);
  const base64Data = `data:application/pdf;base64,${bytes.toString('base64')}`;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = 'campus-360/annales';

  const params = {
    folder,
    public_id: publicId,
    timestamp: timestamp.toString(),
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

async function run() {
  console.log('--- Upload des 18 épreuves réelles vers Cloudinary ---');

  const dir = 'public/annales';
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pdf') && f !== 'test-upload.pdf');
  console.log(`Nombre d'épreuves trouvées localement : ${files.length}`);

  let uploadedCount = 0;

  for (const file of files) {
    const examId = file.replace(/\.pdf$/i, '');
    const localPath = path.join(dir, file);
    console.log(`\n[Cloudinary] Téléversement de ${examId}...`);

    try {
      const { pdfUrl, previewImgUrl, bytes } = await uploadFileToCloudinary(localPath, examId);
      console.log(`  -> URL PDF Cloudinary : ${pdfUrl}`);
      console.log(`  -> Aperçu Couverture : ${previewImgUrl}`);

      // Update in public.documents
      await pool.query(
        `UPDATE public.documents
         SET file_path = $1,
             preview_path = $2,
             status = 'published',
             always_free = true,
             price_coins = 0,
             updated_at = NOW()
         WHERE id = $3`,
        [pdfUrl, previewImgUrl, examId]
      );
      console.log(`  -> Base de données mise à jour pour ${examId}`);
      uploadedCount++;
    } catch (e) {
      console.error(`  [ERREUR] ${examId}:`, e.message);
    }
  }

  console.log(`\nSuccès total : ${uploadedCount}/${files.length} épreuves hébergées sur Cloudinary et intégrées à l'app !`);
}

run()
  .catch(console.error)
  .finally(() => pool.end());
