// Génère le kit de marque Campus 360 : logos vectorisés, PNG, nuancier, polices, brandbook PDF.
// Usage : cd docs/brand/outils && npm install && npm run kit   (nécessite Microsoft Edge)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const KIT = path.join(ROOT, 'docs/brand/Campus360-Kit-Marque');
const FONTS = {
  sora: path.dirname(require.resolve('@expo-google-fonts/sora/package.json')),
  serif: path.dirname(require.resolve('@expo-google-fonts/instrument-serif/package.json')),
  inter: path.join(ROOT, 'node_modules/@expo-google-fonts/inter'),
};
const { chromium } = require(path.join(ROOT, 'node_modules/playwright-core'));

const dirs = {
  book: path.join(KIT, '01-Brandbook'),
  svg: path.join(KIT, '02-Logos/SVG-vectoriel'),
  png: path.join(KIT, '02-Logos/PNG'),
  app: path.join(KIT, '02-Logos/Icones-app'),
  colors: path.join(KIT, '03-Couleurs'),
  fonts: path.join(KIT, '04-Typographies'),
};
// On vide le dossier sans le supprimer (il peut être ouvert ailleurs, ce qui bloque rmdir).
fs.mkdirSync(KIT, { recursive: true });
for (const entry of fs.readdirSync(KIT)) fs.rmSync(path.join(KIT, entry), { recursive: true, force: true });
Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));
fs.copyFileSync(path.join(HERE, 'LISEZMOI-kit.md'), path.join(KIT, 'LISEZMOI.md'));

// ── Palette ──────────────────────────────────────────────────────────────────
const palette = {
  Violet: {
    'Violet 50': '#F5F3FF', 'Violet 100': '#EDE9FE', 'Violet 200': '#DDD6FE', 'Violet 300': '#C4B5FD',
    'Violet 400': '#A78BFA', 'Violet 500': '#8B5CF6', 'Violet 600 (marque)': '#7C3AED', 'Violet 700': '#6D28D9',
    'Violet 800': '#5B21B6', 'Violet 900': '#4C1D95', 'Violet 950': '#2E1065',
  },
  Neutres: {
    Paper: '#FFFFFF', 'Neutre 50': '#F8FAFC', 'Neutre 100': '#F1F5F9', 'Neutre 200': '#E2E8F0',
    'Neutre 300': '#CBD5E1', 'Neutre 400': '#94A3B8', 'Neutre 500': '#64748B', 'Neutre 700': '#334155', Ink: '#0F172A',
  },
  Accents: {
    'Soleil fond': '#FFF8DB', Soleil: '#FFD43B', 'Soleil texte': '#7A5600',
    'Corail fond': '#FFF0EB', Corail: '#FF7A59', 'Corail texte': '#B4401F',
    'Menthe fond': '#E7F8F1', Menthe: '#10B981', 'Menthe texte': '#047857',
  },
};

// ── Logo : monogramme et logotype ────────────────────────────────────────────
const markPaths = (c1, c2) => `
  <path d="M83.1 32.4 A36 36 0 0 0 36.9 32.4" fill="none" stroke="${c1}" stroke-width="15" opacity="0.4"/>
  <path d="M30.5 39.3 A36 36 0 0 0 34.5 85.5" fill="none" stroke="${c1}" stroke-width="15" opacity="0.7"/>
  <path d="M42 91.2 A36 36 0 0 0 87.6 83.1" fill="none" stroke="${c1}" stroke-width="15"/>
  <path d="M99.2 69.3 L99.1 92.7 L76.1 73.5 Z" fill="${c1}" stroke="${c1}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="60" cy="60" r="9" fill="${c2}"/>`;

const sora700 = opentype.loadSync(path.join(FONTS.sora, '700Bold/Sora_700Bold.ttf'));
const sora400 = opentype.loadSync(path.join(FONTS.sora, '400Regular/Sora_400Regular.ttf'));
const TRACKING = -0.043; // em, identique au brandbook (−1,3 px pour 30 px)

// Pose « Campus » (700) puis « 360 » (400) glyphe par glyphe, avec crénage et interlettrage.
function wordmark(x, baseline, size) {
  const parts = [];
  let cursor = x;
  for (const [font, text] of [[sora700, 'Campus'], [sora400, '360']]) {
    const glyphs = font.stringToGlyphs(text);
    const scale = size / font.unitsPerEm;
    let d = '';
    glyphs.forEach((g, i) => {
      d += g.getPath(cursor, baseline, size).toPathData(2);
      const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
      cursor += (g.advanceWidth + kern) * scale + TRACKING * size;
    });
    parts.push(d);
  }
  return { campus: parts[0], num: parts[1], width: cursor - x - TRACKING * size };
}
const capHeight = (size) => (sora700.tables.os2.sCapHeight / sora700.unitsPerEm) * size;
const xHeight = (size) => (sora700.tables.os2.sxHeight / sora700.unitsPerEm) * size;
// Ligne de base optique : le milieu entre le centre des capitales et celui des minuscules
// tombe sur le point central du monogramme (y = 60). Centrer sur les seules capitales
// fait paraître « Campus360 » trop bas, à cause des minuscules.
const opticalBaseline = (centerY, size) => centerY + (capHeight(size) + xHeight(size)) / 4;
// Bords visibles du monogramme dans sa boîte 120 × 120
const MARK = { left: 16.5, right: 101.5, top: 16.5, bottom: 103.5 };
const MARK_GAP = 0.28; // écart monogramme ↔ texte, en largeur de monogramme

const variants = {
  couleur: { label: 'couleur (fond clair)', c1: '#7C3AED', c2: '#0F172A', t1: '#0F172A', t2: '#7C3AED' },
  'fond-sombre': { label: 'sur fond sombre (Ink)', c1: '#A78BFA', c2: '#FFFFFF', t1: '#FFFFFF', t2: '#A78BFA' },
  'fond-violet': { label: 'sur fond violet', c1: '#FFFFFF', c2: '#2E1065', t1: '#FFFFFF', t2: '#DDD6FE' },
  'mono-noir': { label: 'monochrome Ink', c1: '#0F172A', c2: '#0F172A', t1: '#0F172A', t2: '#0F172A' },
  'mono-blanc': { label: 'monochrome blanc', c1: '#FFFFFF', c2: '#FFFFFF', t1: '#FFFFFF', t2: '#FFFFFF' },
};

const svgDoc = (vb, w, h, body, title) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">\n  <title>${title}</title>${body}\n</svg>\n`;

const logos = []; // { file, svg, w, h } pour l'export PNG
const PAD = 14;

// Logotype horizontal : monogramme + texte 78 u, aligné optiquement sur le point central.
// Calculé une fois, réutilisé pour les fichiers logo, le brandbook et les flyers.
const H_SIZE = 78;
const H_TEXT_X = MARK.right + MARK_GAP * (MARK.right - MARK.left)
  - (sora700.charToGlyph('C').getBoundingBox().x1 * H_SIZE) / sora700.unitsPerEm;
const H_WM = wordmark(H_TEXT_X, opticalBaseline(60, H_SIZE), H_SIZE);
const H_WIDTH = H_TEXT_X + H_WM.width; // largeur utile depuis x = PAD
const lockupBody = (c1, c2, t1, t2) =>
  `${markPaths(c1, c2)}\n  <path d="${H_WM.campus}" fill="${t1}"/>\n  <path d="${H_WM.num}" fill="${t2}"/>`;
const LOCKUP_VIEWBOX = `${PAD} ${PAD} ${H_WIDTH.toFixed(1)} 92`;

for (const [key, v] of Object.entries(variants)) {
  // Monogramme seul (zone utile 14 → 106)
  const mono = svgDoc(`${PAD} ${PAD} 92 92`, 512, 512, markPaths(v.c1, v.c2), `Campus 360 — monogramme ${v.label}`);
  logos.push({ name: `Campus360-monogramme-${key}`, svg: mono, w: 92, h: 92 });

  const horiz = svgDoc(LOCKUP_VIEWBOX, Math.round(H_WIDTH * 4), 368, lockupBody(v.c1, v.c2, v.t1, v.t2),
    `Campus 360 — logotype horizontal ${v.label}`);
  logos.push({ name: `Campus360-logotype-horizontal-${key}`, svg: horiz, w: H_WIDTH, h: 92 });

  // Logotype vertical : monogramme centré au-dessus du texte, écart de 0,2 monogramme
  const fs2 = 56;
  const probe = wordmark(0, 0, fs2);
  const width = Math.max(probe.width, 92) + 2 * PAD;
  const cx = width / 2;
  const base = MARK.bottom + 0.2 * (MARK.right - MARK.left) + capHeight(fs2);
  const wv = wordmark(cx - probe.width / 2, base, fs2);
  const height = base + fs2 * 0.24 + PAD;
  const vert = svgDoc(`0 ${PAD} ${width.toFixed(1)} ${(height - PAD).toFixed(1)}`, Math.round(width * 4), Math.round((height - PAD) * 4),
    `\n  <g transform="translate(${(cx - 60).toFixed(2)} 0)">${markPaths(v.c1, v.c2)}\n  </g>\n  <path d="${wv.campus}" fill="${v.t1}"/>\n  <path d="${wv.num}" fill="${v.t2}"/>`,
    `Campus 360 — logotype vertical ${v.label}`);
  logos.push({ name: `Campus360-logotype-vertical-${key}`, svg: vert, w: width, h: height - PAD });
}
for (const l of logos) fs.writeFileSync(path.join(dirs.svg, `${l.name}.svg`), l.svg);

// Icônes d'application (fond blanc plein, sans forme dessinée)
const appIcon = svgDoc('0 0 1024 1024', 1024, 1024,
  `\n  <rect width="1024" height="1024" fill="#FFFFFF"/>\n  <g transform="translate(152 152) scale(6)">${markPaths('#7C3AED', '#0F172A')}\n  </g>`,
  'Campus 360 — icône application');
// Avant-plan Android adaptatif : le monogramme tient dans la zone sûre (66 %)
const adaptive = svgDoc('0 0 1024 1024', 1024, 1024,
  `\n  <g transform="translate(240 240) scale(4.533)">${markPaths('#7C3AED', '#0F172A')}\n  </g>`,
  'Campus 360 — avant-plan icône adaptative Android');
fs.writeFileSync(path.join(dirs.app, 'Campus360-icone-app.svg'), appIcon);
fs.writeFileSync(path.join(dirs.app, 'Campus360-icone-android-avant-plan.svg'), adaptive);

// ── Couleurs ─────────────────────────────────────────────────────────────────
// Nuancier Adobe Swatch Exchange (.ase), couleurs globales RVB, rangées par groupe
function ase(groups) {
  const blocks = [];
  const name = (s) => {
    const b = Buffer.alloc(2 + (s.length + 1) * 2);
    b.writeUInt16BE(s.length + 1, 0);
    for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), 2 + i * 2);
    return b;
  };
  const block = (type, body) => {
    const h = Buffer.alloc(6);
    h.writeUInt16BE(type, 0);
    h.writeUInt32BE(body.length, 2);
    blocks.push(Buffer.concat([h, body]));
  };
  for (const [group, colors] of Object.entries(groups)) {
    block(0xc001, name(`Campus 360 — ${group}`));
    for (const [n, hex] of Object.entries(colors)) {
      const c = Buffer.alloc(4 + 12 + 2);
      c.write('RGB ', 0, 'ascii');
      [1, 3, 5].forEach((i, k) => c.writeFloatBE(parseInt(hex.slice(i, i + 2), 16) / 255, 4 + k * 4));
      c.writeUInt16BE(0, 16); // 0 = couleur globale
      block(0x0001, Buffer.concat([name(n), c]));
    }
    block(0xc002, Buffer.alloc(0));
  }
  const head = Buffer.alloc(12);
  head.write('ASEF', 0, 'ascii');
  head.writeUInt16BE(1, 4);
  head.writeUInt16BE(0, 6);
  head.writeUInt32BE(blocks.length, 8);
  return Buffer.concat([head, ...blocks]);
}
fs.writeFileSync(path.join(dirs.colors, 'Campus360-nuancier.ase'), ase(palette));
fs.writeFileSync(path.join(dirs.colors, 'Campus360-couleurs.json'), JSON.stringify(palette, null, 2) + '\n');

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*\)/, '').trim().replace(/\s+/g, '-');
fs.writeFileSync(path.join(dirs.colors, 'Campus360-couleurs.css'),
  `/* Campus 360 — couleurs de marque */\n:root {\n${Object.values(palette).flatMap((g) => Object.entries(g).map(([n, h]) => `  --c360-${slug(n)}: ${h};`)).join('\n')}\n}\n`);

// Planche de couleurs éditable (texte vectorisé en Sora pour s'ouvrir partout)
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' · ');
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.299 * r + 0.587 * g + 0.114 * b; };
const textPath = (font, str, x, y, size, fill) => `<path d="${font.getPath(str, x, y, size).toPathData(2)}" fill="${fill}"/>`;
let y = 120, body = textPath(sora700, 'Campus 360 — Couleurs', 80, 100, 44, '#0F172A');
for (const [group, colors] of Object.entries(palette)) {
  y += 60;
  body += textPath(sora700, group, 80, y, 26, '#0F172A');
  y += 24;
  const entries = Object.entries(colors);
  entries.forEach(([n, hex], i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const x = 80 + col * 200, yy = y + row * 230;
    const ink = lum(hex) > 0.6 ? '#0F172A' : '#FFFFFF';
    body += `\n  <rect x="${x}" y="${yy}" width="184" height="140" rx="16" fill="${hex}" stroke="#E2E8F0"/>`;
    body += textPath(sora700, n, x + 14, yy + 124, 15, ink);
    body += textPath(sora400, hex, x, yy + 170, 16, '#0F172A');
    body += textPath(sora400, `RVB ${rgb(hex)}`, x, yy + 194, 13, '#64748B');
  });
  y += Math.ceil(entries.length / 6) * 230;
}
fs.writeFileSync(path.join(dirs.colors, 'Campus360-planche-couleurs.svg'),
  svgDoc(`0 0 1360 ${y + 60}`, 1360, y + 60, `\n  <rect width="1360" height="${y + 60}" fill="#FFFFFF"/>\n  ${body}`, 'Campus 360 — planche couleurs'));

// ── Polices ──────────────────────────────────────────────────────────────────
const fontFiles = [
  [FONTS.sora, ['400Regular/Sora_400Regular.ttf', '600SemiBold/Sora_600SemiBold.ttf', '700Bold/Sora_700Bold.ttf'], 'Sora'],
  [FONTS.inter, ['400Regular/Inter_400Regular.ttf', '500Medium/Inter_500Medium.ttf', '600SemiBold/Inter_600SemiBold.ttf'], 'Inter'],
  [FONTS.serif, ['400Regular/InstrumentSerif_400Regular.ttf', '400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'], 'Instrument-Serif'],
];
for (const [dir, files, fam] of fontFiles) {
  const out = path.join(dirs.fonts, fam);
  fs.mkdirSync(out, { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(out, path.basename(f)));
  const lic = ['LICENSE_FONT', 'LICENSE'].map((l) => path.join(dir, l)).find((p) => fs.existsSync(p));
  if (lic) fs.copyFileSync(lic, path.join(out, 'LICENCE-OFL.txt'));
}

// ── Exports navigateur : PNG et brandbook PDF ────────────────────────────────
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();

async function png(svg, file, w, h) {
  await page.setViewportSize({ width: w, height: h });
  const inner = svg.replace(/<\?xml[^>]*>\n/, '').replace(/width="[\d.]+" height="[\d.]+"/, `width="${w}" height="${h}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}
for (const l of logos) {
  const H = l.name.includes('monogramme') ? 1024 : 512;
  const W = Math.round((l.w / l.h) * H);
  await png(l.svg, path.join(dirs.png, `${l.name}-${H}px.png`), W, H);
}
await png(appIcon, path.join(dirs.app, 'Campus360-icone-app-1024.png'), 1024, 1024);
await png(adaptive, path.join(dirs.app, 'Campus360-icone-android-avant-plan-1024.png'), 1024, 1024);
for (const s of [512, 192, 180, 48, 32]) {
  await png(appIcon, path.join(dirs.app, `Campus360-favicon-${s}.png`), s, s);
}

// Brandbook : copie HTML + PDF (texte et formes vectoriels, éditables dans Illustrator).
// Les polices statiques du kit remplacent Google Fonts : ses fichiers variables finiraient
// en Type 3 dans le PDF (dessinés, non modifiables comme du texte).
const face = (family, file, weight, style = 'normal') =>
  `@font-face { font-family: '${family}'; src: url('../04-Typographies/${file}') format('truetype'); font-weight: ${weight}; font-style: ${style}; }`;
const localFonts = [
  face('Sora', 'Sora/Sora_400Regular.ttf', 400), face('Sora', 'Sora/Sora_600SemiBold.ttf', 600), face('Sora', 'Sora/Sora_700Bold.ttf', 700),
  face('Inter', 'Inter/Inter_400Regular.ttf', 400), face('Inter', 'Inter/Inter_500Medium.ttf', 500), face('Inter', 'Inter/Inter_600SemiBold.ttf', 600),
  face('Instrument Serif', 'Instrument-Serif/InstrumentSerif_400Regular.ttf', 400),
  face('Instrument Serif', 'Instrument-Serif/InstrumentSerif_400Regular_Italic.ttf', 400, 'italic'),
].join('\n');
// Le brandbook source reçoit le logotype vectorisé entre ses marqueurs : même tracé que les fichiers logo.
const LK_RATIO = (H_WIDTH / 92).toFixed(4);
const lockupSymbol = `<symbol id="lockup" viewBox="${LOCKUP_VIEWBOX}">${lockupBody('var(--c1, #7C3AED)', 'var(--c2, #0F172A)', 'var(--t1, #0F172A)', 'var(--t2, #7C3AED)')}</symbol>`;
const lockupBlock = `<!-- LOGOTYPE:DEBUT (généré par outils/generer-kit.mjs, ne pas modifier à la main) -->\n  <style>:root { --lk-ratio: ${LK_RATIO}; }</style>\n  ${lockupSymbol}\n  <!-- LOGOTYPE:FIN -->`;
const SOURCE_BOOK = path.join(ROOT, 'docs/brand/brandbook.html');
const sourceBook = fs.readFileSync(SOURCE_BOOK, 'utf8');
if (!/<!-- LOGOTYPE:DEBUT[\s\S]*?<!-- LOGOTYPE:FIN -->/.test(sourceBook)) throw new Error('Marqueurs LOGOTYPE absents du brandbook');
fs.writeFileSync(SOURCE_BOOK, sourceBook.replace(/<!-- LOGOTYPE:DEBUT[\s\S]*?<!-- LOGOTYPE:FIN -->/, lockupBlock));

const bookHtml = fs.readFileSync(SOURCE_BOOK, 'utf8')
  .replace(/<link rel="preconnect"[^>]*>\n/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, `<style>\n${localFonts}\n</style>`);
if (bookHtml.includes('fonts.googleapis')) throw new Error('Google Fonts toujours présent dans le brandbook');
fs.writeFileSync(path.join(dirs.book, 'Campus360-Brandbook.html'), bookHtml);
await page.setViewportSize({ width: 1280, height: 1810 });
await page.goto('file:///' + path.join(dirs.book, 'Campus360-Brandbook.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: path.join(dirs.book, 'Campus360-Brandbook.pdf'), width: '1280px', height: '1810px', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });

// ── Flyers ───────────────────────────────────────────────────────────────────
// Imprimés en PDF vectoriel (fond perdu 3 mm, polices intégrées, modifiables dans Illustrator)
// + aperçus PNG ; formats réseaux sociaux en PNG.
const QRCode = require(path.join(ROOT, 'node_modules/qrcode'));
const SITE = 'campus360b.site';
const qrSvg = (await QRCode.toString(`https://${SITE}`, { type: 'svg', margin: 0, color: { dark: '#0F172A', light: '#FFFFFF' } }))
  .replace('<svg ', '<svg width="100%" height="100%" ');
const fontUrl = (file) => 'file:///' + path.join(dirs.fonts, file).replace(/\\/g, '/');
const flyerFonts = localFonts.replace(/url\('\.\.\/04-Typographies\/([^']+)'\)/g, (_, f) => `url('${fontUrl(f)}')`);

const audiences = {
  etudiants: {
    sticker: 'Étudiants', title: 'Ton <em>premier</em> stage commence ici.',
    sub: 'Des stages vérifiés près de chez toi, et une candidature en un geste sur WhatsApp.',
    points: ['Stages vérifiés par notre équipe', 'Candidature directe sur WhatsApp', 'Cours, TD et sujets d’examen'],
    vars: '--bg:#7C3AED; --fg:#FFFFFF; --muted:rgba(255,255,255,.82); --line:rgba(255,255,255,.22); --st-bg:#FFD43B; --st-fg:#0F172A; --dot1:rgba(255,255,255,.35); --dot2:rgba(255,255,255,.65); --dot3:#FFD43B; --c1:#FFFFFF; --c2:#2E1065; --t1:#FFFFFF; --t2:#DDD6FE;',
    orbit: { c1: '#FFFFFF', c2: '#FFFFFF', opacity: 0.16 },
  },
  emploi: {
    sticker: 'En recherche d’emploi', title: 'Remets ton parcours <em>en mouvement</em>.',
    sub: 'Des offres vérifiées, une candidature directe, et un coup de main pour refaire ton CV.',
    points: ['Offres vérifiées par notre équipe', 'Candidature directe sur WhatsApp', 'CV et lettre avec l’aide de l’IA'],
    vars: '--bg:#FFF0EB; --fg:#0F172A; --muted:#334155; --line:rgba(15,23,42,.14); --st-bg:#FF7A59; --st-fg:#0F172A; --dot1:#FFC9B8; --dot2:#FF9F85; --dot3:#FF7A59; --c1:#7C3AED; --c2:#0F172A; --t1:#0F172A; --t2:#7C3AED;',
    orbit: { c1: '#FF7A59', c2: '#FF7A59', opacity: 0.3 },
  },
};

// unit = taille de 1 % de la largeur rognée ; bleed = fond perdu (0 pour les réseaux sociaux)
function flyerHtml(a, { w, h, unit, bleed, compact }) {
  const W = `${w + 2 * bleed}${unit}`, Hh = `${h + 2 * bleed}${unit}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${flyerFonts}
@page { size: ${W} ${Hh}; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
.page { ${a.vars} --u: ${w / 100}${unit}; --b: ${bleed}${unit}; position: relative; overflow: hidden; width: ${W}; height: ${Hh};
  background: var(--bg); color: var(--fg); padding: calc(var(--b) + var(--u) * ${compact ? 6 : 8}); display: flex; flex-direction: column; justify-content: space-between; gap: calc(var(--u) * ${compact ? 3.5 : 5}); font-family: Inter, sans-serif; }
.orbit { position: absolute; width: calc(var(--u) * 92); height: calc(var(--u) * 92); right: calc(var(--b) - var(--u) * 30); top: calc(var(--b) - var(--u) * 24); }
.lk { position: relative; display: block; flex: none; align-self: flex-start; height: calc(var(--u) * ${compact ? 6 : 7}); width: auto; aspect-ratio: ${LK_RATIO}; }
.main { position: relative; display: flex; flex-direction: column; gap: calc(var(--u) * ${compact ? 3 : 4}); }
.sticker { align-self: flex-start; background: var(--st-bg); color: var(--st-fg); font: 600 calc(var(--u) * 3.4)/1 Inter, sans-serif; padding: calc(var(--u) * 1.8) calc(var(--u) * 3.2); border-radius: 999px; transform: rotate(-3deg); }
h1 { margin: 0; font: 700 calc(var(--u) * ${compact ? 8 : 10.4})/1.02 Sora, sans-serif; letter-spacing: calc(var(--u) * -0.3); }
h1 em { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: 0; }
.sub { margin: 0; color: var(--muted); font-size: calc(var(--u) * ${compact ? 3.3 : 3.7}); line-height: 1.45; max-width: calc(var(--u) * 80); }
ol { list-style: none; margin: 0; padding: 0; display: ${compact ? 'none' : 'flex'}; flex-direction: column; gap: calc(var(--u) * 2.4); }
li { display: flex; align-items: center; gap: calc(var(--u) * 2.6); font: 600 calc(var(--u) * 3.5)/1.3 Inter, sans-serif; }
li::before { content: ''; flex: none; width: calc(var(--u) * 3.2); height: calc(var(--u) * 3.2); border-radius: 50%; }
li:nth-child(1)::before { background: var(--dot1); } li:nth-child(2)::before { background: var(--dot2); } li:nth-child(3)::before { background: var(--dot3); }
.cta { position: relative; display: flex; align-items: center; justify-content: space-between; gap: calc(var(--u) * 5); padding-top: calc(var(--u) * ${compact ? 3.5 : 5}); border-top: calc(var(--u) * 0.25) solid var(--line); }
.cta b { display: block; font: 600 calc(var(--u) * 4.6)/1.15 Sora, sans-serif; letter-spacing: calc(var(--u) * -0.12); }
.cta span { display: block; margin-top: calc(var(--u) * 1.4); color: var(--muted); font-size: calc(var(--u) * 3.3); }
.qr { flex: none; width: calc(var(--u) * ${compact ? 16 : 21}); height: calc(var(--u) * ${compact ? 16 : 21}); background: #fff; border-radius: calc(var(--u) * 2.4); padding: calc(var(--u) * 2); }
</style></head><body><div class="page">
<svg class="orbit" viewBox="0 0 120 120" aria-hidden="true"><g opacity="${a.orbit.opacity}">${markPaths(a.orbit.c1, a.orbit.c2)}</g></svg>
<svg class="lk" role="img" aria-label="Campus 360" viewBox="${LOCKUP_VIEWBOX}">${lockupBody('var(--c1)', 'var(--c2)', 'var(--t1)', 'var(--t2)')}</svg>
<div class="main"><span class="sticker">${a.sticker}</span><h1>${a.title}</h1><p class="sub">${a.sub}</p>
<ol>${a.points.map((p) => `<li>${p}</li>`).join('')}</ol></div>
<div class="cta"><div><b>Télécharge l’app</b><span>Scanne le code ou va sur <span style="display:inline;white-space:nowrap;margin:0">${SITE}</span></span></div><div class="qr">${qrSvg}</div></div>
</div></body></html>`;
}

const flyerDirs = {
  print: path.join(KIT, '05-Flyers/Imprimes-PDF'),
  preview: path.join(KIT, '05-Flyers/Apercus-PNG'),
  social: path.join(KIT, '05-Flyers/Reseaux-sociaux'),
};
Object.values(flyerDirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));
const tmpHtml = path.join(HERE, '.flyer-tmp.html');
const PX_PER_MM = 96 / 25.4;
const printFormats = { A4: [210, 297], A5: [148, 210], A6: [105, 148], DL: [99, 210] };
const socialFormats = { 'carre-1080x1080': [1080, 1080, true], 'story-1080x1920': [1080, 1920, false] };

async function renderFlyer(html, { pdf, png, widthPx, heightPx, scale, trim = 0 }) {
  fs.writeFileSync(tmpHtml, html);
  const ctx = await browser.newContext({ viewport: { width: Math.ceil(widthPx), height: Math.ceil(heightPx) }, deviceScaleFactor: scale });
  const p = await ctx.newPage();
  await p.goto('file:///' + tmpHtml.replace(/\\/g, '/'));
  await p.evaluate(() => document.fonts.ready);
  // Contenu plus haut que le format : le logo sortirait du cadre
  const overflow = await p.evaluate(() => { const e = document.querySelector('.page'); return e.scrollHeight - e.clientHeight; });
  if (overflow > 1) throw new Error(`Flyer trop chargé (${Math.round(overflow)} px de trop) : ${pdf || png}`);
  if (pdf) await p.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  // L'aperçu montre le flyer après coupe : on retire le fond perdu
  if (png) await p.screenshot({ path: png, clip: { x: trim, y: trim, width: widthPx - 2 * trim, height: heightPx - 2 * trim } });
  await ctx.close();
}
for (const [aud, a] of Object.entries(audiences)) {
  for (const [fmt, [w, h]] of Object.entries(printFormats)) {
    const name = `Campus360-flyer-${fmt}-${aud}`;
    const wPx = (w + 6) * PX_PER_MM, hPx = (h + 6) * PX_PER_MM;
    await renderFlyer(flyerHtml(a, { w, h, unit: 'mm', bleed: 3 }), {
      pdf: path.join(flyerDirs.print, `${name}.pdf`), png: path.join(flyerDirs.preview, `${name}.png`),
      widthPx: wPx, heightPx: hPx, scale: 1200 / wPx, trim: 3 * PX_PER_MM,
    });
  }
  for (const [fmt, [w, h, compact]] of Object.entries(socialFormats)) {
    await renderFlyer(flyerHtml(a, { w, h, unit: 'px', bleed: 0, compact }), {
      png: path.join(flyerDirs.social, `Campus360-${fmt}-${aud}.png`), widthPx: w, heightPx: h, scale: 1,
    });
  }
}
fs.rmSync(tmpHtml, { force: true });
await browser.close();

console.log('Kit généré :', KIT);
