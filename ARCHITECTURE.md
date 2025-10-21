# 🏗️ Architecture Technique - OpenBTP

Documentation de l'architecture technique de l'application OpenBTP.

## 📋 Table des matières

- [Stack technique](#stack-technique)
- [Architecture de l'application](#architecture-de-lapplication)
- [Base de données](#base-de-données)
- [API Routes](#api-routes)
- [Système de génération PDF](#système-de-génération-pdf)
- [Authentification et sécurité](#authentification-et-sécurité)
- [Fonctionnalités avancées](#fonctionnalités-avancées)

---

## 🛠️ Stack technique

### Frontend

| Technologie | Version | Usage |
|------------|---------|-------|
| **Next.js** | 15.2.4 | Framework React avec SSR/SSG |
| **React** | 18.3.1 | Bibliothèque UI |
| **TypeScript** | 5.8.3 | Langage typé |
| **TailwindCSS** | 3.4.17 | Framework CSS utilitaire |
| **Headless UI** | 1.7.18 | Composants UI accessibles |
| **Heroicons** | 2.2.0 | Icônes |

### Backend

| Technologie | Version | Usage |
|------------|---------|-------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Next.js API Routes** | 15.2.4 | API Backend |
| **Prisma ORM** | 6.14.0 | ORM pour base de données |
| **NextAuth** | 4.24.11 | Authentification |
| **MySQL** | 8.0+ | Base de données |

### Bibliothèques spécialisées

| Bibliothèque | Usage |
|-------------|-------|
| **Puppeteer** | Génération de PDF via Chromium |
| **ExcelJS** | Export Excel des états d'avancement |
| **Nodemailer** | Envoi d'emails |
| **Leaflet** | Cartographie des chantiers |
| **Chart.js** | Graphiques et statistiques |
| **React Big Calendar** | Planning et calendrier |
| **QRCode** | Génération de QR codes |
| **html2canvas** | Capture d'écran |
| **React Signature Canvas** | Signatures électroniques |

---

## 🏛️ Architecture de l'application

### Structure des dossiers

```
OpenBTP/
├── src/
│   ├── app/                        # App Router Next.js 15
│   │   ├── (auth)/                # Pages d'authentification
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/           # Pages du dashboard (protégées)
│   │   │   ├── chantiers/        # Gestion des chantiers
│   │   │   ├── clients/          # Gestion des clients
│   │   │   ├── sav/              # Service après-vente
│   │   │   ├── planning/         # Planning général
│   │   │   ├── outillage/        # Gestion des outils
│   │   │   ├── bons-regie/       # Bons de régie
│   │   │   ├── administratif/    # Documents administratifs
│   │   │   └── sous-traitants/   # Sous-traitants
│   │   ├── api/                  # API Routes
│   │   ├── public/               # Pages publiques (sans auth)
│   │   │   ├── bon-regie/        # Saisie publique de bons
│   │   │   ├── reception/        # Accès public réception
│   │   │   └── portail/          # Portail sous-traitants
│   │   └── setup/                # Configuration initiale
│   ├── components/               # Composants React réutilisables
│   │   ├── ui/                   # Composants UI de base
│   │   ├── dashboard/            # Composants du dashboard
│   │   ├── chantier/             # Composants spécifiques chantiers
│   │   ├── chat/                 # Chat interne
│   │   ├── modals/               # Modales réutilisables
│   │   └── ...                   # Autres composants
│   ├── lib/                      # Bibliothèques et utilitaires
│   │   ├── prisma/              # Client Prisma
│   │   ├── pdf/                 # Génération PDF
│   │   ├── email/               # Service email
│   │   ├── auth/                # Logique d'authentification
│   │   ├── rag/                 # Service RAG (IA)
│   │   └── services/            # Services métier
│   ├── middleware/              # Middleware Next.js
│   ├── types/                   # Définitions TypeScript
│   └── utils/                   # Fonctions utilitaires
├── prisma/
│   ├── schema.prisma            # Schéma de base de données
│   ├── migrations/              # Historique des migrations
│   └── seed.ts                  # Données d'initialisation
├── public/                      # Fichiers statiques
│   ├── uploads/                # Documents uploadés
│   ├── chantiers/              # Documents par chantier
│   ├── fiches-techniques/      # Fiches produits
│   └── images/                 # Images statiques
├── templates/                   # Templates HTML
│   ├── contrat-professionnel.html
│   ├── contrat-sous-traitant.html
│   └── ppss-template.html
├── pdf-service/                # Service PDF Docker (optionnel)
└── scripts/                    # Scripts utilitaires
```

### Pattern de routage

**Next.js 15 App Router** avec :
- **Groupes de routes** : `(auth)`, `(dashboard)`
- **Routes dynamiques** : `[chantierId]`, `[id]`
- **Routes parallèles** : Multiple layouts
- **Interception de routes** : Modales

### Composants clients vs serveurs

- **Composants serveurs** : Chargement de données, SEO
- **Composants clients** : Interactivité, état local
- **Marquage** : `'use client'` en tête de fichier

---

## 💾 Base de données

### Modèle de données principal

#### Chantiers et clients

```
Client (1) ──── (N) Chantier
                       │
                       ├─── (1) Commande
                       │        └─── (N) LigneCommande
                       │
                       ├─── (N) EtatAvancement
                       │        └─── (N) LigneEtatAvancement
                       │
                       ├─── (N) Document
                       │        └─── (N) Tags
                       │
                       ├─── (N) Note
                       │
                       ├─── (N) Depense
                       │
                       ├─── (1) ReceptionChantier
                       │        └─── (N) RemarqueReception
                       │
                       └─── (N) Task (Planning)
```

#### Sous-traitants

```
SousTraitant (1) ──── (N) CommandeSousTraitant
                 │            └─── (N) LigneCommandeSousTraitant
                 │
                 ├─── (N) SousTraitantEtatAvancement
                 │
                 ├─── (N) Contrat
                 │
                 └─── (N) Ouvrier
                            └─── (N) Document
```

#### SAV

```
TicketSAV (1) ──── (N) InterventionSAV
          │              └─── (N) PhotoInterventionSAV
          │
          ├─── (N) DocumentSAV
          ├─── (N) PhotoSAV
          └─── (N) CommentaireSAV
```

### Schéma Prisma

**Fichier** : `prisma/schema.prisma`

**Modèles principaux** (50+ tables) :
- `User` : Utilisateurs de l'application
- `Client` : Clients finaux
- `Chantier` : Chantiers/projets
- `Commande` : Devis/commandes clients
- `EtatAvancement` : États d'avancement
- `SousTraitant` : Sous-traitants
- `CommandeSousTraitant` : Commandes sous-traitants
- `Document` : Tous les documents
- `ReceptionChantier` : Réceptions de chantier
- `TicketSAV` : Tickets SAV
- `Machine` : Outillage
- `BonRegie` : Bons de régie
- `Tag` : Tags pour documents
- Et 38 autres tables...

### Types de données spéciales

- **Json** : Métadonnées flexibles, coordonnées GPS
- **Text** : Descriptions longues, notes
- **DateTime** : Dates avec timezone
- **Float** : Montants financiers

### Relations et contraintes

- **Cascade DELETE** : Suppression en cascade des dépendances
- **Index** : Optimisation des requêtes fréquentes
- **Contraintes uniques** : Éviter les doublons
- **Foreign keys** : Intégrité référentielle

---

## 🌐 API Routes

L'application expose de nombreuses API REST via Next.js API Routes.

### Authentification

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/signin` | POST | Connexion |
| `/api/auth/signout` | POST | Déconnexion |
| `/api/auth/session` | GET | Session actuelle |

### Chantiers

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/chantiers` | GET | Liste tous les chantiers |
| `/api/chantiers` | POST | Crée un chantier |
| `/api/chantiers/[id]` | GET | Détails d'un chantier |
| `/api/chantiers/[id]` | PUT | Modifie un chantier |
| `/api/chantiers/[id]` | DELETE | Supprime un chantier |

### Commandes

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/chantiers/[id]/commande` | GET | Commande du chantier |
| `/api/chantiers/[id]/commande` | POST | Crée une commande |
| `/api/chantiers/[id]/commande/lignes` | POST | Ajoute une ligne |
| `/api/chantiers/[id]/commande/lignes/[ligneId]` | PUT | Modifie une ligne |
| `/api/chantiers/[id]/commande/lignes/[ligneId]` | DELETE | Supprime une ligne |
| `/api/chantiers/[id]/commande/verrouiller` | POST | Verrouille la commande |

### États d'avancement

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/chantiers/[id]/etats-avancement` | GET | Liste des états |
| `/api/chantiers/[id]/etats-avancement` | POST | Crée un état |
| `/api/chantiers/[id]/etats-avancement/[numero]` | GET | Détails d'un état |
| `/api/chantiers/[id]/etats-avancement/[numero]` | PUT | Modifie un état |
| `/api/chantiers/[id]/etats-avancement/[id]/export-excel` | GET | Export Excel |

### Documents

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/chantiers/[id]/documents` | GET | Liste des documents |
| `/api/chantiers/[id]/documents` | POST | Upload un document |
| `/api/chantiers/[id]/documents/[docId]` | GET | Télécharge un document |
| `/api/chantiers/[id]/documents/[docId]` | PUT | Modifie les métadonnées |
| `/api/chantiers/[id]/documents/[docId]` | DELETE | Supprime un document |

### Réception

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/chantiers/[id]/reception` | GET | Liste des réceptions |
| `/api/chantiers/[id]/reception` | POST | Crée une réception |
| `/api/chantiers/[id]/reception/[receptionId]` | GET | Détails |
| `/api/chantiers/[id]/reception/[receptionId]/remarques` | GET | Liste remarques |
| `/api/chantiers/[id]/reception/[receptionId]/remarques` | POST | Ajoute remarque |
| `/api/chantiers/[id]/reception/[receptionId]/pins` | POST | Génère un code PIN |

### SAV

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/sav` | GET | Liste tous les tickets |
| `/api/sav` | POST | Crée un ticket |
| `/api/sav/[id]` | GET | Détails d'un ticket |
| `/api/sav/[id]` | PATCH | Modifie un ticket |
| `/api/sav/[id]/documents` | POST | Ajoute un document |
| `/api/sav/[id]/photos` | POST | Ajoute une photo |
| `/api/sav/[id]/commentaires` | POST | Ajoute un commentaire |
| `/api/sav/[id]/interventions` | POST | Ajoute une intervention |

### Outillage

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/outillage/machines` | GET | Liste des machines |
| `/api/outillage/machines` | POST | Crée une machine |
| `/api/outillage/machines/[id]` | GET | Détails d'une machine |
| `/api/outillage/machines/[id]` | PUT | Modifie une machine |
| `/api/outillage/machines/[id]` | DELETE | Supprime (ADMIN) |
| `/api/outillage/machines/[id]/prets` | POST | Crée un prêt |
| `/api/outillage/prets/[id]/retour` | POST | Retour de prêt |

### Bons de régie

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/public/bon-regie` | GET | Liste tous les bons |
| `/api/public/bon-regie` | POST | Crée un bon (public) |
| `/api/bon-regie/[id]` | GET | Détails d'un bon |
| `/api/bon-regie/[id]` | DELETE | Supprime (ADMIN) |
| `/api/bon-regie/[id]/associate` | PATCH | Associe à un chantier |

### Email

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/email/send-etat` | POST | Envoie un état d'avancement |
| `/api/chantiers/[id]/rapports/[rapportId]/send-email` | POST | Envoie un rapport |

### Paramètres

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/settings/company` | GET | Infos de l'entreprise |
| `/api/settings/company` | PUT | Modifie les infos |
| `/api/settings/logo` | POST | Upload du logo |

---

## 🔐 Authentification et sécurité

### NextAuth.js

**Configuration** : `src/lib/auth.ts`

**Provider** : Credentials (email + mot de passe)

**Session** :
- Durée : 8 heures
- Token JWT
- Stockage : Cookie httpOnly

### Middleware de protection

**Fichier** : `src/middleware.ts`

**Routes protégées** :
- `/dashboard/*`
- `/chantiers/*`
- `/clients/*`
- `/sous-traitants/*`
- `/outillage/*`
- `/administratif/*`
- `/parametres/*`
- `/utilisateurs/*`
- `/planning/*`

**Routes publiques** :
- `/login`
- `/setup`
- `/api/auth/*`
- `/api/public/*`
- `/public/*`

### Vérification des rôles

**Côté serveur** :
```typescript
const session = await getServerSession(authOptions)
if (!session) {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}

if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}
```

**Côté client** :
```typescript
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
const isAdmin = session?.user?.role === 'ADMIN'
```

### Hachage des mots de passe

- **Bibliothèque** : bcrypt
- **Rounds** : 10
- Stockage : Hash uniquement (jamais le mot de passe en clair)

---

## 📄 Système de génération PDF

OpenBTP utilise plusieurs méthodes de génération PDF selon les besoins.

### 1. Puppeteer (Principal)

**Technologie** : Chromium headless

**Usage** :
- États d'avancement
- Rapports de visite
- Réceptions de chantier
- Contrats

**Fonctionnement** :
1. Génération HTML avec template
2. Conversion HTML → PDF via Puppeteer
3. Retour du buffer PDF

**Fichier** : `src/lib/pdf/pdf-generator.ts`

**Avantages** :
- ✅ Rendu parfait du HTML/CSS
- ✅ Support des polices custom
- ✅ Images base64 intégrées
- ✅ Mise en page complexe

**Inconvénients** :
- ⚠️ Consommation mémoire importante
- ⚠️ Dépendances système (Chromium)

### 2. Service PDF distant (Optionnel)

Pour les environnements contraints (NAS) :

**Service Docker** : `pdf-service/`

**Configuration** :
```env
PDF_SERVICE_URL="http://localhost:3001"
PDF_SERVICE_PROVIDER="custom"
```

**Avantages** :
- ✅ Isolation du processus Chromium
- ✅ Moins de charge sur l'app principale
- ✅ Scalabilité

### 3. Templates HTML

**Localisation** : `src/lib/pdf/templates/`

**Templates disponibles** :
- `etat-avancement-template.ts` : États d'avancement
- `rapport-template.ts` : Rapports de visite
- `reception-template.ts` : Réceptions
- `bon-regie-template.ts` : Bons de régie

**Structure d'un template** :
```typescript
export interface RapportData {
  chantier: ChantierInfo
  date: string
  personnes: PersonnePresente[]
  notes: NoteIndividuelle[]
  photos: PhotoAnnotee[]
  tagFilter?: string
  logoBase64?: string
}

export function generateRapportHTML(data: RapportData): string {
  // Filtrage selon tagFilter
  const notesToInclude = tagFilter 
    ? notes.filter(note => note.tags.includes(tagFilter))
    : notes
  
  // Génération HTML
  return `<!DOCTYPE html>...`
}
```

### Filtrage par tags

Les templates supportent le **filtrage dynamique** :
- Rapports de visite : Filtrer par tag (corps de métier)
- Inclusion conditionnelle de sections
- Adaptation du contenu selon le destinataire

---

## 📧 Système d'envoi d'emails

### Configuration

**Deux niveaux de configuration** :

1. **Base de données** (prioritaire) :
   - Table `companysettings`
   - Configuration via interface web

2. **Variables d'environnement** (fallback) :
   ```env
   EMAIL_HOST="smtp.example.com"
   EMAIL_PORT="587"
   EMAIL_USER="user@example.com"
   EMAIL_PASSWORD="password"
   ```

### Service email

**Fichier** : `src/lib/email-sender.ts`

**Fonction principale** :
```typescript
sendEmailWithAttachment(
  recipients: string[],
  subject: string,
  html: string,
  attachments: Attachment[]
)
```

**Pièces jointes** :
- PDF générés à la volée
- Documents existants
- Images

### Types d'emails envoyés

1. **États d'avancement** :
   - Destinataire : Client
   - Pièce jointe : PDF de l'état
   - Template personnalisable

2. **Rapports de visite** :
   - Destinataires multiples
   - Rapport complet ou filtré
   - Photos incluses dans le PDF

3. **Contrats** :
   - Destinataire : Sous-traitant
   - Lien de signature électronique

4. **Notifications** :
   - Nouveaux tickets SAV
   - Tâches assignées
   - Documents expirant

---

## 🚀 Fonctionnalités avancées

### 1. Système RAG (Retrieval-Augmented Generation)

**Technologie** : Ollama + Embeddings

**Fichiers** :
- `src/lib/rag/rag-service.ts` : Service principal
- `src/lib/ollama/client.ts` : Client Ollama

**Fonctionnalités** :
- Indexation des fiches techniques
- Recherche sémantique
- Assistant IA pour questions techniques
- Génération de réponses contextuelles

**Configuration** :
```env
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:latest"
```

**API** :
- `/api/rag/query` : Poser une question
- `/api/rag/index` : Indexer des documents
- `/api/rag/health` : État du service

### 2. Chat temps réel

**Tables** :
- `Chat` : Conversations
- `ChatMessage` : Messages
- `ChatParticipant` : Participants

**Fonctionnalités** :
- Discussion entre utilisateurs
- Historique persistant
- Notifications
- Pièces jointes

### 3. Planning avec Gantt

**Bibliothèque** : React Big Calendar + Chart personnalisé

**Fichier** : `src/components/dashboard/GanttChart.tsx`

**Fonctionnalités** :
- Vue Gantt des chantiers
- Drag & drop pour déplacer les dates
- Zoom temporel
- Export planning

### 4. Cartographie

**Bibliothèque** : Leaflet + React Leaflet

**Fonctionnalités** :
- Carte avec tous les chantiers
- Marqueurs cliquables
- Filtrage par état
- Clustering pour performance

⚠️ **Problème connu** : Les marqueurs ne s'affichent pas toujours correctement (compatibilité Next.js 15).

### 5. Signature électronique

**Bibliothèque** : react-signature-canvas

**Usage** :
- Bons de régie (signature client)
- Contrats sous-traitants
- Réceptions

**Stockage** : Image base64 dans la base de données

### 6. QR Codes

**Bibliothèque** : qrcode + html5-qrcode

**Génération** :
- Machines/outillage
- Emplacements inventaire
- Codes PIN de réception

**Scanning** :
- Via caméra du smartphone
- Accès direct à la ressource

### 7. Gestion des tâches planifiées

**Bibliothèque** : node-cron

**Fichier** : `src/lib/tasks/scheduledTasks.ts`

**Tâches automatiques** :
- Vérification documents expirant
- Envoi de rappels
- Nettoyage des données temporaires
- Indexation RAG

---

## 🔄 Cycle de vie d'un chantier

### 1. Préparation
- Création du chantier
- Ajout du client
- Upload des plans et CSC
- Création de la commande
- Génération du contrat client

### 2. Démarrage
- Verrouillage de la commande
- Création des sous-traitants si nécessaire
- Génération des contrats sous-traitants
- Premier état d'avancement

### 3. Exécution
- Rapports de visite réguliers
- États d'avancement mensuels
- Gestion des avenants
- Suivi des dépenses
- Photos d'avancement

### 4. Réception
- Création de la réception
- Génération codes PIN
- Collecte des remarques
- Traitement des remarques
- Validation finale

### 5. Clôture
- Dernier état d'avancement (solde)
- Finalisation de la réception
- Archivage des documents
- Clôture du chantier

---

## 🔧 Variables d'environnement

### Variables obligatoires

```env
# Base de données
DATABASE_URL="mysql://user:password@host:3306/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="secret_minimum_32_caracteres"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Variables optionnelles

```env
# Email (fallback si non configuré en DB)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="user@example.com"
EMAIL_PASSWORD="password"
EMAIL_SECURE="false"

# PDF Service
PDF_SERVICE_URL="http://localhost:3001"
PDF_SERVICE_PROVIDER="custom"

# Ollama / IA
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:latest"

# Next.js
NODE_ENV="production"
NEXT_PHASE="phase-production-build"
```

---

## 📊 Performance et optimisation

### Mise en cache

- **React Query** : Cache des requêtes API
- **Next.js Cache** : Pages statiques
- **Prisma Connection Pool** : Connexions DB

### Optimisations images

- **Next.js Image** : Optimisation automatique
- **Formats** : WebP avec fallback JPG
- **Lazy loading** : Chargement à la demande

### Pagination

Toutes les listes utilisent la pagination :
- Chantiers : 25 par page
- Documents : 50 par page
- SAV : 20 par page

### Index base de données

Tous les index importants sont définis dans Prisma :
- Clés primaires
- Clés étrangères
- Index de recherche
- Index composés

---

## 🧪 Testing et qualité

### Linting

```bash
npm run lint
```

**Configuration** : `eslint.config.mjs`

### Build de production

```bash
npm run build
```

**Optimisations** :
- Minification
- Tree shaking
- Code splitting
- Bundle analysis (avec `npm run analyze`)

---

## 🐳 Déploiement

### Développement

```bash
npm run dev
```

### Production standard

```bash
npm run build
npm start
```

### Production avec Prisma

```bash
npm run production:build   # Generate Prisma + Build
npm run production:start   # Migrate + Start
```

### Docker (PDF Service)

```bash
cd pdf-service
docker build -t pdf-service .
docker run -d -p 3001:3001 pdf-service
```

---

## 📈 Monitoring et logs

### Logs applicatifs

**Console serveur** :
- Toutes les requêtes API
- Erreurs Prisma
- Génération PDF
- Envoi emails

**Logs avec emojis** :
- 🎯 Information
- ✅ Succès
- ⚠️ Warning
- ❌ Erreur
- 📥 Réception données
- 📤 Envoi données

**Fichier** : `src/lib/logger.ts` (Logger personnalisé)

### Logs sur NAS

**Scripts de démarrage** :
```bash
# Logs rotatifs par jour
logs/app-YYYYMMDD.log
```

**Consultation** :
```bash
tail -f /volume1/docker/OpenBTP/logs/app-*.log
```

---

## 🔄 Migrations de base de données

### Créer une migration

```bash
npx prisma migrate dev --name ma_migration
```

### Appliquer les migrations

```bash
npx prisma migrate deploy
```

### Réinitialiser la base

⚠️ **ATTENTION** : Supprime toutes les données !

```bash
npx prisma migrate reset
```

---

## 🤝 Contribution

### Structure du code

- **Composants** : Un composant = un fichier
- **Nommage** : PascalCase pour composants, camelCase pour fonctions
- **Types** : Toujours typer avec TypeScript
- **Commentaires** : Expliquer le "pourquoi", pas le "comment"

### Conventions

- **Commits** : Messages en français
- **Branches** : feature/nom-fonctionnalite
- **Pull Requests** : Description détaillée

---

**Dernière mise à jour** : Octobre 2025  
**Version** : 0.1.0

