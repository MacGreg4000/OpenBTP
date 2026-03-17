#!/bin/sh
set -e

echo "🔄 Attente de la base de données..."
until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done

echo "✅ Base de données disponible"
echo "🔄 Application des migrations Prisma..."
npx prisma migrate deploy

echo "🚀 Démarrage de l'application..."
exec npm run start
