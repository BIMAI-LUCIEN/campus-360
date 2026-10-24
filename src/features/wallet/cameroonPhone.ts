// Fichiers jumeaux, contenu identique (vérifié par mobile-api/tests/cameroon-phone.test.mjs) :
// mobile-api/lib/cameroon-phone.ts et src/features/wallet/cameroonPhone.ts.
// Aucun import : utilisé côté API et côté app.

export type CameroonOperator = 'mtn' | 'orange';

export type CameroonPhoneResult =
  | { ok: true; e164: string; national: string; operator: CameroonOperator }
  | { ok: false; error: string };

// Plan de numérotation mobile à 9 chiffres (ART). À corriger ici seulement si un opérateur ouvre une plage.
const OPERATOR_PREFIXES: Array<{ operator: CameroonOperator; pattern: RegExp }> = [
  { operator: 'mtn', pattern: /^6(7\d|5[0-4]|8[0-4])/ },
  { operator: 'orange', pattern: /^6(9\d|5[5-9]|8[5-9])/ },
];

export const OPERATOR_LABELS: Record<CameroonOperator, string> = {
  mtn: 'MTN MoMo',
  orange: 'Orange Money',
};

/**
 * Valide un numéro Mobile Money camerounais (MTN ou Orange) et le normalise en +2376XXXXXXXX.
 * Accepte « 6XX XX XX XX », « 2376… », « +237 6… » et « 00237 6… ».
 */
export const parseCameroonMobile = (raw: string): CameroonPhoneResult => {
  const compact = String(raw ?? '').replace(/[\s().\-]/g, '');
  if (!compact) {
    return { ok: false, error: 'Saisis ton numéro Mobile Money.' };
  }
  if (!/^\+?\d+$/.test(compact)) {
    return { ok: false, error: 'Le numéro ne doit contenir que des chiffres.' };
  }

  let digits = compact.replace(/^\+/, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  const hasCountryCode = compact.startsWith('+') || compact.startsWith('00') || digits.length > 9;

  let national = digits;
  if (hasCountryCode) {
    if (!digits.startsWith('237')) {
      return { ok: false, error: 'Seuls les numéros camerounais (+237) sont acceptés.' };
    }
    national = digits.slice(3);
  }

  if (national.length !== 9 || !national.startsWith('6')) {
    return { ok: false, error: 'Numéro camerounais invalide : 9 chiffres commençant par 6 (ex. 6XX XX XX XX).' };
  }

  const match = OPERATOR_PREFIXES.find((entry) => entry.pattern.test(national));
  if (!match) {
    return { ok: false, error: "Ce numéro n'est ni MTN ni Orange. Utilise un numéro MTN MoMo ou Orange Money." };
  }

  return { ok: true, e164: `+237${national}`, national, operator: match.operator };
};

/** Message d'erreur si l'opérateur choisi ne correspond pas au numéro, sinon null. */
export const operatorMismatchMessage = (
  detected: CameroonOperator,
  selected: CameroonOperator,
): string | null =>
  detected === selected
    ? null
    : `Ce numéro est un numéro ${OPERATOR_LABELS[detected]}. Choisis ${OPERATOR_LABELS[detected]} ou saisis un numéro ${OPERATOR_LABELS[selected]}.`;
