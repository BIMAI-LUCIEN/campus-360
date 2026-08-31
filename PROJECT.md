# Project: Campus 360 — Matching & Automatisation de Stages (Cœur) + Hub Académique

## Architecture Globale
- **Cœur Produit**: Plateforme intégrale de matching de stages & génération automatisée de candidatures par IA (Mobile B2C Expo + Portail B2B Next.js).
- **Modules Secondaires**: Bibliothèque/Marketplace de PDF académiques & Assistant IA de révision (regroupés dans l'onglet `[Ressources]`).
- **Mobile Client**: Expo React Native (iOS / Android / Web) avec 4 onglets : `[Stages]`, `[Candidatures]`, `[Ressources]`, `[Profil]`.
- **Backend & Portail Recruteur**: Next.js App Router dans `admin-app/` avec `/recruteur` (Espace B2B), `/admin` (Supervision & Quarantaine KYB) et `/api/*` (API Prisma/Supabase unifiée).
- **Moteur d'IA & Automatisation**: n8n (Docker) + Google Gemini 2.0 Flash / Claude 3.5 Sonnet pour le scraping, la génération de CV/lettres ciblés, le template HTML/Tailwind -> PDF CMJN et les relances J+7.
- **Base de Données**: Supabase PostgreSQL avec Prisma ORM (`Student`, `Company`, `Job`, `Application`, `Document`, `Wallet`).
- **Paiements**: Mobile Money FCFA (FedaPay / CinetPay : MTN, Orange Money, Moov, Wave) pour packs de candidatures et abonnements.

## Milestones & Sprints (BMAD Framework)
| # | Sprint | Périmètre | Dépendances | Statut |
|---|--------|-----------|-------------|--------|
| 1 | Modèle Prisma & Better Auth | Intégration du schéma Prisma complet (Student, Company, Job, Application) et sessions unifiées. | None | IN PROGRESS |
| 2 | Feed Mobile des Stages & Matching | UI Mobile 4 onglets, infinite scroll, filtres rapides et algorithme de % match basé sur les compétences. | M1 | PLANNED |
| 3 | Moteur de Candidature IA (1-Clic) | Prompt LLM, modal de prévisualisation, export multi-canaux (WhatsApp direct, Email, Téléchargement PDF). | M2 | PLANNED |
| 4 | Timeline, Relances & Gamification | Suivi des candidatures, confettis sur acceptation, webhook n8n pour le Cron J+7 de relance automatique. | M3 | PLANNED |
| 5 | Portail B2B & Détective KYB | Inscription entreprise, système de vérification anti-fraude par IA (>80%), publication d'offres et CVthèque. | M1 | PLANNED |
| 6 | Mobile Money & Finalisation Ressources | Paiements FCFA (FedaPay/CinetPay), réorganisation de la bibliothèque PDF et assistant dans l'onglet Ressources. | M4, M5 | PLANNED |

