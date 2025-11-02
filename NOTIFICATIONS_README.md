# 🔔 Système de Notifications - Guide Complet

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation et Configuration](#installation-et-configuration)
3. [Utilisation](#utilisation)
4. [Types de notifications](#types-de-notifications)
5. [Configuration utilisateur](#configuration-utilisateur)
6. [Intégration dans le code](#intégration-dans-le-code)
7. [Tâches cron](#tâches-cron)

---

## 🎯 Vue d'ensemble

Le système de notifications permet d'envoyer des alertes aux utilisateurs via deux canaux :

- **📧 Email** : Envoi d'emails formatés via le système d'emailing existant
- **📱 In-App** : Notifications dans l'application avec badge dans la navbar (comme les réseaux sociaux)

### Caractéristiques principales

- ✅ 61 types de notifications prédéfinis et extensibles
- ✅ Configuration granulaire par utilisateur et par type
- ✅ Templates personnalisables (email et in-app)
- ✅ Rôles par défaut configurables
- ✅ Rétention de 30 jours pour les notifications in-app
- ✅ Interface utilisateur moderne avec cloche animée
- ✅ Page de configuration complète avec filtres et recherche

---

## 🚀 Installation et Configuration

### 1. Migration de la base de données

```bash
# Générer et appliquer les migrations Prisma
npx prisma generate
npx prisma migrate dev --name add_notifications
```

### 2. Seeder les types de notifications

Appeler l'endpoint de seed (en tant qu'ADMIN) :

```bash
# Via curl
curl -X POST http://localhost:3000/api/notifications/seed \
  -H "Cookie: your-auth-cookie"

# Ou via l'interface (une fois connecté en ADMIN)
# Accédez à : POST /api/notifications/seed
```

Cela créera automatiquement les 61 types de notifications prédéfinis.

### 3. Configuration du cron de nettoyage (optionnel)

Pour nettoyer automatiquement les notifications expirées, configurez un cron externe :

**Option A : Service cron externe (cron-job.org, EasyCron, etc.)**

```
URL: https://votre-domaine.com/api/notifications/cleanup
Méthode: POST ou GET
Header: Authorization: Bearer VOTRE_CRON_SECRET
Fréquence: Quotidienne (ex: tous les jours à 3h du matin)
```

**Option B : Variable d'environnement**

Ajoutez dans votre `.env` :

```env
CRON_SECRET=votre-secret-securise-ici
```

---

## 💡 Utilisation

### Dans l'interface utilisateur

#### 1. Voir les notifications

- Cliquez sur l'icône 🔔 dans la navbar
- Un badge rouge indique le nombre de notifications non lues
- Le dropdown affiche les 10 dernières notifications

#### 2. Marquer comme lu

- Cliquez sur une notification pour la marquer automatiquement comme lue
- Ou cliquez sur le bouton ✓ à droite de chaque notification
- Ou cliquez sur "Tout marquer lu" en haut du dropdown

#### 3. Configurer ses préférences

1. Cliquez sur "Gérer les notifications" en bas du dropdown
2. Ou allez dans **Configuration > Gestion des notifications**
3. Utilisez les filtres et la recherche pour trouver des types spécifiques
4. Toggle les colonnes "Email" et "In-App" pour activer/désactiver
5. Cliquez sur "Sauvegarder les modifications"

#### 4. Configuration pour d'autres utilisateurs (ADMIN uniquement)

Les administrateurs peuvent configurer les notifications pour n'importe quel utilisateur via le sélecteur en haut de la page de configuration.

---

## 📬 Types de notifications

### Catégories disponibles

| Catégorie | Icône | Description |
|-----------|-------|-------------|
| CHANTIER | 🏗️ | Événements liés aux chantiers |
| METRE | 📊 | Métrés sous-traitants |
| RECEPTION | ✅ | Réceptions et remarques |
| DOCUMENT | 📄 | Documents et expirations |
| SAV | 🔧 | Tickets et interventions SAV |
| PLANNING | 📅 | Tâches et planning |
| COMMANDE | 🛒 | Commandes et états |
| SOUS_TRAITANT | 👷 | Contrats et sous-traitants |
| ADMINISTRATIF | 📋 | Bons de régie, etc. |
| SYSTEME | ⚙️ | Erreurs et système |

### Exemples de types de notifications

```typescript
// Chantiers
CHANTIER_CREE          // "Nouveau chantier créé : [NOM] par [USER]"
CHANTIER_DEMARRE       // "Le chantier [NOM] a démarré le [DATE]"
CHANTIER_TERMINE       // "Le chantier [NOM] est terminé"

// Métrés
METRE_SOUMIS          // "[SST] a soumis un métré pour [CHANTIER]"
METRE_VALIDE          // "Votre métré pour [CHANTIER] a été validé"
METRE_REJETE          // "Votre métré pour [CHANTIER] a été rejeté"

// Réceptions
RECEPTION_CREEE       // "Réception créée pour [CHANTIER] - Deadline : [DATE]"
RECEPTION_DEADLINE_7J // "⏰ Réception [CHANTIER] - Deadline dans 7 jours"
REMARQUE_CREEE        // "Nouvelle remarque sur [CHANTIER]"
REMARQUE_RESOLUE      // "✅ Remarque résolue sur [CHANTIER]"

// SAV
SAV_TICKET_CREE       // "🔧 Nouveau ticket SAV [NUM] : [TITRE]"
SAV_TICKET_ASSIGNE    // "Ticket SAV [NUM] vous a été assigné"

// Documents
DOCUMENT_UPLOAD       // "Nouveau document [NOM] ajouté sur [CHANTIER]"
DOCUMENT_EXPIRE       // "⚠️ Document [NOM] expiré"

// ... voir le fichier seed pour la liste complète
```

---

## ⚙️ Configuration utilisateur

### Configurations par défaut selon le rôle

| Rôle | Email | In-App | Description |
|------|-------|--------|-------------|
| ADMIN | ✅ | ✅ | Reçoit tout |
| MANAGER | ✅ | ✅ | Reçoit tout sauf SYSTEME |
| USER | ❌ | ✅ | In-app uniquement, notifications ciblées |
| BOT | ❌ | ❌ | Pas de notifications |

Les utilisateurs peuvent personnaliser leurs préférences via l'interface de configuration.

---

## 👨‍💻 Intégration dans le code

### Import

```typescript
import { notifier } from '@/lib/services/notificationService'
```

### Utilisation basique

```typescript
// Exemple 1 : Notifier les ADMIN et MANAGER
await notifier({
  code: 'METRE_SOUMIS',
  rolesDestinataires: ['ADMIN', 'MANAGER'],
  metadata: {
    chantierId: 'CH-001',
    chantierNom: 'Construction Maison Dupont',
    soustraitantNom: 'Entreprise Martin',
  },
})
```

### Notifier des utilisateurs spécifiques

```typescript
// Exemple 2 : Notifier un utilisateur spécifique
await notifier({
  code: 'SAV_TICKET_ASSIGNE',
  destinataires: [technicienId], // ID de l'utilisateur
  metadata: {
    ticketNum: 'SAV-2025-0042',
    titre: 'Fuite dans la salle de bain',
  },
})
```

### Notifier avec exclusions

```typescript
// Exemple 3 : Notifier tout le monde sauf le créateur
await notifier({
  code: 'CHANTIER_MODIFIE',
  rolesDestinataires: ['ADMIN', 'MANAGER'],
  exclusions: [session.user.id], // Exclure l'utilisateur actuel
  metadata: {
    chantierNom: 'Projet ABC',
    userName: session.user.name,
  },
})
```

### Variables dans les templates

Les variables entre `[CROCHETS]` dans les templates sont automatiquement remplacées par les valeurs de `metadata` :

```typescript
// Template : "[SOUSTRAITANT_NOM] a soumis un métré pour [CHANTIER_NOM]"

await notifier({
  code: 'METRE_SOUMIS',
  metadata: {
    soustraitantNom: 'Entreprise Martin', // Remplace [SOUSTRAITANT_NOM]
    chantierNom: 'Villa Dupont',          // Remplace [CHANTIER_NOM]
  },
})

// Résultat : "Entreprise Martin a soumis un métré pour Villa Dupont"
```

### Exemples concrets d'intégration

#### 1. Métré soumis

```typescript
// Dans /api/public/portail/[type]/[actorId]/metres/route.ts

const metre = await prisma.metreSoustraitant.create({ /* ... */ })

if (metre.statut === 'SOUMIS') {
  await notifier({
    code: 'METRE_SOUMIS',
    rolesDestinataires: ['ADMIN', 'MANAGER'],
    metadata: {
      chantierId: metre.chantierId,
      chantierNom: metre.chantier.nomChantier,
      soustraitantNom: metre.soustraitant.nom,
      metreId: metre.id,
    },
  })
}
```

#### 2. Métré validé

```typescript
// Dans /api/metres/[id]/valider/route.ts

const session = await getServerSession(authOptions)

const metre = await prisma.metreSoustraitant.update({
  where: { id },
  data: { statut: 'VALIDE' },
  include: { 
    chantier: true,
    soustraitant: true 
  }
})

await notifier({
  code: 'METRE_VALIDE',
  destinataires: [], // Notification par email au SST
  metadata: {
    chantierId: metre.chantierId,
    chantierNom: metre.chantier.nomChantier,
    userName: session?.user?.name || 'Un administrateur',
  },
})
```

#### 3. Remarque créée

```typescript
// Dans /api/chantiers/[chantierId]/reception/[id]/remarques/route.ts

const remarque = await prisma.remarqueReception.create({ /* ... */ })

// Notifier les personnes taguées
if (tagsIds.length > 0) {
  await notifier({
    code: 'REMARQUE_CREEE',
    destinataires: tagsIds,
    rolesDestinataires: ['ADMIN'],
    metadata: {
      chantierId: remarque.receptionId,
      chantierNom: chantier.nomChantier,
      description: remarque.description,
    },
  })
}
```

#### 4. Ticket SAV créé

```typescript
// Dans /api/sav/route.ts

const ticket = await prisma.ticketSAV.create({ /* ... */ })

await notifier({
  code: 'SAV_TICKET_CREE',
  rolesDestinataires: ['ADMIN', 'MANAGER'],
  metadata: {
    num: ticket.numTicket,
    titre: ticket.titre,
    priorite: ticket.priorite,
    ticketSAVId: ticket.id,
  },
})

// Si assigné, notifier le technicien
if (ticket.technicienAssignId) {
  await notifier({
    code: 'SAV_TICKET_ASSIGNE',
    destinataires: [ticket.technicienAssignId],
    metadata: {
      num: ticket.numTicket,
      titre: ticket.titre,
      ticketSAVId: ticket.id,
    },
  })
}
```

---

## ⏰ Tâches cron

### Nettoyage automatique des notifications expirées

Les notifications in-app sont automatiquement supprimées après 30 jours (rétention configurée).

#### Configuration avec un service externe

**1. cron-job.org (recommandé)**

1. Créez un compte sur https://cron-job.org
2. Créez un nouveau cron job :
   - URL : `https://votre-domaine.com/api/notifications/cleanup`
   - Méthode : `POST`
   - Schedule : `0 3 * * *` (tous les jours à 3h du matin)
   - Headers : `Authorization: Bearer VOTRE_CRON_SECRET`

**2. GitHub Actions**

Créez `.github/workflows/cleanup-notifications.yml` :

```yaml
name: Cleanup Expired Notifications

on:
  schedule:
    - cron: '0 3 * * *' # Tous les jours à 3h UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/notifications/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**3. Vercel Cron (si hébergé sur Vercel)**

Créez `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/notifications/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

#### Nettoyage manuel

En tant qu'administrateur, vous pouvez déclencher le nettoyage manuellement :

```bash
curl -X POST https://votre-domaine.com/api/notifications/cleanup \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```

---

## 📊 API Endpoints

### Routes disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/notifications` | Liste des notifications de l'utilisateur |
| `PATCH` | `/api/notifications/[id]/read` | Marquer une notification comme lue |
| `POST` | `/api/notifications/read-all` | Marquer toutes comme lues |
| `GET` | `/api/notifications/types` | Liste des types de notifications |
| `GET` | `/api/notifications/config` | Configuration de l'utilisateur |
| `POST` | `/api/notifications/config` | Mettre à jour une config |
| `PUT` | `/api/notifications/config` | Mise à jour en masse |
| `POST` | `/api/notifications/seed` | Seeder les types (ADMIN) |
| `POST` | `/api/notifications/cleanup` | Nettoyer les expirées (CRON) |

### Paramètres GET /api/notifications

```typescript
// Query params
{
  limit?: number      // Défaut: 20
  offset?: number     // Défaut: 0
  onlyUnread?: boolean // Défaut: false
}

// Réponse
{
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}
```

---

## 🎨 Personnalisation

### Ajouter un nouveau type de notification

1. **Ajoutez-le dans le seeder** (`/api/notifications/seed/route.ts`) :

```typescript
{
  code: 'MON_NOUVEAU_TYPE',
  libelle: 'Mon nouveau type de notification',
  description: 'Description de quand cette notification est envoyée',
  categorie: 'CHANTIER',
  rolesParDefaut: ['ADMIN'],
  inAppTemplate: 'Message avec [VARIABLES]',
  emailSubject: 'Sujet de l\'email',
},
```

2. **Exécutez le seeder** :

```bash
curl -X POST http://localhost:3000/api/notifications/seed
```

3. **Utilisez-le dans votre code** :

```typescript
await notifier({
  code: 'MON_NOUVEAU_TYPE',
  metadata: {
    variables: 'valeurs',
  },
})
```

### Personnaliser les templates email

Modifiez la propriété `emailTemplate` dans le seeder avec du HTML complet :

```typescript
emailTemplate: `
  <!DOCTYPE html>
  <html>
    <body>
      <h1>Mon template personnalisé</h1>
      <p>[VARIABLE_1]</p>
      <p>[VARIABLE_2]</p>
    </body>
  </html>
`
```

---

## 🐛 Dépannage

### Les notifications n'apparaissent pas

1. Vérifiez que le type de notification existe : `GET /api/notifications/types`
2. Vérifiez la configuration de l'utilisateur : `GET /api/notifications/config`
3. Vérifiez les logs serveur pour voir si `notifier()` a été appelé
4. Vérifiez que l'utilisateur a le rôle requis

### Les emails ne sont pas envoyés

1. Vérifiez la configuration email dans les settings de l'entreprise
2. Vérifiez que `activeMail` est à `true` pour l'utilisateur
3. Vérifiez les logs du service email

### Badge non mis à jour

1. Le badge se rafraîchit toutes les 30 secondes
2. Rechargez la page manuellement
3. Vérifiez la console browser pour les erreurs

---

## 📈 Métriques et monitoring

Pour monitorer le système de notifications, vous pouvez :

1. **Compter les notifications créées** :
```sql
SELECT COUNT(*) FROM notifications WHERE createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

2. **Taux de lecture** :
```sql
SELECT 
  COUNT(CASE WHEN estLue = true THEN 1 END) * 100.0 / COUNT(*) as taux_lecture
FROM notifications
WHERE createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY);
```

3. **Notifications par type** :
```sql
SELECT nt.libelle, COUNT(*) as count
FROM notifications n
JOIN notification_types nt ON n.notificationTypeId = nt.id
GROUP BY nt.libelle
ORDER BY count DESC;
```

---

## 🎉 Conclusion

Le système de notifications est maintenant complètement opérationnel ! 

Pour toute question ou suggestion d'amélioration, n'hésitez pas à consulter le code source ou à créer une issue.

**Bon développement ! 🚀**

