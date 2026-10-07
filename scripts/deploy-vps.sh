#!/usr/bin/env bash
set -e

echo "=== [DEPLOY-VPS] Starting deployment on $(date) ==="
cd /opt/campus-360

# Fetch latest changes from GitHub
echo "Fetching origin main..."
git fetch origin main

# Capture changed files between current HEAD and origin/main
CHANGED_FILES=$(git diff --name-only HEAD origin/main || true)
echo "Changed files between HEAD and origin/main:"
echo "$CHANGED_FILES"

# Reset working tree to origin/main
git reset --hard origin/main
git lfs pull

# 1. Update landing-site if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^landing-site/" || [ "$1" == "--force" ] || [ ! -d "/opt/campus-360/landing-site/.next" ]; then
    echo "=== Updating landing-site ==="
    cd /opt/campus-360/landing-site
    npm ci --no-audit --no-fund
    npm run build
    pm2 restart campus360-landing-site || pm2 start npm --name campus360-landing-site -- start -- -p 3000
    cd /opt/campus-360
fi

# 2. Update mobile-api if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^mobile-api/" || [ "$1" == "--force" ] || [ ! -d "/opt/campus-360/mobile-api/.next" ]; then
    echo "=== Updating mobile-api ==="
    cd /opt/campus-360/mobile-api
    npm ci --no-audit --no-fund
    npm run build
    pm2 restart campus360-mobile-api || pm2 start npm --name campus360-mobile-api -- start -- -p 3002
    cd /opt/campus-360
fi

# 3. Update recruiter-web if modified or force flag provided
if echo "$CHANGED_FILES" | grep -q "^recruiter-web/" || [ "$1" == "--force" ] || [ ! -d "/opt/campus-360/recruiter-web/.next" ]; then
    echo "=== Updating recruiter-web ==="
    cd /opt/campus-360/recruiter-web
    npm ci --no-audit --no-fund
    npm run build
    pm2 restart campus360-recruiter-web || pm2 start npm --name campus360-recruiter-web -- start -- -p 3001
    cd /opt/campus-360
fi

pm2 save
echo "=== [DEPLOY-VPS] Deployment completed successfully! ==="
