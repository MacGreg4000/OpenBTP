# Dossier d'initialisation de la base de données

## Comment ça fonctionne

Au premier démarrage (volume MariaDB vide), tout fichier `.sql` présent dans ce dossier
est automatiquement importé dans la base de données.

## Cas 1 — Nouvelle installation (base vide)

Laisser ce dossier **vide**.
L'application créera automatiquement toutes les tables via les migrations Prisma.

## Cas 2 — Migration depuis une installation existante

Copier ton fichier de sauvegarde SQL dans ce dossier :

```bash
cp /chemin/vers/ta/sauvegarde.sql /volume1/docker/openbtp/init-db/import.sql
```

Au démarrage, MariaDB importera automatiquement le fichier, puis l'application
détectera la base existante et appliquera uniquement les migrations manquantes.

## Important

- Ce mécanisme ne s'exécute qu'**une seule fois** (au premier démarrage avec volume vide)
- Si le volume MariaDB existe déjà, ce dossier est ignoré
- Après import réussi, tu peux supprimer le fichier `.sql` pour libérer de l'espace
- Ne pas mettre plusieurs fichiers `.sql` — un seul suffit
