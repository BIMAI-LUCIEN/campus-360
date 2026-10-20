# Hôte de fichiers `files.campus360b.site` (Module 19)

Les images et sources envoyées depuis l'app sont stockées sur le disque du VPS. Vercel n'a pas de disque persistant : l'app envoie donc les fichiers à `files.campus360b.site`, qui pointe vers la `mobile-api` du VPS (pm2 `campus360-mobile-api`, port 3002).

## 1. DNS (chez LWS)

Enregistrement `A` : `files` → `164.68.109.206`.

Vérification : `nslookup files.campus360b.site 8.8.8.8` renvoie `164.68.109.206`.

## 2. Dossier de stockage

Hors du dépôt, pour qu'un redéploiement ne l'efface jamais :

```bash
sudo mkdir -p /var/lib/campus360/uploads
sudo chown -R "$(whoami)":"$(whoami)" /var/lib/campus360/uploads
sudo chmod 750 /var/lib/campus360/uploads
```

L'utilisateur propriétaire doit être celui qui exécute pm2.

## 3. Variables d'environnement

| Variable | VPS (`mobile-api/.env.production` ou `.env.local`) | Vercel (projet mobile-api) |
|---|---|---|
| `UPLOAD_ROOT` | `/var/lib/campus360/uploads` | non utilisé |
| `FILES_PUBLIC_URL` | `https://files.campus360b.site` | `https://files.campus360b.site` |
| `FILES_SIGNING_SECRET` | même valeur des deux côtés (optionnel) | même valeur |

Si `FILES_SIGNING_SECRET` est absent, la clé de signature est dérivée de `BETTER_AUTH_SECRET`, déjà partagé entre les deux hôtes. En production, `FILES_PUBLIC_URL` vaut `https://files.campus360b.site` par défaut.

Après modification : `pm2 restart campus360-mobile-api --update-env`.

## 4. Nginx et certificat

```bash
sudo cp docs/deploy/nginx-files.conf /etc/nginx/sites-available/files.campus360b.site
sudo ln -s /etc/nginx/sites-available/files.campus360b.site /etc/nginx/sites-enabled/
# Premier certificat (le bloc 443 doit être commenté tant que le certificat n'existe pas) :
sudo certbot certonly --webroot -w /var/www/certbot -d files.campus360b.site
sudo nginx -t && sudo systemctl reload nginx
```

Vérification : `curl -I https://files.campus360b.site/api/files/00000000-0000-4000-8000-000000000000` renvoie `403`, et non une erreur TLS.

## 5. Purge et sauvegarde (crontab de l'utilisateur pm2)

Les sauvegardes complètes et la rotation automatisée sont centralisées dans les scripts `scripts/backup-db.sh` et `scripts/backup-uploads.sh`. Consulter [OPERATIONS.md](OPERATIONS.md) pour les détails d'exploitation et de restauration.

```cron
# Fichiers orphelins (documents supprimés depuis Vercel), chaque nuit à 3 h (avec sécurité plafond)
0 3 * * * cd /opt/campus-360 && UPLOAD_ROOT=/var/lib/campus360/uploads node scripts/purge-orphan-uploads.cjs >> /var/log/campus360-purge.log 2>&1
# Sauvegarde quotidienne des fichiers (7 jours de rétention quotidienne, 28 jours pour l'archive hebdomadaire)
30 3 * * * /opt/campus-360/scripts/backup-uploads.sh >> /var/log/campus360-backup-uploads.log 2>&1
```

`node scripts/purge-orphan-uploads.cjs --dry-run` liste ce qui serait supprimé, sans rien supprimer. Le flag `--max-delete` (défaut 200) protège contre toute suppression de masse accidentelle.

## 6. Application mobile

La variable `EXPO_PUBLIC_FILES_URL` vaut `https://files.campus360b.site` par défaut. En développement, l'app envoie les fichiers à la `mobile-api` locale (`http://<IP LAN>:3002`).
