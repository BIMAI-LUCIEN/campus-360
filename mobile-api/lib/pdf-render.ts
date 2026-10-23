import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Renders a self-contained HTML page (images inlined as data URIs) to an A4 PDF.
// Puppeteer first (non-blocking, honours @page CSS); the Chrome command line is
// only a fallback, and it runs asynchronously so it never freezes the server.

const RENDER_TIMEOUT_MS = 45_000;

const SYSTEM_BROWSERS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter((p): p is string => Boolean(p));

const firstExisting = (candidates: string[]) => candidates.find((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'];

const launchBrowser = async () => {
  const { default: puppeteer } = await import('puppeteer');
  let executablePath: string | undefined;
  try {
    const bundled = await puppeteer.executablePath();
    executablePath = fs.existsSync(bundled) ? bundled : firstExisting(SYSTEM_BROWSERS);
  } catch {
    executablePath = firstExisting(SYSTEM_BROWSERS);
  }
  return puppeteer.launch({ headless: true, executablePath, args: LAUNCH_ARGS, timeout: RENDER_TIMEOUT_MS });
};

type Browser = Awaited<ReturnType<typeof launchBrowser>>;

// A page with the HTML loaded and every network request blocked (the page is self-contained).
const offlinePage = async (browser: Browser, html: string) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url === 'about:blank') request.continue();
    else request.abort();
  });
  await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
  return page;
};

const renderWithPuppeteer = async (html: string): Promise<Buffer> => {
  const browser = await launchBrowser();
  try {
    const page = await offlinePage(browser, html);
    await page.emulateMediaType('print');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, timeout: RENDER_TIMEOUT_MS });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
};

const renderWithCli = async (html: string): Promise<Buffer> => {
  const browserPath = firstExisting(SYSTEM_BROWSERS);
  if (!browserPath) throw new Error('Aucun navigateur Chromium trouvé.');
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campus360-pdf-'));
  const htmlPath = path.join(workDir, 'document.html');
  const pdfPath = path.join(workDir, 'document.pdf');
  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    await new Promise<void>((resolve, reject) => {
      execFile(
        browserPath,
        [
          '--headless=new',
          ...LAUNCH_ARGS,
          `--user-data-dir=${path.join(workDir, 'profile')}`,
          '--no-pdf-header-footer',
          `--print-to-pdf=${pdfPath}`,
          htmlPath,
        ],
        { timeout: RENDER_TIMEOUT_MS },
        (error) => (error && !fs.existsSync(pdfPath) ? reject(error) : resolve()),
      );
    });
    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

// JPEG of the top of a page (template previews, Module 24). Puppeteer only.
export const renderHtmlToJpeg = async (html: string, width: number, height: number, quality = 70): Promise<Buffer> => {
  const browser = await launchBrowser();
  try {
    const page = await offlinePage(browser, html);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const image = await page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width, height } });
    return Buffer.from(image);
  } finally {
    await browser.close().catch(() => undefined);
  }
};

export const renderHtmlToPdf = async (html: string): Promise<Buffer> => {
  try {
    return await renderWithPuppeteer(html);
  } catch (error) {
    console.warn('[pdf-render] Puppeteer failed, falling back to the Chrome CLI:', error);
  }
  return renderWithCli(html);
};
