# Proposition : Outil de Métrés avec Catégories

## Structure de données

```prisma
model MetreChantier {
  id              String   @id @default(uuid())
  chantierId      String
  date            DateTime @default(now())
  commentaire     String?  @db.Text  // Commentaire global du métré
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  chantier        Chantier @relation(...)
  User            User     @relation(...)
  categories      MetreCategorie[]  // Plusieurs catégories par métré
}

model MetreCategorie {
  id              String   @id @default(uuid())
  metreChantierId String
  nom             String   // Libre : "Carrelage sol", "Plinthes", "Murs", etc.
  ordre           Int      @default(0) // Pour l'ordre d'affichage
  createdAt       DateTime @default(now())
  
  metreChantier   MetreChantier @relation(...)
  lignes          MetreChantierLigne[]
}

model MetreChantierLigne {
  id              String   @id @default(uuid())
  categorieId     String   // Référence à MetreCategorie
  description     String   // Ex: "Salon", "Cuisine", "Salle de bain"
  unite           String   // "m²", "m", "U", etc. (libre)
  longueur        Float?   // en mètres
  largeur         Float?   // en mètres
  hauteur         Float?   // en mètres
  quantite        Float    // Calculé ou saisi manuellement
  notes           String?  @db.Text
  ordre           Int      @default(0)
  createdAt       DateTime @default(now())
  
  categorie       MetreCategorie @relation(...)
}
```

## Interface Mobile : Création/Édition

### Vue d'ensemble avec catégories pliables/dépliables

```
┌─────────────────────────────────────┐
│  ← [Nom du chantier]                │
│  Nouveau métré                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Date : [05/01/2025]  📅            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📋 Catégories                      │
│  ─────────────────────────────────  │
│                                      │
│  ▼ Carrelage sol          [✏️] [🗑️] │
│    ───────────────────────────────  │
│    Unité : [m²]                     │
│                                      │
│    📍 Ligne 1              [🗑️]     │
│    Description : [Salon]            │
│    Longueur : [5.00] m              │
│    Largeur  : [4.00] m              │
│    Quantité : [20.00] m²            │
│    Notes : [Carrelage gris 30x30]   │
│                                      │
│    📍 Ligne 2              [🗑️]     │
│    Description : [Cuisine]           │
│    Longueur : [3.00] m              │
│    Largeur  : [2.50] m              │
│    Quantité : [7.50] m²             │
│    Notes : [Carrelage gris 30x30]   │
│                                      │
│    Total catégorie : 27.50 m²       │
│    [➕ Ajouter une ligne]           │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  ▶ Plinthes                [✏️] [🗑️] │
│    (pliée - 3 lignes)               │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  ▶ Murs                    [✏️] [🗑️] │
│    (pliée - 5 lignes)               │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  [➕ Ajouter une catégorie]         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Commentaire global                 │
│  [Notes générales...           ]    │
│                                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Total général : 85.25 m²           │
│                                      │
│  [💾 Enregistrer]                   │
└─────────────────────────────────────┘
```

### Modal "Ajouter une catégorie"

```
┌─────────────────────────────────────┐
│  Nouvelle catégorie          [✕]    │
├─────────────────────────────────────┤
│                                      │
│  Nom de la catégorie :              │
│  [Carrelage sol            ]        │
│                                      │
│  Unité par défaut :                 │
│  [m²] ▼                             │
│                                      │
│  [✅ Créer]  [❌ Annuler]            │
└─────────────────────────────────────┘
```

### Comportement :

- **Clic sur ▶/▼** : Pliage/dépliage de la catégorie
- **Bouton [✏️]** : Édition du nom de la catégorie
- **Bouton [🗑️]** : Suppression de la catégorie (avec confirmation)
- **Bouton [➕ Ajouter une ligne]** : Ajoute une ligne dans la catégorie dépliée
- **Bouton [➕ Ajouter une catégorie]** : Ouvre le modal pour créer une nouvelle catégorie
- **Total par catégorie** : Somme des quantités de toutes les lignes de la catégorie
- **Total général** : Somme des totaux de toutes les catégories

## Interface Desktop : Onglet Métrés

### Liste des métrés

```
Documents | Photos | Fiches techniques | Métrés
───────────────────────────────────────────────────

┌─────────────────────────────────────────────────┐
│  Métrés du chantier          [+ Nouveau métré] │
├─────────────────────────────────────────────────┤
│                                                  │
│  📋 Métré du 05/01/2025                         │
│     • 3 catégories                              │
│     • 16 lignes au total                        │
│     • 85.25 m² total                            │
│     [👁️ Voir] [✏️ Éditer] [🗑️ Supprimer]      │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  📋 Métré du 10/01/2025                         │
│     • 2 catégories                              │
│     • 8 lignes au total                         │
│     • 28.75 m total                             │
│     [👁️ Voir] [✏️ Éditer] [🗑️ Supprimer]      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Vue détail (Desktop) - Avec catégories pliables

```
┌─────────────────────────────────────────────────┐
│  ← Retour                            [✏️ Éditer] │
│                                                  │
│  Métré du 05/01/2025                            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ▼ Carrelage sol (m²)                          │
│    ┌──────┬──────────┬──────┬──────┬──────────┐│
│    │ Desc │ Longueur │ Larg │ Qte  │ Notes    ││
│    ├──────┼──────────┼──────┼──────┼──────────┤│
│    │Salon │ 5.00 m   │ 4.00 │20.00 │ Gris 30x ││
│    │Cuis. │ 3.00 m   │ 2.50 │ 7.50 │ Gris 30x ││
│    │SdB   │ 2.00 m   │ 1.50 │ 3.00 │ Gris 30x ││
│    └──────┴──────────┴──────┴──────┴──────────┘│
│    Total catégorie : 30.50 m²                  │
│                                                  │
│  ▶ Plinthes (m)                                 │
│    (3 lignes - 15.25 m total)                   │
│                                                  │
│  ▶ Murs (m²)                                    │
│    (5 lignes - 39.50 m² total)                  │
│                                                  │
├─────────────────────────────────────────────────┤
│  Total général : 85.25 m²                       │
│                                                  │
│  Commentaire :                                  │
│  Métré initial du rez-de-chaussée              │
│                                                  │
│  [📄 Exporter PDF] [📊 Exporter Excel]          │
└─────────────────────────────────────────────────┘
```

## Fonctionnalités

### Calculs automatiques :
- Si longueur ET largeur → quantite = longueur × largeur
- Si longueur ET hauteur → quantite = longueur × hauteur
- Sinon → quantite saisie manuellement
- Modifiable manuellement à tout moment

### Gestion des catégories :
- Ajout/suppression de catégories
- Édition du nom de catégorie
- Réorganisation par glisser-déposer (optionnel)
- Unité par catégorie (mais modifiable par ligne si besoin)

### Totalisation :
- Total par catégorie (somme des lignes)
- Total général du métré (somme des catégories)

## Exemple d'utilisation

**Scénario : Métré complet d'un appartement**

1. Créer le métré, date : 05/01/2025
2. Ajouter catégorie "Carrelage sol" (m²)
   - Ligne 1 : Salon, 5m × 4m = 20 m²
   - Ligne 2 : Cuisine, 3m × 2.5m = 7.5 m²
   - Ligne 3 : Salle de bain, 2m × 1.5m = 3 m²
   - Total catégorie : 30.5 m²
3. Ajouter catégorie "Plinthes" (m)
   - Ligne 1 : Salon, 18m
   - Ligne 2 : Cuisine, 8m
   - Ligne 3 : Salle de bain, 6m
   - Total catégorie : 32 m
4. Ajouter catégorie "Murs" (m²)
   - Ligne 1 : Salon, 5m × 2.5m = 12.5 m²
   - Ligne 2 : Cuisine, 3m × 2.5m = 7.5 m²
   - ...
5. Total général : 30.5 m² + 32 m + ... = affiché automatiquement

