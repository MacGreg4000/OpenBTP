#!/bin/bash

# Script simple d'arrêt de l'application SecoTech
echo "🛑 Arrêt de l'application SecoTech..."

# Trouver et arrêter les processus Next.js
echo "🔍 Recherche des processus..."
PIDS=$(pgrep -f "next-server" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
    echo "ℹ️  Aucun processus de l'application trouvé."
    exit 0
fi

echo "📋 Processus trouvés: $PIDS"

# Arrêt propre
echo "🔄 Arrêt des processus..."
for pid in $PIDS; do
    echo "  Arrêt du processus $pid"
    kill -TERM "$pid" 2>/dev/null || true
done

# Attendre 5 secondes
echo "⏳ Attente de l'arrêt..."
sleep 5

# Vérifier si des processus sont encore en cours
REMAINING=$(pgrep -f "next-server" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Arrêt forcé des processus restants..."
    for pid in $REMAINING; do
        kill -KILL "$pid" 2>/dev/null || true
    done
fi

echo "✅ Application arrêtée."