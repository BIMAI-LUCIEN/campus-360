# Checklist de Publication Stores — Campus 360

Cette checklist formalise les déclarations légales, données de sécurité et prérequis graphiques pour la publication de l'application Campus 360 sur le Google Play Store et l'Apple App Store.

---

## 1. Fiche Google Play Store

### A. Déclaration de Sécurité des Données (Data Safety)

| Catégorie de données | Type de données | Finalité | Obligatoire / Facultatif | Partagé avec des tiers | Chiffré en transit | Supprimable sur demande |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Informations personnelles** | Nom, prénom | Fonctionnalité de l'application, personnalisation | Obligatoire | Non | Oui (TLS / HTTPS) | Oui (suppression directe) |
| **Coordonnées** | Adresse e-mail | Authentification, sécurité, réinitialisation de mot de passe | Obligatoire | Non (sauf Resend pour délivrance) | Oui (TLS / HTTPS) | Oui (suppression directe) |
| **Coordonnées** | Numéro de téléphone / WhatsApp | Candidatures stages 1-clic WhatsApp, notifications | Facultatif | Oui (Orange Money / MTN via Notch Pay, entreprise ciblée) | Oui (TLS / HTTPS) | Oui (suppression directe) |
| **Données financières** | Identifiant de transaction, solde coins | Gestion du portefeuille, traçabilité des achats | Obligatoire pour recharge | Oui (Notch Pay comme passerelle agréée) | Oui (TLS / HTTPS) | Oui (historique anonymisé après suppression) |
| **Fichiers et documents** | CV, lettres, rapports de stage, fichiers PDF | Espace de rédaction, assistance IA, consultation | Facultatif | Non (traité par IA sous proxy éphémère sans réentraînement) | Oui (TLS / HTTPS) | Oui (suppression directe des fichiers sur le serveur) |
| **Identifiants de l'appareil** | Push token Expo | Notifications push relatives aux stages et alertes | Facultatif | Oui (Expo / FCM) | Oui (TLS / HTTPS) | Oui |

### B. Liens Obligatoires et Pages Publiques
- [x] **Politique de confidentialité :** `https://campus360b.site/confidentialite` (statut HTTP 200, conforme RGPD)
- [x] **URL de demande de suppression de compte :** `https://campus360b.site/suppression-compte` (statut HTTP 200, répondant à l'exigence Play Store 2024)
- [x] **Conditions générales d'utilisation :** `https://campus360b.site/conditions` (statut HTTP 200)
- [x] **E-mail de support :** `support@campus360b.site` ou `contact@campus360b.site`

### C. Classification du Contenu et Public Cible
- [ ] Questionnaire de classification IARC rempli sur Play Console (classification visée : PEGI 3 / Tout public)
- [ ] Public cible : 18 ans et plus (étudiants de l'enseignement supérieur, aucun ciblage d'enfants)
- [ ] Déclaration d'utilisation d'IA générative : fonctionnalité d'aide à la rédaction avec filtres de modération et garde-fous

### D. Assets Graphiques Requis
- [ ] **Icône d'application haute résolution :** 512 × 512 px, PNG 32 bits, sans canal alpha (fond plein)
- [ ] **Graphique de fonctionnalité (Bannière) :** 1024 × 500 px, JPG ou PNG 24 bits sans canal alpha
- [ ] **Captures d'écran smartphone :** Minimum 2 captures (recommandé 4 à 8), format 16:9 ou 9:16 (ex. 1080 × 1920 px ou 1080 × 2400 px) couvrant :
  1. Accueil & Découverte des stages
  2. Fiche d'offre immersive et candidature WhatsApp
  3. Bibliothèque de cours & lecteur haute définition
  4. Espace rédaction académique assisté par IA
  5. Portefeuille étudiant & recharge Mobile Money

### E. Binaire & Configuration Technique
- [x] `app.json` : `package` = `com.campus360b.app`, `version` = `1.2.0`, `versionCode` = `3`
- [x] `eas.json` : profil `production` configuré avec `buildType: "app-bundle"`
- [ ] Signature de l'App Bundle (`.aab`) via Play App Signing ou keystore de release
- [ ] Déploiement initial sur la piste de test interne (Internal Testing Track)

---

## 2. Fiche Apple App Store (si visé)

- [x] Bouton de suppression de compte accessible directement dans l'application (`ProfileScreen` → Suppression sécurisée avec confirmation et mot de passe)
- [x] Aucune référence à des paiements hors plateforme sans passer par les directives requises
- [ ] Captures d'écran 6.7 pouces (1290 × 2796 px) et 6.5 pouces (1242 × 2688 px)
