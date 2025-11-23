# 🔧 Correction de la configuration .env pour la production

## ⚠️ Problème identifié

Votre fichier `.env` contient :
```env
NEXTAUTH_URL="https://secotech.synology.me:3000"
NEXT_PUBLIC_APP_URL="https://secotech.synology.me:3000"
```

## ✅ Solution selon votre configuration

### Option 1 : Si vous utilisez un reverse proxy (recommandé)

Si votre application est accessible via `https://openbtp.secotech.synology.me` (sans port), alors :

```env
# NextAuth
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Configuration de l'application
NEXT_PUBLIC_APP_URL="https://openbtp.secotech.synology.me"

# IMPORTANT : Pas de port dans l'URL si vous utilisez un reverse proxy
```

### Option 2 : Si vous accédez directement au port 3000

Si vous accédez directement via `https://secotech.synology.me:3000`, alors :

```env
# NextAuth
NEXTAUTH_URL="https://secotech.synology.me:3000"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Configuration de l'application
NEXT_PUBLIC_APP_URL="https://secotech.synology.me:3000"
```

## 🔍 Comment déterminer quelle URL utiliser ?

1. **Ouvrez votre navigateur** et allez sur votre application
2. **Regardez l'URL dans la barre d'adresse** :
   - Si c'est `https://openbtp.secotech.synology.me` → Utilisez **Option 1** (sans port)
   - Si c'est `https://secotech.synology.me:3000` → Utilisez **Option 2** (avec port)

## ⚠️ Règles importantes

1. **NEXTAUTH_URL doit correspondre EXACTEMENT** à l'URL que vous voyez dans votre navigateur
2. **Si vous utilisez un reverse proxy**, n'incluez PAS le port dans l'URL
3. **Si vous accédez directement au port**, incluez le port dans l'URL
4. **TOUJOURS utiliser HTTPS** en production, jamais HTTP

## 📝 Configuration complète recommandée (avec reverse proxy)

```env
# ====================================
# BASE DE DONNÉES
# ====================================
DATABASE_URL="mysql://user:password@localhost:3306/openbtp"

# ====================================
# AUTHENTIFICATION (NextAuth) - OBLIGATOIRE
# ====================================
# URL complète en HTTPS (SANS PORT si reverse proxy)
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# ====================================
# APPLICATION
# ====================================
# URL publique de l'application (HTTPS, SANS PORT si reverse proxy)
NEXT_PUBLIC_APP_URL="https://openbtp.secotech.synology.me"

# ====================================
# ENVIRONNEMENT
# ====================================
NODE_ENV="production"

# ====================================
# API PUPPETEER
# ====================================
PDF_SERVICE_URL="http://localhost:3001"
PDF_SERVICE_PROVIDER="browserless"

# ====================================
# OLLAMA / IA (OPTIONNEL)
# ====================================
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:latest"

# ====================================
# LOGGING
# ====================================
LOG_LEVEL="info"
```

## 🔄 Après modification

1. **Éditez le fichier `.env`** sur votre serveur
2. **Redémarrez l'application** :
   ```bash
   pm2 restart openbtp
   # ou
   npm run build && pm2 restart openbtp
   ```
3. **Videz le cache du navigateur** (Ctrl+Shift+Delete)
4. **Supprimez les cookies** pour votre domaine
5. **Reconnectez-vous**

## 🐛 Dépannage

Si le problème persiste après avoir corrigé l'URL :

1. **Vérifiez les logs** :
   ```bash
   pm2 logs openbtp
   ```

2. **Vérifiez que NEXTAUTH_URL est bien chargé** :
   ```bash
   # Dans les logs, vous devriez voir l'URL utilisée
   ```

3. **Vérifiez la configuration du reverse proxy** :
   - Assurez-vous que les headers `X-Forwarded-Host` et `X-Forwarded-Proto` sont correctement configurés
   - Le reverse proxy doit transmettre `X-Forwarded-Proto: https`

