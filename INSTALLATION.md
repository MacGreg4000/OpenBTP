# Guide d'installation OpenBTP

> Application de gestion de chantiers BTP — Next.js + MariaDB via Docker sur NAS Synology

---

## Prérequis

- NAS Synology avec **DSM 7.0** ou supérieur
- Package **Container Manager** installé (via le Centre de paquets DSM)
- Accès **SSH** activé (Panneau de configuration → Terminal et SNMP → Activer le service SSH)
- Un nom de domaine ou une IP fixe pour accéder à l'application

---

## Étape 1 — Se connecter au NAS en SSH

Depuis ton ordinateur (remplace l'IP par celle de ton NAS) :

```bash
ssh ton_utilisateur@192.168.0.XXX
```

---

## Étape 2 — Cloner le dépôt

```bash
cd /volume1/docker
git clone https://github.com/MacGreg4000/OpenBTP.git openbtp
cd openbtp
```

---

## Étape 3 — Créer les dossiers nécessaires

```bash
mkdir -p uploads
mkdir -p backups
```

> **uploads/** : stocke les photos et documents uploadés dans l'application
> **backups/** : stocke les sauvegardes automatiques quotidiennes de la base de données

---

## Étape 4 — Créer le fichier de configuration

```bash
cp .env.docker .env
nano .env
```

Remplis **obligatoirement** ces valeurs (les autres peuvent rester par défaut) :

```env
# Mot de passe administrateur de la base de données
DB_ROOT_PASSWORD=choisis_un_mot_de_passe_root_fort

# Mot de passe utilisateur de la base de données
DB_PASSWORD=choisis_un_mot_de_passe_user_fort

# URL publique de l'application
NEXTAUTH_URL=https://openbtp.mondomaine.synology.me
NEXT_PUBLIC_APP_URL=https://openbtp.mondomaine.synology.me

# Clé secrète — génère une chaîne aléatoire :
# openssl rand -base64 32
NEXTAUTH_SECRET=colle_ici_la_chaine_generee
```

Sauvegarde avec `Ctrl+O` puis quitte avec `Ctrl+X`.

---

## Étape 5 — Builder l'application

```bash
sudo docker compose build
```

> ⏱️ Cette étape prend **10 à 20 minutes** sur un NAS. C'est normal, ne pas interrompre.

---

## Étape 6 — Démarrer les containers

```bash
sudo docker compose up -d
```

Vérifie que les deux containers sont actifs :

```bash
sudo docker compose ps
```

Tu dois voir `openbtp-db` et `openbtp-web` avec le statut **running**.

---

## Étape 7 — Attendre le démarrage complet

Au premier lancement, l'application crée automatiquement toutes les tables de la base de données.
Cela prend **5 à 10 minutes** sur un NAS.

Suis la progression en direct :

```bash
sudo docker logs -f openbtp-web
```

L'application est prête quand tu vois :

```
✓ Ready in XXXX ms
✅ [CRON] Toutes les tâches démarrées
```

Appuie sur `Ctrl+C` pour quitter l'affichage des logs (les containers continuent de tourner).

---

## Étape 8 — Configurer le reverse proxy Synology

Pour accéder à l'application via HTTPS avec ton nom de domaine :

1. Ouvre le **Panneau de configuration** du DSM
2. Va dans **Portail de connexion → Avancé → Proxy inversé**
3. Clique sur **Créer**
4. Remplis les champs :

| Champ | Valeur |
|---|---|
| Nom | OpenBTP |
| Protocole source | HTTPS |
| Nom d'hôte source | `openbtp.mondomaine.synology.me` |
| Port source | 443 |
| Protocole destination | HTTP |
| Nom d'hôte destination | localhost |
| Port destination | **3333** |

5. Clique sur **Enregistrer**

---

## Étape 9 — Accéder à l'application

```
https://openbtp.mondomaine.synology.me
```

Ou en accès local direct (sans reverse proxy) :

```
http://192.168.0.XXX:3333
```

---

## Migration depuis une installation existante (import de base de données)

Si tu as déjà une base de données à récupérer :

```bash
# 1. Démarrer uniquement la base de données
sudo docker compose up -d openbtp-db

# 2. Attendre que MariaDB soit prête (~2 minutes)
#    Répéter jusqu'à voir "healthy" dans la colonne STATUS
sudo docker compose ps

# 3. Importer ta sauvegarde SQL (remplace le mot de passe et le chemin)
sudo docker exec -i openbtp-db mariadb --skip-ssl \
  -u openbtp_user -p"TON_DB_PASSWORD" openbtp \
  < /chemin/vers/ta/sauvegarde.sql

# 4. Démarrer l'application
sudo docker compose up -d openbtp-web

# 5. Suivre les logs
sudo docker logs -f openbtp-web
```

---

## Commandes utiles au quotidien

```bash
# État des containers
sudo docker compose ps

# Logs en direct
sudo docker logs -f openbtp-web

# Redémarrer l'application uniquement
sudo docker compose restart openbtp-web

# Arrêter tout
sudo docker compose down

# Mettre à jour vers une nouvelle version
git pull origin main
sudo docker compose build
sudo docker compose up -d
```

---

## Sauvegardes automatiques

La base de données est sauvegardée **chaque jour à 20h00** automatiquement.

Les fichiers sont stockés dans `./backups/` (compressés en `.sql.gz`) et conservés **30 jours**.

Pour déclencher une sauvegarde manuellement :

```bash
sudo docker exec openbtp-web node scripts/backup-database.js
```

---

## Structure des fichiers sur le NAS

```
/volume1/docker/openbtp/
├── .env              ← Configuration (ne jamais partager ce fichier)
├── docker-compose.yml
├── Dockerfile
├── uploads/          ← Photos, documents, logos uploadés
└── backups/          ← Sauvegardes automatiques de la base de données
```

---

## Dépannage

**Voir les erreurs :**
```bash
sudo docker logs openbtp-db --tail 30
sudo docker logs openbtp-web --tail 50
```

**Le container web ne démarre pas (base de données pas prête) :**
La base de données prend jusqu'à 2 minutes à démarrer au premier lancement. Le container web attend automatiquement qu'elle soit prête.

**Réinitialiser complètement :**
⚠️ Supprime toutes les données — à utiliser uniquement en cas de problème grave :
```bash
sudo docker compose down -v
mkdir -p uploads backups
sudo docker compose up -d
```

**Le port 3333 n'est pas accessible depuis le réseau :**
Vérifie que le pare-feu Synology autorise le port :
Panneau de configuration → Sécurité → Pare-feu → Modifier les règles → Ajouter le port 3333
