# Correction du warning "Found multiple lockfiles"

## 🔍 Problème

Vous avez un warning au démarrage :
```
⚠ Warning: Found multiple lockfiles. Selecting /volume1/docker/package-lock.json.

Consider removing the lockfiles at:
* /volume1/docker/openbtp/package-lock.json
```

## ❌ Cause

Il y a deux fichiers `package-lock.json` :
1. `/volume1/docker/package-lock.json` (répertoire parent - **ne devrait pas être là**)
2. `/volume1/docker/openbtp/package-lock.json` (répertoire du projet - **celui-ci est correct**)

Le fichier dans le répertoire parent est probablement un résidu d'une ancienne installation ou d'une tentative d'exécution de `npm install` dans le mauvais répertoire.

## ✅ Solution

### Étape 1 : Se connecter en SSH au NAS

```bash
ssh votre_utilisateur@ip_du_nas
```

### Étape 2 : Vérifier les fichiers package-lock.json

```bash
# Vérifier s'il y a un package-lock.json dans le répertoire parent
ls -la /volume1/docker/package-lock.json

# Vérifier le package-lock.json du projet (celui-ci doit rester)
ls -la /volume1/docker/openbtp/package-lock.json
```

### Étape 3 : Supprimer le fichier du répertoire parent

```bash
# Supprimer le package-lock.json du répertoire parent (s'il existe)
rm /volume1/docker/package-lock.json

# Vérifier qu'il n'y a plus qu'un seul package-lock.json
find /volume1/docker -name "package-lock.json" -type f
```

Vous devriez maintenant voir uniquement :
```
/volume1/docker/openbtp/package-lock.json
```

### Étape 4 : Vérifier qu'il n'y a pas de package.json dans le répertoire parent

```bash
# Vérifier s'il y a un package.json dans le répertoire parent (il ne devrait pas y en avoir)
ls -la /volume1/docker/package.json
```

Si ce fichier existe et n'est pas nécessaire, supprimez-le aussi :
```bash
rm /volume1/docker/package.json
```

### Étape 5 : Redémarrer l'application

```bash
cd /volume1/docker/openbtp
npm run start
```

Le warning ne devrait plus apparaître.

## 🔒 Prévention

Pour éviter que cela se reproduise :

1. **Toujours exécuter `npm install` dans le répertoire du projet** :
   ```bash
   cd /volume1/docker/openbtp
   npm install
   ```

2. **Ne jamais exécuter `npm install` dans `/volume1/docker/`** (le répertoire parent)

3. **Vérifier le répertoire actuel** avant d'exécuter des commandes npm :
   ```bash
   pwd  # Doit afficher /volume1/docker/openbtp
   ```

## 📝 Note

Le `package-lock.json` dans `/volume1/docker/openbtp/` est **nécessaire** et doit être conservé. C'est celui qui gère les versions exactes des dépendances de votre projet.

