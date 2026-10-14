// CI guard ("ratchet") for the Clean White & Royal Violet design system.
// Counts hardcoded hex colors per file in src/ (outside the theme and the PDF/CV templates) and
// fails when a file has MORE than its recorded baseline, or when a new file introduces any.
// Lowering a count is always allowed: run with --update to record the new, lower baseline.
//   node scripts/check-hardcoded-colors.mjs           -> check (exit 1 on regression)
//   node scripts/check-hardcoded-colors.mjs --update  -> rewrite the baseline
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'scripts', 'hardcoded-colors-baseline.json');
// Allowed homes for raw colors: the token source and the printable PDF / official CV templates.
const EXCLUDED = new Set(['theme/stitch.ts', 'features/stages/pdfExportService.ts', 'features/stages/OfficialCvView.tsx']);
const HEX = /#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
});

const counts = {};
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).replace(/\\/g, '/');
  if (EXCLUDED.has(rel)) continue;
  const n = (fs.readFileSync(file, 'utf8').match(HEX) ?? []).length;
  if (n > 0) counts[rel] = n;
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE, `${JSON.stringify({ total, files: sorted }, null, 2)}\n`);
  console.log(`Baseline updated: ${total} hardcoded colors in ${Object.keys(sorted).length} files.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files : {};
const regressions = Object.entries(counts)
  .filter(([rel, n]) => n > (baseline[rel] ?? 0))
  .map(([rel, n]) => `  ${rel}: ${baseline[rel] ?? 0} -> ${n} (+${n - (baseline[rel] ?? 0)})`);

if (regressions.length > 0) {
  console.error('Hardcoded colors added (use the tokens from src/theme/stitch.ts instead):');
  console.error(regressions.join('\n'));
  process.exit(1);
}
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`OK: ${total} hardcoded colors (baseline ${baselineTotal}). No file added any.`);
if (total < baselineTotal) console.log('Tip: run with --update to lock in the lower count.');
