# 📄 Gestion des Templates de Contrats

## 🎯 Problème résolu

Le problème des templates de contrats a été entièrement résolu :

### ✅ Ce qui a été corrigé :

1. **Pages manquantes créées** :
   - ✅ Page `/admin/templates-contrats/nouveau` pour créer un nouveau template
   - ✅ Page `/admin/templates-contrats/[id]/modifier` pour modifier un template existant
   - ✅ Plus d'erreur 404 !

2. **Template professionnel ajouté** :
   - ✅ Le template "Contrat de Sous-Traitance Professionnel" a été inséré dans la base de données
   - ✅ Il est maintenant **actif** et disponible
   - ✅ Visible sur la page https://openbtp.secotech.synology.me/admin/templates-contrats

## 🚀 Comment utiliser

### Accéder à la gestion des templates

1. Connectez-vous avec un compte **ADMIN**
2. Allez dans le menu **Documents** → **Gestion** → **Templates de contrats**
3. URL : https://openbtp.secotech.synology.me/admin/templates-contrats

### Créer un nouveau template

1. Cliquez sur le bouton **"Nouveau Template"**
2. Remplissez les champs :
   - **Nom du template** (requis)
   - **Description** (optionnel)
   - **Contenu HTML** (requis)
3. Cliquez sur **"Créer le template"**

### Modifier un template existant

1. Dans la liste des templates, cliquez sur l'icône **crayon** (✏️)
2. Modifiez les champs souhaités
3. Cliquez sur **"Enregistrer les modifications"**

### Activer/Désactiver un template

- Seul **un template peut être actif à la fois**
- Pour activer un template, cliquez sur l'icône **check** (✓)
- Le template actif est utilisé pour générer les nouveaux contrats

### Supprimer un template

- ⚠️ **Impossible de supprimer un template actif**
- Désactivez-le d'abord en activant un autre template
- Cliquez sur l'icône **poubelle** (🗑️)
- Confirmez la suppression

## 📋 Variables disponibles dans les templates

Les templates HTML utilisent des variables dynamiques qui sont remplacées lors de la génération du contrat :

### Informations de l'entreprise
- `{{nomEntreprise}}` - Nom de l'entreprise principale
- `{{adresseEntreprise}}` - Adresse
- `{{zipCodeEntreprise}}` - Code postal
- `{{villeEntreprise}}` - Ville
- `{{tvaEntreprise}}` - Numéro de TVA
- `{{telephoneEntreprise}}` - Téléphone
- `{{emailEntreprise}}` - Email
- `{{representantEntreprise}}` - Représentant légal
- `{{logoBase64}}` - Logo en base64

### Informations du sous-traitant
- `{{nomSousTraitant}}` - Nom du sous-traitant
- `{{adresseSousTraitant}}` - Adresse
- `{{tvaSousTraitant}}` - Numéro de TVA
- `{{telephoneSousTraitant}}` - Téléphone
- `{{emailSousTraitant}}` - Email
- `{{representantSousTraitant}}` - Représentant

### Informations du contrat
- `{{referenceContrat}}` - Référence unique
- `{{dateGeneration}}` - Date de génération
- `{{dateDebut}}` - Date de début
- `{{dateFin}}` - Date de fin
- `{{signatureBase64}}` - Signature en base64

## 🔧 Script d'insertion du template

Si vous devez réinsérer le template professionnel ou mettre à jour son contenu :

```bash
node scripts/insert-professional-template.js
```

Ce script :
- ✅ Lit le fichier `templates/contrat-professionnel.html`
- ✅ Vérifie si le template existe déjà
- ✅ Crée ou met à jour le template dans la base de données
- ✅ Active automatiquement le template

## 📁 Structure des fichiers

```
src/
├── app/(dashboard)/admin/templates-contrats/
│   ├── page.tsx                    # Liste des templates
│   ├── nouveau/
│   │   └── page.tsx               # Créer un nouveau template
│   └── [id]/
│       └── modifier/
│           └── page.tsx           # Modifier un template

templates/
├── contrat-professionnel.html     # Template HTML professionnel
├── contrat-sous-traitant.html
└── contrat-sous-traitant-professionnel.html

scripts/
└── insert-professional-template.js # Script d'insertion
```

## 🎨 Bonnes pratiques

### Pour créer un nouveau template :

1. **Utilisez du HTML valide** avec des styles CSS intégrés
2. **Testez votre template** avant de l'activer
3. **Incluez toutes les clauses légales** nécessaires
4. **Utilisez les variables dynamiques** pour les données variables
5. **Prévisualisez** le rendu avec l'icône document (📄)

### Structure HTML recommandée :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>{{nomSousTraitant}}</title>
  <style>
    /* Vos styles CSS ici */
  </style>
</head>
<body>
  <!-- Votre contenu HTML avec variables -->
  <div class="header">
    <img src="data:image/png;base64,{{logoBase64}}" alt="Logo">
  </div>
  <!-- ... -->
</body>
</html>
```

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Allez sur https://openbtp.secotech.synology.me/admin/templates-contrats
2. Vous devriez voir le template **"Contrat de Sous-Traitance Professionnel"** avec le badge **"ACTIF"**
3. Cliquez sur **"Nouveau Template"** → Plus d'erreur 404 ✅
4. Cliquez sur **l'icône crayon** → Page de modification ✅

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez que vous êtes connecté en tant qu'**ADMIN**
2. Vérifiez que la base de données est accessible
3. Exécutez le script d'insertion si le template est manquant :
   ```bash
   node scripts/insert-professional-template.js
   ```

---

**Dernière mise à jour :** 16 octobre 2025  
**Statut :** ✅ Entièrement fonctionnel

