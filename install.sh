#!/bin/sh
# ============================================================
# install.sh — Script d'installation OpenBTP (Docker)
# Usage : sudo sh install.sh
# ============================================================

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "${BOLD}🚀 Installation OpenBTP${NC}"
echo "========================================"

# --- 1. Vérifier que Docker est disponible ---
if ! command -v docker > /dev/null 2>&1; then
  echo "${RED}❌ Docker n'est pas installé ou pas dans le PATH.${NC}"
  exit 1
fi

# --- 2. Créer le fichier .env si absent ---
if [ ! -f .env ]; then
  echo "${YELLOW}⚙️  Création du fichier .env depuis .env.docker...${NC}"
  cp .env.docker .env
  echo ""
  echo "${YELLOW}⚠️  Le fichier .env a été créé avec des valeurs par défaut.${NC}"
  echo "   Éditez-le avec vos vraies valeurs avant de continuer :"
  echo ""
  echo "   nano .env"
  echo ""
  echo "   Valeurs obligatoires à changer :"
  echo "   - DB_ROOT_PASSWORD"
  echo "   - DB_PASSWORD"
  echo "   - NEXTAUTH_URL"
  echo "   - NEXTAUTH_SECRET"
  echo "   - NEXT_PUBLIC_APP_URL"
  echo ""
  echo "   Relancez ensuite : sudo sh install.sh"
  exit 0
fi

# --- 3. Vérifier que les valeurs par défaut ont été changées ---
if grep -q "change_me" .env; then
  echo "${RED}❌ Le fichier .env contient encore des valeurs 'change_me'.${NC}"
  echo "   Éditez-le : nano .env"
  exit 1
fi

# --- 4. Lire le chemin des uploads depuis .env ---
UPLOADS_PATH=$(grep "^UPLOADS_PATH=" .env | cut -d= -f2)
UPLOADS_PATH=${UPLOADS_PATH:-/volume1/docker/openbtp/uploads}

# --- 5. Créer le dossier uploads si absent ---
if [ ! -d "$UPLOADS_PATH" ]; then
  echo "${YELLOW}📁 Création du dossier uploads : $UPLOADS_PATH${NC}"
  mkdir -p "$UPLOADS_PATH"
  chmod 755 "$UPLOADS_PATH"
  echo "${GREEN}✅ Dossier créé.${NC}"
else
  echo "${GREEN}✅ Dossier uploads existant : $UPLOADS_PATH${NC}"
fi

# --- 6. Lire le port ---
APP_PORT=$(grep "^APP_PORT=" .env | cut -d= -f2)
APP_PORT=${APP_PORT:-3333}

# --- 7. Build et démarrage ---
echo ""
echo "${BOLD}🔨 Build et démarrage des containers...${NC}"
docker compose up -d --build

echo ""
echo "${GREEN}${BOLD}✅ OpenBTP démarré avec succès !${NC}"
echo "========================================"
echo "   📡 Port local    : http://localhost:${APP_PORT}"

NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env | cut -d= -f2)
if [ -n "$NEXTAUTH_URL" ]; then
  echo "   🌐 URL publique  : $NEXTAUTH_URL"
fi

echo ""
echo "   Commandes utiles :"
echo "   sudo docker compose ps           # état des containers"
echo "   sudo docker compose logs -f      # logs en direct"
echo "   sudo docker compose down         # arrêter"
echo ""
