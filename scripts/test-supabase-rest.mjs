const SUPABASE_URL = 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsendvcXFua3Z4bmRtdG56ZHNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMzQ4NiwiZXhwIjoyMDk3MzA5NDg2fQ.M_C0q0S-GwVXIAaVsvV2-LpJ1K6T29QkEL49zKreSrQ';

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
