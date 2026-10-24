#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Park Street Operations - 24/7 VPS Setup & Launch Script"
echo "  Target: Isolated Staging Environment (Docker Compose)"
echo "=========================================================="

APP_DIR="/opt/park-street-operations"

# 1. Update system & install prerequisites
echo "[1/6] Updating system packages & installing prerequisites..."
apt-get update -y
apt-get install -y curl git ufw fail2ban

# 2. Install Docker & Compose if not present
if ! command -v docker &> /dev/null; then
    echo "[2/6] Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "[2/6] Docker is already installed."
fi

# 3. Configure strict firewall (only SSH open inbound)
echo "[3/6] Hardening Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# 4. Clone isolated branch code into target directory
echo "[4/6] Setting up project directory at ${APP_DIR}..."
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

if [ ! -f "docker-compose.staging.yml" ]; then
    echo "Cloning branch feat/park-street-operations-isolated..."
    git clone -b feat/park-street-operations-isolated https://github.com/ahmedsaad6540-stack/snag-app-firebase.git repo-temp
    cp -r repo-temp/park-street-operations/* .
    rm -rf repo-temp
fi

# Ensure storage directories exist
mkdir -p .emulator-data-docker-test backups logs exports

# 5. Build and launch containers
echo "[5/6] Building and launching Docker Compose services..."
if [ ! -f ".env" ]; then
    echo "WARNING: .env file is missing. Please create ${APP_DIR}/.env before running containers."
    exit 1
fi

docker compose -f docker-compose.staging.yml up -d --build

# 6. Verify health
echo "[6/6] Verifying container status..."
sleep 10
docker compose -f docker-compose.staging.yml ps

echo "=========================================================="
echo "  Deployment Complete! Containers are running 24/7."
echo "=========================================================="
