# 🔧 Configuration Production - Problèmes de connexion HTTPS

## ⚠️ Problème : Erreur de connexion avec URLs HTTP non sécurisées

Si vous rencontrez des erreurs comme :
- `Failed to fetch RSC payload`
- `The page contains a form which targets an insecure URL http://...`

Cela signifie que `NEXTAUTH_URL` n'est pas correctement configuré en HTTPS.

## ✅ Solution

### 1. Vérifier le fichier `.env` sur votre serveur de production

Sur votre NAS Synology, éditez le fichier `.env` dans le dossier de l'application :

```bash
nano /volume1/docker/openbtp/.env
```

### 2. Configurer `NEXTAUTH_URL` en HTTPS

**IMPORTANT** : Utilisez **TOUJOURS** HTTPS en production, jamais HTTP.

```env
# ❌ INCORRECT (ne fonctionnera pas)
NEXTAUTH_URL="http://openbtp.secotech.synology.me"
NEXTAUTH_URL="http://secotech.synology.me:3000"

# ✅ CORRECT
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
```

### 3. Configuration complète pour production

```env
# ====================================
# BASE DE DONNÉES
# ====================================
DATABASE_URL="mysql://user:password@localhost:3306/openbtp"

# ====================================
# AUTHENTIFICATION (NextAuth) - OBLIGATOIRE
# ====================================
# URL complète en HTTPS (sans port si reverse proxy)
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
NEXTAUTH_SECRET="votre_secret_aleatoire_32_caracteres_minimum"

# ====================================
# APPLICATION
# ====================================
# URL publique de l'application (HTTPS)
NEXT_PUBLIC_APP_URL="https://openbtp.secotech.synology.me"

# ====================================
# ENVIRONNEMENT
# ====================================
NODE_ENV="production"
```

### 4. Redémarrer l'application

Après avoir modifié le `.env` :

```bash
# Arrêter l'application
pm2 stop openbtp

# Redémarrer
pm2 start openbtp

# Ou si vous utilisez npm
npm run build
pm2 restart openbtp
```

### 5. Vérifier la configuration

Vérifiez que les variables sont bien chargées :

```bash
# Dans le terminal du serveur
cd /volume1/docker/openbtp
cat .env | grep NEXTAUTH_URL
```

Vous devriez voir :
```
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
```

## 🔍 Dépannage

### Si le problème persiste :

1. **Vider le cache du navigateur** : Ctrl+Shift+Delete (Chrome/Firefox)
2. **Vérifier les cookies** : Supprimez tous les cookies pour `openbtp.secotech.synology.me`
3. **Vérifier le reverse proxy** : Assurez-vous que votre reverse proxy (Synology) redirige bien vers HTTPS
4. **Vérifier les logs** : 
   ```bash
   pm2 logs openbtp
   ```

### Configuration du reverse proxy Synology

Si vous utilisez le reverse proxy de Synology, assurez-vous que :
- Le schéma est **HTTPS**
- Le port de destination est correct (généralement 3000)
- Les en-têtes sont correctement configurés

## 📝 Notes importantes

- **Ne jamais utiliser HTTP en production** : Les navigateurs modernes bloquent les formulaires HTTP sur des pages HTTPS
- **NEXTAUTH_URL doit correspondre exactement** à l'URL publique de votre application
- **Pas de port dans NEXTAUTH_URL** si vous utilisez un reverse proxy (le port est géré par le proxy)
- **Redémarrer toujours l'application** après modification du `.env`

