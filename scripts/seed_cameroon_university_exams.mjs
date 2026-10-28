import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require('../mobile-api/node_modules/pg');
const { Pool } = pg;

let dbUrl = '';
for (const envFile of ['mobile-api/.env.local', 'mobile-api/.env', '.env.local', '.env']) {
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/DATABASE_URL=([^\r\n]+)/);
    if (match && !dbUrl) {
      dbUrl = match[1].replace(/['"]/g, '').trim();
    }
  }
}

if (!dbUrl) {
  console.error('Aucune DATABASE_URL trouvée dans les fichiers env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const exams = [
  // ─── 1. ENSPY (Polytechnique Yaoundé) ──────────────────────────────────────────
  {
    id: 'concours-enspy-maths-2023',
    title: "Concours ENSPY 2023 — Épreuve de Mathématiques (1ère année)",
    description: "Sujet officiel du concours d'entrée à l'École Nationale Supérieure Polytechnique de Yaoundé (ENSPY). Algèbre linéaire, espaces vectoriels, calcul matriciel, étude de fonctions et calcul intégral.",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Logiciel',
    subject: 'Algèbre Linéaire & Analyse',
    teacher: 'Commission Nationale des Concours Ingénieurs',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/concours-enspy-maths-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 142,
    downloads_count: 388,
    ai_summary: "Épreuve phare axée sur la rigueur mathématique : diagonalisation de matrices d'ordre 3, résolution de systèmes différentiels et intégrales impropres.",
    ai_tags: ['Concours', 'Grandes Écoles', 'ENSPY', 'Polytechnique', 'Mathématiques', 'Yaoundé', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Maîtriser le calcul de déterminants et la réduction des endomorphismes.",
      "2. Réviser les développements limités et l'intégration par parties.",
      "3. S'entraîner sur les suites récurrentes et les séries numériques.",
      "4. Gérer le temps : 3h d'épreuve pour 4 exercices indépendants."
    ],
    ai_quiz: [
      { question: "Dans quel cas une matrice carrée A est-elle diagonalisable sur R ?", answer: "Quand le polynôme caractéristique est scindé sur R et que la dimension de chaque sous-espace propre égale la multiplicité de la valeur propre." },
      { question: "Quelle est la dérivée de arctan(x) ?", answer: "1 / (1 + x^2)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'concours-enspy-physique-2023',
    title: "Concours ENSPY 2023 — Épreuve de Physique (1ère année)",
    description: "Sujet officiel du concours ENSPY Yaoundé. Mécanique newtonienne, oscillateurs harmoniques, électrostatique, circuits RLC et induction électromagnétique.",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Électrique & Télécoms',
    subject: 'Mécanique du Point & Électromagnétisme',
    teacher: 'Commission Nationale des Concours Ingénieurs',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 4,
    file_path: 'https://files.campus360b.site/annales/concours-enspy-physique-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 119,
    downloads_count: 295,
    ai_summary: "Épreuve complète portant sur la dynamique d'une particule chargée dans un champ magnétique et l'étude en régime transitoire d'un filtre RLC série.",
    ai_tags: ['Concours', 'Grandes Écoles', 'ENSPY', 'Physique', 'Électrostatique', 'Yaoundé', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 95,
    ai_study_plan: [
      "1. Réviser la force de Lorentz et les trajectoires hélicoïdales.",
      "2. Maîtriser les théorèmes de Thévenin et Norton pour les circuits électriques.",
      "3. Poser rigoureusement les équations différentielles d'oscillateurs amortis."
    ],
    ai_quiz: [
      { question: "Quelle est l'unité de l'inductance L dans le système international ?", answer: "Le Henry (H)." },
      { question: "Quelle force s'exerce sur une charge q animée d'une vitesse v dans un champ B ?", answer: "F = q (v ^ B)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-enspy-inf101-2024',
    title: "Session Normale (SN) — INF 101 : Algorithmique et Langage C (Niveau 1 Ingénieur)",
    description: "Examen officiel de Session Normale (SN), Semestre 1, ENSPY Yaoundé. Structures conditionnelles, boucles, pointeurs, allocation dynamique malloc/free et manipulation de fichiers.",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Logiciel',
    subject: 'Algorithmique et Programmation C',
    teacher: 'Département de Génie Informatique ENSPY',
    level: 'Niveau 1 Ingénieur',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/sn-enspy-inf101-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 210,
    downloads_count: 450,
    ai_summary: "Examen semestriel (SN) axé sur la gestion manuelle de la mémoire en C et l'implémentation d'une liste chaînée d'étudiants avec tri par insertion.",
    ai_tags: ['Session Normale', 'SN', 'ENSPY', 'Langage C', 'Algorithmique', 'Semestre 1', 'LMD', 'Cameroun'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 97,
    ai_study_plan: [
      "1. Comprendre la différence entre passage par valeur et passage par adresse (pointeur).",
      "2. Maîtriser l'arithmétique des pointeurs et les structures typedef struct.",
      "3. Éviter les fuites de mémoire en libérant systématiquement avec free()."
    ],
    ai_quiz: [
      { question: "Que renvoie malloc(sizeof(int) * 10) si la mémoire est saturée ?", answer: "Le pointeur NULL." },
      { question: "Quel opérateur permet d'accéder au champ d'une structure via un pointeur ?", answer: "L'opérateur flèche (->)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 2. FMSB (Faculté de Médecine et Sciences Biomédicales - UY1) ───────────────
  {
    id: 'concours-fmsb-biologie-2023',
    title: "Concours National Médecine 2023 — Épreuve de Biologie & SVT (FMSB Yaoundé)",
    description: "Épreuve officielle du Concours National Unique d'entrée dans les facultés de médecine du Cameroun (FMSB Yaoundé, FMSP Douala, FASA Dschang, FHS Buea). Biologie cellulaire, génétique, immunologie et reproduction.",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    teacher: 'Commission Nationale des Examens Médicaux MINESUP',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 4,
    file_path: 'https://files.campus360b.site/annales/concours-fmsb-biologie-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 5.0,
    sales_count: 380,
    downloads_count: 890,
    ai_summary: "QCM et questions rédactionnelles pointues : synthèse des protéines, cycle de Krebs, système immunitaire (anticorps/lymphocytes) et transmission des caractères héréditaires.",
    ai_tags: ['Concours', 'Médecine', 'FMSB', 'FMSP', 'Biologie', 'SVT', 'MINESUP', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 98,
    ai_study_plan: [
      "1. Apprendre par cœur les étapes de la transcription et traduction de l'ARNm.",
      "2. Connaître le rôle précis des organites cellulaires (mitochondries, appareil de Golgi).",
      "3. Réviser la régulation hormonale de l'axe hypothalamo-hypophysaire."
    ],
    ai_quiz: [
      { question: "Où se déroule la glycolyse dans la cellule eucaryote ?", answer: "Dans le cytoplasme (cytosol)." },
      { question: "Quelles cellules sécrètent les anticorps ?", answer: "Les plasmocytes (lymphocytes B différenciés)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-fmsb-anat101-2024',
    title: "Session Normale (SN) — ANAT 101 : Anatomie Générale & Ostéologie (Niveau 1 Médecine)",
    description: "Examen de Session Normale (SN), Semestre 1, FMSB Yaoundé 1. Ostéologie du membre supérieur et inférieur, articulation du genou, vascularisation et repères anatomiques.",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Anatomie & Embryologie',
    teacher: 'Chaire d’Anatomie Humaine FMSB',
    level: 'Niveau 1 Médecine',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/sn-fmsb-anat101-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 245,
    downloads_count: 530,
    ai_summary: "Examen classique de 1ère année de médecine : schémas muets à annoter (humérus, fémur) et questions sur l'innervation sensitive et motrice du membre supérieur.",
    ai_tags: ['Session Normale', 'SN', 'FMSB', 'Médecine', 'Anatomie', 'Semestre 1', 'LMD', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 97,
    ai_study_plan: [
      "1. Dessiner et annoter de mémoire les coupes axiales et sagittales des os longs.",
      "2. Réviser le plexus brachial et les zones de lésion nerveuse courantes.",
      "3. Maîtriser le vocabulaire d'orientation (proximal, distal, médial, latéral)."
    ],
    ai_quiz: [
      { question: "Quel os s'articule avec l'humérus au niveau de la cavité glénoïde ?", answer: "La scapula (omoplate)." },
      { question: "Quel nerf est responsable de la pronation de l'avant-bras ?", answer: "Le nerf médian." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 3. FACULTÉ DES SCIENCES (Université de Yaoundé I) ─────────────────────────
  {
    id: 'sn-uy1-inf111-2024',
    title: "Session Normale (SN) — INF 111 : Algorithmique et Structures de Données 1 (Licence 1)",
    description: "Épreuve officielle de Session Normale (SN), Semestre 1, Département d'Informatique, Faculté des Sciences, Université de Yaoundé I. Complexité algorithmique, tableaux, tris (tri à bulles, tri rapide) et récursivité.",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algorithmique et Programmation C',
    teacher: 'Département d\'Informatique UY1',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 2,
    file_path: 'https://files.campus360b.site/annales/sn-uy1-inf111-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 310,
    downloads_count: 720,
    ai_summary: "Sujet officiel de Session Normale pour tous les étudiants de L1 Informatique à Ngoa-Ekellé. Exercices d'analyse de complexité en notation Big-O et écriture d'algorithmes récursifs.",
    ai_tags: ['Session Normale', 'SN', 'UY1', 'Informatique', 'Algorithmique', 'Licence 1', 'LMD', 'Yaoundé'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Savoir prouver la terminaison et la correction d'une boucle par un invariant.",
      "2. Calculer le nombre d'opérations élémentaires dans le pire et meilleur des cas.",
      "3. Écrire le pseudo-code sans erreurs de syntaxe."
    ],
    ai_quiz: [
      { question: "Quelle est la complexité asymptotique moyenne du tri rapide (Quicksort) ?", answer: "O(n log n)." },
      { question: "Quelle condition est indispensable pour arrêter une fonction récursive ?", answer: "Le cas de base (ou condition d'arrêt)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-uy1-inf211-2024',
    title: "Session Normale (SN) — INF 211 : Bases de Données Relationnelles et SQL (Licence 2)",
    description: "Épreuve officielle de Session Normale (SN), Semestre 1, Faculté des Sciences UY1. Modèle Entité-Association (Merise), formes normales (1FN, 2FN, 3FN, BCNF), algèbre relationnelle et requêtes SQL complexes.",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Bases de Données (SQL)',
    teacher: 'Département d\'Informatique UY1',
    level: 'Licence 2 (Niveau 2)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/sn-uy1-inf211-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 275,
    downloads_count: 610,
    ai_summary: "Session Normale de L2 Informatique : conception complète d'une base de données d'un hôpital au Cameroun, passage du MCD au MLD et écriture de requêtes SELECT avec GROUP BY et HAVING.",
    ai_tags: ['Session Normale', 'SN', 'UY1', 'Bases de Données', 'SQL', 'Merise', 'Licence 2', 'LMD'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Bien maîtriser les règles de transformation du MCD en schéma relationnel.",
      "2. Vérifier les dépendances fonctionnelles pour assurer la 3ème forme normale.",
      "3. Pratiquer les jointures internes (INNER JOIN) et externes (LEFT/RIGHT JOIN)."
    ],
    ai_quiz: [
      { question: "Quelle clause SQL permet de filtrer après une agrégation GROUP BY ?", answer: "La clause HAVING." },
      { question: "Qu'est-ce qu'une clé étrangère (Foreign Key) ?", answer: "Un champ d'une table qui fait référence à la clé primaire d'une autre table pour assurer l'intégrité référentielle." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-uy1-mat111-2024',
    title: "Session Normale (SN) — MAT 111 : Algèbre Linéaire et Espaces Vectoriels (Licence 1)",
    description: "Sujet de Session Normale (SN), Faculté des Sciences, Université de Yaoundé I. Espaces vectoriels, sous-espaces, familles libres et génératrices, théorème du rang et matrices d'applications linéaires.",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algèbre Linéaire',
    teacher: 'Département de Mathématiques UY1',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 2,
    file_path: 'https://files.campus360b.site/annales/sn-uy1-mat111-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.7,
    sales_count: 198,
    downloads_count: 480,
    ai_summary: "Examen fondamental de L1 Maths-Info-Physique. Problème complet sur la somme directe de sous-espaces et le calcul du noyau et de l'image d'un endomorphisme.",
    ai_tags: ['Session Normale', 'SN', 'UY1', 'Mathématiques', 'Algèbre', 'Licence 1', 'Ngoa-Ekellé'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 95,
    ai_study_plan: [
      "1. Savoir vérifier les 3 conditions d'un sous-espace vectoriel.",
      "2. Utiliser le pivot de Gauss pour déterminer le rang d'une famille de vecteurs.",
      "3. Appliquer la formule du rang : dim(E) = dim(Ker f) + dim(Im f)."
    ],
    ai_quiz: [
      { question: "Si dim(Ker f) = 0, quelle propriété possède l'application linéaire f ?", answer: "Elle est injective." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 4. FSEG (Faculté des Sciences Économiques et de Gestion - Soa & Douala) ───
  {
    id: 'sn-uy2-eco111-2024',
    title: "Session Normale (SN) — ECO 111 : Introduction à la Microéconomie (Licence 1)",
    description: "Épreuve de Session Normale (SN), Faculté des Sciences Économiques et de Gestion, Université de Yaoundé II (Soa). Théorie du comportement du consommateur, courbe d'indifférence, contrainte budgétaire, élasticités et équilibre de marché.",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Microéconomie',
    teacher: 'Département d\'Économie UY2 Soa',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/sn-uy2-eco111-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 260,
    downloads_count: 590,
    ai_summary: "Session Normale à Soa : résolution du programme d'optimisation du consommateur avec la méthode du multiplicateur de Lagrange et calcul de l'élasticité-prix de la demande.",
    ai_tags: ['Session Normale', 'SN', 'Soa', 'UY2', 'Économie', 'Microéconomie', 'Licence 1', 'LMD'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Définir le taux marginal de substitution (TMS) comme rapport des utilités marginales.",
      "2. Résoudre le système d'égalisation TMS = Px / Py avec la droite de budget.",
      "3. Interpréter le signe et la valeur absolue de l'élasticité-revenu (biens normaux, inférieurs, de luxe)."
    ],
    ai_quiz: [
      { question: "Que mesure le Taux Marginal de Substitution (TMS) ?", answer: "La quantité d'un bien Y à laquelle le consommateur est prêt à renoncer pour obtenir une unité supplémentaire du bien X tout en gardant la même utilité." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-uy2-cpt111-2024',
    title: "Session Normale (SN) — CPT 111 : Comptabilité Générale I - SYSCOHADA (Licence 1)",
    description: "Épreuve de Session Normale (SN), Semestre 1, FSEG Soa et FSEGA Douala. Principes comptables fondamentaux de l'OHADA, écriture au journal, grand livre, balance des comptes et établissement du bilan et compte de résultat.",
    university: 'Université de Douala',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Comptabilité Générale (SYSCOHADA)',
    teacher: 'Département des Sciences de Gestion',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 4,
    file_path: 'https://files.campus360b.site/annales/sn-douala-cpt111-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 340,
    downloads_count: 780,
    ai_summary: "Cas pratique d'entreprise camerounaise : enregistrement des opérations d'achats/ventes avec TVA, rabais, remises, escomptes, facturation et balance avant inventaire.",
    ai_tags: ['Session Normale', 'SN', 'Comptabilité', 'SYSCOHADA', 'OHADA', 'Douala', 'Licence 1', 'Gestion'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 97,
    ai_study_plan: [
      "1. Connaître le plan comptable OHADA et les classes de 1 à 8.",
      "2. Maîtriser le principe fondamental de la partie double : Total Débit = Total Crédit.",
      "3. Traiter correctement les réductions commerciales (sur facture) et financières (escompte de règlement)."
    ],
    ai_quiz: [
      { question: "Dans quel compte SYSCOHADA enregistre-t-on les achats de marchandises au Cameroun ?", answer: "Le compte 601 (Achats de marchandises)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 5. FSJP (Faculté des Sciences Juridiques et Politiques - Soa & Douala) ────
  {
    id: 'sn-uy2-drt111-2024',
    title: "Session Normale (SN) — DRT 111 : Droit Constitutionnel et Institutions Politiques (Licence 1)",
    description: "Épreuve de Session Normale (SN), Semestre 1, Faculté des Sciences Juridiques et Politiques, Université de Yaoundé II (Soa). Notions d'État, de souveraineté, séparation des pouvoirs, contrôle de constitutionnalité et régime parlementaire vs présidentiel.",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Juridiques et Politiques (FSJP)',
    subject: 'Droit Constitutionnel',
    teacher: 'Département de Droit Public UY2 Soa',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 2,
    file_path: 'https://files.campus360b.site/annales/sn-soa-drt111-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 290,
    downloads_count: 650,
    ai_summary: "Sujet de dissertation juridique et commentaire d'article : 'La séparation des pouvoirs dans les régimes présidentiels contemporains : mythe ou réalité ?'.",
    ai_tags: ['Session Normale', 'SN', 'Droit', 'Droit Constitutionnel', 'Soa', 'FSJP', 'Licence 1', 'Cameroun'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Structurer rigoureusement l'introduction : accroche, définition des termes, délimitation, problème de droit, annonce de plan binaire (I/II).",
      "2. Distinguer séparation stricte (régime présidentiel) et séparation souple (régime parlementaire).",
      "3. Illustrer avec des exemples camerounais (Constitution de 1996 modifiée en 2008) et comparés."
    ],
    ai_quiz: [
      { question: "Qui est le garant de l'indépendance de la justice selon la Constitution camerounaise ?", answer: "Le Président de la République, assisté du Conseil Supérieur de la Magistrature." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 6. IUT DE DOUALA ─────────────────────────────────────────────────────────
  {
    id: 'concours-iut-douala-2023',
    title: "Concours IUT de Douala 2023 — Épreuve de Mathématiques & Logique (DUT)",
    description: "Épreuve officielle du concours d'entrée à l'Institut Universitaire de Technologie de Douala. Filières industrielles (Génie Info, Génie Électrique, Génie Mécanique) et tertiaires. Algèbre, trigonométrie, probabilités et raisonnement logique.",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaires',
    subject: 'Algèbre Linéaire & Analyse',
    teacher: 'Direction de l\'IUT de Douala',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/concours-iut-douala-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 220,
    downloads_count: 510,
    ai_summary: "Concours IUT Douala : 30 questions à choix multiple et 2 problèmes axés sur la vitesse de calcul, les dérivées partielles et les probabilités combinatoires.",
    ai_tags: ['Concours', 'IUT Douala', 'Mathématiques', 'DUT', 'Génie Informatique', 'Douala', 'Cameroun'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 95,
    ai_study_plan: [
      "1. S'entraîner au calcul mental et à la simplification rapide de fractions et racines.",
      "2. Maîtriser le dénombrement (combinaisons C(n,p), arrangements, factorielles).",
      "3. Gérer le barème avec points négatifs fréquents aux QCM de l'IUT."
    ],
    ai_quiz: [
      { question: "Combien d'anagrammes peut-on former avec le mot 'CAMPUS' (6 lettres distinctes) ?", answer: "6! = 720 anagrammes." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'sn-iut-gi101-2024',
    title: "Session Normale (SN) — GI 101 : Algorithmique et Langage C (DUT Génie Informatique L1)",
    description: "Examen de Session Normale (SN), Semestre 1, Département Génie Informatique, IUT de Douala. Tableaux bidimensionnels, récursivité, chaînes de caractères, structures de données et pointeurs.",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaires',
    subject: 'Algorithmique et Programmation C',
    teacher: 'Département Génie Informatique IUT',
    level: 'DUT 1ère année',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/sn-iut-gi101-2024.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 185,
    downloads_count: 420,
    ai_summary: "Épreuve pratique et théorique : implémentation d'un algorithme de chiffrement César et gestion d'une matrice creuse en C.",
    ai_tags: ['Session Normale', 'SN', 'IUT Douala', 'Génie Info', 'DUT', 'Langage C', 'Semestre 1'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Bien manipuler les chaînes avec string.h (strlen, strcpy, strcmp).",
      "2. Écrire des fonctions modulaires avec prototypes dans un fichier .h.",
      "3. Tester son code contre les débordements de tampon (buffer overflow)."
    ],
    ai_quiz: [
      { question: "Quel caractère marque obligatoirement la fin d'une chaîne de caractères en C ?", answer: "Le caractère nul '\\0'." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 7. ÉCOLE NORMALE SUPÉRIEURE (ENS Yaoundé & Maroua) ───────────────────────
  {
    id: 'concours-ens-maths-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : Mathématiques (1er Cycle)",
    description: "Épreuve officielle du concours d'entrée à l'École Normale Supérieure de Yaoundé (ENS). Niveau Baccalauréat Scientifique / Concours 1er cycle. Arithmétique dans Z, suites et séries, géométrie dans l'espace et calcul d'intégrales.",
    university: 'ENS Yaoundé',
    faculty: 'Sciences de l\'Éducation (ENS)',
    subject: 'Algèbre Linéaire & Analyse',
    teacher: 'Direction de l\'ENS Yaoundé',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/concours-ens-maths-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 280,
    downloads_count: 670,
    ai_summary: "Épreuve d'une grande rigueur démonstrative pour futurs professeurs de mathématiques : congruences, équations diophantiennes et problème d'analyse sur les intégrales de Wallis.",
    ai_tags: ['Concours', 'ENS', 'ENS Yaoundé', 'Mathématiques', 'Enseignement', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 98,
    ai_study_plan: [
      "1. Réviser l'algorithme d'Euclide étendu et le théorème de Bézout.",
      "2. Pratiquer les démonstrations par récurrence forte et par l'absurde.",
      "3. Maîtriser les propriétés des intégrales dépendant d'un paramètre entier."
    ],
    ai_quiz: [
      { question: "Que dit le petit théorème de Fermat pour un entier 'a' non divisible par un nombre premier 'p' ?", answer: "a^(p-1) est congru à 1 modulo p." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },
  {
    id: 'concours-ens-svt-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : SVT (1er Cycle)",
    description: "Épreuve officielle du concours ENS Yaoundé, filière Sciences de la Vie et de la Terre (SVT). Géodynamique interne et externe, tectonique des plaques, métabolisme cellulaire et écologie.",
    university: 'ENS Yaoundé',
    faculty: 'Sciences de l\'Éducation (ENS)',
    subject: 'Biologie Cellulaire & Physiologie',
    teacher: 'Direction de l\'ENS Yaoundé',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 4,
    file_path: 'https://files.campus360b.site/annales/concours-ens-svt-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 195,
    downloads_count: 460,
    ai_summary: "Épreuve complète associant biologie cellulaire approfondie et synthèse géologique sur le magmatisme de subduction et la chaîne volcanique du Cameroun.",
    ai_tags: ['Concours', 'ENS', 'SVT', 'Biologie', 'Géologie', 'Ligne du Cameroun', 'Yaoundé'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Savoir schématiser les zones de subduction et de collision continentale.",
      "2. Connaître les caractéristiques géologiques de la Ligne du Mont Cameroun.",
      "3. Rédiger une synthèse argumentée avec introduction, plan équilibré et schémas légendés."
    ],
    ai_quiz: [
      { question: "Quel type de roche volcanique est prédominant sur la ligne du Mont Cameroun ?", answer: "Le basalte." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 8. ENAM (École Nationale d'Administration et de Magistrature) ─────────────
  {
    id: 'concours-enam-cg-2023',
    title: "Concours ENAM 2023 — Dissertation de Culture Générale (Division Administrative)",
    description: "Épreuve reine du concours d'entrée à l'ENAM (Sections Administration Générale, Douanes, Impôts, Prix & Poids, Magistrature). Enjeux de gouvernance, décentralisation, intégration régionale CEMAC et développement durable en Afrique.",
    university: 'ENAM',
    faculty: 'Administration & Magistrature (ENAM)',
    subject: 'Culture Générale Concours',
    teacher: 'Direction Générale de l\'ENAM',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 2,
    file_path: 'https://files.campus360b.site/annales/concours-enam-cg-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 5.0,
    sales_count: 450,
    downloads_count: 1100,
    ai_summary: "Sujet phare de l'ENAM : 'La décentralisation au Cameroun : leviers et défis pour l'émergence économique locale'. Épreuve de 4 heures requérant une solide culture institutionnelle.",
    ai_tags: ['Concours', 'ENAM', 'Culture Générale', 'Administration', 'Magistrature', 'Douanes', 'Cameroun'],
    ai_difficulty: 'hard',
    suggested_price_coins: 0,
    quality_score: 99,
    ai_study_plan: [
      "1. Maîtriser le Code Général des Collectivités Territoriales Décentralisées (Loi de 2019).",
      "2. Structurer en plan dialectique (Thèse / Antithèse / Dépassement) ou thématique rigoureux.",
      "3. Enrichir avec des références doctrinales et historiques précises sur l'État camerounais."
    ],
    ai_quiz: [
      { question: "En quelle année a été promulguée la loi portant Code Général des Collectivités Territoriales Décentralisées au Cameroun ?", answer: "En décembre 2019." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 9. ESSEC DOUALA ──────────────────────────────────────────────────────────
  {
    id: 'concours-essec-maths-2023',
    title: "Concours ESSEC Douala 2023 — Mathématiques Appliquées à la Gestion",
    description: "Épreuve officielle du concours d'entrée en 1ère année de l'ESSEC (École Supérieure des Sciences Économiques et Commerciales de Douala). Optimisation de fonctions, programmation linéaire, calcul d'intérêts et probabilités.",
    university: 'ESSEC Douala',
    faculty: 'Management & Commerce (ESSEC)',
    subject: 'Microéconomie',
    teacher: 'Direction de l\'ESSEC Douala',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/concours-essec-maths-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.8,
    sales_count: 175,
    downloads_count: 390,
    ai_summary: "Épreuve orientée gestion d'entreprise : problème de minimisation des coûts de production sous contrainte budgétaire et modélisation de flux financiers.",
    ai_tags: ['Concours', 'ESSEC', 'ESSEC Douala', 'Commerce', 'Management', 'Maths Gestion', 'Douala'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 95,
    ai_study_plan: [
      "1. Savoir poser un programme linéaire et le résoudre par la méthode graphique ou simplexe.",
      "2. Calculer la valeur actuelle nette (VAN) et le taux de rentabilité interne (TRI).",
      "3. Maîtriser la loi normale et les intervalles de confiance."
    ],
    ai_quiz: [
      { question: "Que représente le coût marginal en économie d'entreprise ?", answer: "Le coût de production d'une unité supplémentaire d'un bien ou service." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  },

  // ─── 10. CONCOURS SANTÉ & IDE (MINSANTE) ──────────────────────────────────────
  {
    id: 'concours-ide-sante-2023',
    title: "Concours National IDE 2023 — Biologie Médicale, Santé & Hygiène (MINSANTE)",
    description: "Épreuve officielle du concours national d'entrée dans les écoles de formation des personnels médico-sanitaires au Cameroun (Infirmiers Diplômés d'État - IDE, Techniciens Médico-Sanitaires - TMS, Sages-Femmes).",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    teacher: 'Direction des Ressources Humaines MINSANTE',
    level: 'Concours',
    academic_year: '2023-2024',
    price_coins: 0,
    page_count: 3,
    file_path: 'https://files.campus360b.site/annales/concours-ide-sante-2023.pdf',
    status: 'published',
    commission_rate: 0,
    rating: 4.9,
    sales_count: 310,
    downloads_count: 820,
    ai_summary: "QCM et cas cliniques de base : prévention des maladies endémiques (paludisme, choléra, tuberculose), chaîne du froid pour les vaccins, anatomie humaine et déontologie des soins.",
    ai_tags: ['Concours', 'IDE', 'Infirmier', 'Santé', 'MINSANTE', 'Biologie', 'Cameroun'],
    ai_difficulty: 'medium',
    suggested_price_coins: 0,
    quality_score: 96,
    ai_study_plan: [
      "1. Réviser les modes de transmission et mesures barrières des grandes endémies tropicales.",
      "2. Connaître le calendrier vaccinal élargi (PEV) en vigueur au Cameroun.",
      "3. Maîtriser les constantes vitales normales de l'adulte (tension, pouls, température, fréquence respiratoire)."
    ],
    ai_quiz: [
      { question: "Quel parasite est responsable du paludisme ?", answer: "Le Plasmodium (principalement Plasmodium falciparum au Cameroun)." },
      { question: "Quelle est la tension artérielle normale au repos chez l'adulte ?", answer: "Environ 120/80 mmHg (12/8 cmHg)." }
    ],
    kind: 'ancien_sujet',
    always_free: true,
  }
];

async function seed() {
  console.log(`Démarrage du seed : ${exams.length} épreuves réelles du supérieur camerounais (SN & Concours)...`);

  let insertedCount = 0;
  for (const doc of exams) {
    const query = `
      INSERT INTO public.documents (
        id, title, description, university, faculty, subject, teacher, level,
        academic_year, price_coins, page_count, file_path, preview_path, file_size,
        status, commission_rate, rating, sales_count, downloads_count, ai_summary,
        ai_tags, ai_difficulty, suggested_price_coins, quality_score, ai_study_plan,
        ai_quiz, created_at, updated_at, kind, always_free
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, NOW(), NOW(), $27, $28
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        university = EXCLUDED.university,
        faculty = EXCLUDED.faculty,
        subject = EXCLUDED.subject,
        teacher = EXCLUDED.teacher,
        level = EXCLUDED.level,
        academic_year = EXCLUDED.academic_year,
        price_coins = EXCLUDED.price_coins,
        page_count = EXCLUDED.page_count,
        file_path = EXCLUDED.file_path,
        status = EXCLUDED.status,
        ai_summary = EXCLUDED.ai_summary,
        ai_tags = EXCLUDED.ai_tags,
        ai_difficulty = EXCLUDED.ai_difficulty,
        quality_score = EXCLUDED.quality_score,
        ai_study_plan = EXCLUDED.ai_study_plan,
        ai_quiz = EXCLUDED.ai_quiz,
        kind = EXCLUDED.kind,
        always_free = EXCLUDED.always_free,
        updated_at = NOW();
    `;

    const values = [
      doc.id,
      doc.title,
      doc.description,
      doc.university,
      doc.faculty,
      doc.subject,
      doc.teacher,
      doc.level,
      doc.academic_year,
      doc.price_coins,
      doc.page_count,
      doc.file_path,
      null, // preview_path
      `${doc.page_count * 180} KB`,
      doc.status,
      doc.commission_rate,
      doc.rating,
      doc.sales_count,
      doc.downloads_count,
      doc.ai_summary,
      JSON.stringify(doc.ai_tags),
      doc.ai_difficulty,
      doc.suggested_price_coins,
      doc.quality_score,
      JSON.stringify(doc.ai_study_plan),
      JSON.stringify(doc.ai_quiz),
      doc.kind,
      doc.always_free,
    ];

    try {
      await pool.query(query, values);
      insertedCount++;
      console.log(`[OK] ${doc.id} -> ${doc.title}`);
    } catch (err) {
      console.error(`[ERREUR] ${doc.id} :`, err.message);
    }
  }

  console.log(`\nSuccès : ${insertedCount}/${exams.length} épreuves insérées et publiées dans public.documents !`);
}

seed()
  .catch(console.error)
  .finally(() => pool.end());
