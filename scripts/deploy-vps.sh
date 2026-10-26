#!/bin/bash
set -euo pipefail

# scripts/deploy-vps.sh
# Production VPS deployment script for Campus 360 with rollback and tag support.

echo "=== [DEPLOY-VPS] Starting deployment on VPS ==="
cd /opt/campus-360

# One deployment at a time: two concurrent `npm ci` in the same folder leave node_modules
# half-installed (this took the API down on 2026-10-26).
mkdir -p /var/lock
exec 9>/var/lock/campus360-deploy.lock
if ! flock -w 900 9; then
  echo "ERREUR : un autre déploiement tient le verrou depuis plus de 15 min." >&2
  exit 1
fi

TARGET_REF=""
FORCE_FLAG=false

while [ $# -gt 0 ]; do
  case "$1" in
    --ref)
      TARGET_REF="$2"
      shift 2
      ;;
    --force)
      FORCE_FLAG=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Record previous commit SHA before modifying working tree
PREV_SHA=$(git rev-parse HEAD)
echo "Previous commit SHA: $PREV_SHA"

if [ -n "$TARGET_REF" ]; then
  echo "Targeting specific ref/tag: $TARGET_REF"
  git fetch --tags origin
  git fetch origin "$TARGET_REF" || true
  CHANGED_FILES=$(git diff --name-only "$PREV_SHA" "$TARGET_REF" || true)
else
  # Fetch latest changes from GitHub
  echo "Fetching origin main..."
  git fetch origin main
  CHANGED_FILES=$(git diff --name-only "$PREV_SHA" origin/main || true)
fi

echo "Changed files between HEAD and target:"
echo "$CHANGED_FILES"

# Health check helper: 5 attempts spaced by 5s
check_health() {
  local service_name="$1"
  local url="$2"
  echo "Vérification de santé pour $service_name ($url)..."
  local attempts=0
  until curl -fsS -o /dev/null "$url"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 5 ]; then
      echo "ERREUR : Contrôle de santé échoué pour $service_name après 5 essais." >&2
      return 1
    fi
    echo "Attente du service $service_name (essai $attempts/5)..."
    sleep 5
  done
  echo "Service $service_name en ligne et sain."
  return 0
}

# Every dependency declared in package.json must be installed, plus the next binary.
# `npm ci` can exit 0 and still leave packages empty (e.g. a package with only LICENSE/README).
deps_complete() {
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const missing = names.filter((n) => !fs.existsSync(`node_modules/${n}/package.json`));
    if (!fs.existsSync("node_modules/.bin/next")) missing.push(".bin/next");
    if (missing.length) { console.error("Dépendances manquantes : " + missing.join(", ")); process.exit(1); }
  '
}

# npm ci, checked; one clean retry if the install is incomplete.
install_deps() {
  local app="$1"
  if npm ci --no-audit --no-fund && deps_complete; then
    return 0
  fi
  echo "Installation incomplète pour $app, nouvel essai après nettoyage..." >&2
  rm -rf node_modules
  npm cache verify >/dev/null 2>&1 || true
  if npm ci --no-audit --no-fund && deps_complete; then
    return 0
  fi
  echo "ERREUR : dépendances de $app toujours incomplètes." >&2
  return 1
}

# Automated rollback function in case of failure
rollback_and_exit() {
  local short_sha="${PREV_SHA:0:7}"
  echo "!!! ALERTE : Échec du déploiement. Déclenchement du retour automatique vers $short_sha..." >&2
  cd /opt/campus-360
  git reset --hard "$PREV_SHA"

  if echo "$CHANGED_FILES" | grep -q "^landing-site/" || [ "$FORCE_FLAG" = true ]; then
    echo "Reconstruction rollback landing-site..."
    cd /opt/campus-360/landing-site && install_deps landing-site && npm run build && (pm2 restart campus360-landing-site || true)
  fi

  if echo "$CHANGED_FILES" | grep -q "^mobile-api/" || [ "$FORCE_FLAG" = true ]; then
    echo "Reconstruction rollback mobile-api..."
    cd /opt/campus-360/mobile-api && install_deps mobile-api && npm run build && (pm2 restart campus360-mobile-api || true)
  fi

  if echo "$CHANGED_FILES" | grep -q "^recruiter-web/" || [ "$FORCE_FLAG" = true ]; then
    echo "Reconstruction rollback recruiter-web..."
    cd /opt/campus-360/recruiter-web && install_deps recruiter-web && npm run build && (pm2 restart campus360-recruiter-web || true)
  fi

  pm2 save || true
  echo "Déploiement annulé : retour à $short_sha." >&2
  exit 1
}

# Never destroy local work on the VPS: stash uncommitted and untracked changes first
# (recoverable with `git stash list` / `git stash pop`), then reset or checkout.
if [ -n "$(git status --porcelain)" ]; then
  echo "Local changes detected on VPS, stashing them before reset..."
  git stash push --include-untracked -m "pre-deploy $(date -u +%Y%m%dT%H%M%SZ)" || true
fi

if [ -n "$TARGET_REF" ]; then
  echo "Checking out target ref: $TARGET_REF..."
  git checkout --force "$TARGET_REF"
else
  git reset --hard origin/main
fi
git lfs pull

# 1. Update landing-site if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^landing-site/" || [ "$FORCE_FLAG" = true ] || [ ! -d "/opt/campus-360/landing-site/.next" ]; then
    echo "=== Updating landing-site ==="
    cd /opt/campus-360/landing-site
    if ! install_deps landing-site; then
      rollback_and_exit
    fi
    if ! npm run build; then
      rollback_and_exit
    fi
    pm2 restart campus360-landing-site || pm2 start npm --name campus360-landing-site -- start -- -p 3000
    if ! check_health "landing-site" "http://127.0.0.1:3000/"; then
      rollback_and_exit
    fi
    cd /opt/campus-360
fi

# 2. Update mobile-api if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^mobile-api/" || [ "$FORCE_FLAG" = true ] || [ ! -d "/opt/campus-360/mobile-api/.next" ]; then
    echo "=== Updating mobile-api ==="
    cd /opt/campus-360/mobile-api
    if ! install_deps mobile-api; then
      rollback_and_exit
    fi
    # Migrations are additive: rolling the code back leaves an applied one in place, harmlessly.
    if ! npm run migrate; then
      rollback_and_exit
    fi

    # Ensure Chromium is installed for PDF export
    CHROME=$(node -e "import('puppeteer').then(p => p.default.executablePath()).then(x => process.stdout.write(String(x))).catch(() => {})")
    if [ ! -x "$CHROME" ]; then
        echo "Chromium introuvable, installation automatique via puppeteer..."
        npx puppeteer browsers install chrome || true
        CHROME=$(node -e "import('puppeteer').then(p => p.default.executablePath()).then(x => process.stdout.write(String(x))).catch(() => {})")
    fi
    if [ ! -x "$CHROME" ]; then
        echo "Chromium introuvable : export PDF impossible."
        rollback_and_exit
    fi
    echo "Chromium détecté : $("$CHROME" --version)"

    if ! npm run build; then
      rollback_and_exit
    fi
    pm2 restart campus360-mobile-api || pm2 start npm --name campus360-mobile-api -- start -- -p 3002

    # Health check for general API status
    if ! check_health "mobile-api" "http://127.0.0.1:3002/api/health"; then
      rollback_and_exit
    fi

    # Health check for PDF engine
    if [ -n "${HEALTH_PDF_SECRET:-}" ]; then
        echo "Vérification du moteur PDF (/api/health/pdf)..."
        sleep 2
        if ! curl -fsS -o /dev/null -H "x-health-secret: $HEALTH_PDF_SECRET" http://127.0.0.1:3002/api/health/pdf; then
            echo "Échec du health check PDF : export PDF non opérationnel."
            rollback_and_exit
        fi
        echo "Moteur PDF opérationnel."
    fi

    cd /opt/campus-360
fi

# 3. Update recruiter-web if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^recruiter-web/" || [ "$FORCE_FLAG" = true ] || [ ! -d "/opt/campus-360/recruiter-web/.next" ]; then
    echo "=== Updating recruiter-web ==="
    cd /opt/campus-360/recruiter-web
    if ! install_deps recruiter-web; then
      rollback_and_exit
    fi
    if ! npm run build; then
      rollback_and_exit
    fi
    pm2 restart campus360-recruiter-web || pm2 start npm --name campus360-recruiter-web -- start -- -p 3001
    if ! check_health "recruiter-web" "http://127.0.0.1:3001/"; then
      rollback_and_exit
    fi
    cd /opt/campus-360
fi

# Record successful deployment SHA
mkdir -p /var/lib/campus360 || true
git rev-parse HEAD > /var/lib/campus360/last-good-sha 2>/dev/null || true

pm2 save
echo "=== [DEPLOY-VPS] Deployment completed successfully! ==="
