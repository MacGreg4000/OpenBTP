# 📦 Système de Sauvegarde Automatique de la Base de Données

Ce système permet de sauvegarder automatiquement votre base de données MySQL chaque jour en fin de journée.

## 📋 Fonctionnalités

- ✅ **Sauvegarde automatique** de la base de données MySQL
- ✅ **Compression** des fichiers pour économiser l'espace
- ✅ **Nettoyage automatique** des anciennes sauvegardes (garde les 30 derniers jours par défaut)
- ✅ **Nommage intelligent** avec date et heure
- ✅ **Logs détaillés** de chaque opération
- ✅ **Résumé des sauvegardes** existantes

## 🚀 Installation

### 1. Prérequis

Assurez-vous que `mysqldump` est installé sur votre système :

```bash
# Vérifier si mysqldump est installé
which mysqldump

# Sur Ubuntu/Debian
sudo apt-get install mysql-client

# Sur macOS (avec Homebrew)
brew install mysql-client

# Sur CentOS/RHEL
sudo yum install mysql
```

### 2. Configuration

Le script utilise les variables d'environnement suivantes (définies dans `.env`) :

```env
# Obligatoire
DATABASE_URL="mysql://user:password@host:port/database"

# Optionnelles
BACKUP_DIR="./backups"              # Dossier de sauvegarde (défaut: ./backups)
KEEP_DAYS=30                        # Nombre de jours à conserver (défaut: 30)
```

### 3. Rendre les scripts exécutables

```bash
chmod +x scripts/backup-database.sh
chmod +x scripts/backup-database.js
```

## 📝 Utilisation

### Sauvegarde manuelle

#### Option 1 : Script shell (recommandé)

```bash
./scripts/backup-database.sh
```

#### Option 2 : Script Node.js directement

```bash
node scripts/backup-database.js
```

### Sauvegarde automatique avec Cron

#### Linux / macOS

Éditez le crontab :

```bash
crontab -e
```

Ajoutez cette ligne pour une sauvegarde tous les jours à 18h00 :

```cron
0 18 * * * cd /chemin/vers/OpenBTP && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

Ou pour une sauvegarde tous les jours à 23h59 (fin de journée) :

```cron
59 23 * * * cd /chemin/vers/OpenBTP && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

**Exemples de plannification :**

- Tous les jours à 18h00 : `0 18 * * *`
- Tous les jours à 23h59 : `59 23 * * *`
- Tous les jours à minuit : `0 0 * * *`
- Toutes les heures : `0 * * * *`
- Tous les dimanches à 2h du matin : `0 2 * * 0`

**Important :** Remplacez `/chemin/vers/OpenBTP` par le chemin absolu de votre projet.

#### Sur un NAS Synology

1. Ouvrez le **Panneau de configuration** → **Planificateur de tâches**
2. Créez une nouvelle tâche : **Tâche planifiée** → **Script défini par l'utilisateur**
3. Configurez :
   - **Nom** : Sauvegarde Base de Données OpenBTP
   - **Utilisateur** : `root`
   - **Planifié** : `Tous les jours` à `23:59`
   - **Script** :
     ```bash
     cd /volume1/docker/OpenBTP
     ./scripts/backup-database.sh >> logs/backup.log 2>&1
     ```
4. Sauvegardez et activez la tâche

## 📁 Structure des sauvegardes

Les fichiers de sauvegarde sont stockés dans le dossier `backups/` (ou celui défini par `BACKUP_DIR`) :

```
backups/
├── backup_2025-01-15_18-00-00.sql.gz
├── backup_2025-01-16_18-00-00.sql.gz
├── backup_2025-01-17_18-00-00.sql.gz
└── ...
```

Format du nom : `backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

## 🔧 Configuration avancée

### Changer le dossier de sauvegarde

```bash
export BACKUP_DIR="/chemin/vers/autre/dossier"
./scripts/backup-database.sh
```

Ou dans le fichier `.env` :

```env
BACKUP_DIR="/volume1/backups/openbtp"
```

### Changer le nombre de jours à conserver

```bash
export KEEP_DAYS=60  # Garder 60 jours au lieu de 30
./scripts/backup-database.sh
```

Ou dans le fichier `.env` :

```env
KEEP_DAYS=60
```

### Sauvegarder sur un disque externe ou NAS

```env
BACKUP_DIR="/mnt/nas/backups/openbtp"
# ou
BACKUP_DIR="/volume1/backups/openbtp"  # Synology
```

## 🔄 Restauration d'une sauvegarde

### Décompresser la sauvegarde

```bash
gunzip backups/backup_2025-01-15_18-00-00.sql.gz
```

### Restaurer la base de données

```bash
# Méthode 1 : Avec mysql en ligne de commande
mysql -u user -p database_name < backups/backup_2025-01-15_18-00-00.sql

# Méthode 2 : Depuis le fichier .env
source .env
mysql -h host -u user -p database_name < backups/backup_2025-01-15_18-00-00.sql
```

### Restaurer directement depuis le fichier compressé

```bash
gunzip -c backups/backup_2025-01-15_18-00-00.sql.gz | mysql -u user -p database_name
```

## 📊 Monitoring

### Vérifier les sauvegardes

Le script affiche automatiquement un résumé des sauvegardes après chaque exécution.

### Vérifier manuellement

```bash
ls -lh backups/
```

### Vérifier les logs

Si vous avez configuré la redirection vers un fichier log :

```bash
tail -f logs/backup.log
```

## 🛠️ Dépannage

### Erreur : "mysqldump n'est pas installé"

Installez le client MySQL (voir section Installation).

### Erreur : "DATABASE_URL n'est pas définie"

Vérifiez que votre fichier `.env` contient bien `DATABASE_URL`.

### Erreur : "Accès refusé"

Vérifiez que :
1. Les identifiants de la base de données sont corrects
2. L'utilisateur MySQL a les permissions nécessaires
3. Le script a les permissions d'écriture dans le dossier de sauvegarde

### Erreur : "Espace disque insuffisant"

Vérifiez l'espace disponible :

```bash
df -h backups/
```

Réduisez le nombre de jours conservés (`KEEP_DAYS`) ou changez le dossier de sauvegarde.

## 📧 Notifications (optionnel)

Pour recevoir des notifications par email en cas d'échec, vous pouvez modifier le script shell :

```bash
# Dans backup-database.sh, après l'exécution
if [ $EXIT_CODE -ne 0 ]; then
    echo "La sauvegarde a échoué" | mail -s "Erreur sauvegarde OpenBTP" admin@example.com
fi
```

## 🔒 Sécurité

⚠️ **Important :**

1. Les fichiers de sauvegarde contiennent toutes vos données sensibles
2. Protégez le dossier de sauvegarde avec des permissions appropriées :
   ```bash
   chmod 700 backups/
   ```
3. Ne stockez pas les sauvegardes dans le même dossier que l'application
4. Envisagez de chiffrer les sauvegardes si elles contiennent des données sensibles
5. Conservez des copies hors site (backup externe)

## 📚 Ressources

- [Documentation mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- [Cron syntax](https://crontab.guru/)
- [Documentation Prisma](https://www.prisma.io/docs)

