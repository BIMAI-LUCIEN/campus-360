// Importe des PDF sous licence ouverte dans le catalogue via POST /api/pdf.
//
// Usage :
//   node scripts/import-free-pdfs.mjs --dir <dossier des PDF> --manifest <manifest.json>            (dry-run, rien n'est envoyé)
//   ADMIN_BASE_URL=https://admin.campus360b.site ADMIN_COOKIE="<cookie de session admin>" \
//     node scripts/import-free-pdfs.mjs --dir <dossier> --manifest <manifest.json> --apply
//
// Chaque PDF part gratuit (alwaysFree, 0 coin) et publié, avec la licence et l'auteur dans la description.
// Le cookie de session admin n'est jamais écrit dans le dépôt : il vient uniquement de l'environnement.

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const dir = argOf("--dir");
const manifestPath = argOf("--manifest");
const apply = args.includes("--apply");

if (!dir || !manifestPath) {
  console.error("Il faut --dir et --manifest.");
  process.exit(1);
}

const baseUrl = process.env.ADMIN_BASE_URL;
const cookie = process.env.ADMIN_COOKIE;
if (apply && (!baseUrl || !cookie)) {
  console.error("--apply demande ADMIN_BASE_URL et ADMIN_COOKIE dans l'environnement.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// Nombre de pages lu dans l'arbre /Pages du PDF (approximation suffisante pour l'affichage).
const countPages = (bytes) => {
  const text = bytes.toString("latin1");
  const matches = [...text.matchAll(/\/Type\s*\/Pages[\s\S]{0,400}?\/Count\s+(\d+)/g)];
  const counts = matches.map((m) => Number(m[1])).filter((n) => n > 0);
  return counts.length ? Math.max(...counts) : 1;
};

const describe = (item) =>
  [
    item.label + ".",
    `Licence : ${item.license}.`,
    item.author ? `Auteur : ${item.author}.` : null,
    `Source : ${item.sourceUrl}`,
  ]
    .filter(Boolean)
    .join(" ");

const results = [];
for (const item of manifest) {
  const path = join(dir, item.file);
  const bytes = readFileSync(path);
  const pageCount = countPages(bytes);
  const row = {
    file: item.file,
    title: item.label,
    license: item.license,
    pageCount,
    bytes: bytes.length,
  };

  if (!apply) {
    results.push({ ...row, status: "dry-run" });
    continue;
  }

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), basename(item.file));
  form.append("title", item.label.slice(0, 200));
  form.append("description", describe(item));
  form.append("university", "Ressources libres");
  form.append("faculty", "Ressources libres");
  form.append("subject", item.label.slice(0, 120));
  form.append("teacher", item.author ? item.author.slice(0, 120) : "Non renseigne");
  form.append("level", "Tous niveaux");
  form.append("academicYear", "2026");
  form.append("priceCoins", "0");
  form.append("pageCount", String(pageCount));
  form.append("kind", item.kind);
  form.append("alwaysFree", "true");
  form.append("status", "published");
  form.append("commissionRate", "0");

  const res = await fetch(`${baseUrl}/api/pdf`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const body = await res.text();
  results.push({ ...row, status: res.status, body: body.slice(0, 200) });
}

console.log(JSON.stringify(results, null, 2));
console.log(apply ? "Import terminé." : "Dry-run : rien n'a été envoyé. Ajoutez --apply pour importer.");
