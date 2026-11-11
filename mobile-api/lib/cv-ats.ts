// The "ATS" judge of the CV jury, computed in code (no AI): can a parser read
// this CV, and does it carry the offer's keywords? Deterministic, so the same
// CV always gets the same verdict. Only strict equivalents count as "another
// form" of a keyword: a related skill (Excel for "gestion") never does.

import { cvToText, printedPeriode, type OfficialCv } from './cv-schema';

export type AtsKeywordState = 'exact' | 'autre_forme' | 'absent';
export type Gravite = 'bloquant' | 'majeur' | 'mineur';

export type AtsResult = {
  verdict: 'PASSE LE FILTRE' | 'FILTRÉ';
  note: number;
  /** Share of the offer's keywords found, 0-100; null when there is no offer requirement. */
  couverture: number | null;
  motsCles: { motCle: string; etat: AtsKeywordState; trouve?: string }[];
  problemes: { gravite: Gravite; message: string }[];
};

export type AtsTemplate = 'classic' | 'prestige' | 'ingenieur' | 'etudiant' | 'ats';

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim();

// Strict equivalents only (same skill, other wording).
const EQUIVALENTS: string[][] = [
  ['pack office', 'microsoft office', 'suite office', 'ms office'],
  ['excel', 'microsoft excel', 'ms excel'],
  ['word', 'microsoft word', 'ms word'],
  ['powerpoint', 'power point', 'microsoft powerpoint'],
  ['anglais', 'english'],
  ['francais', 'french'],
  ['comptabilite', 'comptable'],
  ['comptabilite generale', 'comptabilite general'],
  ['api rest', 'apis rest', 'rest api', 'api restful'],
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['node js', 'nodejs'],
  ['react native', 'reactnative'],
  ['reseaux sociaux', 'social media', 'medias sociaux'],
  ['community management', 'community manager', 'gestion de communaute'],
  ['gestion de stock', 'gestion des stocks', 'gestion de stocks'],
  ['relation client', 'service client', 'relation clientele'],
  ['permis b', 'permis de conduire'],
  ['rapprochement bancaire', 'rapprochements bancaires'],
  ['saisie comptable', 'saisie des ecritures', 'saisie des factures'],
];

const hasPhrase = (haystack: string, needle: string): boolean => needle.length > 0 && haystack.includes(` ${needle} `);

const keywordState = (folded: string, keyword: string): { etat: AtsKeywordState; trouve?: string } => {
  const k = fold(keyword);
  if (!k) return { etat: 'absent' };
  if (hasPhrase(folded, k)) return { etat: 'exact', trouve: keyword };
  for (const group of EQUIVALENTS) {
    if (!group.some((form) => form === k || hasPhrase(` ${k} `, form))) continue;
    const other = group.find((form) => form !== k && hasPhrase(folded, form));
    if (other) return { etat: 'autre_forme', trouve: other };
  }
  // A long requirement ("Licence en comptabilité") is found when most of its words are.
  const words = k.split(' ').filter((w) => w.length >= 4);
  if (words.length >= 2) {
    const found = words.filter((w) => hasPhrase(folded, w));
    // Matched word by word: no single CV phrase to show back.
    if (found.length >= Math.ceil(words.length * 0.6)) return { etat: 'autre_forme' };
  }
  return { etat: 'absent' };
};

const LAYOUT_RISK: Record<AtsTemplate, { gravite: Gravite; message: string } | null> = {
  classic: { gravite: 'mineur', message: 'Coordonnées rangées dans un tableau : certains logiciels de tri les lisent mal.' },
  prestige: { gravite: 'majeur', message: 'Mise en page sur deux colonnes avec icônes : le texte risque d’être extrait dans le désordre.' },
  ingenieur: { gravite: 'majeur', message: 'Frise et tableau des compétences : le texte risque d’être extrait dans le désordre.' },
  etudiant: { gravite: 'majeur', message: 'Mise en page sur deux colonnes : le texte risque d’être extrait dans le désordre.' },
  ats: null,
};

const TODO = /a completer/;

/**
 * Eliminating requirements of the offer found by the jury (module 36): one the
 * CV does not show is blocking, so the ATS filters the CV out (note 4 at most).
 */
export const applyEliminatingCriteria = (
  ats: AtsResult,
  criteres: { exigence: string; present: boolean }[],
): AtsResult => {
  const missing = criteres.filter((c) => !c.present);
  if (!missing.length) return ats;
  return {
    ...ats,
    verdict: 'FILTRÉ',
    note: Math.min(ats.note, 4),
    problemes: [
      ...missing.map((c) => ({ gravite: 'bloquant' as const, message: `Critère de l’offre que le CV ne montre pas : « ${c.exigence} ».` })),
      ...ats.problemes,
    ],
  };
};

export const evaluateAts = (
  cv: OfficialCv,
  options: { template: AtsTemplate; requirements?: string[] },
): AtsResult => {
  const problemes: AtsResult['problemes'] = [];
  const p = cv.detailsPersonnels;
  const add = (gravite: Gravite, message: string) => problemes.push({ gravite, message });

  if (!p.nom.trim() || !p.prenom.trim()) add('bloquant', 'Nom ou prénom absent : le CV ne peut pas être rattaché à toi.');
  if (!p.email.trim() && !p.telephone.trim()) add('bloquant', 'Aucun moyen de te contacter (ni e-mail ni téléphone).');
  else if (!p.email.trim()) add('majeur', 'E-mail absent.');
  else if (!p.telephone.trim()) add('majeur', 'Téléphone absent.');
  if (!p.ville?.trim()) add('mineur', 'Ville absente : les recruteurs filtrent souvent par lieu.');
  if (!cv.titrePoste.trim()) add('majeur', 'Pas de titre de poste en haut du CV.');
  if (!cv.experiences.length) add('majeur', 'Aucune expérience, stage ou projet dans la rubrique Expérience professionnelle.');
  if (!cv.formations.length) add('majeur', 'Rubrique Formation vide.');
  if (!cv.competences.professionnelles.length) add('majeur', 'Rubrique Compétences vide.');

  const dated = [...cv.experiences, ...cv.formations];
  const undated = dated.filter((item) => !printedPeriode(item));
  if (undated.length) add('mineur', `${undated.length} expérience(s) ou formation(s) sans date.`);
  const withoutMonth = dated.filter((item) => printedPeriode(item) && !item.debut);
  if (withoutMonth.length && withoutMonth.length < dated.length) add('mineur', 'Dates écrites de deux façons : choisis mois + année partout.');

  const todoCount = (cvToText(cv).match(/\[[^\]]*compl[ée]ter[^\]]*\]/gi) ?? []).length
    + [cv.titrePoste, p.email, p.telephone].filter((v) => TODO.test(fold(v))).length;
  if (todoCount) add('majeur', `${todoCount} champ(s) encore marqué(s) « à compléter ».`);

  const layout = LAYOUT_RISK[options.template];
  if (layout) add(layout.gravite, layout.message);

  const folded = ` ${fold(cvToText(cv))} `;
  const requirements = [...new Set((options.requirements ?? []).map((r) => r.trim()).filter(Boolean))].slice(0, 30);
  const motsCles = requirements.map((motCle) => ({ motCle, ...keywordState(folded, motCle) }));
  const couverture = motsCles.length
    ? Math.round((motsCles.filter((k) => k.etat !== 'absent').length / motsCles.length) * 100)
    : null;
  if (couverture !== null && couverture < 70) {
    add('bloquant', `Seulement ${couverture} % des mots-clés de l’offre se retrouvent dans le CV.`);
  }

  const count = (g: Gravite) => problemes.filter((x) => x.gravite === g).length;
  let note = (couverture === null ? 8 : couverture / 10) - 1.5 * count('majeur') - 0.5 * count('mineur');
  if (count('bloquant')) note = Math.min(note, 4);
  note = Math.max(0, Math.min(10, Math.round(note)));

  return {
    verdict: note >= 7 && !count('bloquant') ? 'PASSE LE FILTRE' : 'FILTRÉ',
    note,
    couverture,
    motsCles,
    problemes,
  };
};
