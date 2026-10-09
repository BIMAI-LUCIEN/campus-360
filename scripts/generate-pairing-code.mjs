const API_URL = 'https://wa.blackcompany.site';
const API_KEY = 'MigOS_Evolution_SecretKey_2026';
const PHONE = '237690273500';
const INSTANCE = 'student-237690273500';

async function generateCode() {
  console.log('1. Ensuring instance exists on Evolution API...');
  try {
    const createRes = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName: INSTANCE, qrcode: false, integration: 'WHATSAPP-BAILEYS' })
    });
    console.log('Create instance status:', createRes.status);
  } catch (err) {
    console.log('Create instance note:', err.message);
  }

  console.log('\n2. Requesting 8-digit pairing code via GET /instance/connect/' + INSTANCE + '?number=' + PHONE);
  const getUrl = `${API_URL}/instance/connect/${INSTANCE}?number=${PHONE}`;
  const res = await fetch(getUrl, {
    method: 'GET',
    headers: { 'apikey': API_KEY }
  });

  console.log('GET Connect Status:', res.status);
  const data = await res.json();
  console.log('RESPONSE:', JSON.stringify(data, null, 2));

  let rawCode = data.pairingCode || data.code || data.pairing_code || (data.instance && data.instance.pairingCode);
  if (rawCode) {
    const clean = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const formatted = clean.length === 8 ? `${clean.slice(0, 4)} - ${clean.slice(4)}` : clean;
    console.log('\n========================================');
    console.log('🎉 CODE À 8 CHIFFRES POUR ' + PHONE + ' :');
    console.log('👉 ' + formatted);
    console.log('========================================\n');
  }
}

generateCode().catch(console.error);
