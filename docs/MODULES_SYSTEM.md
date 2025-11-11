# 📦 Système de Modules Activables/Désactivables

## Vue d'ensemble

OpenBTP intègre un système de modules inspiré de Dolibarr et Odoo, permettant d'activer ou de désactiver des fonctionnalités selon les besoins de l'entreprise.

## 🎯 Fonctionnalités principales

- ✅ **17 modules prédéfinis** couvrant tous les aspects de l'application
- 🔐 **Gestion par les administrateurs** uniquement
- 🚫 **Modules système protégés** (Dashboard, Chantiers)
- 💾 **Cache intelligent** (localStorage, TTL 5 minutes)
- 🔄 **Mise à jour en temps réel** de l'interface
- 📊 **Catégorisation** des modules (Système, Commercial, Logistique, etc.)

---

## 📋 Liste des modules

### Modules Système (obligatoires)
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `dashboard` | Dashboard | Page d'accueil avec statistiques | ❌ Non |
| `chantiers` | Chantiers | Gestion des chantiers et états d'avancement | ❌ Non |

### Modules Commercial
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `clients` | Clients | Gestion de la base clients | ✅ Oui |
| `sous_traitants` | Sous-traitants | Gestion des sous-traitants et ouvriers | ✅ Oui |
| `sav` | SAV | Service après-vente et tickets | ✅ Oui |
| `metres` | Métrés soumis | Gestion des métrés et devis | ✅ Oui |
| `choix_clients` | Choix client | Gestion des choix et sélections clients | ✅ Oui |

### Modules Logistique
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `inventory` | Inventaire | Gestion des matériaux, racks et équipements | ✅ Oui |
| `outillage` | Outillage | Gestion des machines et prêts d'outillage | ✅ Oui |
| `planning_chargements` | Planification chargements | Gestion des planifications de chargements | ✅ Oui |

### Modules Organisation
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `planning` | Planning | Planning des chantiers et ressources | ✅ Oui |

### Modules Administratif
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `documents` | Documents administratifs | Gestion des documents et administratif | ✅ Oui |
| `bons_regie` | Bons de régie | Gestion des bons de régie | ✅ Oui |
| `journal` | Journal | Journal d'activité et historique | ✅ Oui |

### Modules Communication
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `messagerie` | Messagerie | Chat et messagerie entre utilisateurs | ✅ Oui |
| `chat` | Assistant IA | Chatbot intelligent avec RAG | ✅ Oui |

### Modules Système (optionnels)
| Code | Nom | Description | Désactivable |
|------|-----|-------------|--------------|
| `notifications` | Notifications | Système de notifications email et in-app | ✅ Oui |

---

## 🏗️ Architecture technique

### Structure de la base de données

```sql
CREATE TABLE feature_modules (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(255) DEFAULT 'general',
  icon VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  isSystem BOOLEAN DEFAULT FALSE,
  dependencies TEXT,
  ordre INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Composants principaux

```
src/
├── hooks/
│   └── useFeatures.tsx          # Hook React pour accéder aux modules
├── app/
│   ├── api/modules/
│   │   └── route.ts             # API REST pour gérer les modules
│   └── (dashboard)/admin/modules/
│       └── page.tsx             # Interface d'administration
├── components/
│   ├── Navbar.tsx               # Filtrage automatique des liens
│   └── providers/
│       ├── RootClientProviders.tsx  # Provider racine
│       └── ChatProvider.tsx     # Provider conditionnel du chat
└── middleware.ts                # (Auth uniquement, pas de vérification modules)
```

---

## 🔐 Sécurité

### Niveaux de protection

1. **Frontend (UI)** : Les liens n'apparaissent pas dans la navbar
2. **API** : Seuls les admins peuvent modifier les modules
3. **Base de données** : Les modules système ont `isSystem = true`

### Permissions

```typescript
// Lecture : Tous les utilisateurs authentifiés
GET /api/modules?activeOnly=true

// Modification : Admins uniquement
PATCH /api/modules
Body: { code: "inventory", isActive: false }
```

---

## 💻 Utilisation dans le code

### Hook `useFeatures()`

```typescript
import { useFeatures } from '@/hooks/useFeatures'

function MonComposant() {
  const { isEnabled, modules, loading, refresh } = useFeatures()
  
  // Vérifier si un module est actif
  if (isEnabled('inventory')) {
    return <LienInventaire />
  }
  
  // Accéder à la liste complète
  console.log(modules) // Array de tous les modules actifs
  
  // Rafraîchir manuellement
  await refresh()
  
  return null
}
```

### Conditionner un lien dans la navbar

```typescript
const navigationItems = [
  { name: 'Inventaire', href: '/inventory', moduleCode: 'inventory' },
  { name: 'Outillage', href: '/outillage', moduleCode: 'outillage' },
]

// Filtrage automatique
const filteredItems = navigationItems.filter(item => isEnabled(item.moduleCode))
```

### Masquer un composant entier

```typescript
import { useFeatures } from '@/hooks/useFeatures'

export default function ChatSystemProvider() {
  const { isEnabled } = useFeatures()
  
  if (!isEnabled('messagerie') && !isEnabled('chat')) {
    return null // Masquer complètement le chat
  }
  
  return <ChatSystem />
}
```

---

## 🎨 Interface d'administration

### Accès
- **URL** : `/admin/modules`
- **Permissions** : Administrateurs uniquement
- **Menu** : Avatar → Modules

### Fonctionnalités
- ✅ Vue par catégorie avec couleurs distinctives
- ✅ Toggles interactifs pour activer/désactiver
- ✅ Badge "Système" pour les modules non désactivables
- ✅ Icônes dynamiques (Heroicons)
- ✅ Messages de confirmation
- ✅ Bouton d'actualisation

### Actions disponibles
- **Activer un module** : Toggle → ON (vert)
- **Désactiver un module** : Toggle → OFF (gris)
- **Actualiser** : Bouton en haut à droite

---

## ⚙️ Configuration et cache

### Cache localStorage

Le système utilise un cache intelligent pour optimiser les performances :

```javascript
// Clé : 'features_cache'
// TTL : 5 minutes
// Format : JSON array des modules actifs

localStorage.setItem('features_cache', JSON.stringify(modules))
localStorage.setItem('features_cache_time', Date.now().toString())
```

### Invalidation du cache

Le cache est automatiquement invalidé lors :
- De la modification d'un module (admin)
- D'un rafraîchissement manuel
- Après 5 minutes (TTL expiré)

### Forcer le rafraîchissement

```typescript
const { refresh } = useFeatures()
await refresh() // Vide le cache et recharge depuis l'API
```

---

## 🔄 Flux de données

```
┌─────────────────┐
│  Admin modifie  │
│   un module     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API PATCH      │
│  /api/modules   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Base de        │
│  données        │
│  (MySQL)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  refresh()      │
│  appelé         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cache invalidé │
│  + reload API   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Navbar se      │
│  met à jour     │
│  automatiquement│
└─────────────────┘
```

---

## 🐛 Dépannage

### Les modules ne se mettent pas à jour

**Problème** : Après modification, les liens restent visibles/invisibles

**Solutions** :
1. Attendre 5 minutes (expiration du cache)
2. Vider le cache du navigateur (F12 → Application → LocalStorage → Supprimer `features_cache`)
3. Recharger la page (F5)
4. Vérifier que le seed a été exécuté

### Le bouton de chat reste visible

**Problème** : Le chat flottant apparaît même après désactivation

**Vérifications** :
1. Vérifier que TOUS les modules de communication sont désactivés (`messagerie` ET `chat`)
2. Le chat apparaît si au moins UN des deux est actif
3. Rafraîchir la page après modification

### Module "introuvable" lors de l'activation

**Problème** : Erreur 404 lors du toggle

**Cause** : Le module n'existe pas en base de données

**Solution** : Exécuter le seed
```bash
npx tsx prisma/seed.ts
```

---

## 📝 Bonnes pratiques

### ✅ À faire

- Tester l'impact avant de désactiver un module en production
- Documenter les modules désactivés pour votre équipe
- Garder une trace des configurations par environnement
- Exécuter le seed après chaque changement de schéma

### ❌ À éviter

- Ne jamais modifier directement `isSystem = true` en base
- Ne pas désactiver les modules système (Dashboard, Chantiers)
- Ne pas bypasser l'API pour modifier les modules
- Ne pas oublier d'exécuter le seed sur les nouveaux environnements

---

## 🔮 Évolutions futures possibles

- [ ] Gestion des dépendances entre modules
- [ ] Permissions par rôle utilisateur
- [ ] Analytics d'utilisation par module
- [ ] Modules custom/plugins tiers
- [ ] Import/Export de configurations
- [ ] Historique des activations/désactivations
- [ ] Planification des activations (dates)
- [ ] Module marketplace

---

## 📚 Voir aussi

- [Guide d'installation](./INSTALLATION.md)
- [Guide de déploiement](./DEPLOYMENT.md)
- [API Documentation](./API.md)

