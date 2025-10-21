# 📦 Guide d'Installation - OpenBTP

Guide complet pour installer et configurer OpenBTP sur votre serveur ou NAS.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Installation sur serveur local](#installation-sur-serveur-local)
- [Installation sur NAS Synology](#installation-sur-nas-synology)
- [Configuration](#configuration)
- [Premier démarrage](#premier-démarrage)
- [Dépannage](#dépannage)

---

## 🔧 Prérequis

### Logiciels requis

| Logiciel | Version minimale | Recommandé |
|----------|-----------------|------------|
| **Node.js** | 18.x | 20.x LTS |
| **npm** | 9.x | 10.x |
| **MySQL** | 5.7 | 8.0+ |
| **Git** | 2.x | Dernière version |

### Ressources système recommandées

- **RAM** : Minimum 2 GB, recommandé 4 GB+
- **Disque** : Minimum 5 GB d'espace libre
- **CPU** : 2 cœurs minimum

### Ports réseau

- **3000** : Application web Next.js
- **3306** : Base de données MySQL (par défaut)
- **3001** : Service PDF (optionnel)

---

## 💻 Installation sur serveur local

### Étape 1 : Cloner le dépôt

```bash
# Cloner le dépôt GitHub
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP
```

### Étape 2 : Installer les dépendances

```bash
# Installer toutes les dépendances npm
npm install
```

Cette commande installera toutes les dépendances listées dans `package.json`, incluant :
- Next.js 15.2.4
- React 18.3.1
- Prisma ORM
- TailwindCSS
- Et plus de 50 autres packages

### Étape 3 : Configurer la base de données MySQL

```bash
# Se connecter à MySQL
mysql -u root -p

# Créer la base de données
CREATE DATABASE openbtp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Créer un utilisateur dédié (recommandé pour la production)
CREATE USER 'openbtp_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON openbtp.* TO 'openbtp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Étape 4 : Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
# Copier le template (si disponible) ou créer manuellement
touch .env
```

Ajouter les variables suivantes dans `.env` :

```env
# ====================================
# BASE DE DONNÉES
# ====================================
DATABASE_URL="mysql://openbtp_user:votre_mot_de_passe_securise@localhost:3306/openbtp"

# ====================================
# AUTHENTIFICATION (NextAuth)
# ====================================
# URL de l'application
NEXTAUTH_URL="http://localhost:3000"
# Secret pour NextAuth (générez une clé aléatoire sécurisée)
NEXTAUTH_SECRET="votre_secret_aleatoire_tres_securise_minimum_32_caracteres"

# Pour générer un secret aléatoire :
# openssl rand -base64 32

# ====================================
# APPLICATION
# ====================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ====================================
# EMAIL (OPTIONNEL - Configuration via interface admin)
# ====================================
# Ces variables sont utilisées comme fallback si la config DB n'est pas disponible
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="votre_email@example.com"
EMAIL_PASSWORD="votre_mot_de_passe_email"

# ====================================
# GÉNÉRATION PDF (OPTIONNEL)
# ====================================
# URL du service PDF distant (si vous utilisez un service externe)
PDF_SERVICE_URL="http://localhost:3001"
PDF_SERVICE_PROVIDER="custom"
# Options : "custom" pour service local, "browserless" pour Browserless.io

# ====================================
# OLLAMA / IA (OPTIONNEL - pour RAG)
# ====================================
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:latest"
```

⚠️ **IMPORTANT - Sécurité** :
- Ne jamais commiter le fichier `.env` dans Git
- Utiliser des mots de passe forts et uniques
- Changer tous les secrets par défaut en production
- Le fichier `.env` est déjà dans `.gitignore`

### Étape 5 : Initialiser la base de données avec Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables dans la base de données
npx prisma db push

# Alternative : utiliser les migrations
npx prisma migrate deploy
```

### Étape 6 : Vérifier la connexion à la base de données

```bash
# Ouvrir Prisma Studio pour explorer la base de données
npx prisma studio
```

Prisma Studio s'ouvrira dans votre navigateur à `http://localhost:5555`.

### Étape 7 : Premier démarrage

```bash
# Démarrer l'application en mode développement
npm run dev
```

L'application sera accessible à : **http://localhost:3000**

---

## 🏢 Installation sur NAS Synology

### Prérequis NAS

1. **DSM 7.0 ou supérieur**
2. **Package Node.js installé** (via Package Center)
3. **MariaDB 10 ou MySQL 8** (via Package Center)
4. **Accès SSH activé** (Panneau de configuration → Terminal & SNMP)

### Étape 1 : Installation de Node.js sur le NAS

Via l'interface DSM :
1. Ouvrir **Package Center**
2. Rechercher et installer **Node.js 20**
3. Attendre la fin de l'installation

### Étape 2 : Se connecter en SSH

```bash
# Depuis votre ordinateur
ssh votre_utilisateur@ip_du_nas

# Passer en root (si nécessaire)
sudo -i
```

### Étape 3 : Cloner le projet

```bash
# Créer le répertoire pour l'application
cd /volume1/docker
mkdir -p OpenBTP
cd OpenBTP

# Cloner le dépôt
git clone https://github.com/MacGreg4000/OpenBTP.git .
```

### Étape 4 : Configurer MariaDB/MySQL

Via l'interface DSM :
1. Ouvrir **phpMyAdmin** (Package Center → MariaDB 10)
2. Se connecter avec l'utilisateur root
3. Créer la base de données :

```sql
CREATE DATABASE openbtp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'openbtp'@'localhost' IDENTIFIED BY 'VotreMotDePasseSecurise2025!';
GRANT ALL PRIVILEGES ON openbtp.* TO 'openbtp'@'localhost';
FLUSH PRIVILEGES;
```

### Étape 5 : Configuration des variables d'environnement

```bash
# Créer le fichier .env
cd /volume1/docker/OpenBTP
nano .env
```

Ajouter le contenu suivant (adapter à votre configuration) :

```env
DATABASE_URL="mysql://openbtp:VotreMotDePasseSecurise2025!@localhost:3306/openbtp"
NEXTAUTH_URL="http://192.168.1.100:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"
PDF_SERVICE_URL="http://localhost:3001"
```

⚠️ **Remplacer** :
- `192.168.1.100` par l'IP locale de votre NAS
- `VotreMotDePasseSecurise2025!` par votre mot de passe réel
- Générer un nouveau `NEXTAUTH_SECRET`

Sauvegarder avec `CTRL+O`, `ENTER`, puis `CTRL+X`.

### Étape 6 : Installer les dépendances et initialiser la base

```bash
cd /volume1/docker/OpenBTP

# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Initialiser la base de données
npx prisma db push
```

### Étape 7 : Rendre les scripts exécutables

```bash
chmod +x start-app.sh
chmod +x stop-app.sh
chmod +x start-app-auto.sh
chmod +x stop-app-auto.sh
```

### Étape 8 : Modifier les scripts pour le NAS

Éditer `start-app-auto.sh` et `stop-app-auto.sh` pour ajuster le chemin :

```bash
nano start-app-auto.sh
```

Vérifier/Modifier la ligne :
```bash
APP_DIR="/volume1/docker/OpenBTP"  # Doit correspondre à votre installation
```

### Étape 9 : Premier test manuel

```bash
# Démarrer l'application manuellement
./start-app-auto.sh

# Vérifier les logs
tail -f logs/app-*.log
```

Si tout fonctionne, vous verrez :
```
✅ Application démarrée avec succès
🌐 URL: http://192.168.1.100:3000
```

### Étape 10 : Configurer le démarrage automatique

Consultez le guide détaillé : [README_DEMARRAGE_AUTO_NAS.md](./README_DEMARRAGE_AUTO_NAS.md)

En résumé :
1. DSM → Panneau de configuration → Planificateur de tâches
2. Créer → Tâche planifiée → Script défini par l'utilisateur
3. Nom : "Démarrage OpenBTP"
4. Utilisateur : **root**
5. Planification : **Au démarrage**
6. Script : `/volume1/docker/OpenBTP/start-app-auto.sh`
7. Sauvegarder et tester

---

## ⚙️ Configuration

### Configuration initiale de l'application

Lors du premier accès à l'application, vous serez redirigé vers `/setup` pour :

1. **Créer le premier utilisateur administrateur**
   - Email
   - Nom
   - Mot de passe
   
2. **Configurer les informations de l'entreprise**
   - Nom de l'entreprise
   - Adresse complète
   - Numéro de TVA
   - Coordonnées de contact
   - Logo (optionnel)

3. **Configurer les paramètres email (optionnel)**
   - Serveur SMTP
   - Port
   - Utilisateur
   - Mot de passe
   - SSL/TLS

### Configuration via l'interface web

Après l'installation, accédez à **Paramètres** (icône ⚙️) pour :

#### Informations de l'entreprise
- Logo
- Coordonnées complètes
- Représentant légal
- Informations bancaires

#### Configuration email
- Serveur SMTP
- Authentification
- Email d'expéditeur

#### Sécurité
- Gestion des utilisateurs
- Rôles et permissions
- Mots de passe

---

## 🚀 Premier démarrage

### 1. Accéder à l'application

Ouvrez votre navigateur et accédez à :
- **Local** : http://localhost:3000
- **NAS** : http://[IP_DU_NAS]:3000
- **Production** : https://votre-domaine.com

### 2. Page de configuration initiale

Au premier accès, vous serez automatiquement redirigé vers `/setup`.

**Créer le compte administrateur** :
- Email : `admin@votre-entreprise.com`
- Nom : `Administrateur`
- Mot de passe : **Choisir un mot de passe fort** (min. 8 caractères)

### 3. Connexion

Après la configuration :
1. Vous serez redirigé vers `/login`
2. Connectez-vous avec vos identifiants
3. Vous arriverez sur le **Dashboard**

### 4. Configuration de l'entreprise

1. Aller dans **Paramètres** (menu latéral ou icône ⚙️)
2. Remplir les informations de l'entreprise
3. Ajouter votre logo (PNG, JPEG ou SVG)
4. Configurer les paramètres email pour l'envoi de documents

### 5. Créer les premiers utilisateurs

1. Menu **Utilisateurs**
2. Cliquer sur **Nouveau utilisateur**
3. Remplir les informations :
   - Nom
   - Email
   - Rôle : ADMIN / MANAGER / USER
   - Mot de passe temporaire
4. L'utilisateur recevra un email (si configuré)

### 6. Créer le premier chantier

1. Menu **Chantiers**
2. Cliquer sur **Nouveau chantier**
3. Remplir les informations :
   - Nom du chantier
   - Client (créer un nouveau client si nécessaire)
   - Adresse
   - Dates de début et fin
   - Montant prévisionnel
4. Enregistrer

🎉 **Votre application est prête à être utilisée !**

---

## 🐛 Dépannage

### Problème : "Cannot connect to database"

**Cause** : La base de données n'est pas accessible

**Solutions** :
1. Vérifier que MySQL/MariaDB est démarré :
   ```bash
   # Linux/Mac
   sudo systemctl status mysql
   
   # NAS Synology - via DSM
   Package Center → MariaDB 10 → Vérifier l'état
   ```

2. Vérifier la `DATABASE_URL` dans `.env` :
   - Le nom d'utilisateur est correct
   - Le mot de passe est correct
   - L'hôte est accessible
   - Le nom de la base existe

3. Tester la connexion manuellement :
   ```bash
   mysql -u openbtp_user -p openbtp
   ```

### Problème : "Port 3000 already in use"

**Cause** : Le port 3000 est déjà utilisé par une autre application

**Solutions** :
1. **Option 1** : Arrêter l'autre application
   ```bash
   # Trouver le processus
   lsof -ti:3000
   
   # Tuer le processus
   kill -9 $(lsof -ti:3000)
   ```

2. **Option 2** : Changer le port
   ```bash
   # Démarrer sur un autre port
   PORT=3001 npm run dev
   ```

### Problème : "Prisma Client not generated"

**Cause** : Le client Prisma n'a pas été généré

**Solution** :
```bash
npx prisma generate
```

### Problème : "Module not found" après npm install

**Cause** : Les dépendances ne sont pas correctement installées

**Solutions** :
```bash
# Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json

# Réinstaller proprement
npm install

# Régénérer le client Prisma
npx prisma generate
```

### Problème : Erreur de mémoire lors du build

**Cause** : Node.js manque de mémoire

**Solution** :
```bash
# Augmenter la limite de mémoire
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Problème : L'application ne démarre pas sur NAS

**Causes possibles** :
1. Node.js n'est pas dans le PATH
2. Les permissions ne sont pas correctes
3. Le script pointe vers le mauvais répertoire

**Solutions** :

1. **Vérifier le PATH** :
   ```bash
   which node
   which npm
   ```
   
   Si vide, ajouter au début de `start-app-auto.sh` :
   ```bash
   export PATH="/usr/local/bin:$PATH"
   ```

2. **Vérifier les permissions** :
   ```bash
   ls -la /volume1/docker/OpenBTP/*.sh
   chmod +x /volume1/docker/OpenBTP/*.sh
   ```

3. **Vérifier les logs** :
   ```bash
   tail -50 /volume1/docker/OpenBTP/logs/app-*.log
   ```

### Problème : Pages admin non accessibles

**Cause** : L'utilisateur connecté n'a pas le rôle ADMIN

**Solution** :
Connectez-vous avec un compte ayant le rôle **ADMIN** ou demandez à un administrateur de modifier votre rôle.

### Problème : Les images/documents ne s'affichent pas

**Causes possibles** :
1. Le dossier `public/` n'a pas les bonnes permissions
2. Les fichiers n'ont pas été correctement uploadés

**Solutions** :
```bash
# Vérifier les permissions du dossier public
ls -la public/

# Si nécessaire, corriger les permissions
chmod -R 755 public/
```

### Problème : Erreurs lors de la génération de PDF

**Cause** : Puppeteer ou le service PDF n'est pas correctement configuré

**Solutions** :

1. **Vérifier les dépendances Puppeteer** :
   ```bash
   # Sur Linux/NAS, installer les dépendances système nécessaires
   # Debian/Ubuntu
   sudo apt-get install -y chromium-browser
   
   # Synology - utiliser le service PDF Docker
   ```

2. **Utiliser le service PDF Docker** :
   ```bash
   cd pdf-service
   docker build -t pdf-service .
   docker run -d -p 3001:3001 pdf-service
   ```

### Aide supplémentaire

Pour tout problème non résolu :
1. Consulter les logs de l'application
2. Vérifier la console navigateur (F12)
3. Créer une issue sur GitHub avec :
   - Description du problème
   - Logs pertinents
   - Version de Node.js : `node --version`
   - Système d'exploitation

---

## 📚 Prochaines étapes

Après l'installation réussie :

1. 📖 Consultez le [GUIDE_UTILISATEUR.md](./GUIDE_UTILISATEUR.md) pour apprendre à utiliser toutes les fonctionnalités
2. 🔐 Configurez les utilisateurs et leurs permissions
3. 📊 Créez vos premiers clients et chantiers
4. 🎨 Personnalisez les templates de contrats et rapports
5. 📧 Configurez l'envoi d'emails automatique

---

**Dernière mise à jour** : Octobre 2025  
**Version** : 0.1.0

