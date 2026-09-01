# Contexte & Spécifications Produit : Campus 360

Ce document sert de référence absolue pour comprendre la vision, les fonctionnalités et l'architecture de l'application **Campus 360**. Il permet à n'importe quel développeur ou intelligence artificielle de reprendre le projet avec un contexte complet.

En cas de contradiction avec un ancien document centré uniquement sur les PDF, ce document et les spécifications validées dans `docs/superpowers/specs/` font foi. Les documents PDF restent une fonctionnalité importante, mais la recherche et l'obtention d'un stage constituent la priorité produit.

---

## 1. Vision & Proposition de Valeur
**Campus 360** est une plateforme double (B2C Mobile / B2B Web) conçue pour simplifier et automatiser la recherche de stages pour les étudiants en Afrique Francophone, tout en offrant aux entreprises un outil de sourcing qualifié et sécurisé.

* **Slogan** : *« L'IA qui trouve et décroche ton stage. »*
* **Cœur de cible B2C** : Étudiants d'IUT, BTS, Licences, Masters cherchant un stage obligatoire.
* **Cœur de cible B2B** : Chargés de recrutement, PME, Startups et grandes entreprises locales.
* **Hiérarchie produit** : 1) trouver et décrocher un stage, 2) créer les documents nécessaires, 3) apprendre et réviser avec les ressources académiques.

---

## 2. Architecture des Fonctionnalités

```
                               ┌────────────────────────────────┐
                               │           CAMPUS 360           │
                               └───────────────┬────────────────┘
                                               │
                 ┌─────────────────────────────┴─────────────────────────────┐
                 ▼                                                           ▼
     💼 FONCTIONNALITÉS CŒUR (B2C)                               📦 FONCTIONNALITÉS SECONDAIRES
 ──────────────────────────────────────                     ──────────────────────────────────────
 • Onboarding Animé Obligatoire (4 étapes)                  • Catalogue d'Épreuves PDF (En ligne / Hors-ligne)
 • Flux de Stages avec % de Matching                        • Bibliothèque de cours & épreuves acquis
 • Postulation IA Automatisée (Tailoring)                   • Assistant IA de Révision & Préparation (Limites de chat)
 • Atelier IA (CV + Lettre + Rapport + Mémoire)              • Portefeuille & Micro-paiements Mobile Money
 • Suivi & Relance J+7
 • Boucle Virale de Parrainage
 • Relances humoristiques (Duolingo Style)
```

---

## 3. Le Parcours Utilisateur Étudiant (Mobile)

### A. L'Onboarding Obligatoire
Aucun accès au catalogue d'offres n'est possible sans remplir cette étape interactive et animée :
1. **Établissement d'origine** (saisie assistée).
2. **Filière et niveau d'études**.
3. **3 Compétences principales** (ex: Excel, SQL, Design).
4. **Profil final** : Ajout d'un portfolio ou d'expériences passées pour maximiser la pertinence.

### B. Recherche de Stages & Algorithme de Match
* Les offres s'affichent sous forme de cartes dans un flux.
* Chaque offre affiche un **badge de % de Matching** :
  * **Vert ($80-100\%$)** : Idéal. L'IA recommande de postuler immédiatement.
  * **Bleu ($60-79\%$)** : Bon. Il manque une compétence, mais l'IA adaptera la lettre pour compenser.
  * **Gris ($<60\%$)** : Masqué ou déconseillé.
* L'étudiant peut utiliser un filtre pour explorer des offres hors de sa filière par curiosité.

### C. Les 3 Canaux de Postulation (Hybride)
Selon le statut de l'entreprise dans le système, la postulation s'adapte :

1. **Postulation Interne (In-App)** *(Si l'entreprise est enregistrée sur Campus 360)* :
   * Le CV et la lettre de motivation ajustés par l'IA sont envoyés directement sur le tableau de bord du recruteur.
   * Aucune friction externe pour l'étudiant.
2. **Postulation par E-mail** *(Si l'entreprise est externe)* :
   * L'e-mail part automatiquement depuis les serveurs de la plateforme avec `Reply-To` configuré sur l'email de l'étudiant.
3. **Postulation par WhatsApp** *(Si l'entreprise est externe)* :
   * Ouverture instantanée de l'application WhatsApp de l'étudiant avec le message et le PDF attachés, prêts à être envoyés en 1 clic.

### D. La CVthèque Personnelle
Chaque dossier validé et envoyé est stocké dans l'historique de l'étudiant. Si une offre similaire se présente plus tard, il peut réutiliser et réadapter un CV existant sans repartir de zéro.

### E. Le Conseil "Top 3 Matches"
Un algorithme propose à l'étudiant les 3 meilleurs stages de la semaine qui maximisent ses chances d'être pris, tout en respectant son budget de jetons actuels.

### F. La Boucle de Parrainage
Chaque offre partagée contient un lien de parrainage unique. Si l'ami s'inscrit, le parrain et le parrainé gagnent chacun **1 jeton IA gratuit** (1 jeton = 1 postulation).

### G. Notifications de Relance Style "Duolingo"
Pour stimuler l'engagement, l'application utilise des notifications push humoristiques et légèrement taquines :
* *« Ton CV prend la poussière dans un coin de l'app... Tu veux vraiment valider ton année ? 🧹 »*
* *« Notre IA a travaillé dur pour te rédiger une lettre parfaite. Ne la laisse pas tomber ! 😢 »*

### H. Navigation et accueil personnalisé
La navigation mobile comprend cinq destinations stables : **Accueil**, **Stages**, **Créer**, **Ressources** et **Profil**. Les stages restent la fonctionnalité principale.

L'accueil affiche une prochaine action dynamique. Il privilégie une candidature urgente, une nouvelle offre fortement compatible, un document en cours, un profil incomplet, puis une ressource recommandée. Cette logique fusionne le Top 3 Matches, l'atelier de documents et les ressources sans transformer l'accueil en catalogue de modules.

---

## 4. Modèle Économique, Limites IA & Structure des Prix (B2C)

Pour coller au budget des étudiants en Afrique Francophone, le modèle de tarification repose sur du micro-paiement (PAYG) et 3 abonnements mensuels.

### A. Grille à la Carte (Recharge de jetons)
* **Lecture PDF** : Entre **25 FCFA et 100 FCFA** par document.
* **IA sur PDF (Résumé / Explication)** : **+50 FCFA à +100 FCFA** supplémentaires par document.
* **Candidature de Stage IA** : **1 000 FCFA** par postulation IA complète (génération CV + Lettre), ou **500 FCFA** si l'étudiant fournit son propre CV.
* **Correction & Rédaction Assistée (Atelier)** :
  * Un CV générique : **500 FCFA**.
  * Une lettre de motivation générique : **500 FCFA**.
  * Un Rapport de stage : **1 000 FCFA**.
  * Un Mémoire académique (plan / chapitres) : **2 000 à 3 000 FCFA**.
* **Chat avec l'Assistant Révision IA** : **1 jeton (100 FCFA) = 50 messages** de chat.

### B. Grille des Abonnements Mensuels
L'abonnement supprime les frictions à l'acte d'achat et fidélise l'étudiant en lui octroyant des crédits fixes pour éviter le spam.

1. **Pass Basique (2 000 FCFA / mois)** :
   * **5** candidatures IA complètes.
   * **3** rédactions/corrections de documents incluses dans l'Atelier.
   * **Lecture PDF** : Accès illimité en ligne (lecture seule sans option IA).
   * **Chat IA** : Limité à **500 messages** de chat par mois.
   * *Mode Hors-ligne* : Indisponible.
   * **Exports Atelier** : PDF avec watermark ; export Word indisponible.
2. **Pass Pro (3 500 FCFA / mois)** :
   * **10** candidatures IA complètes.
   * **5** rédactions/corrections de documents incluses dans l'Atelier.
   * **Lecture PDF** : Accès illimité en ligne + Option IA incluse gratuitement.
   * **Mode Hors-ligne (Offline)** : Inclus (téléchargement et chiffrement sécurisé des PDF sur l'appareil).
   * **Chat IA** : Limité à **1 000 messages** de chat par mois.
   * **Exports Atelier** : PDF sans watermark ; export Word indisponible.
3. **Pass Elite (5 000 FCFA / mois)** :
   * **20** candidatures IA complètes.
   * **10** rédactions/corrections de documents incluses dans l'Atelier.
   * **Lecture PDF** : Accès illimité en ligne et hors-ligne (Offline) + Option IA incluse.
   * **Chat IA** : Limité à **2 000 messages** de chat par mois.
   * Badge "Profil Boosté" (visibilité maximale dans la CVthèque des recruteurs).
   * **Exports Atelier** : PDF et Word sans watermark.

### C. Offre gratuite et politique d'export
L'offre gratuite permet la rédaction, la sauvegarde et l'aperçu avec watermark, mais interdit tout export PDF ou Word. Les droits sont contrôlés côté serveur avant toute génération de fichier.

| Offre | Prix mensuel | PDF Atelier | Word Atelier | Watermark |
|---|---:|---|---|---|
| Gratuit | 0 FCFA | Non | Non | Aperçu uniquement |
| Basique | 2 000 FCFA | Oui | Non | Oui sur le PDF |
| Pro | 3 500 FCFA | Oui | Non | Non |
| Elite | 5 000 FCFA | Oui | Oui | Non |

---

## 5. Le Portail Recruteur B2B & Système TanStack (Next.js)

### A. Inscription & Sécurisation (KYB Multimodal)
Le parcours commence par l'inscription de l'entreprise. Pour valider sa légitimité, deux circuits existent :
1. **Circuit Classique (Grandes Entreprises / PME)** :
   * Validation automatique par scan de l'e-mail professionnel et du site web officiel.
2. **Circuit Alternatif (Startups & Micro-Entreprises)** :
   * En cas d'e-mail générique (Gmail/Yahoo) ou d'absence de site web, la validation s'effectue via :
     * Le dépôt du numéro d'enregistrement officiel (RCCM, ID fiscal local).
     * OU le lien vers une page de réseau social d'entreprise active (LinkedIn/Facebook de $>6$ mois).
     * ET la validation obligatoire du numéro WhatsApp de l'entreprise par un code de confirmation (OTP).
   * Parrainage B2B : Si une entreprise déjà validée parraine la startup, son score de confiance reçoit un bonus immédiat.

### B. Le Tableau de Bord Dynamique (TanStack)
* **TanStack Query** : Synchronisation asynchrone en temps réel des offres d'emploi, des candidatures internes reçues et des profils consultés sans rechargement de page.
* **TanStack Table** : Tableau de gestion interactif permettant de trier les candidats reçus par % de match, de filtrer par compétences ou école, et de modifier leur statut en direct.
* **Verrous CVthèque** : Le recruteur peut voir les compétences et profils des étudiants inscrits, mais le bouton **"Contacter sur WhatsApp"** est désactivé tant que le score KYB de l'entreprise n'est pas validé.
* **Parrainage B2B** : Une entreprise qui invite une autre entreprise active reçoit son prochain boost d'offre "URGENT" gratuitement.

### C. Limite des rôles
Les encadrants académiques n'ont aucun compte dans Campus 360. L'étudiant exporte ses documents et les présente à son encadrant en dehors de l'application. Le portail web est réservé aux recruteurs, entreprises et administrateurs Campus 360.

---

## 6. Alignement des surfaces

* **Application mobile** : produit principal étudiant, avec les stages en première position.
* **Site public** : explique d'abord le parcours stage, puis l'atelier de documents et les ressources.
* **Portail recruteur** : offres, candidatures, matching, CVthèque, KYB, boosts et parrainage B2B.
* **Administration** : utilisateurs, abonnements, wallet, crédits IA, documents, exports, catalogue PDF, recruteurs et revenus.
* **Terminologie tarifaire unique** : Gratuit, Basique, Pro et Elite sur toutes les surfaces.

---

## 7. Choix Technologiques & Organisation des Dossiers

1. **Client Mobile Étudiants** (`src/`) : Expo / React Native (Android, iOS, Web).
2. **Portail Recruteur & Backend API** (`recruiter-web/`) : Next.js (App Router, Tailwind CSS, TypeScript, TanStack Query, TanStack Table).
3. **Base de Données** : Supabase / PostgreSQL avec Prisma ORM.
4. **Cerveau & Orchestration (Serverless / VPS-Free)** (`scripts/`) :
   * **Scripts Python Autonomes** : Exécutés via GitHub Actions ou sur une machine locale. Ils gèrent la collecte des offres et se synchronisent directement avec la base de données Supabase.
   * **Scraping Réseaux Sociaux & Images** : Récupération des publications et images d'offres (flyers, captures d'écran) sur Facebook, Instagram, TikTok et sites web d'emplois. 
   * **Gemini Multimodal OCR** : Envoi des flyers et images à l'API Gemini pour extraire de manière structurée les textes, compétences, dates et contacts.
   * **Google Gemini 2.0/3.5/3.7 Flash** : Moteur IA pour la génération de CV/lettres et le chat de révision.
5. **Stockage Hybride des Fichiers (Vidéos, PDF, Images)** :
   * **Google Cloud Storage (GCS - Utilisation du quota 5 To)** : Utilisé comme espace de stockage lourd principal. Tous les mémoires, les rapports de stage rédigés, les fichiers PDF des examens, les flyers d'offres et les vidéos de portfolio des étudiants y sont stockés. Le coût additionnel de stockage est donc de $0.
   * **Cloudinary** : Utilisé comme CDN d'images secondaires pour le redimensionnement et le chargement ultra-rapide des photos de profils et des miniatures de flyers sur l'application mobile.
6. **Système de Paiement Direct (MTN Mobile Money)** :
   * En complément des agrégateurs, un **microservice Python** est hébergé sur le VPS. Ce script communique directement avec l'API MTN MoMo (USSD push, demandes d'autorisation de débit direct) sans commission intermédiaire.
