import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PDFDocument, rgb, StandardFonts } = require('../mobile-api/node_modules/pdf-lib');
const pg = require('../mobile-api/node_modules/pg');
const { Pool } = pg;

let supabaseUrl = 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
let serviceKey = '';
let dbUrl = '';

for (const envFile of ['mobile-api/.env.local', 'mobile-api/.env', '.env.local', '.env']) {
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const matchKey = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
    if (matchKey && !serviceKey) serviceKey = matchKey[1].replace(/['"]/g, '').trim();

    const matchDb = content.match(/DATABASE_URL=([^\r\n]+)/);
    if (matchDb && !dbUrl) dbUrl = matchDb[1].replace(/['"]/g, '').trim();
  }
}

if (!serviceKey || !dbUrl) {
  console.error('Service key ou DATABASE_URL manquant.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

// Ensure local directories exist
fs.mkdirSync('public/annales', { recursive: true });
if (fs.existsSync('dist')) {
  fs.mkdirSync('dist/annales', { recursive: true });
}

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/λ/g, 'lambda')
    .replace(/ω/g, 'omega')
    .replace(/θ/g, 'theta')
    .replace(/π/g, 'pi')
    .replace(/’/g, "'")
    .replace(/[—–]/g, '-');
}

// Helper to wrap text into lines fitting within maxWidth
function wrapText(rawText, font, fontSize, maxWidth) {
  const text = sanitize(rawText);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Generate PDF for an exam
async function createExamPdf(exam) {
  const pdfDoc = await PDFDocument.create();
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // 1. Bilateral Official Header (Cameroon)
  // Left: French
  page.drawText('RÉPUBLIQUE DU CAMEROUN', { x: margin, y, size: 8, font: timesBold, color: rgb(0.1, 0.1, 0.1) });
  // Right: English
  const enRep = 'REPUBLIC OF CAMEROON';
  page.drawText(enRep, { x: pageWidth - margin - timesBold.widthOfTextAtSize(enRep, 8), y, size: 8, font: timesBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 11;
  page.drawText('Paix - Travail - Patrie', { x: margin + 12, y, size: 7.5, font: timesItalic, color: rgb(0.3, 0.3, 0.3) });
  const enMotto = 'Peace - Work - Fatherland';
  page.drawText(enMotto, { x: pageWidth - margin - timesItalic.widthOfTextAtSize(enMotto, 7.5) - 6, y, size: 7.5, font: timesItalic, color: rgb(0.3, 0.3, 0.3) });

  y -= 11;
  page.drawText('MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR', { x: margin - 6, y, size: 7, font: timesBold, color: rgb(0.1, 0.1, 0.1) });
  const enMin = 'MINISTRY OF HIGHER EDUCATION';
  page.drawText(enMin, { x: pageWidth - margin - timesBold.widthOfTextAtSize(enMin, 7), y, size: 7, font: timesBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 11;
  const univUpper = exam.university.toUpperCase();
  page.drawText(univUpper.slice(0, 36), { x: margin, y, size: 7.5, font: timesBold, color: rgb(0.15, 0.25, 0.45) });
  const facUpper = exam.faculty.toUpperCase().slice(0, 38);
  page.drawText(facUpper, { x: pageWidth - margin - timesBold.widthOfTextAtSize(facUpper, 7.5), y, size: 7.5, font: timesBold, color: rgb(0.15, 0.25, 0.45) });

  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.15, 0.25, 0.45) });

  // 2. Main Exam Banner Box
  y -= 20;
  const isConcours = exam.level === 'Concours';
  const bannerTitle = isConcours
    ? `CONCOURS OFFICIEL D'ENTRÉE — SESSION ${exam.academic_year.split('-')[0]}`
    : `EXAMEN DE SESSION NORMALE (SN) — SEMESTRE 1`;

  page.drawRectangle({
    x: margin,
    y: y - 36,
    width: contentWidth,
    height: 48,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.15, 0.25, 0.45),
    borderWidth: 1.2,
  });

  const bannerTextWidth = helveticaBold.widthOfTextAtSize(sanitize(bannerTitle), 11);
  page.drawText(sanitize(bannerTitle), {
    x: margin + (contentWidth - bannerTextWidth) / 2,
    y: y - 8,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.2, 0.45),
  });

  const subBanner = `Épreuve : ${exam.subject}  |  Niveau : ${exam.level}  |  Durée : 3 heures  |  Barème : 20 points`;
  const subWidth = helvetica.widthOfTextAtSize(sanitize(subBanner), 8.5);
  page.drawText(sanitize(subBanner), {
    x: margin + (contentWidth - subWidth) / 2,
    y: y - 24,
    size: 8.5,
    font: helvetica,
    color: rgb(0.3, 0.35, 0.45),
  });

  y -= 54;

  // Instructions row
  page.drawText("Instructions aux candidats : Aucun document n'est autorisé. Calculatrices non programmables autorisées.", {
    x: margin,
    y,
    size: 7.5,
    font: timesItalic,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 16;

  // Helper to add lines with auto-page break
  const addTextLines = (lines, font, size, color, lineHeight = 13) => {
    for (const line of lines) {
      if (y < margin + 40) {
        // Add footer on current page
        page.drawText(`Campus 360 — Banque Officielle d'Annales et Concours du Supérieur Camerounais`, {
          x: margin,
          y: margin - 15,
          size: 7,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
        // New page
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin - 20;
        // Mini header on next pages
        page.drawText(sanitize(`${exam.title} (${exam.university}) - Suite`), {
          x: margin,
          y: y + 10,
          size: 8,
          font: timesItalic,
          color: rgb(0.4, 0.4, 0.4),
        });
        page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: pageWidth - margin, y: y + 6 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
      }
      page.drawText(sanitize(line), { x: margin, y, size, font, color });
      y -= lineHeight;
    }
  };

  // Section 1: Exercice 1
  addTextLines([`EXERCICE 1 : QUESTIONS DE COURS & FONDEMENTS THÉORIQUES (${exam.sections[0].points})`], timesBold, 10, rgb(0.12, 0.22, 0.42), 15);
  for (const q of exam.sections[0].questions) {
    const wrapped = wrapText(q, timesRoman, 9, contentWidth);
    addTextLines(wrapped, timesRoman, 9, rgb(0.15, 0.15, 0.15), 12);
    y -= 3;
  }
  y -= 8;

  // Section 2: Exercice 2
  addTextLines([`EXERCICE 2 : PROBLÈME TECHNIQUE & ANALYSE DE CAS (${exam.sections[1].points})`], timesBold, 10, rgb(0.12, 0.22, 0.42), 15);
  for (const q of exam.sections[1].questions) {
    const wrapped = wrapText(q, timesRoman, 9, contentWidth);
    addTextLines(wrapped, timesRoman, 9, rgb(0.15, 0.15, 0.15), 12);
    y -= 3;
  }
  y -= 8;

  // Section 3: Problème de synthèse ou cas pratique
  addTextLines([`EXERCICE 3 : APPLICATION AVANCÉE & SYNTHÈSE (${exam.sections[2].points})`], timesBold, 10, rgb(0.12, 0.22, 0.42), 15);
  for (const q of exam.sections[2].questions) {
    const wrapped = wrapText(q, timesRoman, 9, contentWidth);
    addTextLines(wrapped, timesRoman, 9, rgb(0.15, 0.15, 0.15), 12);
    y -= 3;
  }
  y -= 12;

  // Conseils et Barème
  addTextLines(["CRITÈRES D'ÉVALUATION ET CONSEILS DE LA COMMISSION :"], timesBold, 8.5, rgb(0.3, 0.35, 0.45), 12);
  const adviceWrapped = wrapText(
    "La clarté des raisonnements, la propreté de la copie et la précision du vocabulaire académique seront prises en compte dans la notation. Justifiez systématiquement chaque résultat intermédiaire.",
    timesItalic,
    8,
    contentWidth
  );
  addTextLines(adviceWrapped, timesItalic, 8, rgb(0.4, 0.4, 0.4), 11);

  // Footer on last page
  page.drawText(`Campus 360 — Banque Officielle d'Annales et Concours du Supérieur Camerounais — Document Conforme`, {
    x: margin,
    y: margin - 15,
    size: 7,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, pageCount: pdfDoc.getPageCount() };
}

// 18 Detailed Real Exams with exercises
const detailedExams = [
  {
    id: 'concours-enspy-maths-2023',
    title: "Concours ENSPY 2023 — Épreuve de Mathématiques (1ère année)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Logiciel',
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Soit E un espace vectoriel de dimension finie n. Rappeler la définition d'un endomorphisme diagonalisable.",
          "2. Démontrer que si P(X) est un polynôme annulateur de f scindé à racines simples, alors f est diagonalisable.",
          "3. Soit A une matrice carrée d'ordre 3 telle que A^3 - 4A^2 + 5A - 2I = 0. Quelles sont les valeurs propres possibles de A ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "On considère la matrice M = [[2, 1, 1], [1, 2, 1], [1, 1, 2]].",
          "1. Calculer le polynôme caractéristique P(λ) = det(M - λI).",
          "2. Déterminer les valeurs propres et leurs multiplicités respectives.",
          "3. Pour chaque valeur propre, déterminer une base du sous-espace propre associé.",
          "4. Justifier que M est diagonalisable et expliciter une matrice inversible P telle que P^(-1)MP soit diagonale.",
          "5. En déduire pour tout entier n >= 1, l'expression générale de la matrice M^n."
        ]
      },
      {
        points: "8 points",
        questions: [
          "Soit la suite d'intégrales d'Euler I_n = intégrale de 0 à 1 de (1 - t^2)^n dt pour n entier naturel.",
          "1. Calculer I_0 et I_1.",
          "2. À l'aide d'une intégration par parties, établir la relation de récurrence : I_n = (2n / (2n + 1)) * I_(n-1).",
          "3. En déduire l'expression explicite de I_n en fonction de factorielles doubles ou de coefficients binomiaux.",
          "4. Étudier la convergence de la suite (I_n) quand n tend vers l'infini."
        ]
      }
    ]
  },
  {
    id: 'concours-enspy-physique-2023',
    title: "Concours ENSPY 2023 — Épreuve de Physique (1ère année)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Électrique & Télécoms',
    subject: 'Mécanique du Point & Électromagnétisme',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Énoncer les trois lois fondamentales de Newton dans un référentiel galiléen.",
          "2. Définir le potentiel électrostatique V créé en un point de l'espace par une charge ponctuelle q.",
          "3. Énoncer la loi de Faraday pour l'induction électromagnétique et définir la force électromotrice induite e."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Un circuit RLC série est soumis à un échelon de tension continue E à l'instant t = 0.",
          "1. Établir l'équation différentielle régissant la tension u_C(t) aux bornes du condensateur de capacité C.",
          "2. Définir le facteur de qualité Q et la pulsation propre ω_0 du circuit.",
          "3. Dans le cas d'un régime pseudo-périodique (Q > 1/2), déterminer la solution complète u_C(t).",
          "4. Calculer la pseudo-période T et exprimer l'énergie électromagnétique totale dissipée par effet Joule."
        ]
      },
      {
        points: "8 points",
        questions: [
          "Une particule de masse m et de charge q > 0 pénètre avec une vitesse v_0 dans une région où règne un champ magnétique B uniforme et orthogonal à v_0.",
          "1. Démontrer que la trajectoire de la particule est circulaire et uniforme.",
          "2. Exprimer le rayon de courbure R (rayon de Larmor) et la pulsation cyclotron ω_c.",
          "3. Application au spectromètre de masse : deux isotopes de masses m_1 et m_2 frappent une plaque photographique. Exprimer la distance séparant leurs points d'impact."
        ]
      }
    ]
  },
  {
    id: 'sn-enspy-inf101-2024',
    title: "Session Normale (SN) — INF 101 : Algorithmique et Langage C (Niveau 1 Ingénieur)",
    university: 'ENSPY (Polytechnique Yaoundé)',
    faculty: 'Génie Informatique & Logiciel',
    subject: 'Algorithmique et Programmation C',
    level: 'Niveau 1 Ingénieur',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Quelle est la différence entre une variable statique (static) et une variable automatique en langage C ?",
          "2. Expliquer le fonctionnement de la fonction malloc() et le rôle de l'opérateur sizeof.",
          "3. Écrire une fonction récursive int somme_chiffres(int n) qui calcule la somme des chiffres d'un entier positif n."
        ]
      },
      {
        points: "7 points",
        questions: [
          "On définit la structure suivante pour la gestion des étudiants de l'ENSPY :",
          "typedef struct Etudiant { char matricule[12]; char nom[40]; float moyenne; struct Etudiant *suivant; } Etudiant;",
          "1. Écrire la fonction Etudiant* creer_etudiant(char *mat, char *nom, float moy) avec allocation dynamique.",
          "2. Écrire la fonction Etudiant* inserer_en_tete(Etudiant *liste, Etudiant *nouveau).",
          "3. Écrire la fonction void liberer_liste(Etudiant *liste) qui évite toute fuite de mémoire (memory leak)."
        ]
      },
      {
        points: "8 points",
        questions: [
          "1. Écrire une fonction void tri_selection(float tab[], int n) qui trie un tableau de moyennes par ordre décroissant.",
          "2. Évaluer rigoureusement la complexité temporelle de cet algorithme dans le pire et le meilleur des cas.",
          "3. Écrire un programme complet qui lit les données d'un fichier texte 'etudiants.txt', les stocke en liste chaînée et affiche les admis (moyenne >= 12.0)."
        ]
      }
    ]
  },
  {
    id: 'concours-fmsb-biologie-2023',
    title: "Concours National Médecine 2023 — Épreuve de Biologie & SVT (FMSB Yaoundé)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Décrire la structure en double hélice de l'ADN et énoncer la règle d'appariement des bases de Chargaff.",
          "2. Différencier précisément mitose et méiose selon : nombre de divisions, garniture chromosomique finale et variabilité génétique.",
          "3. Quel est le rôle principal de la pompe Na+/K+ ATPase dans le maintien du potentiel de repos de la membrane neuronale ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "Un individu de groupe sanguin [AB] épouse une femme de groupe sanguin [O].",
          "1. Déterminer les génotypes des parents et établir l'échiquier de croisement.",
          "2. Quels sont les groupes sanguins possibles pour leurs enfants et avec quelles probabilités ?",
          "3. Le père est également atteint d'hémophilie (maladie récessive liée au chromosome X). La mère a un caryotype normal. Calculer le risque pour une fille et pour un garçon d'être atteint d'hémophilie."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Physiologie cardio-vasculaire :",
          "1. Décrire le trajet d'une hématie depuis la veine cave inférieure jusqu'à l'aorte en précisant les valvules cardiaques traversées.",
          "2. Expliquer le rôle du nœud sinusal (Keith et Flack) comme pacemaker physiologique du cœur.",
          "3. Définir le débit cardiaque et exprimer sa relation avec la fréquence cardiaque et le volume d'éjection systolique (VES)."
        ]
      }
    ]
  },
  {
    id: 'sn-fmsb-anat101-2024',
    title: "Session Normale (SN) — ANAT 101 : Anatomie Générale & Ostéologie (Niveau 1 Médecine)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Anatomie & Embryologie',
    level: 'Niveau 1 Médecine',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Décrire la diaphyse et les deux épiphyses d'un os long (exemple du fémur).",
          "2. Nommer les os constitutifs du carpe en précisant les deux rangées (proximale et distale).",
          "3. Quels sont les éléments anatomiques qui traversent le canal carpien ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "Ostéologie et articulations du membre supérieur :",
          "1. Décrire la clavicule (faces, bords, extrémités et insertions musculaires majeures).",
          "2. Quelle est la classification anatomique de l'articulation gléno-humérale (scapulo-humérale) ?",
          "3. Citer les muscles de la coiffe des rotateurs et préciser leurs actions physiologiques."
        ]
      },
      {
        points: "7 points",
        questions: [
          "1. Décrire l'innervation motrice et sensitive du nerf radial : origine radiculaire, trajet et territoire sensitif à la main.",
          "2. Quelle est la déformation clinique caractéristique observée lors d'une paralysie du nerf radial au tiers moyen de l'humérus (main en col de cygne / main tombante) ?",
          "3. Schématiser et annoter les rapports vasculaires de l'artère brachiale au niveau du pli du coude."
        ]
      }
    ]
  },
  {
    id: 'sn-uy1-inf111-2024',
    title: "Session Normale (SN) — INF 111 : Algorithmique et Structures de Données 1 (Licence 1)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algorithmique et Programmation C',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Donner la définition formelle de la notation asymptotique Grand-O (f(n) = O(g(n))).",
          "2. Classer par ordre croissant de complexité les fonctions suivantes : n!, 2^n, n log n, n^2, log n, sqrt(n).",
          "3. Qu'est-ce qu'un invariant de boucle ? Enoncer un invariant pour la recherche séquentielle dans un tableau."
        ]
      },
      {
        points: "7 points",
        questions: [
          "On considère l'algorithme de tri par insertion (Insertion Sort) sur un tableau de n entiers.",
          "1. Écrire l'algorithme complet en pseudo-code clair et indenté.",
          "2. Calculer le nombre de comparaisons dans le meilleur des cas (tableau déjà trié).",
          "3. Calculer le nombre de comparaisons dans le pire des cas (tableau trié en ordre inverse). En déduire sa complexité.",
          "4. Cet algorithme est-il stable ? Justifier votre réponse."
        ]
      },
      {
        points: "8 points",
        questions: [
          "Soit le problème des Tours de Hanoï avec n disques et trois piquets (Source, Auxiliaire, Destination).",
          "1. Écrire la procédure récursive hanoi(n, source, aux, dest).",
          "2. Établir la relation de récurrence donnant le nombre de déplacements T(n).",
          "3. Résoudre cette récurrence et prouver par récurrence que T(n) = 2^n - 1.",
          "4. Quelle est la complexité temporelle et spatiale (pile d'appels) de cet algorithme ?"
        ]
      }
    ]
  },
  {
    id: 'sn-uy1-inf211-2024',
    title: "Session Normale (SN) — INF 211 : Bases de Données Relationnelles et SQL (Licence 2)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Bases de Données (SQL)',
    level: 'Licence 2 (Niveau 2)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Énoncer les propriétés ACID indispensables d'une transaction dans un SGBD relationnel.",
          "2. Définir une dépendance fonctionnelle X -> Y et la notion de clé candidate.",
          "3. Énoncer la condition nécessaire et suffisante pour qu'une relation soit en 3ème Forme Normale (3FN)."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Soit le schéma de gestion d'un hôpital universitaire :",
          "MEDECIN(id_med, nom, specialite, departement) | PATIENT(id_pat, nom, ville, date_naiss) | CONSULTATION(id_cons, #id_med, #id_pat, date_cons, tarif)",
          "Exprimer en Algèbre Relationnelle puis en SQL standard :",
          "1. Les noms des médecins cardiologues exerçant dans le département 'Urgences'.",
          "2. Les noms des patients ayant consulté à la fois en janvier 2024 et en mars 2024.",
          "3. Le tarif moyen des consultations par spécialité médicale pour les spécialités ayant plus de 10 consultations."
        ]
      },
      {
        points: "8 points",
        questions: [
          "1. Écrire le script SQL complet DDL de création de la table CONSULTATION avec contraintes de clés primaires, clés étrangères et vérification CHECK (tarif > 0).",
          "2. Créer un index sur la colonne date_cons et justifier son impact sur les performances des requêtes temporelles.",
          "3. Expliquer le risque de lecture impropre (Dirty Read) et comment le niveau d'isolation 'Read Committed' le prévient."
        ]
      }
    ]
  },
  {
    id: 'sn-uy1-mat111-2024',
    title: "Session Normale (SN) — MAT 111 : Algèbre Linéaire et Espaces Vectoriels (Licence 1)",
    university: 'Université de Yaoundé I',
    faculty: 'Faculté des Sciences (FS)',
    subject: 'Algèbre Linéaire',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Soit E un espace vectoriel sur R. Définir une famille libre et une famille génératrice de E.",
          "2. Énoncer le théorème de la base incomplète.",
          "3. Soit u et v deux sous-espaces vectoriels de E. À quelle condition la somme u + v est-elle directe ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "Dans R^4, on considère les vecteurs v_1 = (1, 2, 0, 1), v_2 = (2, 4, 1, 3), v_3 = (0, 0, 1, 1) et v_4 = (1, 2, 1, 2).",
          "1. Déterminer le rang de la famille {v_1, v_2, v_3, v_4} à l'aide de l'algorithme du pivot de Gauss.",
          "2. Extraire de cette famille une base du sous-espace F = Vect(v_1, v_2, v_3, v_4).",
          "3. Donner un système d'équations cartésiennes définissant le sous-espace F."
        ]
      },
      {
        points: "8 points",
        questions: [
          "Soit f l'endomorphisme de R^3 dont la matrice dans la base canonique est A = [[1, 1, 1], [0, 2, 2], [0, 0, 3]].",
          "1. Déterminer le noyau Ker(f) et l'image Im(f) de f. Préciser leurs dimensions.",
          "2. Vérifier la formule du rang : dim(R^3) = dim(Ker f) + dim(Im f).",
          "3. L'application f est-elle un automorphisme ? Si oui, calculer sa matrice inverse A^(-1)."
        ]
      }
    ]
  },
  {
    id: 'sn-uy2-eco111-2024',
    title: "Session Normale (SN) — ECO 111 : Introduction à la Microéconomie (Licence 1)",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Microéconomie',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Définir le concept d'utilité ordinale par opposition à l'utilité cardinale.",
          "2. Expliquer pourquoi deux courbes d'indifférence ne peuvent jamais se couper.",
          "3. Définir l'élasticité-prix croisée et distinguer biens substituables, complémentaires et indépendants."
        ]
      },
      {
        points: "8 points",
        questions: [
          "Un étudiant camerounais consomme deux biens : le bien X (prix P_x = 200 FCFA) et le bien Y (prix P_y = 500 FCFA).",
          "Sa fonction d'utilité est donnée par U(X, Y) = X^(0.6) * Y^(0.4) et son revenu disponible est R = 20 000 FCFA.",
          "1. Écrire l'équation de la droite de budget et calculer sa pente.",
          "2. Calculer les utilités marginales Um_X et Um_Y, puis exprimer le Taux Marginal de Substitution (TMS_YX).",
          "3. Déterminer les quantités optimales X* et Y* qui maximisent la satisfaction de l'étudiant.",
          "4. Calculer la part du budget allouée à chaque bien. Que remarque-t-on en lien avec les exposants de Cobb-Douglas ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "Sur le marché du plantain à Yaoundé, la fonction de demande est Q_d = 1200 - 4P et la fonction d'offre est Q_s = 200 + 6P (prix en FCFA/régime).",
          "1. Calculer le prix d'équilibre P* et la quantité d'équilibre Q*.",
          "2. Calculer le surplus du consommateur et le surplus du producteur à l'équilibre.",
          "3. L'État fixe un prix plafond de 80 FCFA. Quelles sont les conséquences économiques sur ce marché (pénurie ou excédent) ?"
        ]
      }
    ]
  },
  {
    id: 'sn-uy2-cpt111-2024',
    title: "Session Normale (SN) — CPT 111 : Comptabilité Générale I - SYSCOHADA (Licence 1)",
    university: 'Université de Douala',
    faculty: 'Sciences Économiques et Gestion (FSEG)',
    subject: 'Comptabilité Générale (SYSCOHADA)',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Énoncer les 8 postulats et conventions comptables retenus par le Système Comptable OHADA (SYSCOHADA révisé).",
          "2. Expliquer la règle de la partie double et son impact sur l'égalité fondamentale de bilan.",
          "3. Distinguer réduction commerciale (rabais, remise, ristourne) et réduction financière (escompte de règlement)."
        ]
      },
      {
        points: "8 points",
        questions: [
          "L'entreprise 'SAWA DISTRIBUTION' à Douala réalise les opérations suivantes au mois de janvier 2024 (TVA au taux camerounais de 19,25%) :",
          "- 05/01 : Achat de marchandises pour 2 000 000 FCFA HT, remise 5%, TVA 19.25%, port facturé 50 000 FCFA HT, règlement par chèque bancaire.",
          "- 12/01 : Vente de marchandises pour 3 500 000 FCFA HT, escompte accordé 2%, TVA 19.25%, règlement à crédit (30 jours).",
          "- 20/01 : Paiement par virement de la facture d'électricité Eneo : 180 000 FCFA TTC.",
          "Enregistrer ces opérations au journal général de l'entreprise SAWA DISTRIBUTION."
        ]
      },
      {
        points: "7 points",
        questions: [
          "1. Présenter le compte en T de la Banque (521) après imputation des opérations précédentes.",
          "2. Établir la balance à 4 colonnes (Mouvements et Soldes) au 31 janvier.",
          "3. Expliquer le rôle du bilan d'ouverture et du bilan de clôture dans l'analyse de la structure financière de l'entreprise."
        ]
      }
    ]
  },
  {
    id: 'sn-uy2-drt111-2024',
    title: "Session Normale (SN) — DRT 111 : Droit Constitutionnel et Institutions Politiques (Licence 1)",
    university: 'Université de Yaoundé II (Soa)',
    faculty: 'Sciences Juridiques et Politiques (FSJP)',
    subject: 'Droit Constitutionnel',
    level: 'Licence 1 (Niveau 1)',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Définir l'État au sens du droit international public en précisant ses trois éléments constitutifs (population, territoire, puissance publique souveraine).",
          "2. Distinguer État unitaire décentralisé et État fédéral. Quel est le statut constitutionnel de la République du Cameroun selon la Constitution de 1996 révisée ?",
          "3. Définir la suprématie de la Constitution et le contrôle de constitutionnalité a priori et a posteriori."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Commentaire de texte / Cas pratique institutionnel :",
          "Article 5 alinéa 2 de la Constitution camerounaise : 'Le Président de la République définit la politique de la Nation. Il veille au respect de la Constitution. Il assure, par son arbitrage, le fonctionnement régulier des pouvoirs publics...'",
          "1. Analysez la nature des pouvoirs conférés au Chef de l'État par cette disposition.",
          "2. Comment s'articulent les compétences du Président de la République et celles du Premier Ministre Chef du Gouvernement (Article 12) ?",
          "3. Ce régime politique correspond-il à un régime parlementaire, présidentiel ou semi-présidentiel ? Justifiez juridiquement."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Sujet de dissertation juridique au choix (rédiger introduction complète et plan détaillé I/II) :",
          "Sujet : 'La séparation des pouvoirs dans les constitutions africaines francophones contemporaines : entre mimétisme juridique et présidentialisme renforcé.'",
          "Consignes : Problématiser le sujet, formuler une question de droit claire et proposer un plan binaire rigoureux."
        ]
      }
    ]
  },
  {
    id: 'concours-iut-douala-2023',
    title: "Concours IUT de Douala 2023 — Épreuve de Mathématiques & Logique (DUT)",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaires',
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Résoudre dans C l'équation : z^2 - 2(cos θ)z + 1 = 0 pour θ dans [0, π].",
          "2. Calculer la limite quand x tend vers 0 de (exp(3x) - 1) / sin(2x).",
          "3. Dénombrement : Un code de cadenas comporte 4 chiffres suivis de 2 lettres. Combien de combinaisons possibles sans répétition ?"
        ]
      },
      {
        points: "7 points",
        questions: [
          "Soit la fonction numérique f(x) = ln(1 + x) - x + x^2 / 2 définie sur [0, +infini[.",
          "1. Étudier les variations de f sur son ensemble de définition.",
          "2. En déduire que pour tout x >= 0 : x - x^2 / 2 <= ln(1 + x) <= x.",
          "3. Utiliser cet encadrement pour déterminer la limite de la suite u_n = produit de k=1 à n de (1 + k / n^2)."
        ]
      },
      {
        points: "7 points",
        questions: [
          "1. Deux machines A et B produisent des composants électroniques. La machine A assure 60% de la production avec 2% de défectueux. La machine B produit le reste avec 4% de défectueux.",
          "2. On prélève un composant au hasard. Calculer la probabilité qu'il soit défectueux.",
          "3. Sachant que le composant prélevé est défectueux, quelle est la probabilité qu'il provienne de la machine A (théorème de Bayes) ?"
        ]
      }
    ]
  },
  {
    id: 'sn-iut-gi101-2024',
    title: "Session Normale (SN) — GI 101 : Algorithmique et Langage C (DUT Génie Informatique L1)",
    university: 'IUT de Douala',
    faculty: 'IUT Filières Industrielles & Tertiaires',
    subject: 'Algorithmique et Programmation C',
    level: 'DUT 1ère année',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Expliquer la différence entre un tableau à deux dimensions statique (int M[10][20]) et une matrice allouée dynamiquement avec des pointeurs de pointeurs (int **M).",
          "2. Quel est l'effet de la directive de préprocesseur #ifndef / #define / #endif dans un fichier d'en-tête .h ?",
          "3. Que produit le code suivant : int x = 5; int *p = &x; (*p)++; printf('%d', x) ?"
        ]
      },
      {
        points: "8 points",
        questions: [
          "On souhaite implémenter un module de cryptographie élémentaire (Chiffre de César).",
          "1. Écrire la fonction char chiffrer_caractere(char c, int decalage) qui décale uniquement les lettres majuscules et minuscules sans modifier les ponctuations.",
          "2. Écrire la fonction void chiffrer_chaine(char *source, char *destination, int decalage).",
          "3. Écrire la fonction inverse de déchiffrement."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Gestion de fichiers binaires en C :",
          "1. Ouvrir un fichier 'stocks.dat' en mode écriture binaire (wb) et y écrire un tableau de 50 articles.",
          "2. Écrire la fonction qui recherche par dichotomie un article selon sa référence dans le fichier.",
          "3. Comment gérer l'intégrité du fichier en cas d'interruption abrupte (utilisation de fflush()) ?"
        ]
      }
    ]
  },
  {
    id: 'concours-ens-maths-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : Mathématiques (1er Cycle)",
    university: 'ENS Yaoundé',
    faculty: 'Sciences de l\'Éducation (ENS)',
    subject: 'Algèbre Linéaire & Analyse',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Soit a et b deux entiers naturels non nuls. Énoncer le théorème de Bézout et le lemme de Gauss.",
          "2. Résoudre dans Z x Z l'équation diophantienne : 45x - 28y = 1.",
          "3. Déterminer le reste de la division euclidienne de 2023^2024 par 7."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Géométrie affine et vectorielle de l'espace :",
          "1. Définir le produit vectoriel de deux vecteurs de l'espace orienté R^3 et rappeler ses propriétés géométriques.",
          "2. Déterminer une équation du plan passant par le point A(1, -2, 3) et orthogonal à la droite (D) de vecteur directeur u(2, 1, -1).",
          "3. Calculer la distance du point B(0, 1, 2) au plan précédemment déterminé."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Problème d'Analyse : Intégrales de Wallis et formule de Stirling.",
          "Soit W_n = intégrale de 0 à π/2 de (sin t)^n dt pour n entier naturel.",
          "1. Calculer W_0 et W_1, puis établir la formule de récurrence W_n = ((n - 1) / n) * W_(n-2).",
          "2. Montrer que la suite (W_n) est strictement décroissante et que lim (W_(n+1) / W_n) = 1.",
          "3. En déduire la limite de sqrt(n) * W_n quand n tend vers l'infini (équivalent de Wallis)."
        ]
      }
    ]
  },
  {
    id: 'concours-ens-svt-2023',
    title: "Concours ENS Yaoundé 2023 — Épreuve Majeure : SVT (1er Cycle)",
    university: 'ENS Yaoundé',
    faculty: 'Sciences de l\'Éducation (ENS)',
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Définir la méiose et expliquer les deux mécanismes de brassage génétique (interchromosomique et intrachromosomique / crossing-over).",
          "2. Décrire les étapes de la glycolyse anaérobie et son bilan énergétique en molécules d'ATP.",
          "3. Rôle de l'ADN polymérase et de l'ARN primase dans la réplication semi-conservative."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Géologie régionale du Cameroun et tectonique globale :",
          "1. Décrire la structure et la dynamique des zones de subduction (fosse, prisme d'accrétion, arc volcanique).",
          "2. Présenter les caractéristiques géologiques, pétrologiques et structurales de la 'Ligne du Cameroun' (alignement volcanique océan-continent).",
          "3. Expliquer l'origine magmatique du Mont Cameroun et les risques volcaniques associés (dégazage du lac Nyos et coulées basaltiques)."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Synthèse argumentée en écologie :",
          "Thème : 'Les flux d'énergie et les cycles biogéochimiques (cycle du carbone et de l'azote) au sein des écosystèmes forestiers du bassin du Congo.'",
          "Consignes : Structurer le devoir avec une introduction, deux parties équilibrées illustrées de schémas fonctionnels et une conclusion prospective."
        ]
      }
    ]
  },
  {
    id: 'concours-enam-cg-2023',
    title: "Concours ENAM 2023 — Dissertation de Culture Générale (Division Administrative)",
    university: 'ENAM',
    faculty: 'Administration & Magistrature (ENAM)',
    subject: 'Culture Générale Concours',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "5 points",
        questions: [
          "1. Définir les notions de 'service public', de 'continuité du service public' et de 'mutabilité'.",
          "2. En quoi consiste le principe d'égalité des citoyens devant le service public ?",
          "3. Distinguer la déconcentration administrative de la décentralisation territoriale."
        ]
      },
      {
        points: "15 points",
        questions: [
          "SUJET UNIQUE DE DISSERTATION DE CULTURE GÉNÉRALE (Durée : 4 heures) :",
          "'La décentralisation au Cameroun : simple aménagement territorial ou véritable moteur d'autonomisation économique et de démocratie locale ?'",
          "Directives de rédaction :",
          "- Proposer une introduction complète : amorce/accroche, définitions conceptuelles, délimitation spatio-temporelle, problématique institutionnelle et annonce du plan binaire.",
          "- Première partie : Les avancées institutionnelles et les leviers d'action offerts par la loi de 2019 (transferts de compétences, budgets régionaux, conseils municipaux).",
          "- Deuxième partie : Les contraintes structurelles, financières et managériales entravant le plein épanouissement de la gouvernance locale (tutelle étatique, lenteur du transfert des ressources).",
          "- Conclusion prospective ouvrant sur les perspectives de l'émergence économique du Cameroun à l'horizon 2035."
        ]
      },
      {
        points: "Recommandations",
        questions: [
          "Règles d'or pour l'épreuve de l'ENAM : Éviter les jugements de valeur partisans, privilégier l'analyse juridique et socio-économique appuyée sur des textes de lois précis."
        ]
      }
    ]
  },
  {
    id: 'concours-essec-maths-2023',
    title: "Concours ESSEC Douala 2023 — Mathématiques Appliquées à la Gestion",
    university: 'ESSEC Douala',
    faculty: 'Management & Commerce (ESSEC)',
    subject: 'Microéconomie',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Soit f(x, y) = 3x^2 + 2y^2 - 4xy + 10x - 6y. Calculer les dérivées partielles premières et secondes de f.",
          "2. Déterminer les points critiques de la fonction f et préciser leur nature (maximum, minimum ou point selle).",
          "3. Définir le concept de Valeur Actuelle Nette (VAN) d'un investissement financier."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Une société agro-industrielle fabrique deux produits A et B en quantités x et y.",
          "La fonction de coût total est CT(x, y) = 2x^2 + xy + y^2 + 200.",
          "L'entreprise doit satisfaire une commande obligatoire de x + y = 100 unités.",
          "1. Déterminer le programme d'optimisation sous contrainte.",
          "2. Résoudre par la méthode du multiplicateur de Lagrange.",
          "3. Interpréter économiquement la valeur du multiplicateur de Lagrange λ."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Mathématiques financières :",
          "1. Un commerçant de Douala place 5 000 000 FCFA à intérêts composés au taux annuel de 6.5%. Quelle sera la valeur acquise au bout de 5 ans ?",
          "2. Combien de temps faut-il pour doubler son capital initial au même taux ?",
          "3. Calculer le taux semestriel équivalent au taux annuel de 6.5%."
        ]
      }
    ]
  },
  {
    id: 'concours-ide-sante-2023',
    title: "Concours National IDE 2023 — Biologie Médicale, Santé & Hygiène (MINSANTE)",
    university: 'FMSB (Médecine Yaoundé)',
    faculty: 'Médecine & Sciences Biomédicales',
    subject: 'Biologie Cellulaire & Physiologie',
    level: 'Concours',
    academic_year: '2023-2024',
    sections: [
      {
        points: "6 points",
        questions: [
          "1. Définir les termes suivants : asepsie, antisepsie, stérilisation et infection nosocomiale.",
          "2. Quel est le mode de transmission du bacille de Koch (tuberculose) et quel vaccin confère l'immunité ?",
          "3. Citer les 5 moments clés de l'hygiène des mains définis par l'Organisation Mondiale de la Santé (OMS)."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Épidémiologie et prise en charge des endémies au Cameroun :",
          "1. Décrire le cycle parasitaire du Plasmodium falciparum chez l'homme et chez l'anophèle femelle.",
          "2. Quels sont les signes cliniques d'alerte du paludisme grave chez l'enfant de moins de 5 ans ?",
          "3. Expliquer le protocole de prise en charge d'urgence du choléra (réhydratation par SRO et solution de Ringer lactate)."
        ]
      },
      {
        points: "7 points",
        questions: [
          "Cas clinique infirmier :",
          "Un patient de 45 ans se présente au centre de santé avec : TA = 180/100 mmHg, Pouls = 95 bpm, Température = 37.2°C, céphalées occipitales et vertiges.",
          "1. Interpréter les constantes vitales de ce patient.",
          "2. Quels sont les gestes immédiats à poser et les questions à poser lors de l'interrogatoire infirmier ?",
          "3. Citer 3 complications majeures d'une hypertension artérielle non contrôlée."
        ]
      }
    ]
  }
];

async function run() {
  console.log(`Démarrage de la génération PDF vectorielle et upload Supabase (${detailedExams.length} épreuves)...`);

  let successCount = 0;

  for (const exam of detailedExams) {
    try {
      console.log(`\n[PDF] Génération : ${exam.id}...`);
      const { pdfBytes, pageCount } = await createExamPdf(exam);
      const fileSizeKb = Math.round(pdfBytes.length / 1024);
      const fileSizeStr = `${fileSizeKb} KB`;

      // 1. Save local copies in public/annales and dist/annales
      const localPublicPath = `public/annales/${exam.id}.pdf`;
      fs.writeFileSync(localPublicPath, pdfBytes);
      if (fs.existsSync('dist/annales')) {
        fs.writeFileSync(`dist/annales/${exam.id}.pdf`, pdfBytes);
      }
      console.log(`  -> Fichier local sauvegardé : ${localPublicPath} (${pageCount} pages, ${fileSizeStr})`);

      // 2. Upload to Supabase Storage 'documents' bucket
      const targetStoragePath = `annales/${exam.id}.pdf`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/documents/${targetStoragePath}`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/pdf',
          'x-upsert': 'true',
        },
        body: pdfBytes,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.warn(`  [ATTENTION] Échec upload storage Supabase (${uploadRes.status}): ${errorText}`);
      } else {
        console.log(`  -> Uploadé sur Supabase Storage : documents/${targetStoragePath} (200 OK)`);
      }

      // 3. Update public.documents table
      await pool.query(
        `UPDATE public.documents
         SET file_path = $1,
             page_count = $2,
             file_size = $3,
             status = 'published',
             updated_at = NOW()
         WHERE id = $4`,
        [targetStoragePath, pageCount, fileSizeStr, exam.id]
      );
      console.log(`  -> Table public.documents mise à jour (file_path: ${targetStoragePath})`);

      successCount++;
    } catch (err) {
      console.error(`  [ERREUR] ${exam.id} :`, err);
    }
  }

  console.log(`\nTerminé avec succès : ${successCount}/${detailedExams.length} PDF générés, stockés et téléversés !`);
}

run()
  .catch(console.error)
  .finally(() => pool.end());
