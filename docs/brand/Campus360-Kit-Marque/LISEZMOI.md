# Campus 360 — Kit de marque (v1, octobre 2026)

Tout ce qu'il faut pour utiliser la marque Campus 360 : brandbook, logos, couleurs et polices.

**À faire en premier :** installer les polices du dossier `04-Typographies` (clic droit sur chaque fichier `.ttf` > Installer). Sans elles, Illustrator remplace les textes du brandbook par une autre police.

## 01-Brandbook

| Fichier | Usage |
| --- | --- |
| `Campus360-Brandbook.pdf` | Version à modifier dans **Illustrator** et à partager. 7 pages, texte modifiable. |
| `Campus360-Brandbook.html` | Version écran, à ouvrir dans un navigateur (utilise les polices du dossier 04). |

**Ouvrir le brandbook dans Illustrator :** Fichier > Ouvrir > `Campus360-Brandbook.pdf`, puis choisir la page (Illustrator ouvre une page à la fois). Les textes, formes et couleurs sont modifiables. Pour garder une version de travail : Fichier > Enregistrer sous > format Illustrator (`.ai`).

## 02-Logos

- `SVG-vectoriel/` : fichiers sources, à ouvrir directement dans Illustrator. Le texte « Campus360 » est vectorisé (tracés), il s'affiche à l'identique sans police installée.
- `PNG/` : fichiers prêts à l'emploi, fond transparent (monogramme 1024 px, logotypes 512 px de haut).
- `Icones-app/` : icône d'application (fond blanc plein, 1024 px), avant-plan d'icône adaptative Android, favicons 32 à 512 px.

Trois formes, cinq versions chacune :

| Forme | Usage |
| --- | --- |
| `monogramme` | Avatar, icône, favicon, petits formats |
| `logotype-horizontal` | En-tête de site, signature, documents |
| `logotype-vertical` | Affiches, couvertures, formats carrés |

| Version | Fond prévu |
| --- | --- |
| `couleur` | Blanc ou Violet 50 (version principale) |
| `fond-sombre` | Ink `#0F172A` |
| `fond-violet` | Violet 600 `#7C3AED` |
| `mono-noir` | Impression une couleur, tampon |
| `mono-blanc` | Photo ou fond foncé quand la couleur ne passe pas |

Règle : le logo se pose directement sur le fond, jamais dans un carré ou une pastille. Ne pas le déformer, le pivoter, le recolorer ni lui ajouter d'ombre.

## 03-Couleurs

- `Campus360-nuancier.ase` : nuancier Adobe. Dans Illustrator : panneau Nuancier > menu > Ouvrir la bibliothèque de nuances > Autre bibliothèque. Les couleurs arrivent en trois groupes (Violet, Neutres, Accents), en couleurs globales.
- `Campus360-planche-couleurs.svg` : planche modifiable avec toutes les valeurs.
- `Campus360-couleurs.css` et `Campus360-couleurs.json` : pour les développeurs.

Les valeurs sont en RVB (écran). Pour l'impression, convertir en CMJN dans Illustrator avec le profil de l'imprimeur et valider sur épreuve : le violet `#7C3AED` perd de l'éclat en CMJN.

## 05-Flyers

Deux versions de chaque format :
- `etudiants` : fond violet, pastille Soleil.
- `emploi` : fond Corail clair, pastille Corail.

Chaque flyer porte un QR code vers campus360b.site.

| Dossier | Contenu |
| --- | --- |
| `Imprimes-PDF/` | A4 (210 × 297 mm), A5 (148 × 210), A6 (105 × 148), DL (99 × 210). PDF vectoriels avec **fond perdu de 3 mm** sur chaque bord : à envoyer tel quel à l'imprimeur. Textes modifiables dans Illustrator (polices du dossier 04 installées). |
| `Apercus-PNG/` | Les mêmes flyers après coupe, pour les montrer ou les envoyer par message. |
| `Reseaux-sociaux/` | Post carré 1080 × 1080 et story 1080 × 1920, prêts à publier. |

Pour l'impression : garder les textes à au moins 5 mm du bord de coupe (c'est déjà le cas), et tester le QR code sur l'épreuve avant le tirage.

## 04-Typographies

| Famille | Rôle |
| --- | --- |
| Sora (400, 600, 700) | Logotype, titres |
| Inter (400, 500, 600) | Texte, interface |
| Instrument Serif (Regular, Italic) | Un mot d'accent en italique dans un titre |

Polices libres sous licence SIL Open Font License (fichier `LICENCE-OFL.txt` dans chaque dossier) : utilisation commerciale autorisée.
