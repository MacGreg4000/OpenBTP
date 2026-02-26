# Ouvriers internes vs Magasiniers – Architecture et décisions

## Contexte

OpenBTP gère deux types de personnel interne avec accès portail mobile :
- **Ouvriers internes** : journal de chantier, documents, mètres, etc.
- **Magasiniers** : tâches logistique, journal magasinier.

Historiquement, pour permettre aux magasiniers d'accéder au journal (réutilisant le modèle `JournalOuvrier`), un enregistrement `OuvrierInterne` est créé avec le même `id` que le `Magasinier`. Cela entraîne une **duplication en base** : un magasinier apparaît à la fois dans la table OuvrierInterne et dans Magasinier.

## Problème

Sans traitement, un magasinier apparaît dans **deux listes** de l'interface admin (Ouvriers internes + Magasiniers) et a accès à **deux portails** mobiles distincts, ce qui crée confusion et doublons.

## Décision prise : Option 1 – Masquage côté front-end (2025-01)

**Implémentation** : Dans la page Sous-traitants, les magasiniers sont exclus de l'affichage de la liste « Ouvriers internes ». Seuls les ouvriers internes « purs » (non magasiniers) sont affichés.

**Technique** :
- Variable dérivée `ouvriersInternesAffichables` = `ouvriersInternes.filter(o => !magasiniers.some(m => m.id === o.id))`
- Fichier : `src/app/(dashboard)/sous-traitants/page.tsx`
- Les magasiniers sont gérés uniquement via la section « Magasiniers » (nom, actif, PIN, tâches).

**Conséquences** :
- Un magasinier ne doit être édité que via le modal/section Magasiniers.
- La section Magasiniers doit permettre de modifier toutes les infos nécessaires (nom, contact si pertinent, etc.).

## Alternatives envisagées pour évolution future

### Option 2 : Coche « Est magasinier » sur ouvrier interne
- Ajouter une coche sur chaque ouvrier pour le marquer comme magasinier.
- Une personne = un seul enregistrement OuvrierInterne.
- La liste Magasiniers devient une vue filtrée.
- *Requiert* : migration des données, évolution du schéma (champ `estMagasinier` ou liaison).

### Option 3 : Portail unique avec rôles
- Une seule entité, rôles multiples (ouvrier, magasinier, ou les deux).
- Portail unique qui affiche dynamiquement les sections selon les rôles.
- *Requiert* : refonte du portail et des APIs d'authentification.

### Option 4 : Séparation stricte (pas de doublon en base)
- Un magasinier n'a pas d'OuvrierInterne associé.
- Le journal magasinier repose uniquement sur Magasinier.
- *Requiert* : adapter le journal et les APIs pour gérer les deux types de sujets.

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/app/(dashboard)/sous-traitants/page.tsx` | Filtrage `ouvriersInternesAffichables`, listes Ouvriers / Magasiniers |
| `prisma/schema.prisma` | Modèles OuvrierInterne, Magasinier |
| APIs `ouvriers-internes`, `magasiniers`, `journal/*` | Données et journal |
| Portails `/public/portail/ouvrier/*` et `/public/portail/magasinier/*` | Interfaces mobiles |

## Référence rapide

Pour modifier cette logique à l'avenir :
1. Lire ce document.
2. Choisir une alternative (2, 3 ou 4) selon les besoins métier.
3. Planifier une migration si changement de modèle de données.
4. Mettre à jour ce document après implémentation.
