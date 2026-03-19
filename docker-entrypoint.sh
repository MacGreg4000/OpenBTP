#!/bin/sh
set -e

echo "🔄 Attente de la base de données..."
# Extraire les infos de connexion depuis DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed 's|mysql://[^:]*:[^@]*@\([^:]*\):.*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|mysql://[^:]*:[^@]*@[^:]*:\([0-9]*\)/.*|\1|')
DB_USER=$(echo "$DATABASE_URL" | sed 's|mysql://\([^:]*\):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed 's|mysql://[^:]*:\([^@]*\)@.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/\([^?]*\).*|\1|')

until mariadb --skip-ssl -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done

echo "✅ Base de données disponible"
echo "🔄 Application des migrations Prisma..."

# Tenter les migrations. Si la base n'est pas vide (P3005 = import SQL existant),
# faire un baseline automatique puis réessayer.
migrate_output=$(npx prisma migrate deploy 2>&1) || {
  if echo "$migrate_output" | grep -q "P3005"; then
    echo "⚠️  Schéma existant détecté (base importée) - baseline automatique..."
    for dir in prisma/migrations/*/; do
      migration_name=$(basename "$dir")
      npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
    done
    echo "✅ Baseline terminé - relance des migrations..."
    npx prisma migrate deploy
  else
    echo "$migrate_output"
    exit 1
  fi
}

echo "🚀 Démarrage de l'application..."
exec npm run start
