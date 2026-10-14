// Replaces hardcoded colors in the Expo app with design tokens from src/theme/stitch.ts.
// Only JS string literals ('#xxxxxx') and JSX attributes (color="#xxxxxx") are touched;
// template literals (embedded HTML/CSS), comments and excluded files are left as they are.
// Usage: node scripts/tokenize-colors.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const DRY = process.argv.includes('--dry');

// Same value as the token: no visual change.
const SAME = {
  '#0F172A': 'ink', '#334155': 'inkSoft', '#64748B': 'inkMuted', '#94A3B8': 'inkSubtle',
  '#FFFFFF': 'white', '#FFF': 'white', '#F8FAFC': 'background', '#F1F5F9': 'paperSoft',
  '#E2E8F0': 'glassBorder', '#CBD5E1': 'outline', '#7C3AED': 'primary', '#6D28D9': 'siennaDeep',
  '#8B5CF6': 'secondary', '#10B981': 'emerald', '#059669': 'emeraldDeep', '#EF4444': 'error',
  '#D97706': 'warning', '#F59E0B': 'warningTone',
};
// Diverging accents unified on the brand (intentional visual change).
const UNIFY = { '#4F46E5': 'primary', '#6366F1': 'primary', '#4338CA': 'siennaDeep', '#818CF8': 'secondary', '#16A34A': 'emeraldDeep' };
const FILE_SPECIFIC = { 'features/documents/DocumentImagesModal.tsx': { '#0284C7': 'primary' } };

// Theme source, PDF/HTML templates and the official CV template keep their own colors.
const EXCLUDED = new Set(['theme/stitch.ts', 'features/stages/pdfExportService.ts', 'features/stages/OfficialCvView.tsx']);

const tokenFor = (rel, hex) => {
  const key = hex.toUpperCase();
  return FILE_SPECIFIC[rel]?.[key] ?? UNIFY[key] ?? SAME[key] ?? null;
};

const transform = (rel, src) => {
  let out = '';
  let i = 0;
  let count = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    // Comments
    if (c === '/' && next === '/') { const end = src.indexOf('\n', i); const stop = end < 0 ? src.length : end; out += src.slice(i, stop); i = stop; continue; }
    if (c === '/' && next === '*') { const end = src.indexOf('*/', i + 2); const stop = end < 0 ? src.length : end + 2; out += src.slice(i, stop); i = stop; continue; }
    // Template literal: copied untouched (embedded HTML/CSS must keep raw values).
    if (c === '`') {
      let j = i + 1; let depth = 0;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (depth === 0 && src[j] === '`') break;
        if (src[j] === '$' && src[j + 1] === '{') { depth += 1; j += 2; continue; }
        if (depth > 0 && src[j] === '}') { depth -= 1; }
        j += 1;
      }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j += 1; j += 1; }
      const literal = src.slice(i + 1, j);
      const token = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(literal) ? tokenFor(rel, literal) : null;
      if (token) {
        const isJsxAttr = c === '"' && /[A-Za-z]=$/.test(out.slice(-2));
        out += isJsxAttr ? `{stitchColors.${token}}` : `stitchColors.${token}`;
        count += 1;
      } else {
        out += src.slice(i, j + 1);
      }
      i = j + 1; continue;
    }
    out += c; i += 1;
  }
  return { out, count };
};

const ensureImport = (file, src) => {
  // Imports can appear anywhere in the file (some modules import after helper code).
  if (/import\s*\{[^}]*\bstitchColors\b[^}]*\}\s*from\s*'[^']*theme\/stitch'/s.test(src)) return src;
  const rel = path.relative(path.dirname(file), path.join(ROOT, 'theme/stitch')).replace(/\\/g, '/');
  const spec = rel.startsWith('.') ? rel : `./${rel}`;
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const lastImport = [...src.matchAll(/^import [\s\S]*?from '[^']+';\s*$/gm)].pop();
  if (!lastImport) return `import { stitchColors } from '${spec}';${eol}${src}`;
  const at = lastImport.index + lastImport[0].length;
  return `${src.slice(0, at)}${eol}import { stitchColors } from '${spec}';${src.slice(at)}`;
};

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
});

let total = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (EXCLUDED.has(rel)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const { out, count } = transform(rel, src);
  if (count === 0) continue;
  total += count;
  console.log(`${String(count).padStart(4)}  ${rel}`);
  if (!DRY) fs.writeFileSync(file, ensureImport(file, out));
}
console.log(`total replacements: ${total}${DRY ? ' (dry run)' : ''}`);
