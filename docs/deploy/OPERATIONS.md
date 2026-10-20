# Guide d'Exploitation & Continuité de Service — Campus 360

Ce guide réunit les procédures opérationnelles pour la production sur le VPS Ubuntu (`164.68.109.206`) et la base PostgreSQL Supabase : sauvegardes automatiques, procédure de restauration testée, retour arrière (rollback), purge sécurisée et surveillance externe.

---

## 1. Sauvegardes Automatiques

Deux scripts automatisés gèrent les sauvegardes avec une politique de rétention standard (7 jours quotidiens, 4 semaines hebdomadaires) :

### A. Base de données PostgreSQL (`scripts/backup-db.sh`)
- Exécute un `pg_dump` au format binaire compressé (`--format=custom --no-owner`).
- Stocké dans `/var/backups/campus360/db/daily/campus360-db-YYYYMMDD.dump` (droits `600`).
- Le dimanche, copie automatique dans `/var/backups/campus360/db/weekly/`.
- Rotation automatique : suppression des fichiers quotidiens de plus de 7 jours et hebdomadaires de plus de 28 jours.

### B. Fichiers et Uploads VPS (`scripts/backup-uploads.sh`)
- Archive compressée `tar.gz` de tout le répertoire `$UPLOAD_ROOT` (`/var/lib/campus360/uploads`).
- Stocké dans `/var/backups/campus360/uploads/daily/campus360-uploads-YYYYMMDD.tar.gz`.
- Rotation automatique : 7 jours quotidiens, 28 jours hebdomadaires.

### C. Configuration Crontab recommandée
Ajouter dans la crontab de l'utilisateur exécutant (ex. `sudo crontab -e` ou utilisateur pm2) :
```cron
# 1. Sauvegarde quotidienne de la base PostgreSQL à 02h15
15 2 * * * /opt/campus-360/scripts/backup-db.sh >> /var/log/campus360-backup-db.log 2>&1

# 2. Purge des uploads orphelins à 03h00 (sécurité plafond 200 fichiers / 20%)
0 3 * * * cd /opt/campus-360 && UPLOAD_ROOT=/var/lib/campus360/uploads node scripts/purge-orphan-uploads.cjs >> /var/log/campus360-purge.log 2>&1

# 3. Sauvegarde quotidienne des fichiers à 03h30
30 3 * * * /opt/campus-360/scripts/backup-uploads.sh >> /var/log/campus360-backup-uploads.log 2>&1
```

---

## 2. Procédure de Restauration de la Base de Données

Avant toute restauration en production, tester impérativement sur une base isolée.

### Étape 1 : Créer une base de test
```bash
createdb -h localhost -U postgres campus360_restore_test
```

### Étape 2 : Restaurer le dump
```bash
pg_restore --clean --if-exists --no-owner -h localhost -U postgres -d campus360_restore_test /var/backups/campus360/db/daily/campus360-db-20261020.dump
```

### Étape 3 : Contrôler la cohérence et les volumes
Vérifier que les tables critiques contiennent les volumes attendus :
```sql
SELECT count(*) FROM public.app_users;
SELECT count(*) FROM public.app_documents;
SELECT count(*) FROM public.app_wallet_transactions;
SELECT count(*) FROM public.stage_applications;
```

### Étape 4 : Bascule en production (en cas de sinistre avéré)
```bash
# Arrêter les services pour éviter toute écriture concurrente
pm2 stop all

# Restaurer sur la base active
pg_restore --clean --if-exists --no-owner "$DATABASE_URL" /var/backups/campus360/db/daily/campus360-db-YYYYMMDD.dump

# Redémarrer les services
pm2 start all
```

---

## 3. Déploiement et Rollback Automatique

Le script de déploiement `scripts/deploy-vps.sh` intègre désormais :
1. Mémorisation du commit précédent (`PREV_SHA`).
2. Exécution des migrations versionnées (`npm run migrate`).
3. Contrôle de présence de Chromium pour l'export PDF.
4. Sonde de santé HTTP (5 essais toutes les 5s) sur chaque service après redémarrage :
   - `http://127.0.0.1:3000/` (Landing)
   - `http://127.0.0.1:3002/api/health` et `/api/health/pdf` (Mobile API)
   - `http://127.0.0.1:3001/` (Admin)
5. En cas d'échec du build ou de la santé, le script effectue un **rollback automatique** :
   - `git reset --hard "$PREV_SHA"`
   - Recompilation et redémarrage des services
   - Sortie en erreur `exit 1` avec journalisation du SHA restauré.

### Rollback manuel
Si un problème fonctionnel survient après un déploiement réussi :
```bash
cd /opt/campus-360
git reset --hard <SHA_VALIDE_PRECEDENT>

# Reconstruire les services concernés
cd mobile-api && npm ci && npm run build && pm2 restart campus360-mobile-api
cd ../landing-site && npm ci && npm run build && pm2 restart campus360-landing-site
cd ../recruiter-web && npm ci && npm run build && pm2 restart campus360-recruiter-web
pm2 save
```
> **Règle :** Un rollback de code ne défait jamais les migrations SQL (toutes les migrations doivent être rétrocompatibles et additives).

---

## 4. Purge Sécurisée des Uploads Orphelins

Le script `scripts/purge-orphan-uploads.cjs` supprime les fichiers du disque qui ne sont plus référencés en base.

- Toujours exécuter en mode simulation d'abord :
  ```bash
  node scripts/purge-orphan-uploads.cjs --dry-run
  ```
- **Plafonds de sécurité intégrés** :
  - Refus d'exécuter si plus de 200 fichiers (`--max-delete`) doivent être supprimés.
  - Refus d'exécuter si plus de 20% du total des fichiers doivent être supprimés.
- Pour forcer une purge dépassant les seuils :
  ```bash
  node scripts/purge-orphan-uploads.cjs --force
  ```

---

## 5. Surveillance Externe (Monitoring & Alerting)

Pour détecter immédiatement toute coupure sans attendre les retours utilisateurs :

1. Configurer un moniteur externe (ex. Better Stack Uptime, Uptime Kuma, ou Pingdom).
2. Pointer la sonde HTTP GET vers :
   - URL : `https://api.campus360b.site/api/health`
   - Fréquence : Toutes les 5 minutes.
   - Code HTTP attendu : `200`.
   - Corps attendu : `{"status":"ok","db":"connected"}`.
3. Configurer une alerte instantanée par e-mail / SMS vers l'administrateur technique dès le 2ème échec consécutif.
