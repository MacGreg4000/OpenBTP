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

# ===== Permissions upload / backups =====
# En Docker, les volumes montés remplacent les dossiers créés pendant la build.
# Si le dossier public/uploads sur l'hôte n'a pas les bonnes permissions,
# l'upload échoue avec EACCES.
echo "🔧 Vérification/ajustement permissions dossiers montés..."
mkdir -p /app/public/uploads /app/public/chantiers /app/public/documents /app/backups || true
chown -R nextjs:nodejs /app/public/uploads /app/public/chantiers /app/public/documents /app/backups 2>/dev/null || true
chmod -R u+rwX,g+rwX,o+rX /app/public/uploads /app/public/chantiers /app/public/documents /app/backups 2>/dev/null || true

# Vérifier si la base est vide (aucune table)
# -sN = silent (pas de bordures) + no column names → retourne juste la valeur
TABLE_COUNT=$(mariadb --skip-ssl -sN -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" 2>/dev/null)

# Chercher un fichier .sql dans /app/init-db/
SQL_FILE=""
for f in /app/init-db/*.sql; do
  [ -f "$f" ] && SQL_FILE="$f" && break
done

if [ "$TABLE_COUNT" = "0" ] && [ -n "$SQL_FILE" ]; then
  echo "📥 Base vide détectée — import de $(basename "$SQL_FILE")..."
  echo "⏳ Cette opération peut prendre plusieurs minutes sur un NAS..."
  mariadb --skip-ssl -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
  echo "✅ Import SQL terminé"
fi

echo "🔄 Application des migrations Prisma..."

# Tenter les migrations. Si la base n'est pas vide (P3005 = import SQL existant),
# faire un baseline automatique puis réessayer.
migrate_output=$(npx prisma migrate deploy 2>&1) || {
  if echo "$migrate_output" | grep -q "P3005"; then
    echo "⚠️  Schéma existant détecté (P3005). Vérification du schéma avant baseline..."

    # Baseline "automatique" = on marque toutes les migrations comme appliquées.
    # C'est seulement correct si le schéma SQL existant est déjà au bon niveau.
    # Sinon, on risque de "sauter" des migrations => tables manquantes.
    HAS_BON_PREPARATION=$(mariadb --skip-ssl -sN -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
      -e "SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='bon_preparation' LIMIT 1" 2>/dev/null || true)

    if [ -z "$HAS_BON_PREPARATION" ]; then
      echo "❌ Table 'bon_preparation' absente: baseline refusé. Il faut appliquer les migrations correctement."
      echo "----- prisma output (P3005) -----"
      echo "$migrate_output"
      exit 1
    fi

    echo "✅ Schéma semble cohérent (bon_preparation présent) - baseline automatique..."
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
exec su -s /bin/sh -c "npm run start" nextjs
