# 🏗️ OpenBTP

**Application complète de gestion de chantiers BTP** - Open Source

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.14-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Open%20Source-green)](LICENSE)

Application web moderne et complète pour la gestion de chantiers dans le secteur de la construction (BTP). Gestion des projets, devis, états d'avancement, sous-traitants, SAV, outillage et bien plus encore.

---

## 🚀 Démarrage rapide

### Installation en 5 minutes

```bash
# 1. Cloner le dépôt
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP

# 2. Installer les dépendances
npm install

# 3. Configurer la base de données
# Créer le fichier .env avec votre DATABASE_URL

# 4. Initialiser Prisma
npx prisma generate
npx prisma db push

# 5. Démarrer l'application
npm run dev
```

Accédez à **http://localhost:3000** et suivez l'assistant de configuration.

📖 **Guide complet** : [INSTALLATION.md](./INSTALLATION.md)

---

## ✨ Fonctionnalités principales

### 🏗️ Gestion des chantiers
- ✅ Création et suivi de chantiers
- ✅ Gestion des clients et contacts
- ✅ Commandes et devis avec lignes détaillées
- ✅ États d'avancement client et sous-traitants
- ✅ Calculs financiers automatiques
- ✅ Export Excel des états d'avancement

### 📄 Documents et rapports
- ✅ Upload et classement de documents (tags)
- ✅ Gestion des photos de chantier
- ✅ Rapports de visite avec photos annotées
- ✅ **Rapports filtrés par corps de métier**
- ✅ Génération PDF professionnelle
- ✅ Envoi par email aux clients

### ✅ Réception de chantier
- ✅ Création de réception avec codes PIN
- ✅ Accès public pour clients/sous-traitants
- ✅ Gestion des remarques avec photos
- ✅ Validation/Rejet/Résolution des remarques
- ✅ Génération PDF de réception
- ✅ QR codes pour accès mobile

### 🤝 Sous-traitants
- ✅ Gestion des sous-traitants et ouvriers
- ✅ Génération de contrats professionnels
- ✅ Signature électronique
- ✅ Commandes et états d'avancement dédiés
- ✅ Portail sous-traitant avec code PIN
- ✅ Gestion des documents ouvriers (conformité)

### 🔧 Service Après-Vente (SAV)
- ✅ Création et suivi de tickets SAV
- ✅ Gestion des interventions
- ✅ Assignation ouvriers/sous-traitants
- ✅ Historique complet
- ✅ Photos et documents
- ✅ Commentaires et discussions
- ✅ Statuts et priorités

### 🛠️ Outillage
- ✅ Inventaire des machines et outils
- ✅ Système de prêts avec historique
- ✅ QR codes pour identification
- ✅ Scanner mobile
- ✅ Gestion des états (disponible, en panne, etc.)
- ✅ Suppression réservée aux admins

### 📝 Bons de régie
- ✅ Création de bons de régie
- ✅ Saisie publique (sur chantier)
- ✅ Signature électronique client
- ✅ Association aux chantiers
- ✅ Génération PDF automatique
- ✅ Suppression réservée aux admins

### 📅 Planning
- ✅ Vue Gantt des chantiers
- ✅ Planning des ressources
- ✅ Calendrier interactif
- ✅ Gestion des tâches

### 📦 Inventaire
- ✅ Gestion des racks et emplacements
- ✅ QR codes pour chaque emplacement
- ✅ Suivi des matériaux
- ✅ Scanner mobile

### 👥 Administration
- ✅ Gestion des utilisateurs et rôles (ADMIN, MANAGER, USER)
- ✅ Configuration de l'entreprise
- ✅ Templates de contrats personnalisables
- ✅ Configuration email SMTP
- ✅ Paramètres système

### 🤖 Fonctionnalités avancées (optionnelles)
- 🔍 RAG / Assistant IA (Ollama)
- 💬 Chat interne temps réel
- 🗺️ Cartographie des chantiers
- 📊 Tableaux de bord et statistiques
- 🎨 Mode sombre

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[INSTALLATION.md](./INSTALLATION.md)** | 📦 Guide d'installation complet (serveur, NAS) |
| **[GUIDE_UTILISATEUR.md](./GUIDE_UTILISATEUR.md)** | 📖 Manuel utilisateur détaillé par fonctionnalité |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 🏗️ Architecture technique et API |
| **[README_DEMARRAGE_AUTO_NAS.md](./README_DEMARRAGE_AUTO_NAS.md)** | 🏢 Démarrage automatique sur NAS Synology |
| **[README_IMPORT_NAS.md](./README_IMPORT_NAS.md)** | 💾 Import de base de données |
| **[README_TEMPLATES_CONTRATS.md](./README_TEMPLATES_CONTRATS.md)** | 📄 Gestion des templates de contrats |
| **[ANONYMISATION.md](./ANONYMISATION.md)** | 🔒 Protection des données (RGPD) |

---

## 🔧 Prérequis

- **Node.js** 18.x ou supérieur (recommandé : 20.x LTS)
- **MySQL** 8.0+ ou **MariaDB** 10.3+
- **npm** 9.x ou supérieur
- **2 GB RAM** minimum (4 GB recommandé)
- **5 GB** d'espace disque

---

## 📦 Installation

### Installation standard (serveur local)

```bash
# 1. Cloner le dépôt
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP

# 2. Installer les dépendances
npm install

# 3. Créer le fichier .env
cp .env.example .env  # Si disponible
# Ou créer manuellement avec vos paramètres

# 4. Configurer la base de données MySQL
mysql -u root -p
CREATE DATABASE openbtp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 5. Initialiser Prisma
npx prisma generate
npx prisma db push

# 6. Démarrer l'application
npm run dev
```

➡️ Accédez à **http://localhost:3000**

### Installation sur NAS Synology

Consultez le guide détaillé : **[INSTALLATION.md](./INSTALLATION.md)** section NAS.

**Résumé** :
1. Installer Node.js et MariaDB via Package Center
2. Cloner le dépôt dans `/volume1/docker/OpenBTP`
3. Configurer `.env` avec les paramètres du NAS
4. Installer et initialiser
5. Configurer le démarrage automatique

---

## 🎯 Utilisation

### Premier accès

1. **Page de setup** (`/setup`) :
   - Créer le compte administrateur
   - Configurer les informations de l'entreprise
   - Configurer les emails (optionnel)

2. **Connexion** (`/login`) :
   - Se connecter avec l'admin créé

3. **Configuration** :
   - Ajouter le logo de l'entreprise
   - Créer les premiers utilisateurs
   - Configurer les templates de contrats

4. **Premier chantier** :
   - Créer un client
   - Créer un chantier
   - Commencer à utiliser !

### Workflow type

```
1. Créer un client
2. Créer un chantier
3. Créer et verrouiller la commande
4. Uploader les documents (plans, contrat, CSC)
5. Créer les états d'avancement mensuels
6. Envoyer les états au client
7. Ajouter des sous-traitants si nécessaire
8. Créer des rapports de visite
9. Créer la réception en fin de travaux
10. Finaliser et archiver
```

📖 **Guide complet** : [GUIDE_UTILISATEUR.md](./GUIDE_UTILISATEUR.md)

---

## 🏗️ Architecture

**Stack** :
- **Framework** : Next.js 15 (App Router)
- **UI** : React 18 + TailwindCSS
- **Base de données** : MySQL 8 + Prisma ORM
- **Auth** : NextAuth.js
- **PDF** : Puppeteer + Templates HTML
- **Email** : Nodemailer
- **Charts** : Chart.js + React Big Calendar

📖 **Documentation technique** : [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📱 Fonctionnalités mobiles

### Accès publics (sans authentification)

- **Bons de régie** : `/public/bon-regie` - Saisie sur chantier avec signature
- **Réception** : `/public/reception` - Ajout de remarques avec code PIN
- **Portail sous-traitants** : `/public/portail` - Accès dédié sous-traitants

### Responsive design

✅ L'interface s'adapte automatiquement :
- 📱 Smartphone
- 📲 Tablette
- 💻 Desktop

### Progressive Web App (PWA)

⚠️ Fonctionnalité en cours de développement :
- Mode hors ligne pour rapports de visite
- Synchronisation automatique
- Installation sur écran d'accueil

---

## 🔐 Rôles et sécurité

### Hiérarchie des rôles

| Rôle | Permissions |
|------|------------|
| **ADMIN** | 🔴 Accès complet, gestion utilisateurs, suppression données |
| **MANAGER** | 🟡 Gestion chantiers, création documents, pas de suppression importante |
| **USER** | 🟢 Consultation, ajout notes/photos, bons de régie |
| **BOT** | 🤖 Automatisations système |

### Sécurité

- 🔒 Authentification obligatoire (sauf pages publiques)
- 🔑 Mots de passe hashés (bcrypt)
- 🛡️ Protection CSRF
- 🔐 Sessions JWT sécurisées
- 📋 Logs d'audit
- 🚫 Protection contre injections SQL (Prisma)

---

## 🌟 Points forts

### ✅ Avantages

- **100% Open Source** - Code libre et modifiable
- **Auto-hébergé** - Vos données restent chez vous
- **Complet** - Toutes les fonctionnalités du BTP
- **Moderne** - Technologies récentes et maintenues
- **Performant** - Optimisations Next.js 15
- **Extensible** - Architecture modulaire
- **Responsive** - Fonctionne sur tous les écrans
- **Multilingue** - Français par défaut, extensible

### 🎯 Cas d'usage

**PME du BTP** (5-50 employés) :
- ✅ Gestion complète des chantiers
- ✅ Suivi financier précis
- ✅ Communication client professionnelle
- ✅ Conformité administrative

**Entreprises générales** :
- ✅ Coordination sous-traitants
- ✅ Planification ressources
- ✅ Multi-chantiers simultanés

**Artisans** :
- ✅ Interface simple et intuitive
- ✅ Bons de régie rapides
- ✅ SAV organisé

---

## 📊 Statistiques du projet

- **Lignes de code** : ~50,000+
- **Composants React** : 100+
- **API Routes** : 200+
- **Tables base de données** : 50+
- **Dépendances** : 80+

---

## 🔄 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrage développement (port 3000) |
| `npm run build` | Compilation pour production |
| `npm run start` | Démarrage production |
| `npm run lint` | Vérification ESLint |
| `npm run production:build` | Build avec Prisma generate |
| `npm run production:start` | Start avec migrations |
| `npm run sync-template` | Synchroniser template contrat |

### Scripts de démarrage NAS

| Script | Usage |
|--------|-------|
| `./start-app.sh` | Démarrage manuel interactif |
| `./stop-app.sh` | Arrêt manuel |
| `./start-app-auto.sh` | Démarrage automatique (NAS) |
| `./stop-app-auto.sh` | Arrêt automatique (NAS) |

---

## 📁 Structure du projet

```
OpenBTP/
├── 📱 src/
│   ├── app/                          # App Router Next.js 15
│   │   ├── (auth)/                  # Authentification
│   │   ├── (dashboard)/             # Interface protégée
│   │   │   ├── chantiers/          # 📊 Gestion chantiers
│   │   │   ├── clients/            # 👥 Gestion clients
│   │   │   ├── sous-traitants/     # 🤝 Sous-traitants
│   │   │   ├── sav/                # 🔧 Service après-vente
│   │   │   ├── planning/           # 📅 Planning
│   │   │   ├── outillage/          # 🛠️ Outillage
│   │   │   ├── bons-regie/         # 📝 Bons de régie
│   │   │   └── administratif/      # 📁 Documents admin
│   │   ├── api/                    # 🌐 API Backend (200+ routes)
│   │   ├── public/                 # 🌍 Pages publiques
│   │   └── setup/                  # ⚙️ Configuration initiale
│   ├── components/                  # ⚛️ Composants React (100+)
│   ├── lib/                        # 📚 Bibliothèques
│   │   ├── pdf/                   # PDF generation
│   │   ├── email/                 # Email service
│   │   ├── rag/                   # IA / RAG
│   │   └── prisma/                # ORM client
│   ├── types/                      # 📝 Types TypeScript
│   └── utils/                      # 🔧 Utilitaires
├── 💾 prisma/
│   ├── schema.prisma               # Schéma BDD (50+ tables)
│   └── migrations/                 # Historique migrations
├── 🌍 public/                       # Fichiers statiques
│   ├── uploads/                   # Documents uploadés
│   ├── chantiers/                 # Docs par chantier
│   └── images/                    # Images
├── 📄 templates/                    # Templates HTML
│   ├── contrat-professionnel.html
│   └── ...
├── 🐳 pdf-service/                  # Service PDF Docker
└── 📜 scripts/                      # Scripts utilitaires
```

---

## 🗄️ Base de données

### Modèle relationnel (50+ tables)

**Entités principales** :
- `User` - Utilisateurs (ADMIN, MANAGER, USER, BOT)
- `Client` - Clients avec contacts
- `Chantier` - Chantiers/projets
- `Commande` - Devis et commandes
- `EtatAvancement` - États d'avancement
- `SousTraitant` - Sous-traitants
- `Document` - Tous les documents
- `ReceptionChantier` - Réceptions
- `TicketSAV` - Tickets SAV
- `Machine` - Outillage
- `BonRegie` - Bons de régie
- `Task` - Tâches et planning

**Caractéristiques** :
- ✅ Intégrité référentielle
- ✅ Cascade DELETE pour dépendances
- ✅ Index optimisés
- ✅ Types JSON pour flexibilité
- ✅ Support UTF-8 complet

📖 **Détails** : [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🔌 API

### REST API

**200+ endpoints** organisés par domaine :

```
/api/
├── auth/              # Authentification
├── chantiers/         # Chantiers et sous-ressources
├── clients/           # Clients et contacts
├── sav/              # Service après-vente
├── outillage/        # Machines et prêts
├── sous-traitants/   # Sous-traitants et ouvriers
├── planning/         # Planning et tâches
├── documents/        # Documents généraux
├── email/            # Envoi d'emails
├── pdf/              # Génération PDF
├── settings/         # Paramètres
└── public/           # Endpoints publics (sans auth)
```

**Format** : JSON  
**Auth** : Session cookie (NextAuth)  
**Errors** : Status HTTP + message JSON

📖 **Documentation API** : [ARCHITECTURE.md](./ARCHITECTURE.md#api-routes)

---

## 🚀 Déploiement

### Environnements supportés

| Environnement | Support | Notes |
|--------------|---------|-------|
| **Linux** | ✅ Complet | Ubuntu, Debian, CentOS |
| **macOS** | ✅ Complet | Development |
| **Windows** | ✅ Via WSL2 | Recommandé avec WSL |
| **NAS Synology** | ✅ Complet | DSM 7.0+ |
| **Docker** | ⚠️ Partiel | PDF service uniquement |

### Production

**Recommandations** :
- ✅ Utiliser un reverse proxy (nginx, Apache)
- ✅ Activer HTTPS (Let's Encrypt)
- ✅ Configurer les sauvegardes automatiques
- ✅ Monitorer les logs
- ✅ Limiter les taux de requêtes

**Build production** :
```bash
npm run production:build
npm run production:start
```

**Variables d'environnement** :
```env
NODE_ENV="production"
DATABASE_URL="mysql://..."
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="secret_securise_32_chars_min"
```

---

## ⚙️ Configuration

### Variables d'environnement

#### Obligatoires

```env
DATABASE_URL="mysql://user:pass@host:3306/openbtp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="secret_aleatoire_32_caracteres_minimum"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Optionnelles

```env
# Email (fallback)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="user@example.com"
EMAIL_PASSWORD="password"

# PDF Service
PDF_SERVICE_URL="http://localhost:3001"

# Ollama / IA
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
```

📖 **Liste complète** : [INSTALLATION.md](./INSTALLATION.md#configuration)

---

## 🛡️ Sécurité

### Bonnes pratiques implémentées

- ✅ **Authentification** : NextAuth avec JWT
- ✅ **Autorisation** : Vérification des rôles par API
- ✅ **Mots de passe** : Hashage bcrypt (10 rounds)
- ✅ **CSRF Protection** : NextAuth built-in
- ✅ **SQL Injection** : Prisma parameterized queries
- ✅ **XSS Protection** : React auto-escaping
- ✅ **HTTPS** : Recommandé en production
- ✅ **Logs** : Audit trail des actions importantes

### RGPD / Protection des données

- 🔒 Données chiffrées en base
- 🗑️ Droit à l'oubli (suppression client)
- 📋 Export de données possible
- 🔐 Accès restreint par authentification

📖 **Détails** : [ANONYMISATION.md](./ANONYMISATION.md)

---

## 🐛 Problèmes connus

### Carte des chantiers

**Symptôme** : Carte s'affiche mais marqueurs invisibles

**Cause** : Incompatibilité Leaflet + Next.js 15

**Contournement** : Les données sont correctes, seul l'affichage pose problème

**Solution future** : Investigation en cours sur le chargement des icônes Leaflet

### Génération PDF sur NAS

**Symptôme** : Erreurs de génération PDF

**Cause** : Dépendances Chromium manquantes

**Solutions** :
1. Utiliser le service PDF Docker
2. Installer manuellement Chromium sur le NAS
3. Utiliser un service externe (Browserless.io)

---

## 🤝 Contribution

### Comment contribuer

1. **Fork** le projet
2. Créer une **branche** : `git checkout -b feature/ma-fonctionnalite`
3. **Commit** vos changements : `git commit -m "feat: Description"`
4. **Push** vers la branche : `git push origin feature/ma-fonctionnalite`
5. Ouvrir une **Pull Request**

### Conventions de code

- ✅ TypeScript strict
- ✅ ESLint configuré
- ✅ Composants fonctionnels
- ✅ Hooks React
- ✅ Commentaires en français
- ✅ Tests recommandés

---

## 📞 Support

### Obtenir de l'aide

1. **Documentation** : Lire les guides ci-dessus
2. **Issues GitHub** : Créer une issue détaillée
3. **Logs** : Consulter les logs de l'application

### Informations à fournir

Pour toute demande d'aide, incluez :
- Version de Node.js : `node --version`
- Version de MySQL : `mysql --version`
- Logs pertinents
- Étapes pour reproduire le problème
- Système d'exploitation

---

## 🗺️ Roadmap

### Prochaines fonctionnalités

- [ ] 📱 PWA complète avec mode hors ligne
- [ ] 🗺️ Correction carte Leaflet
- [ ] 📊 Rapports analytiques avancés
- [ ] 🔄 Synchronisation multi-appareils
- [ ] 📧 Templates d'emails personnalisables
- [ ] 🌐 Multilingue (EN, ES, DE)
- [ ] 📱 Application mobile native
- [ ] 🔌 API publique documentée
- [ ] 📈 Tableaux de bord personnalisables
- [ ] 🤖 Plus de fonctionnalités IA

### Améliorations continues

- ⚡ Performance et optimisations
- 🐛 Corrections de bugs
- 🔒 Renforcement de la sécurité
- 📚 Documentation enrichie

---

## 📄 Licence

**Open Source** - Licence à définir

Ce projet est open source et libre d'utilisation. Vous pouvez :
- ✅ L'utiliser commercialement
- ✅ Le modifier selon vos besoins
- ✅ Le redistribuer
- ✅ Contribuer au projet

---

## 👨‍💻 Auteurs et remerciements

**Développé par** : Secotech / MacGreg4000

**Remerciements** :
- Communauté Next.js
- Équipe Prisma
- Contributeurs open source

---

## 🆘 Aide rapide

### Commandes essentielles

```bash
# Démarrer en développement
npm run dev

# Builder pour production
npm run build

# Démarrer en production
npm start

# Voir les données (Prisma Studio)
npx prisma studio

# Logs en temps réel (NAS)
tail -f logs/app-*.log
```

### Liens utiles

- 🌐 **GitHub** : https://github.com/MacGreg4000/OpenBTP
- 📖 **Documentation** : Fichiers MD à la racine
- 💬 **Issues** : https://github.com/MacGreg4000/OpenBTP/issues

---

## 📊 État du projet

**Version actuelle** : 0.1.0  
**Statut** : ✅ Stable - Production ready  
**Dernière mise à jour** : Octobre 2025

### Fonctionnalités testées

- ✅ Gestion des chantiers
- ✅ États d'avancement
- ✅ Documents et rapports
- ✅ Réception de chantier
- ✅ SAV
- ✅ Outillage
- ✅ Bons de régie
- ✅ Sous-traitants

---

**⭐ Si ce projet vous est utile, n'hésitez pas à lui donner une étoile sur GitHub !**

---

**Made with ❤️ for the construction industry**
