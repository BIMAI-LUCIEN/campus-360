import fs from 'node:fs';
import path from 'node:path';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('admin-app/.env.local');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkStorage() {
  const listUrl = `${supabaseUrl}/storage/v1/object/list/documents`;
  console.log('Listing files in documents bucket...');
  const res = await fetch(listUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: 'admin',
      limit: 100,
    }),
  });
  
  if (res.ok) {
    const list = await res.json();
    console.log('Files in documents/admin:', list.map(item => item.name));
  } else {
    console.log('List failed:', res.status, await res.text());
  }
  
  const listPreviewsUrl = `${supabaseUrl}/storage/v1/object/list/document-previews`;
  console.log('Listing files in document-previews bucket...');
  const res2 = await fetch(listPreviewsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: 'admin',
      limit: 100,
    }),
  });
  
  if (res2.ok) {
    const list2 = await res2.json();
    console.log('Files in document-previews/admin:', list2.map(item => item.name));
  } else {
    console.log('List previews failed:', res2.status, await res2.text());
  }
}

checkStorage();
