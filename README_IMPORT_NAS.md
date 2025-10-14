# Import de la base de données sur NAS

## Fichiers fournis

1. **`structure_database_nas.sql`** - Structure complète de la base de données (sans données)
2. **`schema_prisma_complet.prisma`** - Schéma Prisma complet pour référence

## Instructions d'import sur NAS

### 1. Préparation de la base de données

```sql
-- Créer la base de données sur votre NAS
CREATE DATABASE IF NOT EXISTS `app_secotech` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 2. Import de la structure

```bash
# Sur votre NAS, exécutez :
mysql -u [username] -p app_secotech < structure_database_nas.sql
```

### 3. Configuration de l'application

Mettez à jour votre fichier `.env` avec les nouvelles informations de connexion :

```env
DATABASE_URL="mysql://[username]:[password]@[nas-ip]:[port]/app_secotech"
```

### 4. Synchronisation Prisma

```bash
# Dans le dossier de l'application
npx prisma db pull
npx prisma generate
```

## Structure des tables principales

### Tables de base
- `User` - Utilisateurs de l'application
- `Client` - Clients
- `contacts` - Contacts des clients
- `Chantier` - Chantiers/projets
- `soustraitant` - Sous-traitants

### Tables de gestion
- `commande` - Commandes clients
- `lignecommande` - Lignes de commande
- `etat_avancement` - États d'avancement
- `ligne_etat_avancement` - Lignes d'état d'avancement
- `commande_soustraitant` - Commandes sous-traitants
- `depense` - Dépenses

### Tables de fonctionnalités
- `task` - Tâches/planning
- `ticket_sav` - Tickets SAV
- `chat` - Conversations
- `chat_message` - Messages
- `user_notes` - Notes utilisateur (avec tâches)

### Tables d'authentification
- `account` - Comptes NextAuth
- `session` - Sessions NextAuth
- `verificationtoken` - Tokens de vérification

## Caractéristiques techniques

- **Charset** : utf8mb4
- **Collation** : utf8mb4_unicode_ci
- **Engine** : InnoDB
- **Support JSON** : Oui (pour les coordonnées, métadonnées)
- **Index** : Optimisés pour les requêtes fréquentes
- **Foreign Keys** : Contraintes d'intégrité référentielle

## Vérification de l'import

Après l'import, vérifiez que toutes les tables sont créées :

```sql
SHOW TABLES;
```

Vous devriez voir environ 50+ tables listées.

## Notes importantes

1. **Pas de données** : Ce script ne contient que la structure, pas les données
2. **Privilèges** : Assurez-vous que l'utilisateur MySQL a les droits CREATE, ALTER, INDEX
3. **Version MySQL** : Compatible avec MySQL 5.7+ et MariaDB 10.3+
4. **Sauvegarde** : Faites une sauvegarde avant l'import si vous avez des données existantes

## Support

En cas de problème, vérifiez :
- Les logs MySQL sur votre NAS
- Les permissions de l'utilisateur de base de données
- La compatibilité de version MySQL/MariaDB
