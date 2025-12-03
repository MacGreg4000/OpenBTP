# 🔧 Configuration NEXTAUTH_URL - Guide selon votre accès

## ⚠️ Important

**Vous ne pouvez avoir qu'UNE SEULE `NEXTAUTH_URL` dans votre fichier `.env`.**

Cette variable doit correspondre **exactement** à l'URL que vous utilisez dans votre navigateur pour accéder à l'application.

---

## 📋 Scénarios de configuration

### 1️⃣ Accès via IP locale (HTTP) - Reverse proxy désactivé

Si vous accédez à l'application via l'IP locale de votre NAS (ex: `http://192.168.1.100:3000`) :

```env
NEXTAUTH_URL="http://192.168.1.100:3000"
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"
```

**Remplacez `192.168.1.100` par l'IP réelle de votre NAS.**

---

### 2️⃣ Accès via reverse proxy (HTTPS) - Recommandé pour production

Si vous accédez via un domaine avec reverse proxy (ex: `https://openbtp.secotech.synology.me`) :

```env
NEXTAUTH_URL="https://openbtp.secotech.synology.me"
NEXT_PUBLIC_APP_URL="https://openbtp.secotech.synology.me"
```

**⚠️ Important** : 
- Pas de port dans l'URL si vous utilisez un reverse proxy
- Toujours utiliser `https://` (pas `http://`)

---

### 3️⃣ Accès direct au port (HTTPS)

Si vous accédez directement au port avec HTTPS (ex: `https://secotech.synology.me:3000`) :

```env
NEXTAUTH_URL="https://secotech.synology.me:3000"
NEXT_PUBLIC_APP_URL="https://secotech.synology.me:3000"
```

---

## 🔄 Changer de configuration

Si vous devez changer entre IP locale et reverse proxy :

1. **Éditez le fichier `.env`** sur votre NAS
2. **Modifiez `NEXTAUTH_URL`** pour correspondre à votre méthode d'accès
3. **Redémarrez l'application** pour que les changements prennent effet

---

## ✅ Vérification

Pour vérifier que votre configuration est correcte :

1. **Ouvrez votre navigateur** et allez sur votre application
2. **Regardez l'URL dans la barre d'adresse**
3. **Vérifiez que `NEXTAUTH_URL` correspond exactement** à cette URL (protocole, domaine/IP, et port si présent)

**Exemple** :
- URL dans le navigateur : `http://192.168.1.100:3000`
- `NEXTAUTH_URL` doit être : `http://192.168.1.100:3000` ✅

---

## 🐛 Problèmes courants

### ❌ Erreur : "Impossible de valider la session"

**Cause** : `NEXTAUTH_URL` ne correspond pas à l'URL utilisée dans le navigateur.

**Solution** : Vérifiez que `NEXTAUTH_URL` correspond exactement à l'URL de votre navigateur.

### ❌ Les cookies ne sont pas créés

**Cause** : 
- `NEXTAUTH_URL` est en HTTPS mais vous accédez via HTTP (ou vice versa)
- Le cookie `secure` ne peut pas être défini en HTTP

**Solution** : Assurez-vous que le protocole (http/https) de `NEXTAUTH_URL` correspond à celui de votre navigateur.

### ❌ Redirection vers /login en boucle

**Cause** : Le middleware ne trouve pas le token JWT car les cookies ne sont pas créés.

**Solution** : 
1. Vérifiez que `NEXTAUTH_SECRET` est bien défini
2. Vérifiez que `NEXTAUTH_URL` correspond à l'URL du navigateur
3. Vérifiez les logs serveur pour voir si les cookies sont créés

---

## 📝 Configuration complète recommandée (IP locale)

Si vous utilisez l'IP locale pour l'instant :

```env
# ====================================
# BASE DE DONNÉES
# ====================================
DATABASE_URL="mysql://user:password@localhost:3306/openbtp"

# ====================================
# AUTHENTIFICATION (NextAuth) - OBLIGATOIRE
# ====================================
# Remplacez 192.168.1.100 par l'IP réelle de votre NAS
NEXTAUTH_URL="http://192.168.1.100:3000"
NEXTAUTH_SECRET="KIZ7iC1gWHrq99cRj6jpY3rFaksqWlc25Wvo1L8haUQ="

# ====================================
# APPLICATION
# ====================================
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"

# ====================================
# ENVIRONNEMENT
# ====================================
NODE_ENV="production"
```

---

## 🔐 Sécurité

⚠️ **Important** :
- En production avec reverse proxy, utilisez **TOUJOURS HTTPS**
- Ne partagez jamais votre `NEXTAUTH_SECRET`
- Utilisez des secrets différents pour chaque environnement

---

**Dernière mise à jour** : Janvier 2025

