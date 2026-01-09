# 🔧 Auto-initialisation des Modules

## Vue d'ensemble

Le système de modules d'OpenBTP est maintenant **initialisé automatiquement** lors de la première installation de l'application. Plus besoin de lancer manuellement le seed !

---

## ✅ Fonctionnement automatique

### 1️⃣ **Premier démarrage (page `/setup`)**

Lors de la configuration initiale de l'application (création du compte admin et des infos entreprise), les **18 modules** sont automatiquement créés et activés.

**Workflow :**
```
Utilisateur remplit /setup
    ↓
API crée l'admin et l'entreprise
    ↓
🎉 Initialisation automatique des modules
    ↓
Redirection vers /login
    ↓
Menu navbar complet visible
```

### 2️⃣ **Modules initialisés par défaut**

| Code | Nom | Catégorie | Actif |
|------|-----|-----------|-------|
| `dashboard` | Dashboard | Système | ✅ |
| `chantiers` | Chantiers | Système | ✅ |
| `clients` | Clients | Commercial | ✅ |
| `devis` | Devis | Commercial | ✅ |
| `sous_traitants` | Sous-traitants | Commercial | ✅ |
| `inventory` | Inventaire | Logistique | ✅ |
| `outillage` | Outillage | Logistique | ✅ |
| `planning` | Planning | Organisation | ✅ |
| `planning_chargements` | Planification chargements | Logistique | ✅ |
| `journal` | Journal | Organisation | ✅ |
| `documents` | Documents administratifs | Gestion | ✅ |
| `bons_regie` | Bons de régie | Gestion | ✅ |
| `sav` | SAV | Commercial | ✅ |
| `metres` | Métrés soumis | Commercial | ✅ |
| `choix_clients` | Choix client | Commercial | ✅ |
| `factures` | Factures | Gestion | ✅ |
| `messagerie` | Messagerie | Communication | ✅ |
| `chat` | Assistant IA | IA | ✅ |
| `notifications` | Notifications | Système | ✅ |

---

## 🛠️ Commandes manuelles (optionnel)

### Vérifier le statut des modules
```bash
curl http://localhost:3000/api/modules/init
```

**Réponse :**
```json
{
  "total": 18,
  "active": 18,
  "needsInit": false
}
```

### Réinitialiser les modules manuellement
```bash
curl -X POST http://localhost:3000/api/modules/init \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Seed Prisma (méthode classique)
```bash
npx tsx prisma/seed.ts
```

---

## 🔑 Sécurité

- **API `/api/modules/init`** : Accessible uniquement aux **ADMIN**
- Vérification de session NextAuth obligatoire
- Upsert utilisé (pas de duplication si relancé)

---

## 🚀 Avantages

### ✅ **Avant** (manuel)
1. Installer l'application
2. Configurer `/setup`
3. **Oublier de lancer le seed** 😰
4. Menu navbar vide
5. Lancer manuellement `npx tsx prisma/seed.ts`
6. Rafraîchir la page

### ✅ **Maintenant** (automatique)
1. Installer l'application
2. Configurer `/setup`
3. **Modules auto-initialisés** 🎉
4. Menu navbar complet directement

---

## 📝 Fichiers modifiés

### API Setup
- **`src/app/api/setup/route.ts`**
  - Ajout de la fonction `initializeFeatureModules()`
  - Appel automatique lors du POST de setup

### Nouvelle API
- **`src/app/api/modules/init/route.ts`**
  - GET : Vérifier le statut des modules
  - POST : Réinitialiser les modules (admin uniquement)

### Seed Prisma (conservé)
- **`prisma/seed.ts`**
  - Toujours fonctionnel pour les installations via CLI
  - Utilisé en développement

---

## 🧪 Test

### Tester l'auto-initialisation

1. **Réinitialiser la BDD** (dev uniquement) :
   ```bash
   npx prisma migrate reset --force
   ```

2. **Démarrer l'application** :
   ```bash
   npm run dev
   ```

3. **Accéder à** http://localhost:3000

4. **Remplir `/setup`** (redirection automatique)

5. **Se connecter** → Menu navbar complet visible ✅

---

## 📚 Documentation liée

- [MODULES_SYSTEM.md](docs/MODULES_SYSTEM.md) - Documentation complète du système de modules
- [INSTALLATION.md](INSTALLATION.md) - Guide d'installation complet
- [DEMARRAGE_RAPIDE.md](DEMARRAGE_RAPIDE.md) - Démarrage rapide en 5 minutes

---

## 🐛 Dépannage

### Menu navbar vide après setup

**Cause** : Modules non initialisés

**Solution 1** : Lancer l'API manuelle
```bash
# Se connecter en tant qu'admin puis :
curl -X POST http://localhost:3000/api/modules/init
```

**Solution 2** : Seed Prisma
```bash
npx tsx prisma/seed.ts
```

**Solution 3** : Rafraîchir le cache
```bash
# Dans la console du navigateur
localStorage.clear()
location.reload()
```

---

## 🎯 Conclusion

Plus besoin de se soucier de l'initialisation des modules ! Le système est maintenant **100% automatique** et **plug-and-play**. 🚀
