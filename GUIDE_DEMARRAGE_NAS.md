# Guide de démarrage automatique sur NAS - Solution étape par étape

## 🎯 Votre situation

Vous avez un script sur votre NAS qui fonctionne manuellement mais pas au démarrage automatique.

Script actuel :
```bash
cd volume1/docker/OpenBTP/
npm run start
```

## ❌ Pourquoi ça ne marche pas au démarrage ?

1. **Chemin relatif** : `volume1` au lieu de `/volume1` (manque le `/` au début)
2. **Node.js pas dans le PATH** : Au démarrage, le NAS ne trouve pas `npm`
3. **Pas en arrière-plan** : La commande bloque et empêche la suite du démarrage

## ✅ Solution étape par étape

### Étape 1 : Trouver où est installé Node.js

Connectez-vous en SSH à votre NAS et exécutez :

```bash
which node
which npm
```

Vous devriez voir quelque chose comme :
- `/usr/local/bin/node`
- `/usr/local/bin/npm`

**Notez le chemin**, vous en aurez besoin.

### Étape 2 : Localiser votre script sur le NAS

Votre script est probablement ici :
```bash
/volume1/docker/OpenBTP/start.sh
```

Ou peut-être dans `/usr/local/bin/` ou ailleurs. Trouvez-le avec :
```bash
find /volume1 -name "*.sh" -type f 2>/dev/null | grep -i openbtp
```

### Étape 3 : Modifier le script

Éditez votre script (remplacez le chemin par le vôtre) :

```bash
sudo vi /volume1/docker/OpenBTP/start.sh
```

**Remplacez tout le contenu par :**

```bash
#!/bin/bash

# Script de démarrage automatique OpenBTP pour NAS Synology
# Ce fichier doit être sur le NAS à l'emplacement : /volume1/docker/OpenBTP/start.sh

# 1. Définir le répertoire de l'application (CHEMIN ABSOLU avec / au début)
APP_DIR="/volume1/docker/OpenBTP"
LOG_FILE="$APP_DIR/startup.log"

# 2. Ajouter Node.js au PATH
# ⚠️ ADAPTER CE CHEMIN selon le résultat de 'which node'
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# 3. Log de démarrage
echo "========================================" >> "$LOG_FILE"
echo "[$(date)] Démarrage automatique de OpenBTP" >> "$LOG_FILE"

# 4. Vérifier que Node.js est accessible
if ! command -v node &> /dev/null; then
    echo "[$(date)] ERREUR: Node.js introuvable dans le PATH" >> "$LOG_FILE"
    echo "[$(date)] PATH actuel: $PATH" >> "$LOG_FILE"
    exit 1
fi

echo "[$(date)] Node.js trouvé: $(which node)" >> "$LOG_FILE"
echo "[$(date)] Version Node.js: $(node --version)" >> "$LOG_FILE"

# 5. Se placer dans le répertoire de l'application
cd "$APP_DIR" || {
    echo "[$(date)] ERREUR: Impossible d'accéder à $APP_DIR" >> "$LOG_FILE"
    exit 1
}

echo "[$(date)] Répertoire: $(pwd)" >> "$LOG_FILE"

# 6. Vérifier si l'application tourne déjà
if pgrep -f "next-server" > /dev/null; then
    echo "[$(date)] Application déjà en cours d'exécution" >> "$LOG_FILE"
    exit 0
fi

# 7. Lancer l'application EN ARRIÈRE-PLAN
echo "[$(date)] Lancement de npm run start..." >> "$LOG_FILE"
nohup npm run start >> "$LOG_FILE" 2>&1 &

# 8. Attendre un peu et vérifier
sleep 5

if pgrep -f "next-server" > /dev/null; then
    echo "[$(date)] ✅ Application démarrée avec succès - PID: $(pgrep -f 'next-server')" >> "$LOG_FILE"
else
    echo "[$(date)] ❌ Échec du démarrage" >> "$LOG_FILE"
    exit 1
fi

echo "========================================" >> "$LOG_FILE"
```

Sauvegardez avec : `ESC` puis `:wq` puis `ENTRÉE`

### Étape 4 : Rendre le script exécutable

```bash
chmod +x /volume1/docker/OpenBTP/start.sh
```

### Étape 5 : Tester le script

Arrêtez d'abord l'application si elle tourne :
```bash
pkill -f next-server
```

Puis testez le script :
```bash
/volume1/docker/OpenBTP/start.sh
```

Vérifiez les logs :
```bash
cat /volume1/docker/OpenBTP/startup.log
```

Vous devriez voir un message de succès ✅

### Étape 6 : Configurer la tâche planifiée

#### Option A : Via l'interface DSM (Recommandé)

1. **Ouvrez DSM** (interface web du NAS)

2. **Allez dans** : `Panneau de configuration` → `Planificateur de tâches`

3. **Vérifiez s'il existe déjà une tâche** pour l'ancien nom du dépôt
   - Si oui, **supprimez-la** ou **modifiez-la**

4. **Créez une nouvelle tâche** :
   - Cliquez sur `Créer` → `Tâche planifiée` → `Script défini par l'utilisateur`

5. **Onglet "Général"** :
   - Nom de la tâche : `Démarrage OpenBTP`
   - Utilisateur : `root` ⚠️ Important !
   - Activé : ☑️ Coché

6. **Onglet "Planification"** :
   - Exécuter lors de l'événement suivant : **Au démarrage** ☑️
   - (Ou décochez tout et activez seulement "Au démarrage")

7. **Onglet "Paramètres de la tâche"** :
   - Dans le champ "Commande définie par l'utilisateur", entrez :
   ```bash
   /volume1/docker/OpenBTP/start.sh
   ```

8. **Cliquez sur OK**

9. **Testez la tâche** :
   - Sélectionnez la tâche
   - Cliquez sur `Exécuter`
   - Attendez quelques secondes
   - Vérifiez : `cat /volume1/docker/OpenBTP/startup.log`

#### Option B : Via Crontab (Avancé)

```bash
# Éditer le crontab
sudo vi /etc/crontab

# Ajouter cette ligne :
@reboot root /volume1/docker/OpenBTP/start.sh

# Sauvegarder et redémarrer cron
sudo synoservice --restart crond
```

### Étape 7 : Test final - Redémarrer le NAS

1. **Arrêtez l'application** :
   ```bash
   pkill -f next-server
   ```

2. **Redémarrez le NAS** depuis DSM ou :
   ```bash
   sudo reboot
   ```

3. **Après le redémarrage**, attendez 2-3 minutes

4. **Vérifiez que l'application tourne** :
   ```bash
   # En SSH
   ps aux | grep next-server
   
   # Vérifiez les logs
   cat /volume1/docker/OpenBTP/startup.log
   ```

5. **Testez dans votre navigateur** : `http://IP-DU-NAS:3000`

## 🔧 Dépannage

### ❌ "command not found: npm"

**Problème** : Node.js n'est pas dans le PATH au démarrage

**Solution** : Dans le script, ajustez le PATH. Trouvez où est npm :
```bash
find / -name "npm" -type f 2>/dev/null
```

Puis mettez le bon chemin dans le script :
```bash
export PATH="/le/bon/chemin/bin:$PATH"
```

### ❌ "No such file or directory"

**Problème** : Le chemin `/volume1/docker/OpenBTP` n'existe pas

**Solution** : Vérifiez le vrai chemin :
```bash
ls -la /volume1/docker/
```

Ajustez `APP_DIR` dans le script.

### ❌ L'application démarre puis s'arrête

**Problème** : Erreur dans l'application (base de données, .env, etc.)

**Solution** : Consultez les logs :
```bash
tail -100 /volume1/docker/OpenBTP/startup.log
```

Vérifiez :
- Le fichier `.env` existe et est correct
- La base de données MySQL est accessible
- Les variables d'environnement sont bonnes

### ❌ La tâche planifiée ne s'exécute pas

**Problème** : Configuration incorrecte de la tâche

**Solution** :
1. Vérifiez que l'utilisateur est bien `root`
2. Vérifiez que "Au démarrage" est coché
3. Vérifiez que le chemin du script est absolu (commence par `/`)
4. Consultez les résultats de la tâche dans DSM

### ❌ Le script marche manuellement mais pas au démarrage

**Problème** : Variables d'environnement différentes

**Solution** : Ajoutez au script :
```bash
# Charger les variables d'environnement
export $(cat /volume1/docker/OpenBTP/.env | grep -v '^#' | xargs)
```

## 📊 Vérifier l'état de l'application

### Vérifier si l'application tourne

```bash
# Méthode 1
ps aux | grep next-server

# Méthode 2
pgrep -f next-server

# Méthode 3
netstat -tuln | grep 3000  # Vérifier si le port 3000 est utilisé
```

### Consulter les logs

```bash
# Logs de démarrage
cat /volume1/docker/OpenBTP/startup.log

# Logs en temps réel
tail -f /volume1/docker/OpenBTP/startup.log
```

### Arrêter l'application

```bash
# Méthode douce
pkill -TERM -f next-server

# Méthode forte (si ça ne répond pas)
pkill -KILL -f next-server
```

## 🎯 Checklist finale

- [ ] Le script utilise des chemins ABSOLUS (avec `/` au début)
- [ ] Node.js est dans le PATH du script
- [ ] Le script lance l'application avec `nohup` et `&`
- [ ] Le script est exécutable (`chmod +x`)
- [ ] Le script fonctionne quand on l'exécute manuellement
- [ ] La tâche planifiée existe dans DSM
- [ ] La tâche planifiée s'exécute avec l'utilisateur `root`
- [ ] La tâche planifiée est activée "Au démarrage"
- [ ] Le NAS a redémarré pour tester
- [ ] L'application est accessible dans le navigateur

## 💡 Astuce : Script de vérification rapide

Créez ce script pour vérifier rapidement l'état :

```bash
#!/bin/bash
# /volume1/docker/OpenBTP/check-status.sh

echo "🔍 Vérification de l'application OpenBTP"
echo "========================================"

if pgrep -f "next-server" > /dev/null; then
    echo "✅ Application EN COURS d'exécution"
    echo "PID: $(pgrep -f 'next-server')"
else
    echo "❌ Application ARRÊTÉE"
fi

echo ""
echo "📊 Dernières lignes des logs :"
tail -20 /volume1/docker/OpenBTP/startup.log 2>/dev/null || echo "Pas de logs"
```

Rendez-le exécutable et utilisez-le :
```bash
chmod +x /volume1/docker/OpenBTP/check-status.sh
/volume1/docker/OpenBTP/check-status.sh
```


