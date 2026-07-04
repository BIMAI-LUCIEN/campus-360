const urls = [
  'https://admin.campus360b.site',
  'https://admin.campus360b.site/admin/login',
  'https://campus-360-hi97.vercel.app',
  'https://campus-360-hi97.vercel.app/admin/login',
];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: 'manual' });
      const t = await r.text();
      console.log('---', r.status, u, '---');
      console.log(t.slice(0, 1500));
      console.log();
    } catch (e) {
      console.log('ERR', e.message, u);
    }
  }
})();