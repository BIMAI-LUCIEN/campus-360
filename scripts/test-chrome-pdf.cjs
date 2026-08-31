const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpHtml = path.join(os.tmpdir(), 'test_page.html');
const tmpPdf = path.join(os.tmpdir(), 'test_page.pdf');

fs.writeFileSync(tmpHtml, '<html><body><h1>Hello Academic University</h1><p>Testing PDF generation</p></body></html>', 'utf8');

const userProfileDir = path.join(os.tmpdir(), `chrome_pdf_prof_${Date.now()}`);
fs.mkdirSync(userProfileDir, { recursive: true });

const cmd = `"${chrome}" --headless --disable-gpu --no-sandbox --disable-software-rasterizer --user-data-dir="${userProfileDir}" --no-pdf-header-footer --print-to-pdf="${tmpPdf}" "${tmpHtml}"`;
console.log('Running:', cmd);

try {
  execSync(cmd, { stdio: 'inherit', timeout: 20000 });
  console.log('PDF Generated! Size:', fs.statSync(tmpPdf).size, 'bytes');
} catch (e) {
  console.error('Failed:', e);
} finally {
  try { fs.rmSync(userProfileDir, { recursive: true, force: true }); } catch {}
}
