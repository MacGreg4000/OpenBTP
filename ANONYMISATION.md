# 🔒 Anonymisation complète du dépôt OpenBTP

## ⚠️ IMPORTANT

Les fichiers sensibles ont été retirés du tracking Git actuel, **MAIS ils restent dans l'historique Git**.

Pour une anonymisation **COMPLÈTE** du dépôt GitHub, vous devez **purger l'historique Git**.

## 📋 Méthode recommandée : git-filter-repo

### 1. Installation de git-filter-repo

```bash
# macOS
brew install git-filter-repo

# Ou via pip
pip3 install git-filter-repo
```

### 2. Purger l'historique

```bash
cd /Users/gregory/Desktop/app-secotech

# Purger tous les fichiers sensibles de l'historique
git filter-repo --path public/chantiers --invert-paths --force
git filter-repo --path public/documents --invert-paths --force
git filter-repo --path public/fiches-techniques --invert-paths --force
git filter-repo --path public/uploads --invert-paths --force
git filter-repo --path public/images/company-logo.png --invert-paths --force
git filter-repo --path public/images/signature.png --invert-paths --force
git filter-repo --path public/logo.png --invert-paths --force
git filter-repo --path 'public/favicon*.png' --invert-paths --force
git filter-repo --path 'public/favicon*.ico' --invert-paths --force
```

### 3. Reconfigurer le remote

Après `git-filter-repo`, le remote est supprimé. Il faut le rajouter :

```bash
git remote add origin https://github.com/MacGreg4000/OpenBTP.git
```

### 4. Force push vers GitHub

⚠️ **ATTENTION : Ceci va ÉCRASER l'historique GitHub !**

```bash
git push --force origin main
```

### 5. Vérification

```bash
# Vérifier que les fichiers sensibles ne sont plus dans l'historique
git log --all --full-history -- "public/documents/*"
git log --all --full-history -- "public/chantiers/*"
```

Si aucun commit n'apparaît, c'est réussi ! ✅

## 🔄 Méthode alternative : Créer un nouveau dépôt

Si la réécriture de l'historique pose problème, vous pouvez :

1. Créer un nouveau dépôt GitHub vide : `OpenBTP-clean`
2. Supprimer le dossier `.git` local
3. Réinitialiser Git et pousser :

```bash
cd /Users/gregory/Desktop/app-secotech
rm -rf .git
git init
git add .
git commit -m "🎉 Initial commit - OpenBTP (anonymisé)"
git branch -M main
git remote add origin https://github.com/MacGreg4000/OpenBTP-clean.git
git push -u origin main
```

## 📝 Fichiers déjà anonymisés

✅ Tous les dossiers sensibles sont maintenant dans `.gitignore`  
✅ Des README explicatifs ont été ajoutés  
✅ Un favicon générique a été créé  
✅ Le commit actuel ne contient aucune donnée sensible  

**Il ne reste plus qu'à purger l'historique Git pour une anonymisation complète !**

