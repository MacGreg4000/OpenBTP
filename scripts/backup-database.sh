#!/bin/bash

###############################################################################
# Script shell pour la sauvegarde automatique de la base de données
# 
# Ce script wrapper facilite l'exécution du script Node.js de sauvegarde
# et peut être utilisé directement dans un cron job.
#
# Usage:
#   ./scripts/backup-database.sh
#
# Configuration:
#   - Le script utilise les variables d'environnement du fichier .env
#   - Le dossier de sauvegarde peut être défini via BACKUP_DIR
#   - Le nombre de jours à conserver peut être défini via KEEP_DAYS
###############################################################################

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Obtenir le répertoire du script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Aller dans le répertoire du projet
cd "$PROJECT_DIR" || exit 1

# Charger les variables d'environnement depuis .env
if [ -f .env ]; then
    echo -e "${CYAN}📋 Chargement des variables d'environnement...${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé, utilisation des variables d'environnement système${NC}"
fi

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERREUR: DATABASE_URL n'est pas définie${NC}"
    echo -e "${YELLOW}   Définissez-la dans le fichier .env ou comme variable d'environnement${NC}"
    exit 1
fi

# Exécuter le script Node.js
echo -e "${CYAN}🚀 Démarrage de la sauvegarde...${NC}\n"
node "$SCRIPT_DIR/backup-database.js"

# Vérifier le code de sortie
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Script terminé avec succès${NC}"
else
    echo -e "\n${RED}❌ Le script a échoué avec le code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi


