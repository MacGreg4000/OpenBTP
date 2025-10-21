# 🔧 Template de configuration - Variables d'environnement

Fichier de référence pour créer votre fichier `.env`.

---

## 📝 Instructions

1. Créer un fichier `.env` à la racine du projet
2. Copier le contenu ci-dessous
3. Remplacer les valeurs par vos paramètres réels
4. **Ne jamais** commiter le fichier `.env` (déjà dans .gitignore)

---

## 📄 Contenu du fichier .env

```env
# ====================================
# BASE DE DONNÉES (OBLIGATOIRE)
# ====================================
DATABASE_URL="mysql://openbtp_user:votre_mot_de_passe@localhost:3306/openbtp"

# ====================================
# AUTHENTIFICATION (OBLIGATOIRE)
# ====================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="changez_moi_par_une_cle_aleatoire_de_32_caracteres_minimum"

# ====================================
# APPLICATION (OBLIGATOIRE)
# ====================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ====================================
# EMAIL (OPTIONNEL)
# ====================================
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="votre.email@example.com"
EMAIL_PASSWORD="votre_mot_de_passe_email"

# ====================================
# PDF SERVICE (OPTIONNEL)
# ====================================
PDF_SERVICE_URL="http://localhost:3001"
PDF_SERVICE_PROVIDER="custom"

# ====================================
# OLLAMA / IA (OPTIONNEL)
# ====================================
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="phi3:mini"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:latest"
```

---

## 🔐 Sécurité

### Générer NEXTAUTH_SECRET

```bash
# Linux/Mac
openssl rand -base64 32

# Ou en Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Variables sensibles

⚠️ **Ne jamais** :
- Commiter le fichier `.env`
- Partager vos secrets
- Utiliser des mots de passe faibles
- Réutiliser les mêmes secrets

✅ **Toujours** :
- Utiliser des secrets différents par environnement
- Changer les secrets régulièrement en production
- Sauvegarder vos secrets de manière sécurisée

---

## 📋 Exemples par environnement

### Développement local

```env
DATABASE_URL="mysql://root:root@localhost:3306/openbtp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev_secret_ne_pas_utiliser_en_production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### NAS Synology (IP locale)

```env
DATABASE_URL="mysql://openbtp:Password123!@localhost:3306/openbtp"
NEXTAUTH_URL="http://192.168.1.100:3000"
NEXTAUTH_SECRET="secret_nas_aleatoire_32_caracteres"
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"
PDF_SERVICE_URL="http://192.168.1.100:3001"
```

### Production (domaine public)

```env
DATABASE_URL="mysql://openbtp:SuperSecurePassword2025!@localhost:3306/openbtp"
NEXTAUTH_URL="https://openbtp.votre-entreprise.com"
NEXTAUTH_SECRET="production_secret_super_securise_aleatoire"
NEXT_PUBLIC_APP_URL="https://openbtp.votre-entreprise.com"
NODE_ENV="production"
```

---

## 🌐 Configuration Email - Fournisseurs courants

### Gmail

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="votre.email@gmail.com"
EMAIL_PASSWORD="votre_mot_de_passe_application"
```

⚠️ **Important** : Utilisez un "mot de passe d'application" Google, pas votre mot de passe Gmail.
Créez-en un sur : https://myaccount.google.com/apppasswords

### Office 365 / Outlook

```env
EMAIL_HOST="smtp.office365.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="votre.email@votreentreprise.com"
EMAIL_PASSWORD="votre_mot_de_passe"
```

### OVH

```env
EMAIL_HOST="ssl0.ovh.net"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="votre.email@votredomaine.com"
EMAIL_PASSWORD="votre_mot_de_passe"
```

### Serveur SMTP personnalisé

```env
EMAIL_HOST="mail.votre-serveur.com"
EMAIL_PORT="587"
EMAIL_SECURE="true"
EMAIL_USER="votre_utilisateur"
EMAIL_PASSWORD="votre_mot_de_passe"
```

---

## ✅ Vérification

Après avoir créé votre fichier `.env` :

```bash
# Vérifier que le fichier existe
ls -la .env

# Tester la connexion DB
npx prisma db pull
```

Si tout est OK, vous pouvez démarrer :

```bash
npm run dev
```

---

**Dernière mise à jour** : Octobre 2025

