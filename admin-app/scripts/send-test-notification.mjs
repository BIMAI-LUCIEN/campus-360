import fs from 'node:fs';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('.env.local');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const emailArg = process.argv[2];
const title = process.argv[3] || 'Alerte Campus 360';
const body = process.argv[4] || 'Ceci est une notification test en temps réel ! 🚀';

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    let query = '';
    let params = [];

    if (emailArg) {
      console.log(`Recherche de tokens pour l'utilisateur: ${emailArg}`);
      query = `
        select pt.push_token, u.email, u.name from public.app_user_push_tokens pt
        join public.app_users u on u.id = pt.user_id
        where lower(u.email) = $1
      `;
      params = [emailArg.toLowerCase().trim()];
    } else {
      console.log('Aucun email fourni. Recherche des derniers tokens enregistrés...');
      query = `
        select pt.push_token, u.email, u.name from public.app_user_push_tokens pt
        join public.app_users u on u.id = pt.user_id
        order by pt.created_at desc limit 5
      `;
    }

    const res = await client.query(query, params);
    if (res.rows.length === 0) {
      console.log('Aucun token de notification trouvé dans la base de données.');
      process.exit(0);
    }

    console.log(`Trouvé ${res.rows.length} token(s). Envoi de la notification...`);

    const messages = res.rows.map((row) => ({
      to: row.push_token,
      sound: 'default',
      title: title,
      body: body,
      data: { test: true, sentAt: new Date().toISOString() },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erreur Expo Push API: ${response.status} - ${text}`);
    }

    const result = await response.json();
    console.log('Réponse Expo:', JSON.stringify(result, null, 2));
    console.log('Notification envoyée avec succès aux destinataires suivants:');
    res.rows.forEach((row) => console.log(`- ${row.name} (${row.email})`));

  } catch (err) {
    console.error('Erreur durant l\'envoi du test:', err);
  } finally {
    await client.end();
  }
}

run();
