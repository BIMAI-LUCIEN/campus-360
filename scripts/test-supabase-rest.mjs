const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testOrQuery() {
  const phone9 = '690273500';
  const phone12 = '237690273500';
  const instance = 'student-237690273500';

  console.log('Testing PostgREST `or` filter with PATCH...');
  const url = `${SUPABASE_URL}/rest/v1/stage_students?or=(phone_whatsapp.eq.${phone9},phone_whatsapp.eq.${phone12},whatsapp_instance.eq.${instance})`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      whatsapp_connected: true,
      whatsapp_instance: instance,
      whatsapp_linked_at: new Date().toISOString()
    })
  });

  console.log('PATCH Status:', res.status);
  const data = await res.json();
  console.log('Result length:', data.length);
  console.log('Updated user:', data[0]?.full_name, data[0]?.whatsapp_connected);
}

testOrQuery().catch(console.error);
