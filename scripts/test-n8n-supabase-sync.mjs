const N8N_URL = 'https://n8n.blackcompany.site';
const SUPABASE_URL = 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsendvcXFua3Z4bmRtdG56ZHNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTczMzQ4NiwiZXhwIjoyMDk3MzA5NDg2fQ.M_C0q0S-GwVXIAaVsvV2-LpJ1K6T29QkEL49zKreSrQ';

async function checkStudentInSupabase(phone) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stage_students?phone_whatsapp=eq.${phone}&select=id,full_name,phone_whatsapp,whatsapp_connected,whatsapp_instance,whatsapp_linked_at`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });
  const data = await res.json();
  return data[0];
}

async function runTests() {
  console.log('🧪 1. Checking initial Supabase state for 690273500...');
  const initial = await checkStudentInSupabase('690273500');
  console.log('Initial student state:', initial);

  // 1. Simulate Evolution API Webhook "connection.update" -> state: "open"
  console.log('\n🧪 2. Sending simulation webhook: evolution-connection-update (state = open)...');
  const whRes = await fetch(`${N8N_URL}/webhook/evolution-connection-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'connection.update',
      instance: 'student-237690273500',
      data: {
        instance: 'student-237690273500',
        state: 'open',
        statusReason: 200
      },
      sender: '237690273500@s.whatsapp.net'
    })
  });
  console.log('Webhook status:', whRes.status);

  // Allow 2 seconds for N8N node to execute Supabase PATCH
  await new Promise(r => setTimeout(r, 2000));

  const afterOpen = await checkStudentInSupabase('690273500');
  console.log('Supabase student state after OPEN event:', afterOpen);
  if (afterOpen.whatsapp_connected === true && afterOpen.whatsapp_instance === 'student-237690273500') {
    console.log('✅ PASS: Supabase correctly synced to whatsapp_connected = true !');
  } else {
    console.warn('⚠️ WhatsApp not true in Supabase, verify N8N execution');
  }

  // 2. Simulate Evolution API Webhook "connection.update" -> state: "close"
  console.log('\n🧪 3. Sending simulation webhook: evolution-connection-update (state = close)...');
  const whCloseRes = await fetch(`${N8N_URL}/webhook/evolution-connection-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'connection.update',
      instance: 'student-237690273500',
      data: {
        instance: 'student-237690273500',
        state: 'close',
        statusReason: 401
      },
      sender: '237690273500@s.whatsapp.net'
    })
  });
  console.log('Webhook status:', whCloseRes.status);

  await new Promise(r => setTimeout(r, 2000));

  const afterClose = await checkStudentInSupabase('690273500');
  console.log('Supabase student state after CLOSE event:', afterClose);
  if (afterClose.whatsapp_connected === false) {
    console.log('✅ PASS: Supabase correctly synced to whatsapp_connected = false !');
  } else {
    console.warn('⚠️ WhatsApp not false in Supabase');
  }

  // 3. Test Session Webhook "campus360-whatsapp-session" with action = 'status'
  console.log('\n🧪 4. Calling Session Webhook: campus360-whatsapp-session (action = status)...');
  const sessionStatusRes = await fetch(`${N8N_URL}/webhook/campus360-whatsapp-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '690273500',
      action: 'status'
    })
  });
  console.log('Session status HTTP:', sessionStatusRes.status);
  const statusBody = await sessionStatusRes.json();
  console.log('Status body from N8N:', statusBody);

  // 4. Test Session Webhook "campus360-whatsapp-session" with action = 'disconnect'
  console.log('\n🧪 5. Calling Session Webhook: campus360-whatsapp-session (action = disconnect)...');
  const sessionDiscRes = await fetch(`${N8N_URL}/webhook/campus360-whatsapp-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '690273500',
      action: 'disconnect'
    })
  });
  console.log('Disconnect HTTP:', sessionDiscRes.status);
  const discBody = await sessionDiscRes.json();
  console.log('Disconnect body from N8N:', discBody);

  const afterDisc = await checkStudentInSupabase('690273500');
  console.log('Supabase student state after Disconnect action:', afterDisc);
  if (afterDisc.whatsapp_connected === false) {
    console.log('✅ PASS: Supabase student disconnect confirmed!');
  }
}

runTests().catch(console.error);

