# 🔍 Diagnostic NAS - Erreur 502 Bad Gateway

## ⚠️ Problème identifié

Le `curl` retourne une **erreur 502 Bad Gateway**, ce qui signifie que le reverse proxy Synology ne peut pas atteindre l'application Next.js.

## ✅ Actions à effectuer sur le NAS

### 1. Vérifier que l'application est démarrée

```bash
# Si vous utilisez PM2
pm2 status
pm2 logs openbtp --lines 50

# Si vous utilisez Docker
docker ps | grep openbtp
docker logs openbtp --tail 50

# Si vous utilisez npm/node directement
ps aux | grep node
```

### 2. Vérifier que l'application écoute sur le port 3000

```bash
# Vérifier les ports ouverts
netstat -tuln | grep 3000
# ou
ss -tuln | grep 3000

# Tester la connexion locale
curl http://localhost:3000/api/auth/test-session
```

**Si ça ne fonctionne pas localement**, l'application n'est pas démarrée ou n'écoute pas sur le bon port.

### 3. Corriger NODE_ENV dans le .env

Votre `.env` a `NODE_ENV` commenté. Il faut le définir :

```bash
# Éditer le .env
nano /volume1/docker/openbtp/.env

# Décommenter et corriger :
NODE_ENV="production"
```

### 4. Vérifier la configuration du reverse proxy Synology

Dans DSM (interface web) :

1. **Panneau de configuration** → **Application Portal** → **Reverse Proxy**
2. Vérifier la règle pour `openbtp.secotech.synology.me` :
   - **Schéma** : HTTPS
   - **Hôte de destination** : `localhost` (ou `127.0.0.1`)
   - **Port** : `3000` (ou le port où votre app tourne)
   - **Headers personnalisés** : Ajouter ces headers si absents :
     ```
     X-Forwarded-Host: $host
     X-Forwarded-Proto: https
     X-Forwarded-For: $remote_addr
     ```

### 5. Redémarrer l'application

```bash
# Si PM2
pm2 restart openbtp

# Si Docker
docker restart openbtp

# Attendre quelques secondes puis vérifier
pm2 status
# ou
docker ps | grep openbtp
```

### 6. Tester à nouveau

```bash
# Tester localement d'abord
curl http://localhost:3000/api/auth/test-session

# Si ça fonctionne localement, tester via le reverse proxy
curl -v https://openbtp.secotech.synology.me/api/auth/test-session
```

## 🔧 Si l'application ne démarre pas

### Vérifier les logs d'erreur

```bash
# PM2
pm2 logs openbtp --err --lines 100

# Docker
docker logs openbtp --tail 100
```

### Vérifier les dépendances

```bash
cd /volume1/docker/openbtp
npm install
npm run build
```

### Vérifier les permissions

```bash
# Vérifier que le dossier est accessible
ls -la /volume1/docker/openbtp

# Vérifier les permissions
chmod -R 755 /volume1/docker/openbtp
```

## 📝 Checklist complète

- [ ] Application démarrée (PM2/Docker/processus)
- [ ] Application écoute sur port 3000 (ou port configuré)
- [ ] `NODE_ENV="production"` dans `.env` (non commenté)
- [ ] Reverse proxy configuré avec bon port de destination
- [ ] Headers `X-Forwarded-*` configurés dans reverse proxy
- [ ] Test local fonctionne : `curl http://localhost:3000/api/auth/test-session`
- [ ] Test via reverse proxy fonctionne : `curl https://openbtp.secotech.synology.me/api/auth/test-session`

