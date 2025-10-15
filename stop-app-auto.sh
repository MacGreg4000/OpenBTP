#!/bin/bash

# Script d'arrêt automatique pour NAS

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
log "🛑 Arrêt automatique de l'application SecoTech"

# Trouver et arrêter les processus Next.js
PIDS=$(pgrep -f "next-server" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
    log "ℹ️  Aucun processus de l'application trouvé."
    exit 0
fi

log "📋 Processus trouvés: $PIDS"

# Arrêt propre avec SIGTERM
log "🔄 Arrêt des processus avec SIGTERM..."
for pid in $PIDS; do
    log "  Arrêt du processus $pid"
    kill -TERM "$pid" 2>/dev/null || true
done

# Attendre 10 secondes pour un arrêt propre
log "⏳ Attente de l'arrêt (10 secondes)..."
sleep 10

# Vérifier si des processus sont encore en cours
REMAINING=$(pgrep -f "next-server" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    log "⚠️  Arrêt forcé avec SIGKILL des processus restants: $REMAINING"
    for pid in $REMAINING; do
        kill -KILL "$pid" 2>/dev/null || true
    done
    sleep 2
fi

# Vérification finale
FINAL_CHECK=$(pgrep -f "next-server" 2>/dev/null || true)
if [ -z "$FINAL_CHECK" ]; then
    log "✅ Application arrêtée avec succès."
else
    log "❌ ATTENTION: Certains processus n'ont pas pu être arrêtés: $FINAL_CHECK"
    exit 1
fi

log "=========================================="


