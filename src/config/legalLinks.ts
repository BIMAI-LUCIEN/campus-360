export interface LegalLinks {
  conditions: string;
  privacy: string;
  legal: string;
  deletion: string;
}

export const legalLinks = (base: string): LegalLinks => {
  const cleanBase = (base || 'https://campus360b.site').replace(/\/+$/, '');
  return {
    conditions: `${cleanBase}/conditions`,
    privacy: `${cleanBase}/confidentialite`,
    legal: `${cleanBase}/mentions-legales`,
    deletion: `${cleanBase}/suppression-compte`,
  };
};
