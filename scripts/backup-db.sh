#!/usr/bin/env bash
# Database backup script for Campus 360 (Supabase PostgreSQL)
# Generates custom-format pg_dump, rotates daily (7 days) and weekly (28 days).
set -euo pipefail

BACKUP_ROOT="${BACKUP_DIR:-/var/backups/campus360/db}"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"
chmod 700 "$BACKUP_ROOT" || true

# 1. Resolve DATABASE_URL securely without logging credentials
if [ -z "${DATABASE_URL:-}" ]; then
  ENV_FILE="/opt/campus-360/mobile-api/.env.production"
  if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="/opt/campus-360/mobile-api/.env.local"
  fi
  if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"'"'")
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup-db] ERREUR : DATABASE_URL introuvable dans l'environnement et les fichiers .env." >&2
  exit 1
fi

TODAY=$(date +%Y%m%d)
BACKUP_FILE="$DAILY_DIR/campus360-db-${TODAY}.dump"

echo "[backup-db] Démarrage de la sauvegarde quotidienne vers $BACKUP_FILE..."
if ! pg_dump --format=custom --no-owner "$DATABASE_URL" -f "$BACKUP_FILE"; then
  echo "[backup-db] ÉCHEC de pg_dump." >&2
  exit 1
fi
chmod 600 "$BACKUP_FILE"

# If Sunday (day 7 of week), copy to weekly backup
DOW=$(date +%u)
if [ "$DOW" -eq 7 ]; then
  echo "[backup-db] Dimanche détecté : archivage hebdomadaire..."
  cp "$BACKUP_FILE" "$WEEKLY_DIR/campus360-db-${TODAY}.dump"
fi

# Retention policy: daily backups kept 7 days, weekly backups kept 28 days
echo "[backup-db] Application de la rotation des sauvegardes..."
find "$DAILY_DIR" -type f -name "campus360-db-*.dump" -mtime +7 -delete || true
find "$WEEKLY_DIR" -type f -name "campus360-db-*.dump" -mtime +28 -delete || true

echo "[backup-db] Sauvegarde terminée avec succès."
