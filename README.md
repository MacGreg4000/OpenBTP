# 🏗️ OpenBTP

Plateforme complète de gestion de chantiers BTP avec système modulaire.

## 🚀 Démarrage rapide

```bash
# Installation
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Base de données
npx prisma db push
npx tsx prisma/seed.ts  # ⚠️ OBLIGATOIRE

# Démarrage
npm run dev
```

**🌐 Application disponible sur** : http://localhost:3000

---

## 📦 Fonctionnalités principales

### Modules activables/désactivables

OpenBTP intègre 17 modules que vous pouvez activer ou désactiver selon vos besoins :

- ✅ **Gestion de chantiers** - États d'avancement, commandes, documents
- ✅ **Gestion clients** - Base clients, contacts, historique
- ✅ **Sous-traitants** - Gestion des ST, ouvriers, commandes, états
- ✅ **Inventaire** - Matériaux, racks, gestion des stocks
- ✅ **Outillage** - Machines, prêts, maintenance
- ✅ **Planning** - Planning chantiers et ressources
- ✅ **Documents** - GED, documents administratifs
- ✅ **Bons de régie** - Création et suivi
- ✅ **Choix client** - Sélections et validations
- ✅ **SAV** - Tickets, interventions, suivi
- ✅ **Métrés** - Métrés soumis et validations
- ✅ **Journal** - Historique des activités
- ✅ **Messagerie** - Chat entre utilisateurs
- ✅ **Assistant IA** - Chatbot intelligent avec RAG
- ✅ **Notifications** - Système de notifications

### Autres fonctionnalités

- 📊 **Dashboard** - Statistiques et KPIs en temps réel
- 📱 **Mode mobile** - Interface adaptée pour tablettes/mobiles
- 🔐 **Multi-utilisateurs** - Gestion des rôles (Admin, Manager, User)
- 📄 **Génération PDF** - Commandes, états, rapports
- 📧 **Envoi d'emails** - Intégration SMTP
- 🎨 **Dark mode** - Interface claire/sombre
- 🌍 **Multi-langue** - Français par défaut

---

## 📚 Documentation

- 📖 [Guide du système de modules](./docs/MODULES_SYSTEM.md)
- 🚀 [Guide de déploiement](./docs/DEPLOYMENT.md)
- 🔧 [Configuration](./docs/CONFIGURATION.md) *(à venir)*
- 🔌 [API Documentation](./docs/API.md) *(à venir)*

---

## 🛠️ Stack technique

- **Framework** : Next.js 15.4.7 (App Router)
- **Language** : TypeScript
- **Base de données** : MySQL 8.0+ (via Prisma ORM)
- **Authentification** : NextAuth.js
- **UI** : Tailwind CSS, Headless UI
- **Charts** : Chart.js / react-chartjs-2
- **PDF** : Puppeteer
- **IA** : Ollama (RAG avec phi3:mini)

---

## 📋 Prérequis

- Node.js 18.0.0 ou supérieur
- npm ou yarn
- MySQL 8.0 ou supérieur
- Git

### Optionnel
- PM2 (pour la production)
- Nginx/Apache (reverse proxy)
- Ollama (pour l'assistant IA)

---

## 🔧 Installation détaillée

### 1. Cloner le repository

```bash
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

```bash
cp .env.example .env
```

Éditer `.env` avec vos paramètres :

```env
# Base de données
DATABASE_URL="mysql://user:password@localhost:3306/appsecotech"

# NextAuth
NEXTAUTH_SECRET="votre_secret_très_long_et_aléatoire"
NEXTAUTH_URL="http://localhost:3000"

# Ollama (Assistant IA)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"

# Email (optionnel)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="votre@email.com"
SMTP_PASS="votre_mot_de_passe"
```

### 4. Créer la base de données

```bash
mysql -u root -p
```

```sql
CREATE DATABASE appsecotech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 5. Initialiser la base de données

```bash
# Créer les tables
npx prisma db push

# ⚠️ IMPORTANT : Remplir les données de base (OBLIGATOIRE)
npx tsx prisma/seed.ts
```

**Le seed est obligatoire** car il crée les 17 modules de base. Sans lui, l'application sera vide !

### 6. Build et démarrage

```bash
# Développement
npm run dev

# Production
npm run build
npm start

# Avec PM2
pm2 start npm --name "openbtp" -- start
```

---

## 🎯 Utilisation

### Premier démarrage

1. Accédez à http://localhost:3000
2. Créez votre premier compte administrateur
3. Configurez votre entreprise dans `/configuration`
4. Gérez les modules dans `/admin/modules`
5. Créez votre premier chantier !

### Gestion des modules

**URL** : `/admin/modules` (Admins uniquement)

- Activez/désactivez les fonctionnalités selon vos besoins
- Les changements sont immédiats (cache 5 minutes)
- Les modules système (Dashboard, Chantiers) ne peuvent pas être désactivés

---

## 🚀 Déploiement en production

### Script de déploiement rapide

```bash
# Sur votre serveur
git pull && \
npm install && \
npx tsx prisma/seed.ts && \
npm run build && \
pm2 restart openbtp
```

### Avec PM2

```bash
# Installation PM2
npm install -g pm2

# Démarrage
pm2 start ecosystem.config.js

# Monitoring
pm2 monit

# Logs
pm2 logs openbtp
```

### Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # Évite les 504 sur l’assistant IA (Ollama lent)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

📖 **Consultez le [guide de déploiement complet](./docs/DEPLOYMENT.md)**

---

## 🔐 Sécurité

- ✅ Authentification sécurisée (NextAuth)
- ✅ Tokens JWT avec expiration
- ✅ Hashage des mots de passe (bcrypt)
- ✅ Protection CSRF
- ✅ Rate limiting sur les APIs sensibles
- ✅ Validation des entrées (Zod)
- ✅ Gestion des permissions par rôle

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add: AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📝 Changelog

### Version 2.0.0 (11/11/2025)

#### ✨ Nouveautés
- **Système de modules activables/désactivables**
  - 17 modules prédéfinis
  - Interface d'administration dédiée
  - Cache intelligent avec TTL
  - Catégorisation des modules

- **Séparation Messagerie / Assistant IA**
  - Module "messagerie" pour le chat entre utilisateurs
  - Module "chat" pour l'assistant IA (RAG)
  - Activation/désactivation indépendante

#### 🔧 Améliorations
- Navbar dynamique selon modules actifs
- FeaturesProvider au niveau racine
- Invalidation automatique du cache
- Performance optimisée

#### 📚 Documentation
- Guide complet du système de modules
- Guide de déploiement mis à jour
- README restructuré

### Versions précédentes

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique complet

---

## 🐛 Bugs connus

Aucun bug critique actuellement. 

Pour signaler un bug : [GitHub Issues](https://github.com/MacGreg4000/OpenBTP/issues)

---

## 📄 Licence

Tous droits réservés © 2025 OpenBTP

---

## 👥 Auteurs

- **Grégory** - *Développeur principal*

---

## 🆘 Support

- 📧 Email : support@openbtp.com *(à définir)*
- 💬 Discord : *(à définir)*
- 📖 Documentation : [docs/](./docs/)
- 🐛 Issues : [GitHub Issues](https://github.com/MacGreg4000/OpenBTP/issues)

---

## 🙏 Remerciements

- Next.js team pour le framework
- Prisma pour l'ORM
- Tailwind CSS pour le design
- Tous les contributeurs open-source

---

**Made with ❤️ in France**
