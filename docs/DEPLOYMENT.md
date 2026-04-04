# 🚀 Guide de Déploiement - OpenBTP

## Table des matières

1. [Installation Fraîche](#installation-fraîche)
2. [Mise à Jour](#mise-à-jour)
3. [Déploiement Production](#déploiement-production)
4. [Troubleshooting](#troubleshooting)

---

## 📦 Installation Fraîche

### Prérequis

- Node.js 18+ et npm
- MySQL 8.0+
- Git
- PM2 (pour la production)

### Étapes complètes

```bash
# 1. Cloner le repository
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
nano .env  # Éditer avec vos paramètres
```

**Exemple de `.env` :**
```env
DATABASE_URL="mysql://user:password@localhost:3306/appsecotech"
NEXTAUTH_SECRET="votre_secret_très_long_et_aléatoire"
NEXTAUTH_URL="https://votre-domaine.com"
OLLAMA_BASE_URL="http://votre-nas:11434"
OLLAMA_MODEL="phi3:mini"
```

```bash
# 4. Créer la base de données
mysql -u root -p
> CREATE DATABASE appsecotech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> exit;

# 5. Déployer la structure de la base
npx prisma db push

# 6. ⚠️ IMPORTANT : Remplir les données de base (OBLIGATOIRE)
npx tsx prisma/seed.ts

# 7. Générer le client Prisma
npx prisma generate

# 8. Build de l'application
npm run build

# 9. Démarrer l'application
# Développement :
npm run dev

# Production :
npm start
# OU avec PM2 :
pm2 start npm --name "openbtp" -- start
pm2 save
```

---

## 🔄 Mise à Jour

### Sur votre machine de développement

```bash
cd OpenBTP

# 1. Récupérer les dernières modifications
git pull

# 2. Mettre à jour les dépendances
npm install

# 3. Mettre à jour le schéma de base de données (si modifié)
npx prisma db push

# 4. ⚠️ Mettre à jour les données (modules, etc.)
npx tsx prisma/seed.ts

# 5. Générer le client Prisma
npx prisma generate

# 6. Rebuild
npm run build

# 7. Redémarrer
npm run dev
```

### Sur votre serveur de production (NAS ou autre)

#### Option A : Avec accès SSH et npm

```bash
# Se connecter au serveur
ssh user@votre-nas

cd /chemin/vers/OpenBTP

# Script de mise à jour complet
git pull && \
npm install && \
npx tsx prisma/seed.ts && \
npm run build && \
pm2 restart openbtp
```

#### Option B : Sans npx/tsx (limitation NAS)

**Depuis votre Mac** (temporairement connecté à la base de prod) :

```bash
cd /Users/gregory/Desktop/OpenBTP

# 1. Éditer temporairement .env pour pointer vers la prod
nano .env
# Remplacer DATABASE_URL par celle de la prod

# 2. Exécuter le seed à distance
npx tsx prisma/seed.ts

# 3. Remettre .env en local
git checkout .env
```

**Puis sur le NAS** :

```bash
ssh user@votre-nas
cd /chemin/vers/OpenBTP

git pull && \
npm install && \
npm run build && \
pm2 restart openbtp
```

#### Option C : SQL Manuel (si vraiment impossible)

1. Connectez-vous à phpMyAdmin sur votre NAS
2. Sélectionnez la base `appsecotech`
3. Allez dans l'onglet SQL
4. Copiez le contenu du fichier `docs/seed.sql` (si disponible)
5. Exécutez

---

## 🏭 Déploiement Production

### Checklist de pré-déploiement

- [ ] Backup de la base de données
- [ ] Variables d'environnement configurées
- [ ] Tests locaux réussis
- [ ] Build sans erreurs
- [ ] Documentation à jour

### Script de déploiement automatisé

Créez un fichier `deploy.sh` :

```bash
#!/bin/bash

echo "🚀 Déploiement OpenBTP en cours..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction d'erreur
error_exit() {
    echo -e "${RED}❌ Erreur: $1${NC}" 1>&2
    exit 1
}

# 1. Backup de la base de données
echo "📦 Backup de la base de données..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u $DB_USER -p$DB_PASS appsecotech > "backups/$BACKUP_FILE" || error_exit "Backup failed"
echo -e "${GREEN}✓ Backup créé: $BACKUP_FILE${NC}"

# 2. Git pull
echo "📥 Récupération des dernières modifications..."
git pull origin main || error_exit "Git pull failed"
echo -e "${GREEN}✓ Code mis à jour${NC}"

# 3. Installation des dépendances
echo "📦 Installation des dépendances..."
npm install || error_exit "npm install failed"
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Mise à jour de la base de données
echo "🗄️ Mise à jour de la base de données..."
npx prisma db push || error_exit "Prisma push failed"
echo -e "${GREEN}✓ Schéma de base de données à jour${NC}"

# 5. Seed des données
echo "🌱 Seed des données..."
npx tsx prisma/seed.ts || error_exit "Seed failed"
echo -e "${GREEN}✓ Données de base créées${NC}"

# 6. Build de l'application
echo "🔨 Build de l'application..."
npm run build || error_exit "Build failed"
echo -e "${GREEN}✓ Application buildée${NC}"

# 7. Redémarrage du serveur
echo "🔄 Redémarrage du serveur..."
pm2 restart openbtp || error_exit "PM2 restart failed"
echo -e "${GREEN}✓ Serveur redémarré${NC}"

# 8. Vérification
echo "🔍 Vérification du statut..."
pm2 status openbtp

echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo "🌐 L'application est accessible à : $NEXTAUTH_URL"
```

### Utilisation du script

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔧 Configuration PM2

### Fichier `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'openbtp',
    script: 'npm',
    args: 'start',
    cwd: '/chemin/vers/OpenBTP',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}
```

### Commandes PM2 utiles

```bash
# Démarrer l'application
pm2 start ecosystem.config.js

# Voir les logs
pm2 logs openbtp

# Voir le statut
pm2 status

# Redémarrer
pm2 restart openbtp

# Arrêter
pm2 stop openbtp

# Supprimer
pm2 delete openbtp

# Monitoring
pm2 monit

# Sauvegarder la config
pm2 save

# Démarrage automatique au boot
pm2 startup
```

---

## 🐳 Docker (optionnel)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Build de l'application
RUN npm run build

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://user:password@db:3306/appsecotech
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=appsecotech
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

---

## 🔍 Troubleshooting

### Erreur : "Module not found"

**Cause** : Dépendances manquantes

**Solution** :
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erreur : "Cannot connect to database"

**Cause** : URL de connexion incorrecte ou base inaccessible

**Vérifications** :
1. Vérifier `DATABASE_URL` dans `.env`
2. Tester la connexion MySQL :
   ```bash
   mysql -h HOST -u USER -p DATABASE
   ```
3. Vérifier que MySQL est démarré

### Erreur : "Table 'feature_modules' doesn't exist"

**Cause** : Le seed n'a pas été exécuté

**Solution** :
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### Build qui échoue

**Causes possibles** :
- TypeScript errors
- Dépendances manquantes
- Mémoire insuffisante

**Solution** :
```bash
# Vider le cache
rm -rf .next
npm run build

# Si mémoire insuffisante
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

### Application ne démarre pas après déploiement

**Vérifications** :
```bash
# Vérifier les logs
pm2 logs openbtp

# Vérifier le statut
pm2 status

# Redémarrer en mode debug
pm2 delete openbtp
NODE_ENV=production npm start
```

### Cache localStorage qui persiste

**Problème** : Les modules ne se mettent pas à jour

**Solution côté client** :
1. F12 → Console
2. Taper : `localStorage.clear()`
3. Recharger la page (F5)

---

## 📊 Monitoring

### Logs à surveiller

```bash
# Logs applicatifs
tail -f logs/out.log
tail -f logs/err.log

# Logs système
journalctl -u openbtp -f

# Logs Nginx (si utilisé)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Métriques importantes

- **CPU** : Doit rester < 70%
- **Mémoire** : < 1GB par défaut
- **Temps de réponse** : < 500ms
- **Erreurs** : 0 erreur critique

---

## 🔒 Sécurité

### Checklist de sécurité

- [ ] Firewall configuré (port 3000 interne uniquement)
- [ ] Reverse proxy (Nginx/Apache) avec SSL
- [ ] Variables d'environnement sécurisées
- [ ] Backups automatiques configurés
- [ ] Logs rotatifs activés
- [ ] Mises à jour de sécurité Node.js/npm

### Exemple Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Timeouts longs pour l’assistant IA (Ollama peut prendre plusieurs minutes)
    location /api/rag/query {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

## 📝 Changelog

### À faire après chaque déploiement

1. Noter la version déployée
2. Documenter les changements importants
3. Informer l'équipe
4. Vérifier les fonctionnalités critiques

---

## 🆘 Support

En cas de problème lors du déploiement :

1. Consulter les logs : `pm2 logs openbtp`
2. Vérifier ce guide de troubleshooting
3. Contacter le support technique
4. GitHub Issues : https://github.com/MacGreg4000/OpenBTP/issues

---

**Dernière mise à jour** : 11/11/2025

