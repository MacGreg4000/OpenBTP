# 📅 Planning V2 - Version Optimisée

## 🎯 Objectif

Créer une version **épurée et performante** du planning des chantiers avec une meilleure lisibilité et un workflow simplifié.

---

## ✨ Améliorations principales

### 📏 **Densité optimale**
- ✅ **Hauteur par ligne** : `60px` (au lieu de 110px)
- ✅ **Barre de chantier** : `24px` (au lieu de 36px)
- ✅ **Résultat** : **8-10 chantiers visibles** simultanément (vs 4-5 avant)

### 🎨 **Design épuré**
- ✅ **Couleurs solides** : Bleu / Vert / Amber (pas de gradients complexes)
- ✅ **Ombres subtiles** : Une seule ombre légère `shadow-sm`
- ✅ **Badge minimaliste** : Point coloré + texte (pas d'emoji géant)
- ✅ **Palette harmonieuse** : Moins de surcharge visuelle

### 🚀 **Workflow simplifié**
- ✅ **Filtres inline** : Petits boutons toggles intégrés dans la barre d'outils
- ✅ **Recherche compacte** : Plus petite, positionnée à droite
- ✅ **Échelle simplifiée** : 3 boutons radio propres et clairs
- ✅ **Pas de panneau qui s'ouvre** : Tout est toujours visible

### 💡 **Infobulle légère**
- ✅ **Design compact** : 320px de large (vs 384px)
- ✅ **Infos essentielles** : Client, dates, durée, montant, adresse
- ✅ **Moins de décorations** : Focus sur le contenu

---

## 📂 Fichiers créés

### 1. Page principale
**Fichier** : `src/app/(dashboard)/planning-v2/page.tsx`
- Identique à la page originale mais utilise `GanttChartV2`
- Lien vers la version classique en haut à droite

### 2. Composant optimisé
**Fichier** : `src/components/dashboard/GanttChartV2.tsx`
- 820 lignes (vs 902 dans la v1)
- Code plus propre et commenté
- Performances identiques mais UI allégée

### 3. Navigation
**Fichier modifié** : `src/components/Navbar.tsx`
- Ajout de la route "Planning V2 (optimisé)" dans le menu Gestion

---

## 🎨 Palette de couleurs

### États des chantiers

| État | Couleur principale | Utilisation |
|------|-------------------|-------------|
| **En préparation** | `bg-amber-500` | Point, barre, bouton filtre |
| **En cours** | `bg-blue-500` | Point, barre, bouton filtre |
| **Terminé** | `bg-emerald-500` | Point, barre, bouton filtre |

### UI Générale

| Élément | Couleur |
|---------|---------|
| Fond principal | `bg-gray-50 dark:bg-gray-900` |
| Cartes | `bg-white dark:bg-gray-800` |
| Bordures | `border-gray-200 dark:border-gray-700` |
| Texte principal | `text-gray-900 dark:text-white` |
| Texte secondaire | `text-gray-600 dark:text-gray-400` |

---

## 📐 Dimensions

### Version originale (V1)
```
Hauteur ligne : 110px
Barre chantier : 36px (h-9)
Badge statut : 56px (w-14 h-14)
Infobulle : 384px largeur
Chantiers visibles : 4-5
```

### Version optimisée (V2)
```
Hauteur ligne : 60px
Barre chantier : 24px (h-6)
Badge statut : 8px (w-2 h-2 point)
Infobulle : 320px largeur
Chantiers visibles : 8-10
```

---

## 🔗 Accès

### Menu de navigation
**Gestion** → **Planning V2 (optimisé)**

### URL directe
`/planning-v2`

### Lien retour
Un bouton "Version classique" dans le header permet de revenir à `/planning`

---

## 🆚 Comparaison visuelle

### Barre d'outils
**V1** : 2 lignes, panneau filtres qui s'ouvre, beaucoup d'espace
**V2** : 2 lignes compactes, tout visible en permanence, design épuré

### En-tête tableau
**V1** : Grandes colonnes avec icônes et gradients
**V2** : Colonnes plus étroites, texte simple et clair

### Ligne de chantier
**V1** : 
- Emoji + badge gradient
- 2 infos par ligne
- Beaucoup d'espacement

**V2** :
- Point coloré simple
- Titre + client sur 2 lignes
- Compact et lisible

### Barre de temps
**V1** : Barre épaisse (36px) avec gradients et ombres multiples
**V2** : Barre fine (24px) avec couleur solide

### Infobulle
**V1** : Très détaillée, icônes animées, gradients partout
**V2** : Compacte, icônes simples, info essentielles

---

## 🔧 Fonctionnalités identiques

✅ Navigation temporelle (précédent/suivant)
✅ Échelle de temps (Jours/Semaines/Mois)
✅ Filtres par état (En préparation/En cours/Terminé)
✅ Recherche par nom de chantier ou client
✅ Export PDF
✅ Infobulle au survol
✅ Calcul automatique des positions
✅ Marqueur "Aujourd'hui"
✅ Weekends en gris
✅ Mode sombre complet

---

## 📊 Performances

### Temps de rendu
- **Identique** : React.useMemo sur timeUnits
- **Identique** : Filtrage optimisé des chantiers
- **Meilleur** : Moins d'éléments DOM (pas de gradients complexes)

### Taille du bundle
- **V1** : 902 lignes
- **V2** : 820 lignes (-9%)

---

## 🎯 Quand utiliser chaque version ?

### Planning V1 (Original)
✅ Présentation client/direction
✅ Impression de documents officiels
✅ Quand l'esthétique prime sur la densité

### Planning V2 (Optimisé)
✅ Utilisation quotidienne
✅ Suivi de nombreux chantiers (10+)
✅ Travail sur petit écran
✅ Efficacité et rapidité de lecture

---

## 🚀 Évolutions futures possibles

### Court terme
- [ ] Drag & drop pour modifier les dates
- [ ] Filtres avancés (par client, par montant)
- [ ] Vue compacte/étendue toggle

### Moyen terme
- [ ] Sauvegarde des préférences utilisateur
- [ ] Export Excel
- [ ] Partage de vue par URL

### Long terme
- [ ] Collaboration temps réel
- [ ] Notifications de changements
- [ ] Intégration calendrier externe (Google Calendar)

---

## 📝 Notes techniques

### État des filtres par défaut
```typescript
{
  'En préparation': true,
  'En cours': true,
  'Terminé': false  // Masqué par défaut
}
```

### Largeur des colonnes selon l'échelle
```typescript
Jours    : 70px
Semaines : 120px
Mois     : 180px
```

### Hauteur maximale du tableau
```typescript
max-h-[600px]  // ~10 chantiers visibles
```

---

## ✅ Build & Déploiement

### Build réussi
```bash
✓ Compiled successfully
✓ Route /planning-v2 générée
✓ Aucune erreur TypeScript
✓ Aucune erreur ESLint
```

### Accès
L'application est prête à être déployée avec les deux versions du planning disponibles.

---

**Créé le** : {{ DATE }}
**Version** : 2.0
**Statut** : ✅ Production Ready
