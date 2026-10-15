// Turns a fetched HTML page into readable plain text: drops scripts, styles and
// page chrome (nav, header, footer, forms), prefers <article>/<main> when they
// hold the bulk of the content, and keeps paragraph breaks.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è',
  ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', ugrave: 'ù',
  icirc: 'î', iuml: 'ï', euml: 'ë', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', oelig: 'œ', copy: '©',
  Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedil: 'Ç',
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

const DROPPED_BLOCKS = ['script', 'style', 'noscript', 'svg', 'template', 'iframe', 'canvas', 'nav', 'header', 'footer', 'form', 'aside', 'button', 'select'];

const stripToText = (html: string): string => {
  let out = html.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const tag of DROPPED_BLOCKS) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), ' ');
  }
  out = out
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|tr|table|blockquote|pre|dd|dt)\s*>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(out)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const extractBlock = (html: string, tag: string): string | null => {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'));
  return match ? match[1] : null;
};

export const htmlToText = (html: string): { title: string; text: string } => {
  const head = extractBlock(html, 'title');
  const title = head ? stripToText(head).replace(/\s+/g, ' ').slice(0, 200) : '';
  const body = html.replace(/<head\b[\s\S]*?<\/head\s*>/i, ' ');
  const full = stripToText(body);
  for (const tag of ['article', 'main']) {
    const block = extractBlock(body, tag);
    if (block) {
      const text = stripToText(block);
      if (text.length >= Math.min(500, full.length * 0.5)) return { title, text };
    }
  }
  return { title, text: full };
};
