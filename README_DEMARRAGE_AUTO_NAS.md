# Configuration du démarrage automatique sur NAS Synology

Ce guide vous explique comment configurer le démarrage automatique de l'application SecoTech/OpenBTP sur votre NAS Synology.

## ⚠️ Problème principal : Changement de nom du dépôt

Si vous avez réinstallé l'application avec le nouveau nom du dépôt GitHub (OpenBTP), **le chemin a changé** et vos anciens scripts/tâches pointent vers l'ancien répertoire !

## 📋 Checklist de vérification

### 1. Vérifier le chemin d'installation

**Ancien chemin probable :**
```bash
/volume1/docker/app-secotech  # ou autre nom
```

**Nouveau chemin probable :**
```bash
/volume1/docker/OpenBTP  # nouveau nom du dépôt
```

### 2. Mettre à jour les scripts

Les scripts `start-app-auto.sh` et `stop-app-auto.sh` ont été créés pour le démarrage automatique.

**IMPORTANT :** Modifiez la variable `APP_DIR` dans les deux scripts :

```bash
# Dans start-app-auto.sh et stop-app-auto.sh
APP_DIR="/volume1/docker/OpenBTP"  # ⚠️ Adapter ce chemin !
```

### 3. Rendre les scripts exécutables

Connectez-vous en SSH à votre NAS et exécutez :

```bash
cd /volume1/docker/OpenBTP  # Votre chemin d'installation
chmod +x start-app-auto.sh
chmod +x stop-app-auto.sh
```

## 🔧 Configuration du démarrage automatique

### Option 1 : Via le Panneau de configuration (Recommandé)

1. **Ouvrir DSM** (interface web de votre NAS)

2. **Aller dans : Panneau de configuration → Planificateur de tâches**

3. **Créer une nouvelle tâche** :
   - Cliquer sur **Créer** → **Tâche planifiée** → **Script défini par l'utilisateur**

4. **Paramètres de la tâche** :
   - **Général :**
     - Nom de la tâche : `Démarrage SecoTech`
     - Utilisateur : `root` (important pour avoir tous les droits)
     - Activé : ☑️ coché
   
   - **Planification :**
     - Date : Exécuter les jours suivants : `Tous les jours` (ou ne cochez rien si vous voulez juste au boot)
     - Première exécution : **Au démarrage**
   
   - **Paramètres de la tâche :**
     - Commande définie par l'utilisateur :
     ```bash
     /volume1/docker/OpenBTP/start-app-auto.sh
     ```
     - ⚠️ Remplacez le chemin par votre chemin réel !

5. **Sauvegarder** la tâche

6. **Tester la tâche** :
   - Sélectionner la tâche
   - Cliquer sur **Exécuter**
   - Vérifier les logs dans `/volume1/docker/OpenBTP/logs/`

### Option 2 : Via Crontab (Utilisateurs avancés)

1. **Se connecter en SSH au NAS**

2. **Éditer le crontab de root** :
   ```bash
   sudo vi /etc/crontab
   ```

3. **Ajouter la ligne suivante** :
   ```bash
   @reboot root /volume1/docker/OpenBTP/start-app-auto.sh
   ```

4. **Sauvegarder** et quitter (`ESC` puis `:wq`)

5. **Redémarrer le service cron** (ou redémarrer le NAS)
   ```bash
   sudo synoservice --restart crond
   ```

## 🔍 Vérification et dépannage

### Vérifier que l'application tourne

```bash
# En SSH sur le NAS
ps aux | grep next-server
```

Si l'application tourne, vous verrez une ou plusieurs lignes avec `next-server`.

### Consulter les logs

```bash
# Logs de démarrage automatique
cat /volume1/docker/OpenBTP/logs/app-*.log

# Logs en temps réel
tail -f /volume1/docker/OpenBTP/logs/app-$(date +%Y%m%d).log
```

### Vérifier la tâche planifiée

1. **DSM → Panneau de configuration → Planificateur de tâches**
2. Sélectionner votre tâche
3. Cliquer sur **Action** → **Afficher les résultats**

### Problèmes courants

#### ❌ L'application ne démarre pas au boot

**Solutions :**

1. **Vérifier le chemin du script**
   - La tâche planifiée pointe-t-elle vers le bon chemin ?
   - Le script existe-t-il vraiment à cet emplacement ?

2. **Vérifier les permissions**
   ```bash
   ls -la /volume1/docker/OpenBTP/*.sh
   ```
   Les scripts doivent être exécutables (`-rwxr-xr-x`)

3. **Vérifier le chemin dans le script**
   ```bash
   cat /volume1/docker/OpenBTP/start-app-auto.sh | grep APP_DIR
   ```
   Le `APP_DIR` doit correspondre à votre répertoire d'installation

4. **Vérifier que Node.js est accessible**
   ```bash
   which node
   which npm
   ```
   Si ces commandes ne retournent rien, Node.js n'est pas dans le PATH au démarrage

#### ❌ Node.js n'est pas dans le PATH au démarrage

Si Node.js est installé manuellement, vous devez ajouter le PATH dans le script :

```bash
# Ajouter au début de start-app-auto.sh, après #!/bin/bash
export PATH="/usr/local/bin:$PATH"  # Adapter selon votre installation de Node.js
```

#### ❌ L'application démarre mais s'arrête immédiatement

1. **Vérifier les variables d'environnement** (fichier `.env`)
2. **Vérifier que la base de données est accessible**
3. **Consulter les logs** pour voir l'erreur exacte

#### ❌ La tâche planifiée a disparu après mise à jour DSM

Parfois, les mises à jour de DSM peuvent réinitialiser les tâches planifiées. Il faut les recréer.

## 🔄 Migration depuis l'ancien nom du dépôt

Si vous aviez une ancienne installation et que vous êtes passé au nouveau nom :

1. **Désactiver/Supprimer l'ancienne tâche planifiée** (qui pointe vers l'ancien chemin)

2. **Arrêter l'ancienne application** (si elle tourne encore)
   ```bash
   cd /volume1/docker/ancien-nom
   ./stop-app.sh
   ```

3. **Créer la nouvelle tâche** avec le nouveau chemin (voir ci-dessus)

4. **Tester le démarrage automatique** :
   ```bash
   # Exécuter manuellement le script
   /volume1/docker/OpenBTP/start-app-auto.sh
   
   # Vérifier les logs
   tail -f /volume1/docker/OpenBTP/logs/app-*.log
   ```

5. **Redémarrer le NAS** pour tester le démarrage automatique

## 📝 Notes importantes

- **Les scripts `start-app.sh` et `stop-app.sh`** sont pour le démarrage **manuel** (ils demandent confirmation)
- **Les scripts `start-app-auto.sh` et `stop-app-auto.sh`** sont pour le démarrage **automatique** (sans interaction)
- **Les logs** sont conservés dans `logs/app-YYYYMMDD.log`
- **Pensez à nettoyer les vieux logs** régulièrement pour économiser l'espace disque

## ✅ Test final

Pour tester que tout fonctionne :

1. **Arrêter l'application** (si elle tourne)
   ```bash
   /volume1/docker/OpenBTP/stop-app-auto.sh
   ```

2. **Exécuter le script de démarrage automatique**
   ```bash
   /volume1/docker/OpenBTP/start-app-auto.sh
   ```

3. **Vérifier les logs**
   ```bash
   tail -20 /volume1/docker/OpenBTP/logs/app-*.log
   ```

4. **Vérifier que l'application est accessible** via votre navigateur

5. **Redémarrer le NAS** pour tester le démarrage automatique complet

## 🆘 Besoin d'aide ?

Si le problème persiste, envoyez les informations suivantes :

1. **Logs de démarrage** : `/volume1/docker/OpenBTP/logs/app-*.log`
2. **Résultats de la tâche planifiée** (dans DSM)
3. **Version de Node.js** : `node --version`
4. **Chemin d'installation exact** : `pwd` depuis le répertoire de l'application


