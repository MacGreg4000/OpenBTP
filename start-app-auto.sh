#!/bin/bash

# Script de démarrage automatique pour NAS
# Ce script est conçu pour être exécuté sans interaction utilisateur

# Définir le répertoire de l'application (à adapter selon votre NAS)
APP_DIR="/volume1/docker/app-secotech"  # ⚠️ MODIFIER CE CHEMIN selon votre installation
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/app-$(date +%Y%m%d).log"

# Créer le répertoire de logs s'il n'existe pas
mkdir -p "$LOG_DIR"

# Fonction de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "🚀 Démarrage automatique de l'application SecoTech"

# Vérifier si le répertoire existe
if [ ! -d "$APP_DIR" ]; then
    log "❌ ERREUR: Le répertoire $APP_DIR n'existe pas"
    exit 1
fi

# Se placer dans le répertoire de l'application
cd "$APP_DIR" || {
    log "❌ ERREUR: Impossible de se placer dans $APP_DIR"
    exit 1
}

log "📂 Répertoire de travail: $(pwd)"

# Vérifier si l'application est déjà en cours d'exécution
if pgrep -f "next-server" > /dev/null; then
    log "⚠️  L'application est déjà en cours d'exécution."
    log "PID: $(pgrep -f 'next-server')"
    log "Arrêt du démarrage automatique."
    exit 0
fi

# Vérifier que Node.js est disponible
if ! command -v node &> /dev/null; then
    log "❌ ERREUR: Node.js n'est pas installé ou pas dans le PATH"
    exit 1
fi

log "✅ Node.js version: $(node --version)"
log "✅ npm version: $(npm --version)"

# Démarrer l'application en arrière-plan
log "📦 Démarrage de l'application avec npm run start..."

# Lancer l'application en arrière-plan avec redirection des logs
nohup npm run start >> "$LOG_FILE" 2>&1 &

# Attendre un peu pour vérifier que l'application démarre
sleep 3

# Vérifier que l'application a bien démarré
if pgrep -f "next-server" > /dev/null; then
    log "✅ Application démarrée avec succès!"
    log "PID: $(pgrep -f 'next-server')"
else
    log "❌ ERREUR: L'application n'a pas pu démarrer"
    log "Consultez les logs pour plus d'informations: $LOG_FILE"
    exit 1
fi

log "=========================================="


