// Writing rules shared by every route that drafts text for a student (report,
// thesis, section chat, interview drafts). The goal is a text the student could
// have written: their voice, an academic register, no stock AI phrasing, and no
// invented facts. `findAiTics` is the mechanical check run after generation.

// Stock phrases that make a text read as machine-written. Matched without
// accents and case, on word boundaries. Keep entries short and specific: a
// broad entry ("important") would flag normal academic prose.
export const AI_TIC_BLACKLIST: readonly string[] = [
  'dans un monde en constante evolution',
  'dans un monde en perpetuelle evolution',
  'dans un contexte en constante evolution',
  'a l ere du numerique',
  'il est important de souligner',
  'il est important de noter',
  'il est essentiel de souligner',
  'il convient de noter',
  'il convient de souligner',
  'il est crucial de',
  'plongeons dans',
  'plonger dans le vif du sujet',
  'sans plus tarder',
  'en somme',
  'en conclusion',
  'pour conclure',
  'revolutionnaire',
  'paysage numerique',
  'paysage economique',
  'crucial',
  'cruciale',
  'incontournable',
  'incontournables',
  'veritable levier',
  'levier strategique',
  'pierre angulaire',
  'jouer un role cle',
  'joue un role cle',
  'joue un role primordial',
  'un atout majeur',
  'force est de constater',
  'catalyser',
  'synergie',
  'synergies',
  'n est plus a demontrer',
  'de maniere exponentielle',
  'en constante evolution',
];

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PATTERNS = AI_TIC_BLACKLIST.map((phrase) => ({ phrase, re: new RegExp(`(?:^| )${phrase}(?= |$)`, 'g') }));

export type AiTic = { phrase: string; count: number };

// Blacklisted phrases present in a text (plain text or HTML), most frequent first.
export const findAiTics = (text: string): AiTic[] => {
  const folded = ` ${fold(text || '')} `;
  const found: AiTic[] = [];
  for (const { phrase, re } of PATTERNS) {
    const count = (folded.match(re) || []).length;
    if (count > 0) found.push({ phrase, count });
  }
  // Longer phrases contain shorter ones ("en constante evolution"): report the longest only.
  const kept = found.filter((tic) => !found.some((other) => other !== tic && other.phrase.length > tic.phrase.length && other.phrase.includes(tic.phrase)));
  return kept.sort((a, b) => b.count - a.count);
};

export type WritingVoice = 'je' | 'nous';

// Placeholder rule: anything the student has not provided is left for them to fill.
export const MISSING_INFO_RULE =
  "N'invente jamais un fait, un chiffre, une date, un nom de personne ou d'entreprise, une citation ou une référence. " +
  "Si une information manque, écris-la entre crochets à l'endroit voulu, par exemple [nombre d'employés] ou [date d'arrivée], pour que l'étudiant la complète.";

// The core rules, inserted as-is in every drafting prompt.
export const studentVoiceRules = (voice: WritingVoice = 'je'): string =>
  [
    'Règles d’écriture :',
    voice === 'je'
      ? '- Écris à la première personne du singulier (« j’ai observé », « j’ai mis en place »), comme l’étudiant lui-même.'
      : '- Écris à la première personne du pluriel (« nous avons observé »), comme l’étudiant lui-même.',
    '- Registre académique simple et précis : des phrases claires, sans familiarité ni emphase.',
    '- Voix active de préférence. Varie la longueur des phrases : une phrase courte peut suivre une plus longue.',
    '- Chaque phrase apporte un fait, une observation ou un raisonnement. Pas de phrase de remplissage, pas de généralité sur « le monde » ou « la société ».',
    '- Préfère un chiffre, un exemple vécu ou un nom précis à un adjectif (« le délai est passé de 5 à 2 jours » plutôt que « une amélioration significative »).',
    '- N’ouvre pas sur une généralité et ne termine pas par un résumé de ce qui vient d’être dit.',
    '- Évite les listes à puces quand un paragraphe suffit ; quand une liste est utile, ses éléments n’ont pas tous la même longueur.',
    `- N’emploie jamais ces expressions : ${AI_TIC_BLACKLIST.filter((p) => p.includes(' ')).slice(0, 18).map((p) => `« ${p} »`).join(', ')}, ni les mots « crucial », « incontournable », « révolutionnaire », « paysage », « synergie ».`,
    `- ${MISSING_INFO_RULE}`,
  ].join('\n');

// HTML format rule shared by the drafting routes: <h1> is the first heading level
// inside a section (the section title itself is added by the document), and the
// numbering is automatic.
export const HTML_FORMAT_RULE =
  'Réponds en HTML simple : <p>, <h1> pour un sous-titre, <h2> pour un sous-sous-titre, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <table> si utile. ' +
  'N’écris pas de numéro devant les titres (la numérotation est automatique), ne répète pas le titre de la section, pas de balise <html> ni de bloc de code markdown.';

// Targeted rewrite asked when a generated text still contains blacklisted phrases.
export const ticRewritePrompt = (html: string, tics: AiTic[]): string =>
  [
    'Le texte HTML ci-dessous contient des expressions à retirer :',
    tics.map((t) => `« ${t.phrase} »`).join(', ') + '.',
    'Réécris uniquement les phrases qui les contiennent, avec des mots simples et précis. Ne change rien d’autre : ni les faits, ni les chiffres, ni les crochets, ni la structure HTML.',
    'Renvoie le HTML complet, sans commentaire.',
    '',
    html,
  ].join('\n');

// One targeted rewrite when blacklisted phrases remain. The model call is
// injected (tests pass a fake); any failure or a suspicious answer keeps the
// original text, so this pass can never lose the student's content.
export const polishAiTics = async (
  html: string,
  rewrite: (prompt: string) => Promise<string | null>,
): Promise<{ html: string; rewritten: boolean; tics: AiTic[] }> => {
  const tics = findAiTics(html);
  if (tics.length === 0) return { html, rewritten: false, tics };
  try {
    const answer = (await rewrite(ticRewritePrompt(html, tics)))?.trim();
    const cleaned = answer ? answer.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim() : '';
    // Reject an answer that dropped most of the text or kept as many tics.
    if (!cleaned || cleaned.length < html.length * 0.6 || findAiTics(cleaned).length >= tics.length) {
      return { html, rewritten: false, tics };
    }
    return { html: cleaned, rewritten: true, tics: findAiTics(cleaned) };
  } catch {
    return { html, rewritten: false, tics };
  }
};

// Models often open with the section title although the document prints it
// already: drop a leading heading (or bold line) that repeats it.
export const stripRepeatedTitle = (html: string, sectionTitle: string): string => {
  const key = (text: string) => fold(text).replace(/^chapitre [0-9ivxlc]+ /, '');
  const target = key(sectionTitle);
  if (!target) return html;
  return html.replace(
    /^\s*(?:<(h[1-6])[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>\s*<(strong|b)>([\s\S]*?)<\/\3>\s*<\/p>)\s*/i,
    (match, _h: string, headingText: string | undefined, _s: string, boldText: string | undefined) =>
      key(headingText ?? boldText ?? '') === target ? '' : match,
  );
};
