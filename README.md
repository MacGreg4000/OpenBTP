# OpenBTP

Application de gestion de chantiers et de sécurité pour le secteur de la construction.

## Prérequis

- Node.js (version 18 ou supérieure)
- MySQL (version 8.0 ou supérieure)
- npm ou yarn

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/psychogenelive/OpenBTP.git
cd OpenBTP
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
Créer un fichier `.env` à la racine du projet avec les variables suivantes :
```env
# Base de données
DATABASE_URL="mysql://root:root@localhost:3306/openbtp"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre_secret_ici"

# Configuration de l'application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Initialiser la base de données :
```bash
# Créer la base de données
npx prisma db push

# Créer l'utilisateur administrateur
npm run create-admin

# Initialiser les tâches administratives
npm run seed:admin-tasks
```

## Démarrage de l'application

1. En mode développement :
```bash
npm run dev
```

2. En production :
```bash
npm run build
npm start
```

L'application sera accessible à l'adresse : http://localhost:3000

## Scripts disponibles

- `npm run dev` : Lance l'application en mode développement
- `npm run build` : Compile l'application pour la production
- `npm start` : Lance l'application en mode production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run create-admin` : Crée un utilisateur administrateur
- `npm run seed:admin-tasks` : Initialise les tâches administratives
- `npm run check-db` : Vérifie l'état de la base de données
- `npm run reset-tasks` : Réinitialise les tâches

## Structure du projet

```
OpenBTP/
├── src/                    # Code source de l'application
│   ├── app/               # Pages et routes Next.js
│   ├── components/        # Composants React réutilisables
│   ├── lib/              # Utilitaires et configurations
│   ├── middleware/       # Middleware Next.js
│   ├── types/           # Types TypeScript
│   └── utils/           # Fonctions utilitaires
├── prisma/               # Schéma et migrations de la base de données
├── public/              # Fichiers statiques
├── scripts/             # Scripts utilitaires
├── templates/           # Templates HTML
└── .env                # Variables d'environnement
```

## Sécurité

- Assurez-vous de changer le mot de passe administrateur par défaut après la première connexion
- Gardez votre fichier `.env` sécurisé et ne le partagez jamais
- Utilisez des mots de passe forts pour la base de données

## Support

Pour toute question ou problème, veuillez créer une issue dans le dépôt GitHub.

## Problèmes connus

### Carte des chantiers
- **Marqueurs non visibles** : La carte s'affiche correctement mais les marqueurs (pointeurs) ne sont pas visibles sur la carte. Des améliorations ont été apportées à la stabilité du composant pour éviter les erreurs de build avec Next.js 15, mais les marqueurs ne s'affichent pas correctement malgré la présence des fichiers d'icônes dans `/public/images/`.
- Pour résoudre ce problème, des investigations supplémentaires sont nécessaires concernant le chargement des icônes Leaflet et leur compatibilité avec Next.js 15.
