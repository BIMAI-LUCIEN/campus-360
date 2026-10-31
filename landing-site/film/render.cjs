// Renders film/presentation.html frame by frame and builds the landing film with its soundtrack.
// Usage:
//   node film/render.cjs stills 2,8,14            -> film/out/still-<t>.jpg (layout check)
//   node film/render.cjs film                      -> public/motion/presentation.mp4 + presentation-poster.jpg
// Needs: playwright (root node_modules), ffmpeg on PATH, film/audio/music.mp3 (instrumental bed).
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve(__dirname, '../..')] }));

const FILM_DIR = __dirname;
const OUT_DIR = path.join(FILM_DIR, 'out');
const PUBLIC = path.resolve(FILM_DIR, '../public/motion');
const HTML = 'file:///' + path.join(FILM_DIR, 'presentation.html').replace(/\\/g, '/');

// Transition accents, in seconds (see the scene times in presentation.html).
const WHOOSHES = [5.9, 11.2, 16.7, 23.2, 31.7, 35.7, 39.7, 52.9];
const IMPACTS = [6.4, 48.5];

async function openFilm() {
  let browser;
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}), args: ['--allow-file-access-from-files'] });
      break;
    } catch {
      // try the next channel
    }
  }
  if (!browser) throw new Error('No Chromium-based browser available.');
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(HTML);
  await page.evaluate(() => window.filmReady);
  const { DURATION, FPS } = await page.evaluate(() => window.FILM);
  return { browser, page, DURATION, FPS };
}

async function stills(times) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await openFilm();
  for (const t of times) {
    await page.evaluate((s) => window.render(s), t);
    await page.screenshot({ path: path.join(OUT_DIR, `still-${t}.jpg`), type: 'jpeg', quality: 85 });
    console.log('still', t);
  }
  await browser.close();
}

function ffmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
    if (input) input(proc.stdin);
  });
}

// Soundtrack: the music bed, filtered-noise whooshes on every transition and a low hit on the drops.
async function soundtrack(duration) {
  const music = path.join(FILM_DIR, 'audio', 'music.mp3');
  const out = path.join(OUT_DIR, 'soundtrack.m4a');
  const inputs = ['-i', music,
    '-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.9:duration=0.7:seed=7',
    '-f', 'lavfi', '-i', 'sine=frequency=52:duration=0.9'];
  const parts = [`[0:a]atrim=0:${duration},afade=t=out:st=${duration - 1.6}:d=1.6,volume=0.9[music]`];
  // Whoosh: band-passed noise with a fast swell and a tail.
  parts.push(`[1:a]highpass=f=600,lowpass=f=5200,afade=t=in:st=0:d=0.45:curve=exp,afade=t=out:st=0.45:d=0.25,volume=0.22,asplit=${WHOOSHES.length}${WHOOSHES.map((_, i) => `[w${i}]`).join('')}`);
  WHOOSHES.forEach((s, i) => parts.push(`[w${i}]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}[wd${i}]`));
  parts.push(`[2:a]afade=t=out:st=0.05:d=0.85,volume=0.55,aformat=channel_layouts=stereo,asplit=${IMPACTS.length}${IMPACTS.map((_, i) => `[h${i}]`).join('')}`);
  IMPACTS.forEach((s, i) => parts.push(`[h${i}]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}[hd${i}]`));
  const mixIn = ['[music]', ...WHOOSHES.map((_, i) => `[wd${i}]`), ...IMPACTS.map((_, i) => `[hd${i}]`)].join('');
  parts.push(`${mixIn}amix=inputs=${1 + WHOOSHES.length + IMPACTS.length}:normalize=0:duration=first,alimiter=limit=0.95,loudnorm=I=-16:TP=-1.5:LRA=11[out]`);
  await ffmpeg([...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', out]);
  return out;
}

async function film() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page, DURATION, FPS } = await openFilm();
  const silent = path.join(OUT_DIR, 'silent.mp4');
  const total = Math.round(DURATION * FPS);
  const started = Date.now();
  await ffmpeg(
    ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', silent],
    async (stdin) => {
      for (let f = 0; f < total; f++) {
        await page.evaluate((s) => window.render(s), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
        if (f % 150 === 0) console.log(`frame ${f}/${total} (${Math.round((Date.now() - started) / 1000)} s)`);
      }
      stdin.end();
    },
  );
  // Poster: the call-to-action frame.
  await page.evaluate((s) => window.render(s), 57.5);
  await page.screenshot({ path: path.join(PUBLIC, 'presentation-poster.jpg'), type: 'jpeg', quality: 82 });
  await browser.close();

  const audio = await soundtrack(DURATION);
  const mp4 = path.join(PUBLIC, 'presentation.mp4');
  await ffmpeg(['-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slower', '-crf', '27', '-maxrate', '2200k', '-bufsize', '4400k', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', mp4]);
  console.log('done', mp4, `${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
  console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim(), 's');
}

const [mode, arg] = process.argv.slice(2);
(mode === 'stills' ? stills((arg || '2,8,14').split(',').map(Number)) : film()).catch((error) => {
  console.error(error);
  process.exit(1);
});
