# Strategie budget reduit

## Principe

Le budget doit partir dans ce qui prouve le marche PDF : acquisition campus, sourcing de bons
documents, stockage securise, paiement et support. Il ne faut pas financer une architecture lourde
avant d'avoir valide que les etudiants achetent et relisent leurs PDF.

## Outils gratuits ou peu couteux

| Besoin | Choix conseille | Pourquoi |
| --- | --- | --- |
| App mobile | Expo | Developpement Android/iOS rapide, Expo Go gratuit pour tester. |
| Builds | EAS Free au debut | Suffisant pour les premiers APK/AAB de test si les quotas sont respectes. |
| Base de donnees | Supabase Free | Postgres, Auth, Storage, APIs et RLS au meme endroit. |
| Admin | Dashboard Next.js existant | Plus adapte au workflow PDF que Supabase Studio seul. |
| Design | Figma Free ou Penpot | Maquettes et design system sans cout initial. |
| Gestion projet | GitHub Projects, Trello ou Notion Free | Suffisant pour MVP. |
| Monitoring simple | Logs Supabase + Sentry Free plus tard | Observer les erreurs sans grosse facture. |
| Analytics | Logs Supabase au debut | Mesurer previews, achats, recherches et recharges. |

## Ce qu'il faut eviter au debut

- Creer une app iOS native complete avant validation Android.
- Developper des modules non PDF avant traction reelle.
- Heberger des fichiers PDF sans URLs signees.
- Acheter trop de SMS OTP. Tester email magic link ou WhatsApp OTP si acceptable.
- Promettre une conversion Coins vers argent sans process de retrait tuteur clair.
- Ajouter une IA couteuse avant d'avoir un catalogue utile et achete.

## Couts probables a prevoir

- Nom de domaine : faible cout annuel.
- Compte Google Play : cout unique.
- Apple Developer : cout annuel, a differer si Android suffit au lancement.
- SMS/WhatsApp OTP : cout variable, a surveiller des les tests.
- Agregateur Mobile Money : commission par transaction.
- Stockage PDF : faible au debut, puis a surveiller selon volume.
- Verification catalogue : temps humain pour controler la qualite des PDF.

## Decision recommandee

Lancer d'abord sur Android + admin web PDF. Garder iOS pour une phase 2 si les campus pilotes
montrent une vraie demande.

## Seuils de passage au payant

- Supabase Pro : quand les limites Free bloquent le stockage, les backups ou le volume reel.
- EAS payant : quand il faut faire plusieurs builds prioritaires par semaine.
- Service OTP payant : quand l'activation telephone devient critique.
- Analyse IA payante : quand le volume de PDF justifie l'automatisation.
