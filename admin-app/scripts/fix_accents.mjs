import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  path.resolve(__dirname, '../../App.tsx'),
  path.resolve(__dirname, '../../src/features/documents/DocumentsScreen.tsx'),
  path.resolve(__dirname, '../../src/features/documents/DocumentEditorWebView.tsx'),
  path.resolve(__dirname, '../../src/features/onboarding/OnboardingScreen.tsx'),
  path.resolve(__dirname, '../../src/features/pdf/PdfStudentSection.tsx'),
];

// List of [wrong, correct] pairs — most specific first
const replacements = [
  // Full phrases first (more specific)
  ["souscrire a un abonnement", "souscrire à un abonnement"],
  ["S'abonner a Basic", "S'abonner à Basic"],
  ["S'abonner a Premium", "S'abonner à Premium"],
  ["Retour a la connexion", "Retour à la connexion"],
  ["Abonne-toi pour debloquer", "Abonne-toi pour débloquer"],
  ["Abonne-toi", "Abonnez-vous"],
  ["debloquer tous les documents", "débloquer tous les documents"],
  ["Abonnement active", "Abonnement activé"],
  ["Pack IA ajoute", "Pack IA ajouté"],
  ["credits IA ont ete mis a jour", "crédits IA ont été mis à jour"],
  ["Tes credits IA ont ete mis a jour", "Tes crédits IA ont été mis à jour"],
  ["Achat impossible", "Achat impossible"],
  ["Pack deja achete", "Pack déjà acheté"],
  ["Pack achete", "Pack acheté"],
  ["PDF achete", "PDF acheté"],
  ["Deja achete", "Déjà acheté"],
  ["Reessaie dans un instant", "Réessaie dans un instant"],
  ["Reessaie plus tard", "Réessaie plus tard"],
  ["Connecte-toi pour acheter ce PDF", "Connecte-toi pour acheter ce PDF"],
  ["Connecte-toi pour acheter ce pack", "Connecte-toi pour acheter ce pack"],
  ["Connecte-toi pour recharger ton wallet PDF", "Connecte-toi pour recharger ton wallet PDF"],
  ["Connecte-toi pour ouvrir ta bibliotheque", "Connecte-toi pour ouvrir ta bibliothèque"],
  ["Connecte-toi pour synchroniser", "Connecte-toi pour synchroniser"],
  ["Connecte-toi pour r\u00e9diger", "Connecte-toi pour rédiger"],
  ["Connecte-toi pour", "Connecte-toi pour"],
  ["Connexion via Google reussie", "Connexion via Google réussie"],
  ["mis a jour", "mis à jour"],
  ["Mettre a jour", "Mettre à jour"],
  ["mettre a jour", "mettre à jour"],
  ["Action recommandee", "Action recommandée"],
  ["Pack Recommande", "Pack Recommandé"],
  ["Recommande", "Recommandé"],
  ["recommandee", "recommandée"],
  ["Lecture securisee hors-ligne", "Lecture sécurisée hors-ligne"],
  ["Lecture securisee", "Lecture sécurisée"],
  ["securisee", "sécurisée"],
  ["Bibliotheque securisee", "Bibliothèque sécurisée"],
  ["Ouvrir ma bibliotheque", "Ouvrir ma bibliothèque"],
  ["ouvre ta bibliotheque", "ouvre ta bibliothèque"],
  ["dans ta bibliotheque", "dans ta bibliothèque"],
  ["ta bibliotheque", "ta bibliothèque"],
  ["Bibliotheque", "Bibliothèque"],
  ["bibliotheque", "bibliothèque"],
  ["generer des quiz", "générer des quiz"],
  ["Generer", "Générer"],
  ["generer", "générer"],
  ["achetes pour les relire", "achetés pour les relire"],
  ["documents achetes", "documents achetés"],
  ["debloques", "débloqués"],
  ["debloquer", "débloquer"],
  ["Debloque", "Débloqué"],
  ["debloque", "débloqué"],
  ["Reprendre ta revision", "Reprendre ta révision"],
  ["reprends ta revision", "reprends ta révision"],
  ["pour reviser plus vite", "pour réviser plus vite"],
  ["Tes revisions", "Tes révisions"],
  ["tes revisions", "tes révisions"],
  ["la revision", "la révision"],
  ["ta revision", "ta révision"],
  ["apres telechargement", "après téléchargement"],
  ["de telecharger", "de télécharger"],
  ["Telecharger", "Télécharger"],
  ["telecharger", "télécharger"],
  ["Etudiant Campus-Bordes", "Étudiant Campus-Bordes"],
  ["'Etudiant'", "'Étudiant'"],
  ["?? Etudiant", "?? Étudiant"],
  ["universite, filiere, matiere", "université, filière, matière"],
  ["universite, filiere et niveau", "université, filière et niveau"],
  ["Choisis ton universite", "Choisis ton université"],
  ["ton universite", "ton université"],
  ["Universites & Filieres", "Universités & Filières"],
  ["Universites", "Universités"],
  ["universite", "université"],
  ["Filiere", "Filière"],
  ["filiere", "filière"],
  ["Credits IA", "Crédits IA"],
  ["credits IA", "crédits IA"],
  ["Acces ILLIMITE", "Accès ILLIMITE"],
  ["Acces illimite", "Accès illimité"],
  ["Acces illimit", "Accès illimité"],
  ["Acces a TOUS", "Accès à TOUS"],
  ["Acces a tout", "Accès à tout"],
  ["Abonnements (Acces illimite PDF)", "Abonnements (Accès illimité PDF)"],
  ["Abonnement actif.", "Abonnement actif."],
  ["PDF debloques.", "PDF débloqués."],
  ["sans connexion apres", "sans connexion après"],
  ["Ajoute des coins puis reviens", "Ajoute des coins puis reviens"],
  ["Montant a ajouter", "Montant à ajouter"],
  ["vitesse superieure", "vitesse supérieure"],
  ["Passe a la", "Passe à la"],
  ["Creer un compte", "Créer un compte"],
  ["Creer mon espace", "Créer mon espace"],
  ["Creation du compte", "Création du compte"],
  ["Creation", "Création"],
  ["Connexion impossible", "Connexion impossible"],
  ["limite pour acheter", "limité pour acheter"],
  ["solde devient limite", "solde devient limité"],
  ["debut de session", "début de session"],
  ["lapp ", "l'app "],
  ["l application", "l'application"],
  ["hors catalogue", "hors catalogue"],
  // Fix broken encoded chars
  ["Recharge r\u00e9ussie", "Recharge réussie"],
  ["ajout\u00e9s via", "ajoutés via"],
  ["Choisis ta fili\u00e8re", "Choisis ta filière"],
  ["fili\u00e8re", "filière"],
  ["Sois alert\u00e9", "Sois alerté"],
  ["d\u00e8s qu'on", "dès qu'on"],
  // App.tsx specific
  ["Recherche par universite", "Recherche par université"],
  ["Abonnement active", "Abonnement activé"],
  ["l'application", "l'application"],
];

let totalFixed = 0;

for (const filePath of files) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixed = 0;

  for (const [wrong, correct] of replacements) {
    if (wrong === correct) continue;
    let newContent = content;
    // Replace all occurrences
    while (newContent.includes(wrong)) {
      newContent = newContent.replace(wrong, correct);
    }
    if (newContent !== content) {
      fileFixed++;
      content = newContent;
    }
  }

  if (fileFixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${fileFixed} issue(s) in: ${path.basename(filePath)}`);
    totalFixed += fileFixed;
  } else {
    console.log(`No issues in: ${path.basename(filePath)}`);
  }
}

console.log(`\nTotal replacements made: ${totalFixed}`);
