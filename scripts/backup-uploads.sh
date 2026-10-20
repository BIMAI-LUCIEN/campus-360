#!/usr/bin/env bash
# Uploads storage backup script for Campus 360
# Compresses UPLOAD_ROOT into tar.gz, rotates daily (7 days) and weekly (28 days).
set -euo pipefail

BACKUP_ROOT="${BACKUP_DIR:-/var/backups/campus360/uploads}"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"
chmod 700 "$BACKUP_ROOT" || true

# 1. Resolve UPLOAD_ROOT
TARGET_DIR="${UPLOAD_ROOT:-}"
if [ -z "$TARGET_DIR" ]; then
  ENV_FILE="/opt/campus-360/mobile-api/.env.production"
  if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="/opt/campus-360/mobile-api/.env.local"
  fi
  if [ -f "$ENV_FILE" ]; then
    TARGET_DIR=$(grep -E '^UPLOAD_ROOT=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"'"'")
  fi
fi

if [ -z "$TARGET_DIR" ] || [ ! -d "$TARGET_DIR" ]; then
  echo "[backup-uploads] ERREUR : UPLOAD_ROOT introuvable ou répertoire inexistant ($TARGET_DIR)." >&2
  exit 1
fi

TODAY=$(date +%Y%m%d)
ARCHIVE_FILE="$DAILY_DIR/campus360-uploads-${TODAY}.tar.gz"

echo "[backup-uploads] Sauvegarde de $TARGET_DIR vers $ARCHIVE_FILE..."
if ! tar -czf "$ARCHIVE_FILE" -C "$(dirname "$TARGET_DIR")" "$(basename "$TARGET_DIR")"; then
  echo "[backup-uploads] ÉCHEC de l'archivage tar." >&2
  exit 1
fi
chmod 600 "$ARCHIVE_FILE"

# If Sunday (day 7 of week), copy to weekly backup
DOW=$(date +%u)
if [ "$DOW" -eq 7 ]; then
  echo "[backup-uploads] Dimanche détecté : archivage hebdomadaire..."
  cp "$ARCHIVE_FILE" "$WEEKLY_DIR/campus360-uploads-${TODAY}.tar.gz"
fi

# Retention policy: daily backups kept 7 days, weekly backups kept 28 days
echo "[backup-uploads] Application de la rotation des sauvegardes..."
find "$DAILY_DIR" -type f -name "campus360-uploads-*.tar.gz" -mtime +7 -delete || true
find "$WEEKLY_DIR" -type f -name "campus360-uploads-*.tar.gz" -mtime +28 -delete || true

echo "[backup-uploads] Sauvegarde des uploads terminée avec succès."
