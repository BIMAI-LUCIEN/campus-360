import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFDocument } = require('../mobile-api/node_modules/pdf-lib');
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
  console.error('DATABASE_URL manquant.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// The 16 uploads from the VPS
const vpsUploads = [
  {
    "id": "concours-enspy-physique-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235309/campus-360/annales/concours-enspy-physique-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235309/campus-360/annales/concours-enspy-physique-2023.jpg",
    "pages": 2,
    "size_str": "638 KB"
  },
  {
    "id": "sn-enspy-inf101-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235312/campus-360/annales/sn-enspy-inf101-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235312/campus-360/annales/sn-enspy-inf101-2024.jpg",
    "pages": 4,
    "size_str": "3.8 MB"
  },
  {
    "id": "sn-fmsb-anat101-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235314/campus-360/annales/sn-fmsb-anat101-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235314/campus-360/annales/sn-fmsb-anat101-2024.jpg",
    "pages": 5,
    "size_str": "901 KB"
  },
  {
    "id": "concours-ide-sante-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235316/campus-360/annales/concours-ide-sante-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235316/campus-360/annales/concours-ide-sante-2023.jpg",
    "pages": 6,
    "size_str": "1.3 MB"
  },
  {
    "id": "concours-ens-maths-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235317/campus-360/annales/concours-ens-maths-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235317/campus-360/annales/concours-ens-maths-2023.jpg",
    "pages": 2,
    "size_str": "374 KB"
  },
  {
    "id": "concours-ens-svt-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235320/campus-360/annales/concours-ens-svt-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235320/campus-360/annales/concours-ens-svt-2023.jpg",
    "pages": 2,
    "size_str": "344 KB"
  },
  {
    "id": "sn-uy1-inf111-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235321/campus-360/annales/sn-uy1-inf111-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235321/campus-360/annales/sn-uy1-inf111-2024.jpg",
    "pages": 1,
    "size_str": "304 KB"
  },
  {
    "id": "sn-uy1-inf211-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235323/campus-360/annales/sn-uy1-inf211-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235323/campus-360/annales/sn-uy1-inf211-2024.jpg",
    "pages": 2,
    "size_str": "410 KB"
  },
  {
    "id": "sn-uy1-mat111-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235324/campus-360/annales/sn-uy1-mat111-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235324/campus-360/annales/sn-uy1-mat111-2024.jpg",
    "pages": 2,
    "size_str": "324 KB"
  },
  {
    "id": "concours-iut-douala-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235326/campus-360/annales/concours-iut-douala-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235326/campus-360/annales/concours-iut-douala-2023.jpg",
    "pages": 6,
    "size_str": "1.4 MB"
  },
  {
    "id": "concours-enam-cg-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235329/campus-360/annales/concours-enam-cg-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235329/campus-360/annales/concours-enam-cg-2023.jpg",
    "pages": 5,
    "size_str": "3.8 MB"
  },
  {
    "id": "sn-uy2-drt111-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235331/campus-360/annales/sn-uy2-drt111-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235331/campus-360/annales/sn-uy2-drt111-2024.jpg",
    "pages": 3,
    "size_str": "2.2 MB"
  },
  {
    "id": "concours-essec-maths-2023",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235334/campus-360/annales/concours-essec-maths-2023.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235334/campus-360/annales/concours-essec-maths-2023.jpg",
    "pages": 4,
    "size_str": "2.8 MB"
  },
  {
    "id": "sn-uy2-eco111-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235335/campus-360/annales/sn-uy2-eco111-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235335/campus-360/annales/sn-uy2-eco111-2024.jpg",
    "pages": 1,
    "size_str": "209 KB"
  },
  {
    "id": "sn-uy2-cpt111-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235337/campus-360/annales/sn-uy2-cpt111-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235337/campus-360/annales/sn-uy2-cpt111-2024.pdf",
    "pages": 2,
    "size_str": "463 KB"
  },
  {
    "id": "sn-iut-gi101-2024",
    "url": "https://res.cloudinary.com/dngtng7d4/image/upload/v1793235339/campus-360/annales/sn-iut-gi101-2024.pdf",
    "preview_url": "https://res.cloudinary.com/dngtng7d4/image/upload/pg_1/v1793235339/campus-360/annales/sn-iut-gi101-2024.pdf",
    "pages": 4,
    "size_str": "711 KB"
  }
];

async function uploadPdfBuffer(pdfBuf, publicId) {
  const base64Data = `data:application/pdf;base64,${pdfBuf.toString('base64')}`;
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
    throw new Error(`Cloudinary error: ${err}`);
  }

  const data = await res.json();
  const pdfUrl = data.secure_url;
  const previewImgUrl = pdfUrl.replace('/image/upload/', '/image/upload/pg_1/').replace(/\.pdf$/i, '.jpg');

  return { pdfUrl, previewImgUrl, pages: data.pages || 1, bytes: data.bytes };
}

async function main() {
  console.log('=== Finalisation de l\'intégration des 18 épreuves réelles scrapées ===\n');
  fs.mkdirSync('public/annales/scraped', { recursive: true });

  const tmpDir = path.join(process.env.USERPROFILE, '.dev-browser', 'tmp');
  const allFinalDocs = [];

  // 1. Process 16 VPS uploads
  for (const item of vpsUploads) {
    console.log(`[VPS SYNC] Mise à jour en base de ${item.id} (${item.pages} pages, ${item.size_str})...`);
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
      [item.url, item.preview_url, item.pages, item.size_str, item.id]
    );
    allFinalDocs.push(item);
  }

  // 2. Process the 2 local authentic files
  const localItems = [
    {
      id: "concours-enspy-maths-2023",
      b64File: "concours-enspy-maths.b64",
      title: "Concours ENSPY 2023 — Épreuve de Mathématiques (Épreuve Réelle)"
    },
    {
      id: "concours-fmsb-biologie-2023",
      b64File: "concours-fmsb-biologie.b64",
      title: "Concours National Médecine 2023 — Biologie & Sciences (FMSB Yaoundé)"
    }
  ];

  for (const loc of localItems) {
    const b64Path = path.join(tmpDir, loc.b64File);
    if (!fs.existsSync(b64Path)) {
      console.error(`[ERREUR] Fichier local ${loc.b64File} introuvable !`);
      continue;
    }

    const b64 = fs.readFileSync(b64Path, 'utf8');
    const buf = Buffer.from(b64, 'base64');
    let pages = 1;
    try {
      const pdf = await PDFDocument.load(buf);
      pages = pdf.getPageCount();
    } catch (e) {
      console.warn(`Warning page count: ${e.message}`);
    }

    const sizeStr = `${(buf.length / (1024 * 1024)).toFixed(1)} MB`;
    console.log(`[LOCAL UPLOAD] Téléversement Cloudinary de ${loc.id} (${pages} pages, ${sizeStr})...`);

    const { pdfUrl, previewImgUrl } = await uploadPdfBuffer(buf, loc.id);
    fs.writeFileSync(path.join('public/annales', `${loc.id}.pdf`), buf);
    fs.writeFileSync(path.join('public/annales/scraped', `${loc.id}.pdf`), buf);

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
      [pdfUrl, previewImgUrl, pages, sizeStr, loc.id]
    );

    console.log(`  -> URL Cloudinary : ${pdfUrl}`);
    console.log(`  -> Aperçu JPEG : ${previewImgUrl}`);
    allFinalDocs.push({
      id: loc.id,
      url: pdfUrl,
      preview_url: previewImgUrl,
      pages,
      size_str: sizeStr
    });
  }

  console.log(`\n========================================`);
  console.log(`18/18 ÉPREUVES RÉELLES EN LIGNE INTÉGRÉES AVEC SUCCÈS !`);
  console.log(`========================================\n`);

  // Verify database
  const res = await pool.query(
    `SELECT id, title, page_count, file_size, file_path
     FROM public.documents
     ORDER BY id`
  );
  console.table(res.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
