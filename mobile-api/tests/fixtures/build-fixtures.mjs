// Regenerates the binary fixtures used by extraction tests.
// Usage (from mobile-api/): node tests/fixtures/build-fixtures.mjs
import fs from 'node:fs';
import path from 'node:path';
import { Document, Packer, Paragraph } from 'docx';

const dir = path.resolve('tests/fixtures');

// Minimal valid 3-page PDF with one line of Helvetica text per page.
const buildPdf = (lines) => {
  const objects = [];
  const pageIds = lines.map((_, i) => 4 + i * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${lines.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  lines.forEach((line, i) => {
    const pageId = pageIds[i];
    const stream = `BT /F1 14 Tf 72 720 Td (${line}) Tj ET`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(out);
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

fs.writeFileSync(
  path.join(dir, 'source-3-pages.pdf'),
  buildPdf([
    'Introduction du rapport de stage chez Alpha Telecom.',
    'Le chiffre d affaires de Alpha Telecom atteint 42 milliards.',
    'Conclusion et perspectives du stagiaire.',
  ]),
);

const docx = new Document({
  sections: [{ children: [
    new Paragraph('Rapport de stage : présentation de la société Beta Logistique.'),
    new Paragraph('La flotte compte 120 camions frigorifiques.'),
  ] }],
});
fs.writeFileSync(path.join(dir, 'source.docx'), await Packer.toBuffer(docx));

fs.writeFileSync(path.join(dir, 'source.txt'), 'Notes de terrain : le tuteur de stage est Madame Ngono, service qualité.\n', 'utf8');
console.log('fixtures written to', dir);
