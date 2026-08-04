#!/bin/bash

# 🚀 DEPLOYMENT SCRIPT VPS UBUNTU — ARCHI CAM AI
# =================================================
# Script d'installation et de déploiement automatique sur le VPS Cloud Ubuntu.

set -e

echo "================================================================="
echo "🏛️ DEPLOYING ARCHI CAM AI PRODUCTION WORKERS ON VPS CLOUD"
echo "================================================================="

# 1. Mise à jour système et dépendances Docker
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git certbot python3-certbot-nginx docker.io docker-compose

# 2. Vérification du nom de domaine SSL
DOMAIN=${1:-vps.archicamai.cm}
EMAIL=${2:-admin@archicamai.cm}

echo "🌐 Configuration du SSL Let's Encrypt pour le domaine: $DOMAIN"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m $EMAIL
fi

# 3. Création des répertoires de données
mkdir -p data projects public/assets

# 4. Lancement des conteneurs Docker Production
echo "⚙️ Lancement des microservices via docker-compose.production.yml..."
docker-compose -f docker-compose.production.yml up -d --build

echo "================================================================="
echo "✅ DÉPLOIEMENT VPS REUSSI !"
echo "FastMCP Service : https://$DOMAIN/health"
echo "Neo4j Bolt      : bolt://$DOMAIN:7687"
echo "================================================================="
