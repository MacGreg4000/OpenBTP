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

## Étape 3b — Base de données : nouvelle installation ou migration ?

### Nouvelle installation (base vide)

Ne rien faire. L'application créera automatiquement toutes les tables au premier démarrage.

### Migration depuis une installation existante

Copie ton fichier de sauvegarde SQL dans le dossier `init-db/` :

```bash
cp /chemin/vers/ta/sauvegarde.sql init-db/import.sql
```

C'est tout. Au premier démarrage, MariaDB détectera le fichier et importera automatiquement la base de données. L'application s'adapte ensuite seule selon le cas.

> ⚠️ Ce mécanisme ne fonctionne **qu'au premier démarrage** (volume MariaDB vide).
> Si le volume existe déjà, le dossier `init-db/` est ignoré.

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

### Proxy inversé DSM et assistant IA (Ollama) — éviter le HTTP 504

Le **proxy inversé du DSM** coupe souvent les requêtes au bout d’environ **60 secondes**. Or une question RAG (embeddings + recherche + génération) peut dépasser ce délai : le navigateur affiche alors **504**, alors que Next.js et Ollama sont encore en train de travailler.

**L’interface DSM ne permet pas** de régler ce délai pour une règle précise. Il faut **allonger les timeouts nginx** côté NAS (via SSH, compte administrateur), après **sauvegarde** de tout fichier modifié :

1. Active **SSH** : *Panneau de configuration → Terminal et SNMP*.
2. Connecte-toi en SSH et repère où nginx inclut la config proxy (souvent `include` vers un fichier du type `proxy.conf` sous `/etc/nginx/` ou `/usr/syno/etc/nginx/` — le chemin exact varie selon la **version DSM**).
3. Ajoute (ou complète) des directives du type :

```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

4. Recharge ou redémarre nginx (selon ta version : `sudo nginx -s reload`, `sudo synosystemctl restart nginx`, ou redémarrage du service **Nginx** dans le gestionnaire de paquets / services).

Les mises à jour DSM peuvent **réécraser** certains fichiers : garde une copie de ta modification. En cas de doute, voir les fils Synology Community / SynoForum sur « nginx gateway timeout » et « reverse proxy ».

**Ollama dans un autre conteneur Docker sur le même NAS** : tant que le port **11434** est **publié sur l’hôte** (ex. `-p 11434:11434`), la valeur par défaut du compose OpenBTP convient : `OLLAMA_BASE_URL=http://nas-host:11434` avec `extra_hosts: nas-host:host-gateway` (déjà dans `docker-compose.yml`). Vérifie depuis le conteneur web :  
`docker exec -it openbtp-web wget -qO- --timeout=5 http://nas-host:11434/api/tags`  
Si tu préfères un **réseau Docker partagé** entre OpenBTP et Ollama, tu peux alors utiliser l’URL `http://<nom_du_service_ollama>:11434` et l’indiquer dans `OLLAMA_BASE_URL` (sans passer par l’hôte).

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

La méthode recommandée est décrite à l'**Étape 3b** ci-dessus (dossier `init-db/`).

Si tu as raté cette étape et que les containers tournent déjà, tu peux importer manuellement :

```bash
# 1. Arrêter tout et supprimer le volume de la base
sudo docker compose down -v

# 2. Copier la sauvegarde dans init-db/
cp /chemin/vers/ta/sauvegarde.sql init-db/import.sql

# 3. Relancer — l'import se fait automatiquement
sudo docker compose up -d
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

## Ce qu'il faut sauvegarder

Pour une sauvegarde complète permettant de tout restaurer sur un nouveau serveur :

| Quoi | Chemin sur le NAS | Contenu |
|---|---|---|
| **Base de données** | `./backups/backup_YYYY-MM-DD_*.sql.gz` | Toutes les données (chantiers, clients, devis...) |
| **Fichiers uploadés** | `./uploads/` | Photos de chantier, documents, logos, signatures |
| **Configuration** | `./.env` | Mots de passe, clés secrètes, URLs |

> ⚠️ Ne jamais partager le fichier `.env` — il contient les mots de passe.

### Procédure de sauvegarde manuelle complète

```bash
# 1. Déclencher une sauvegarde BDD immédiate
sudo docker exec openbtp-web node scripts/backup-database.js

# 2. Copier les fichiers importants vers un emplacement sûr
cp -r /volume1/docker/openbtp/uploads/ /volume1/backup/openbtp-uploads/
cp -r /volume1/docker/openbtp/backups/ /volume1/backup/openbtp-backups/
cp /volume1/docker/openbtp/.env /volume1/backup/openbtp.env
```

### Restaurer sur un nouveau serveur

```bash
# 1. Cloner le dépôt
git clone https://github.com/MacGreg4000/OpenBTP.git openbtp
cd openbtp

# 2. Restaurer la configuration
cp /volume1/backup/openbtp.env .env

# 3. Restaurer les fichiers uploadés
cp -r /volume1/backup/openbtp-uploads/ uploads/
mkdir -p backups

# 4. Décompresser la dernière sauvegarde SQL et la placer dans init-db/
gunzip -c /volume1/backup/openbtp-backups/backup_YYYY-MM-DD_*.sql.gz > init-db/import.sql

# 5. Builder et démarrer — tout le reste est automatique
sudo docker compose build
sudo docker compose up -d
```

---

## Structure des fichiers sur le NAS

```
/volume1/docker/openbtp/
├── .env              ← Configuration (ne jamais partager ce fichier)
├── docker-compose.yml
├── Dockerfile
├── init-db/          ← Placer ici le .sql à importer au premier démarrage (laisser vide sinon)
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
