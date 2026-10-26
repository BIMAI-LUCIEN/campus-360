# Campus 360 — Identité de marque (v1, octobre 2026)

Version visuelle complète : [brandbook.html](brandbook.html). Ce fichier en est le résumé.

## 1. Plateforme

**Signature :** Ton parcours, à 360°.
**Promesse :** du campus à l'emploi, tout le parcours (apprendre, postuler, décrocher).
**Univers :** raffiné, minimaliste, ludique. Beaucoup de blanc, un seul violet, le jeu dans les détails (pastilles inclinées, mot en italique, touches de couleur).

**Deux publics, une même orbite** : le violet reste constant, chaque public a son accent.

| Public | Rang | Accent | Message type |
| --- | --- | --- | --- |
| Étudiants (18–25 ans, licence, master) | Principal | Soleil | « Ton *premier* stage commence ici. » |
| En recherche d'emploi (jeunes diplômés, personnes sans emploi) | Secondaire | Corail | « Remets ton parcours *en mouvement*. » |

**Ton :** tutoiement, phrases courtes, verbe d'action, un clin d'œil de temps en temps. On écrit « en recherche d'emploi », jamais « chômeur » dans les titres. Pas de jargon RH, pas de promesses vagues.

## 2. Logo

- Monogramme **Orbite « trois étapes »** : trois segments de plus en plus intenses autour d'un point (l'étudiant), qui finissent en flèche montante.
- Fichiers : [logo-orbite.svg](logo-orbite.svg) (transparent), [logo-orbite-icone.svg](logo-orbite-icone.svg) (icône d'app, fond blanc plein). Recherche : [planche-orbite.html](planche-orbite.html), [planche-logos.html](planche-logos.html).
- Logotype : monogramme + « Campus » en Sora 700 + « 360 » en Sora 400 violet.
- Versions : violet sur blanc (principale), sur Violet 50, violet 400 sur Ink, blanc sur violet, monochrome Ink.
- **Jamais enfermé dans une forme**, jamais déformé, pivoté, recoloré ni ombré.
- Zone de protection : un quart de la largeur du monogramme. Taille mini : 20 px (monogramme), 96 px (logotype).

## 3. Couleurs

**Violet (marque)** : 50 `#F5F3FF` · 100 `#EDE9FE` · 200 `#DDD6FE` · 300 `#C4B5FD` · 400 `#A78BFA` · 500 `#8B5CF6` · **600 `#7C3AED`** · 700 `#6D28D9` · 800 `#5B21B6` · 900 `#4C1D95` · 950 `#2E1065`

**Neutres** : Paper `#FFFFFF` · 50 `#F8FAFC` · 100 `#F1F5F9` · 200 `#E2E8F0` · 300 `#CBD5E1` · 400 `#94A3B8` · 500 `#64748B` · 700 `#334155` · Ink `#0F172A`

**Accents ludiques** (fond / couleur / texte) :

| Accent | Fond | Couleur | Texte | Usage |
| --- | --- | --- | --- | --- |
| Soleil | `#FFF8DB` | `#FFD43B` | `#7A5600` | Public étudiant, « Nouveau » |
| Corail | `#FFF0EB` | `#FF7A59` | `#B4401F` | Public en recherche d'emploi, échéances |
| Menthe | `#E7F8F1` | `#10B981` | `#047857` | Succès, offre vérifiée, rémunération |

**Proportions :** Paper 60 %, Ink 22 %, Violet 12 %, accents 6 %. Un seul accent ludique par écran.

**Contrastes vérifiés (WCAG)** : Ink sur blanc 17,9 · blanc sur Violet 600 5,7 · Violet 700 sur Violet 50 6,5 · Ink sur Soleil 12,5 · Ink sur Corail 7,0 · Violet 400 sur Ink 6,6. Soleil (1,4) et Corail (2,6) ne servent jamais de couleur de texte sur blanc.

## 4. Typographie

| Famille | Graisses | Rôle |
| --- | --- | --- |
| **Sora** | 400, 600, 700 | Logotype, titres, chiffres clés |
| **Inter** | 400, 500, 600 | Texte, interface, formulaires |
| **Instrument Serif Italic** | 400 | Un seul mot d'accent dans un titre, 20 px minimum |

Échelle : Display Sora 700 48/52 · Titre 1 Sora 700 32/36 · Titre 2 Sora 600 24/30 · Titre 3 Sora 600 18/24 · Texte Inter 16/24 · Petit Inter 14/20 · Libellé Inter 600 12 capitales.

## 5. Éléments graphiques

- Arcs d'orbite en grand, coupés par le bord du cadre.
- Fil des trois étapes pour la progression (candidatures, onboarding).
- Pastilles inclinées à ±3°, une ou deux par visuel.
- Icônes au trait 2 px, bouts arrondis (Lucide ou Phosphor).
- Photos réelles d'étudiants et de jeunes actifs d'Afrique centrale, lumière naturelle.
- Rayons 12 à 24 px, bordures fines, ombres presque invisibles.

## 6. Écarts avec l'app actuelle

- L'app utilise Outfit pour les titres (`src/theme/stitch.ts`) : passer à Sora.
- Soleil, Corail et Instrument Serif n'existent pas encore dans le thème : à ajouter en tokens (le `lint:colors` interdit les couleurs brutes hors thème).
- Icône d'app et favicon à remplacer par le monogramme Orbite.
