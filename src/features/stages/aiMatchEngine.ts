import type { StageJob } from '../../types';

export interface MatchAnalysis {
  score: number; // Score continu et réaliste (18% à 98%)
  headline: string; // e.g. "Match Exceptionnel (95%)", "Forte Adéquation (82%)", "Profil Transversal (61%)", "Compétences à Développer (38%)"
  badgeColor: string; // e.g. "#10B981", "#34D399", "#F59E0B", "#EF4444"
  matchedPoints: string[]; // 2 key reasons / highlights
  strategicAdvice: string; // 1 strategic tip highlighted in the letter
  keyStrengths: string[]; // detected overlapping or transferable competencies
  breakdown?: {
    majorAffinity: number; // 0..35
    skillsOverlap: number; // 0..35
    studyLevelContract: number; // 0..15
    locationProximity: number; // 0..15
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TAXONOMIE SÉMANTIQUE CROISÉE : DOMAINES & FILIÈRES (35%)
// ─────────────────────────────────────────────────────────────────────────────
export type DomainKey =
  | 'TECH'
  | 'FINANCE'
  | 'BTP'
  | 'MARKETING'
  | 'LOGISTIQUE'
  | 'DROIT'
  | 'SANTE'
  | 'RH_ADMIN';

const DOMAIN_KEYWORDS: Record<DomainKey, string[]> = {
  TECH: [
    'info', 'logiciel', 'software', 'dev', 'web', 'mobile', 'data', 'ia',
    'intelligence artificielle', 'réseau', 'reseau', 'télécom', 'telecom',
    'cyber', 'système d\'information', 'systeme d\'information', 'cloud', 'iot',
    'électron', 'electron', 'multimédia', 'multimedia', 'computer', 'full-stack',
    'frontend', 'backend', 'programmat'
  ],
  FINANCE: [
    'finance', 'comptab', 'audit', 'banque', 'gestion financière', 'gestion financiere',
    'fiscal', 'actuariat', 'économie', 'economie', 'microfinance', 'fintech',
    'trésor', 'tresor', 'cobac', 'cemac', 'bourse', 'contrôle de gestion', 'controle de gestion'
  ],
  BTP: [
    'btp', 'génie civil', 'genie civil', 'civil', 'bâtiment', 'batiment',
    'travaux publics', 'architect', 'urbanis', 'topograph', 'géotech', 'geotech',
    'construction', 'structure', 'chantier', 'voirie', 'aménagement'
  ],
  MARKETING: [
    'market', 'commun', 'vente', 'commercial', 'publicité', 'publicite',
    'brand', 'relation client', 'négociation', 'negociation', 'événement',
    'evenement', 'cosmét', 'cosmet', 'distribution', 'promotion'
  ],
  LOGISTIQUE: [
    'logist', 'transit', 'supply chain', 'transport', 'douan', 'fret',
    'stock', 'approvisionn', 'entrepôt', 'entrepot', 'portuaire', 'export',
    'import', 'camcis', 'dédouanement'
  ],
  DROIT: [
    'droit', 'jurid', 'contentieux', 'légal', 'legal', 'ohada', 'avocat',
    'notaire', 'juriste', 'réglementat', 'reglementat', 'fiscalité des affaires',
    'affaires juridiques'
  ],
  SANTE: [
    'santé', 'sante', 'pharmac', 'médic', 'medic', 'biolog', 'biochim',
    'biomédic', 'biomedic', 'laboratoire', 'soin', 'qualité alimentaire',
    'qualite alimentaire', 'agroaliment', 'clinique', 'hôpital', 'hopital'
  ],
  RH_ADMIN: [
    'rh', 'ressources humaines', 'gestion', 'administrat', 'secrétariat',
    'secretariat', 'management', 'assistanat', 'organisation', 'services généraux',
    'bureautique'
  ],
};

const CROSS_DOMAIN_AFFINITY: Record<DomainKey, Partial<Record<DomainKey, number>>> = {
  TECH: {
    TECH: 1.0,
    FINANCE: 0.75, // FinTech, SI bancaire
    MARKETING: 0.65, // Marketing digital, SEO, growth
    LOGISTIQUE: 0.60, // Traçabilité ERP, Supply chain tech
    RH_ADMIN: 0.55, // SIRH, transformation digitale
    SANTE: 0.50, // HealthTech, imagerie médicale
    BTP: 0.50, // BIM, DAO, modélisation 3D
    DROIT: 0.45, // Cyberdroit, RGPD
  },
  FINANCE: {
    FINANCE: 1.0,
    RH_ADMIN: 0.75, // Gestion d'entreprise, paie
    DROIT: 0.70, // Fiscalité, droit commercial OHADA
    TECH: 0.65, // FinTech, BI, data analytics
    LOGISTIQUE: 0.60, // Comptabilité analytique, coûts de fret
    MARKETING: 0.55, // Tarification, études de rentabilité
    BTP: 0.45,
    SANTE: 0.40,
  },
  BTP: {
    BTP: 1.0,
    TECH: 0.55, // Modélisation, CAO/DAO
    LOGISTIQUE: 0.50, // Approvisionnement chantiers
    RH_ADMIN: 0.45,
    FINANCE: 0.45,
    DROIT: 0.40,
    MARKETING: 0.35,
    SANTE: 0.30,
  },
  MARKETING: {
    MARKETING: 1.0,
    RH_ADMIN: 0.75, // Communication corporate & interne
    TECH: 0.70, // Digital marketing, web, product management
    LOGISTIQUE: 0.65, // Distribution commerciale, retail
    FINANCE: 0.55,
    DROIT: 0.45,
    SANTE: 0.40,
    BTP: 0.35,
  },
  LOGISTIQUE: {
    LOGISTIQUE: 1.0,
    MARKETING: 0.65, // Distribution, commerce international
    TECH: 0.60, // Systèmes d'information logistiques, ERP
    FINANCE: 0.60, // Gestion des coûts, transit
    RH_ADMIN: 0.55,
    BTP: 0.50, // Logistique de matériaux
    DROIT: 0.45, // Droit douanier, incoterms
    SANTE: 0.40,
  },
  DROIT: {
    DROIT: 1.0,
    RH_ADMIN: 0.80, // Droit du travail, relations sociales
    FINANCE: 0.70, // Fiscalité des affaires, conformité bancaire
    TECH: 0.50, // Droit du numérique, propriété intellectuelle
    LOGISTIQUE: 0.45, // Droit des transports, douane
    MARKETING: 0.45,
    SANTE: 0.40,
    BTP: 0.35,
  },
  SANTE: {
    SANTE: 1.0,
    TECH: 0.55, // Biomédical, logiciels d'analyse
    LOGISTIQUE: 0.50, // Chaîne du froid, pharmacie
    RH_ADMIN: 0.45,
    DROIT: 0.40, // Réglementation sanitaire
    MARKETING: 0.40,
    FINANCE: 0.35,
    BTP: 0.30,
  },
  RH_ADMIN: {
    RH_ADMIN: 1.0,
    DROIT: 0.80, // Droit social, contrats
    FINANCE: 0.75, // Gestion budgétaire, paie
    MARKETING: 0.70, // Marque employeur, communication
    TECH: 0.55,
    LOGISTIQUE: 0.55,
    SANTE: 0.45,
    BTP: 0.45,
  },
};

function detectDomains(text: string): DomainKey[] {
  const normalized = (text || '').toLowerCase().trim();
  if (!normalized) return [];
  const detected: DomainKey[] = [];
  (Object.keys(DOMAIN_KEYWORDS) as DomainKey[]).forEach((domain) => {
    const keywords = DOMAIN_KEYWORDS[domain];
    if (keywords.some((kw) => normalized.includes(kw))) {
      detected.push(domain);
    }
  });
  return detected;
}

function calculateDomainAffinity(studentDomains: DomainKey[], jobDomains: DomainKey[]): number {
  if (studentDomains.length === 0 || jobDomains.length === 0) {
    return 0.45; // Profil transversal généraliste si filière ou secteur non explicite
  }

  // Si au moins un domaine en commun direct
  const hasExact = studentDomains.some((sd) => jobDomains.includes(sd));
  if (hasExact) return 1.0;

  // Calcul du score maximal d'affinité croisée
  let maxAffinity = 0.20; // Seuil plancher de transversalité
  studentDomains.forEach((sd) => {
    jobDomains.forEach((jd) => {
      const aff = CROSS_DOMAIN_AFFINITY[sd]?.[jd] ?? 0.20;
      if (aff > maxAffinity) {
        maxAffinity = aff;
      }
    });
  });

  return maxAffinity;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECOUVREMENT COMPÉTENCES & SYNONYMES CONNEXES (35%)
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_CLUSTERS: Record<string, string[]> = {
  // Mobile, Web & Dev
  'react native': ['react', 'mobile', 'typescript', 'javascript', 'frontend', 'expo', 'ios', 'android', 'redux', 'tailwind', 'mobile money', 'ui/ux'],
  'react': ['react native', 'frontend', 'javascript', 'typescript', 'next.js', 'web', 'redux', 'html', 'css', 'tailwind'],
  'typescript': ['javascript', 'frontend', 'backend', 'node.js', 'react native', 'react'],
  'javascript': ['typescript', 'frontend', 'node.js', 'react', 'react native', 'web'],
  'node.js': ['javascript', 'typescript', 'backend', 'express', 'nestjs', 'apis rest', 'api rest', 'postgresql', 'docker'],
  'apis rest': ['backend', 'postman', 'http', 'node.js', 'json', 'api rest', 'endpoints', 'intégration'],
  'api rest': ['backend', 'postman', 'http', 'node.js', 'json', 'apis rest', 'endpoints', 'intégration'],
  'mobile money': ['paiement', 'fintech', 'react native', 'api rest', 'télécoms', 'momo'],
  'docker': ['devops', 'linux', 'cloud', 'conteneur', 'déploiement', 'backend'],
  'postgresql': ['sql', 'base de données', 'backend', 'node.js'],
  'sql': ['base de données', 'postgresql', 'mysql', 'analyse de données', 'excel avancé'],
  'git': ['github', 'gitlab', 'versioning', 'code', 'collaboration'],
  'flutter': ['dart', 'mobile', 'frontend', 'android', 'ios'],
  'figma': ['ui/ux', 'design', 'prototypage', 'wireframes', 'adobe xd', 'canva'],

  // Télécoms & Réseaux
  'réseaux télécoms': ['fibre optique', 'cisco', 'routage ip', 'linux', 'infrastructure', 'télécoms', 'sécurité', 'tcp/ip'],
  'fibre optique': ['réseaux télécoms', 'câblage', 'infrastructure', 'télécoms', 'déploiement'],
  'routage ip': ['réseaux télécoms', 'cisco', 'switch', 'tcp/ip', 'dns', 'adresses ip'],
  'cisco / linux': ['cisco', 'linux', 'réseaux télécoms', 'routage ip', 'système'],
  'sécurité': ['cybersécurité', 'réseaux télécoms', 'firewall', 'protection', 'conformité'],

  // Banque, Finance & Audit
  'banque & finance': ['analyse financière', 'comptabilité', 'audit', 'contrôle de gestion', 'cobac', 'cemac', 'excel', 'banque'],
  'analyse financière': ['finance', 'états financiers', 'bilan', 'ratios', 'excel', 'modélisation', 'banque'],
  'audit': ['contrôle de gestion', 'conformité', 'comptabilité', 'revue', 'procédures', 'risques'],
  'contrôle de gestion': ['budgets', 'tableaux de bord', 'audit', 'kpis', 'excel', 'comptabilité analytique'],
  'comptabilité bancaire': ['comptabilité', 'finance', 'banque', 'cobac', 'cemac'],
  'réglementation cemac': ['droit ohada', 'cobac', 'conformité', 'banque', 'finance'],
  'excel avancé': ['tableaux croisés dynamiques', 'vba', 'analyse de données', 'bureautique', 'formules', 'excel'],
  'excel': ['tableaux croisés dynamiques', 'bureautique', 'formules', 'gestion', 'pack office'],

  // Logistique, Transit & Supply Chain
  'logistique': ['transit douane', 'gestion de stocks', 'supply chain', 'transport', 'fret', 'distribution', 'entrepôt', 'camcis'],
  'transit douane': ['déclarations douanières', 'fret', 'import-export', 'logistique', 'port', 'camcis'],
  'gestion de stocks': ['inventaires', 'logistique', 'magasinage', 'approvisionnement', 'wms', 'excel', 'stocks'],
  'distribution': ['logistique', 'livraison', 'commerce', 'supply chain'],
  'rigueur': ['organisation', 'sens du détail', 'méthode', 'fiabilité'],
  'sens du détail': ['rigueur', 'minutie', 'contrôle', 'qualité'],

  // Marketing, Ventes & Événementiel
  'marketing': ['communication', 'sens commercial', 'vente', 'prospection', 'réseaux sociaux', 'stratégie'],
  'communication': ['marketing', 'relations publiques', 'rédaction', 'accueil', 'présentation', 'anglais'],
  'sens commercial': ['négociation', 'vente', 'relation client', 'dynamisme', 'commerce'],
  'dynamisme': ['proactivité', 'motivation', 'relationnel', 'énergie', 'communication'],
  'anglais': ['communication', 'bilingue', 'english', 'rédaction', 'international'],

  // Droit & Réglementation
  'droit des affaires ohada': ['droit ohada', 'rédaction juridique', 'droit commercial', 'contrats', 'contentieux'],
  'rédaction juridique': ['contrats', 'actes', 'notes juridiques', 'veille réglementaire', 'contentieux'],
  'fiscalité camerounaise': ['impôts', 'audit fiscal', 'déclarations', 'droit fiscal', 'dgi'],

  // Biomédical & Santé
  'biologie / biochimie': ['laboratoire', 'analyses biomédicales', 'prélèvements', 'contrôle qualité'],
  'contrôle qualité': ['normes iso', 'haccp', 'assurance qualité', 'rigueur', 'process'],
  'normes sanitaires': ['hygiène', 'sécurité', 'réglementation sanitaire', 'qualité'],
  'méthode': ['rigueur', 'organisation', 'protocoles', 'précision'],

  // Administration & Secrétariat
  'administration': ['bureautique word/excel', 'secrétariat', 'organisation', 'classement', 'accueil'],
  'bureautique word/excel': ['word', 'excel', 'pack office', 'saisie rapide', 'secrétariat', 'bureautique'],
  'secrétariat': ['accueil', 'standard', 'saisie', 'courrier', 'archivage'],
  'saisie rapide': ['dactylographie', 'bureautique', 'rigueur', 'vitesse'],
  'accueil & courtoisie': ['relationnel', 'communication', 'orientation', 'sourire'],
  'organisation': ['gestion du temps', 'méthode', 'autonomie', 'planification', 'rigueur'],
};

function normalizeSkill(s: string): string {
  return s.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ');
}

function evaluateSkillsOverlap(
  studentSkills: string[],
  jobRequirements: string[],
  jobDescription: string,
  jobTitle: string
): {
  scoreRatio: number;
  matchedDirect: string[];
  matchedRelated: string[];
} {
  const normalizedUserSkills = studentSkills.map(normalizeSkill).filter(Boolean);
  const normalizedJobReqs = jobRequirements.map(normalizeSkill).filter(Boolean);
  const contextText = `${jobTitle} ${jobDescription}`.toLowerCase();

  if (normalizedJobReqs.length === 0) {
    // Si l'offre n'a pas listé d'exigences explicites
    return {
      scoreRatio: normalizedUserSkills.length > 0 ? 0.70 : 0.40,
      matchedDirect: normalizedUserSkills.slice(0, 2),
      matchedRelated: [],
    };
  }

  if (normalizedUserSkills.length === 0) {
    // Profil sans compétences déclarées (junior en formation)
    return {
      scoreRatio: 0.15,
      matchedDirect: [],
      matchedRelated: [],
    };
  }

  const matchedDirectSet = new Set<string>();
  const matchedRelatedSet = new Set<string>();
  let totalPoints = 0;

  normalizedJobReqs.forEach((req) => {
    // 1. Match direct (inclusion exacte ou sous-chaîne)
    const directHit = normalizedUserSkills.find(
      (u) => u === req || u.includes(req) || req.includes(u)
    );

    if (directHit) {
      totalPoints += 1.0;
      matchedDirectSet.add(directHit);
      return;
    }

    // 2. Recherche dans le graphe de synonymes et compétences connexes
    let relatedHit: string | undefined;
    for (const [key, synonyms] of Object.entries(SKILL_CLUSTERS)) {
      const normKey = normalizeSkill(key);
      const isReqInCluster = normKey === req || req.includes(normKey) || normKey.includes(req);
      if (isReqInCluster) {
        relatedHit = normalizedUserSkills.find((u) =>
          synonyms.some((syn) => {
            const normSyn = normalizeSkill(syn);
            return u === normSyn || u.includes(normSyn) || normSyn.includes(u);
          })
        );
        if (relatedHit) break;
      }
    }

    if (relatedHit) {
      totalPoints += 0.75;
      matchedRelatedSet.add(relatedHit);
      return;
    }

    // 3. Match partiel via mots-clés ou contexte de l'offre
    const words = req.split(' ').filter((w) => w.length > 2);
    const partialHit = normalizedUserSkills.find((u) =>
      words.some((w) => u.includes(w))
    );

    if (partialHit) {
      totalPoints += 0.45;
      matchedRelatedSet.add(partialHit);
      return;
    }
  });

  // 4. Vérifier si d'autres compétences de l'étudiant sont valorisables dans la description
  normalizedUserSkills.forEach((u) => {
    if (!matchedDirectSet.has(u) && !matchedRelatedSet.has(u) && contextText.includes(u)) {
      totalPoints += 0.30;
      matchedRelatedSet.add(u);
    }
  });

  const baseRatio = totalPoints / normalizedJobReqs.length;
  // Plafonner entre 0.10 et 1.0
  const scoreRatio = Math.min(1.0, Math.max(0.10, baseRatio));

  return {
    scoreRatio,
    matchedDirect: Array.from(matchedDirectSet),
    matchedRelated: Array.from(matchedRelatedSet),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NIVEAU D'ÉTUDES & ADÉQUATION DU CONTRAT (15%)
// ─────────────────────────────────────────────────────────────────────────────
function evaluateStudyContractMatch(educationLevel?: string, contractType?: string): number {
  const levelStr = (educationLevel || '').toLowerCase();
  const contractStr = (contractType || '').toLowerCase();

  // Si ni l'un ni l'autre n'est spécifié, score médian
  if (!levelStr && !contractStr) return 9.5;

  const isJunior = /bts|dut|deug|licence 1|licence 2|l1|l2|bac\+2/.test(levelStr);
  const isMid = /licence 3|licence pro|l3|bachelor|bac\+3/.test(levelStr);
  const isSenior = /master|ingénieur|ingenieur|m1|m2|dea|dess|bac\+5/.test(levelStr);

  const isAcademic = /académique|academique|immersion|découverte|decouverte|ouvrier/.test(contractStr);
  const isPfe = /pfe|fin d'études|fin d'etudes|mémoire|memoire/.test(contractStr);
  const isProOrJob = /professionnel|premier emploi|emploi|cdi|cdd|alternance/.test(contractStr);

  if (isMid) {
    if (isAcademic || isPfe) return 15; // Licence correspond idéalement aux stages académiques & PFE
    if (isProOrJob) return 12;
    return 13.5;
  }

  if (isSenior) {
    if (isPfe || isProOrJob) return 15; // Master / Ingénieur correspond idéalement à PFE & Pré-emploi
    if (isAcademic) return 11; // Surqualification légère mais tout à fait recevable
    return 14;
  }

  if (isJunior) {
    if (isAcademic) return 15; // Stage d'immersion idéal pour BTS / L1 / L2
    if (isPfe) return 9; // Début de cycle pour un PFE
    if (isProOrJob) return 6; // Pré-requis d'expérience généralement plus élevés
    return 11;
  }

  // Si niveau standard non classé
  return 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOCALISATION / PROXIMITÉ GÉOGRAPHIQUE & VILLES (15%)
// ─────────────────────────────────────────────────────────────────────────────
function evaluateLocationProximity(
  jobLocation?: string,
  studentLocation?: string,
  studentMajor?: string
): number {
  const jobLoc = (jobLocation || '').toLowerCase();
  const studentLoc = (studentLocation || '').toLowerCase();
  const majorLoc = (studentMajor || '').toLowerCase();

  // 1. Offre en télétravail ou Remote -> 100% (15 points)
  if (/remote|télétravail|teletravail|en ligne|hybride|partout/.test(jobLoc)) {
    return 15;
  }

  // 2. Détection de la ville de l'étudiant
  let detectedStudentCity = '';
  if (/douala/.test(studentLoc) || /douala/.test(majorLoc)) detectedStudentCity = 'douala';
  else if (/yaoundé|yaounde/.test(studentLoc) || /yaoundé|yaounde|polytechnique/.test(majorLoc)) detectedStudentCity = 'yaounde';
  else if (/bafoussam|dschang/.test(studentLoc) || /dschang/.test(majorLoc)) detectedStudentCity = 'bafoussam';
  else if (/buea|limbe/.test(studentLoc) || /buea|limbe/.test(majorLoc)) detectedStudentCity = 'buea';
  else if (/garoua|maroua/.test(studentLoc)) detectedStudentCity = 'nord';

  // 3. Détection de la ville de l'offre
  let detectedJobCity = '';
  if (/douala/.test(jobLoc)) detectedJobCity = 'douala';
  else if (/yaoundé|yaounde/.test(jobLoc)) detectedJobCity = 'yaounde';
  else if (/bafoussam|dschang/.test(jobLoc)) detectedJobCity = 'bafoussam';
  else if (/buea|limbe/.test(jobLoc)) detectedJobCity = 'buea';
  else if (/garoua|maroua/.test(jobLoc)) detectedJobCity = 'nord';

  // Si l'une des villes n'est pas identifiée, attribuer un score de mobilité médian (10/15)
  if (!detectedStudentCity || !detectedJobCity) {
    return 10;
  }

  // Même ville exacte
  if (detectedStudentCity === detectedJobCity) {
    return 15;
  }

  // Bassins économiques connectés (ex: Douala <-> Buea/Limbe)
  if (
    (detectedStudentCity === 'douala' && detectedJobCity === 'buea') ||
    (detectedStudentCity === 'buea' && detectedJobCity === 'douala')
  ) {
    return 12;
  }

  // Grand axe Yaoundé <-> Bafoussam / Ouest
  if (
    (detectedStudentCity === 'yaounde' && detectedJobCity === 'bafoussam') ||
    (detectedStudentCity === 'bafoussam' && detectedJobCity === 'yaounde')
  ) {
    return 9;
  }

  // Deux métropoles majeures Douala <-> Yaoundé (navette fréquente mais logement nécessaire)
  if (
    (detectedStudentCity === 'douala' && detectedJobCity === 'yaounde') ||
    (detectedStudentCity === 'yaounde' && detectedJobCity === 'douala')
  ) {
    return 7.5;
  }

  // Villes géographiquement distantes
  return 4.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOTEUR PRINCIPAL D'ANALYSE DE COMPATIBILITÉ (MATCH ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Moteur d'analyse de compatibilité probabiliste multi-facteurs pondéré :
 * - Affinité Filière / Secteur (35%)
 * - Recouvrement Compétences avec synonymes & connexes (35%)
 * - Niveau d'Études & Adéquation Contrat (15%)
 * - Localisation / Proximité Ville (15%)
 *
 * Produit un score continu et réaliste allant de 18% à 98%.
 */
export function analyzeJobMatch(
  job: StageJob,
  student: {
    major?: string;
    educationLevel?: string;
    skills?: string[];
    location?: string;
    address?: string;
  }
): MatchAnalysis {
  // 1. Affinité Filière / Secteur (35%)
  const studentDomains = detectDomains(student.major || '');
  const jobText = `${job.company?.industry || ''} ${job.title || ''} ${job.description || ''}`;
  const jobDomains = detectDomains(jobText);
  const domainAffinity = calculateDomainAffinity(studentDomains, jobDomains);
  const scoreMajorAffinity = Math.round(domainAffinity * 35 * 10) / 10;

  // 2. Recouvrement Compétences (35%)
  const { scoreRatio, matchedDirect, matchedRelated } = evaluateSkillsOverlap(
    student.skills || [],
    job.requirements || [],
    job.description || '',
    job.title || ''
  );
  const scoreSkillsOverlap = Math.round(scoreRatio * 35 * 10) / 10;

  // 3. Niveau d'études & Contrat (15%)
  const scoreStudyLevel = evaluateStudyContractMatch(student.educationLevel, job.contractType);

  // 4. Localisation / Proximité (15%)
  const studentLoc = student.location || student.address || '';
  const scoreLocation = evaluateLocationProximity(job.location, studentLoc, student.major);

  // 5. Somme brute multi-facteurs
  const rawScore = scoreMajorAffinity + scoreSkillsOverlap + scoreStudyLevel + scoreLocation;

  // 6. Production d'un score continu et réaliste allant de 18% à 98%
  const finalScore = Math.round(Math.min(98, Math.max(18, rawScore)));

  // 7. Labels d'en-tête & Badges de couleur adaptés
  let headline = '';
  let badgeColor = '';
  let strategicAdvice = '';

  const uniqueMatchedSkills = Array.from(new Set([...matchedDirect, ...matchedRelated]));
  const allHighlightedSkills = uniqueMatchedSkills.length > 0
    ? uniqueMatchedSkills
    : (student.skills && student.skills.length > 0 ? student.skills.slice(0, 2) : ['Adaptabilité', 'Rigueur']);

  if (finalScore >= 90) {
    headline = `Match Exceptionnel (${finalScore}%)`;
    badgeColor = '#10B981'; // Emerald vibrant
    strategicAdvice = matchedDirect.length > 0
      ? `L'IA a mis en avant ta maîtrise de ${matchedDirect.slice(0, 2).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' & ')} pour maximiser ton impact dès le 1er jour.`
      : `L'IA valorise l'excellence et l'adéquation directe de ton parcours avec les missions confiées.`;
  } else if (finalScore >= 78) {
    headline = `Forte Adéquation (${finalScore}%)`;
    badgeColor = '#34D399'; // Mint green
    strategicAdvice = uniqueMatchedSkills.length > 0
      ? `L'IA a structuré ta candidature autour de tes compétences en ${uniqueMatchedSkills[0]} tout en soulignant ton potentiel d'intégration rapide.`
      : `L'IA a articulé ta lettre pour démontrer une synergie forte entre tes acquis académiques et le poste.`;
  } else if (finalScore >= 60) {
    headline = `Profil Transversal (${finalScore}%)`;
    badgeColor = '#F59E0B'; // Amber
    strategicAdvice = `L'IA met en avant tes compétences transférables et ta forte capacité d'apprentissage pour combler les spécificités du métier.`;
  } else if (finalScore >= 45) {
    headline = `Passerelle Métier (${finalScore}%)`;
    badgeColor = '#F97316'; // Orange
    strategicAdvice = `L'IA a orienté ta lettre sur ta polyvalence, ton esprit d'initiative et ta motivation concrète à monter rapidement en compétences.`;
  } else {
    headline = `Compétences à Développer (${finalScore}%)`;
    badgeColor = '#EF4444'; // Red
    strategicAdvice = `L'IA conseille de valoriser tes projets personnels, ta curiosité intellectuelle et ta proactivité pour retenir l'attention du recruteur.`;
  }

  // 8. Formulation des 2 points forts concrets ("Pourquoi toi")
  const matchedPoints: string[] = [];

  // Point 1 : Filière / Secteur
  if (domainAffinity >= 0.8) {
    matchedPoints.push(
      `Ta filière (${student.major || 'Universitaire'}) correspond directement aux besoins du poste de ${job.title}.`
    );
  } else if (domainAffinity >= 0.5) {
    matchedPoints.push(
      `Profil transversal solide : ta formation en ${student.major || 'formation'} apporte une perspective complémentaire valorisante.`
    );
  } else {
    matchedPoints.push(
      `Passerelle métier : ton cursus en ${student.major || 'formation'} reflète une curiosité adaptable face aux exigences de l'offre.`
    );
  }

  // Point 2 : Compétences
  if (matchedDirect.length > 0) {
    const formatted = matchedDirect
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' & ');
    matchedPoints.push(`Compétences clés directement opérationnelles : ${formatted}.`);
  } else if (matchedRelated.length > 0) {
    const formatted = matchedRelated
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' & ');
    matchedPoints.push(`Compétences connexes mobilisables : ${formatted} pour une montée en compétences accélérée.`);
  } else {
    matchedPoints.push(
      `Capacité d'assimilation rapide et maîtrise des fondamentaux méthodologiques du supérieur.`
    );
  }

  return {
    score: finalScore,
    headline,
    badgeColor,
    matchedPoints,
    strategicAdvice,
    keyStrengths: allHighlightedSkills,
    breakdown: {
      majorAffinity: scoreMajorAffinity,
      skillsOverlap: scoreSkillsOverlap,
      studyLevelContract: scoreStudyLevel,
      locationProximity: scoreLocation,
    },
  };
}
