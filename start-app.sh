#!/bin/bash

# Script simple de démarrage de l'application SecoTech
echo "🚀 Démarrage de l'application SecoTech..."

# Vérifier si l'application est déjà en cours d'exécution
if pgrep -f "next-server" > /dev/null; then
    echo "⚠️  L'application semble déjà en cours d'exécution."
    echo "PID: $(pgrep -f 'next-server')"
    echo "Voulez-vous continuer ? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Démarrage annulé."
        exit 0
    fi
fi

# Démarrer l'application
echo "📦 Démarrage avec npm run start..."
npm run start