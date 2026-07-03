export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  authorRole: string;
  publishedAt: string; // ISO
  readingMinutes: number;
  tags: string[];
  content: string; // simple markdown-ish
  cover?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "reviser-bac-en-30-jours",
    title: "Comment réviser le BAC en 30 jours : la méthode Campus 360",
    description:
      "30 jours, 12 matières, zéro panique. La méthode structurée que des centaines d'étudiants ont appliquée pour valider leur BAC.",
    category: "Méthodo",
    author: "Aïcha M.",
    authorRole: "Tutrice Campus 360",
    publishedAt: "2026-06-15",
    readingMinutes: 8,
    tags: ["BAC", "révisions", "méthodo"],
    content: `Le BAC approche, t'as 30 jours devant toi et 12 matières à couvrir. C'est faisable. Voici exactement comment on a accompagné 340 étudiants vers la réussite l'an dernier.

## Pourquoi la plupart échouent

Trois erreurs classiques :
- **Tout réviser en même temps** → fatigue, confusion
- **Révise sans s'entraîner** → illusion de maîtrise
- **Compter les heures au lieu de mesurer la progression**

## La méthode Campus 360 en 5 étapes

### 1. Diagnostique (Jours 1-2)
Fais une annale complète par matière. Note ton score honnêtement. C'est ta baseline.

### 2. Plan de bataille (Jours 2-3)
Classe les matières en 3 groupes :
- 🟢 Solides (8/10 et plus) → 1h/jour d'entretien
- 🟡 Fragiles (5-7/10) → 2h/jour
- 🔴 Critiques (moins de 5/10) → 3h/jour

### 3. Boucle 25/5
Travaille par blocs de 25 minutes. Pause 5. Pas de téléphone. Notre app a un timer intégré.

### 4. Fiches au lieu de notes
Pour chaque chapitre, produis UNE fiche recto-verso. Mots-clés, formules, exemples. Utilise l'IA Campus 360 pour les générer à partir de tes PDFs.

### 5. Annales chronométrées
À partir du Jour 10, une annale par jour en conditions réelles.

## Planning type (exemple : S série C)

| Heure | Matin | Soir |
|---|---|---|
| 6h30-7h30 | Maths (annale) | — |
| 8h-12h | Cours | — |
| 14h-17h | Cours | — |
| 19h-20h | Physique | Fiches |
| 20h30-21h30 | SVT | — |
| 22h-22h30 | Philo (fiches) | — |

## Le secret qui change tout

Le Week-end 3, refais le diagnostique. Compare au Jour 1. Si t'as pas progressé de 20%, change ta méthode sur les matières concernées. Pas de temps pour l'émotion.

Bonne chance. Tu vas cartonner. 💪`,
  },
  {
    slug: "meilleurs-pdf-licence-1-maths",
    title: "Les 10 PDFs indispensables en Licence 1 Maths",
    description:
      "Notre curation des PDFs les mieux notés par les étudiants de L1 Maths : cours complets, TD corrigés, annales des 5 dernières années.",
    category: "Catalogue",
    author: "Christian K.",
    authorRole: "Modérateur communauté",
    publishedAt: "2026-06-08",
    readingMinutes: 6,
    tags: ["Licence 1", "Maths", "PDFs"],
    content: `Tu débarques en L1 Maths et tu sais pas par où commencer ? Voici les PDFs que les étudiants de la promo 2024-2025 ont noté 4.5 étoiles et plus.

## Les indispensables

1. **Analyse réelle — Cours complet** (Pr Diallo, UY1)
   274 pages, ultra progressif, exemples résolus à chaque étape. Le graal.

2. **Algèbre linéaire — TD corrigés**
   180 exercices avec corrigés détaillés. La méthode pour réussir les partiels.

3. **Probabilités — Fondamentaux**
   Cours + 200 QCM. Idéal pour s'auto-évaluer avant les contrôles continus.

## Où les trouver

Tous disponibles sur Campus 360 dans la catégorie "Maths > Licence 1". L'inscription gratuite te donne accès à 3 PDFs par mois.

Si t'as pas encore de compte, c'est par ici. 👇`,
  },
  {
    slug: "top-bouquins-prepa",
    title: "Top 10 des bouquins qui sauvent en prépa",
    description:
      "Les manuels que les préparationnaires camerounais s'arrachent. Avec pour chacun : niveau requis, points forts, et où le trouver.",
    category: "Recommandations",
    author: "Florence T.",
    authorRole: "Étudiante prépa, UB",
    publishedAt: "2026-05-28",
    readingMinutes: 10,
    tags: ["prépa", "livres", "études"],
    content: `Deux ans de prépa, j'ai lu et survécu. Voici les 10 bouquins sans lesquels tu survis pas.

## Maths

- **HPR (Hervé Prat, Résumé) — Analyse MP**
  Complet, rigoureux, compact. 2 100 pages mais tu lis que les chapitres qui te manquent.

- **Franchini — Algèbre MPSI**
  Exercices progressifs du plus simple au plus vicieux.

## Physique

- **Hprépa (option PSI)**
  La référence. Cours + exos + corrigés détaillés.

## Chimie

- **Dunod Prépa — Chimie PC**
  Excellent pour la chimie organique. Les mécanismes sont limpides.

(... liste complète disponible dans l'app ...)`,
  },
  {
    slug: "wallet-mobile-money-vs-carte",
    title: "Wallet Campus 360 : pourquoi on a choisi Mobile Money d'abord",
    description:
      "En Afrique centrale, 70% des transactions passent par Mobile Money. On a fait le choix de mettre Orange Money et MTN MoMo au cœur de l'expérience.",
    category: "Produit",
    author: "Équipe Campus 360",
    authorRole: "Équipe produit",
    publishedAt: "2026-05-20",
    readingMinutes: 5,
    tags: ["Mobile Money", "paiement", "wallet"],
    content: `Quand on a lancé Campus 360, on a fait un pari : **priorité au Mobile Money plutôt qu'à la carte bancaire**. Voici pourquoi.

## Les chiffres parlent

- 70% des paiements au Cameroun passent par Orange Money ou MTN MoMo
- 4% seulement par carte bancaire
- Le reste : cash, virement, crypto

Si on avait commencé par la carte, on aurait touché 4% de notre marché. Avec Mobile Money, on en touche 74%.

## L'expérience utilisateur

Recharger son wallet Campus 360 en Mobile Money :
1. Tu ouvres l'app
2. Tu choisis ton opérateur (Orange / MTN)
3. Tu entres le montant (500 FCFA minimum)
4. Tu valides avec ton code secret Mobile Money
5. Ton wallet est crédité en 30 secondes

Pas de numéro de carte à taper. Pas de 3D Secure à valider. Pas de CB expirée à mettre à jour.

## Et la carte bancaire alors ?

On la supporte aussi ! Visa et Mastercard, via un partenaire PCI-DSS Level 1. Mais c'est pas l'option par défaut.

## Et si j'ai pas de Mobile Money ?

Tu peux aussi payer en cash via un de nos partenaires (+ de 200 points de dépôt à Douala, Yaoundé, Buea). Liste dans l'app.

À très vite sur Campus 360. 🚀`,
  },
  {
    slug: "offre-rentree-2026-premium",
    title: "Premium à -50% pour la rentrée 2026",
    description:
      "Du 1er juillet au 30 septembre 2026, l'abonnement Premium passe à 4 950 FCFA/mois au lieu de 9 900. Sans engagement.",
    category: "Promo",
    author: "Équipe Campus 360",
    authorRole: "Annonces",
    publishedAt: "2026-07-01",
    readingMinutes: 3,
    tags: ["promo", "Premium", "rentrée"],
    content: `La rentrée approche, on a une offre pour toi.

## L'offre

**Premium à -50%** : 4 950 FCFA/mois au lieu de 9 900.

- Du 1er juillet au 30 septembre 2026
- Sans engagement (annulation en 1 clic)
- Garanti 14 jours satisfait ou remboursé

## Ce que ça inclut

- PDFs illimités dans tout le catalogue
- Assistant IA sans limite
- Mode hors-ligne prioritaire
- Support prioritaire

## Comment en profiter

1. Télécharge l'app Campus 360
2. Crée ton compte
3. Va dans "Premium" → l'offre s'applique automatiquement

À très vite. ✌️`,
  },
  {
    slug: "top-7-fiches-ia-reussir-examens",
    title: "Top 7 des fiches générées par IA qui ont fait réussir",
    description:
      "On a compilé les fiches générées par l'IA Campus 360 qui ont été le plus partagées par les étudiants. Inspiration garantie pour tes révisions.",
    category: "IA",
    author: "Équipe Campus 360",
    authorRole: "Équipe IA",
    publishedAt: "2026-05-12",
    readingMinutes: 7,
    tags: ["IA", "fiches", "révisions"],
    content: `Notre IA a généré +12 000 fiches depuis janvier. Voici les 7 qui ont été le plus consultées, le plus partagées, et le mieux notées.

## #1 — Fiche résumé "Programmation C — Bases"

231 lignes, ultra-structurées. Exemples compilables, points-clés encadrés. Note moyenne : 4.9/5.

## #2 — Fiche "Anatomie — Membre supérieur"

198 schémas ASCII + texte. Utilisée par 1 200 étudiants en Médecine L2.

(... la suite dans l'app ...)`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(slug);
  if (!current) return [];
  return blogPosts
    .filter((p) => p.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.tags.some((t) => current.tags.includes(t)) ? 1 : 0;
      const bMatch = b.tags.some((t) => current.tags.includes(t)) ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}