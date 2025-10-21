# 📝 Historique des modifications - OpenBTP

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

---

## [0.1.0] - Octobre 2025

### ✨ Nouvelles fonctionnalités

#### Gestion des bons de régie
- ✅ Ajout de la suppression de bons de régie (réservé aux ADMIN)
- ✅ Modal de confirmation avant suppression
- ✅ Notifications toast de succès/erreur
- ✅ Mise à jour automatique de la liste

#### Documentation
- ✅ Création du guide d'installation complet (`INSTALLATION.md`)
- ✅ Création du guide utilisateur détaillé (`GUIDE_UTILISATEUR.md`)
- ✅ Création de la documentation d'architecture (`ARCHITECTURE.md`)
- ✅ Création du guide de démarrage rapide (`DEMARRAGE_RAPIDE.md`)
- ✅ Création du template de variables d'environnement (`ENV_TEMPLATE.md`)
- ✅ Mise à jour complète du README principal

### 🐛 Corrections de bugs

#### Outillage
- 🔧 **Correction** : Variable `isAdmin` codée en dur à `false`
- ✅ **Solution** : Vérification dynamique du rôle via `useSession()`
- 📝 **Impact** : Les administrateurs peuvent maintenant supprimer des machines

#### Tags de documents
- 🔧 **Correction** : URL API incorrecte pour la mise à jour des tags
- ✅ **Solution** : Utilisation de l'API existante `/api/chantiers/[id]/documents/[docId]`
- 📝 **Impact** : Les tags peuvent maintenant être modifiés correctement

#### Rapports filtrés
- 🔧 **Correction** : Tags des photos non récupérés depuis les métadonnées
- ✅ **Solution** : Récupération des tags lors de la régénération du PDF
- 📝 **Impact** : Les rapports filtrés par corps de métier fonctionnent correctement

#### Page de réception
- 🔧 **Correction** : Erreur 500 lors de l'accès aux détails d'une réception
- ✅ **Solution** : Migration de SQL brut vers Prisma ORM
- 📝 **Impact** : La page de réception est maintenant accessible

#### États d'avancement
- ✅ **Confirmation** : L'envoi d'email fonctionne pour les états client ET sous-traitants
- ✅ **Confirmation** : Le bouton enveloppe s'affiche correctement quand l'état est finalisé

### 🔄 Améliorations

#### API
- ✅ Migration de requêtes SQL brutes vers Prisma ORM (meilleure sécurité)
- ✅ Ajout de logs détaillés avec emojis pour faciliter le debug
- ✅ Meilleure gestion des erreurs avec messages explicites
- ✅ Ajout de stack traces en cas d'erreur 500

#### Interface utilisateur
- ✅ Amélioration de la cohérence des messages d'erreur
- ✅ Ajout de modales de confirmation pour les suppressions
- ✅ Notifications toast pour feedback immédiat
- ✅ Vérification des permissions côté client (boutons conditionnels)

#### Sécurité
- ✅ Vérification stricte du rôle ADMIN pour les suppressions critiques
- ✅ Validation des permissions côté serveur ET client
- ✅ Logs d'audit pour les actions sensibles

### 📚 Documentation

- ✅ Documentation complète de l'installation (serveur et NAS)
- ✅ Guide utilisateur couvrant toutes les fonctionnalités
- ✅ Documentation de l'architecture technique
- ✅ Guide de démarrage rapide pour nouveaux utilisateurs
- ✅ Template de configuration des variables d'environnement
- ✅ README mis à jour avec badges et structure améliorée

---

## [En cours de développement]

### 🚧 Fonctionnalités à venir

- [ ] Application mobile native
- [ ] Mode hors ligne complet (PWA)
- [ ] Correction des marqueurs de carte Leaflet
- [ ] Templates d'emails personnalisables
- [ ] Support multilingue (EN, ES, DE)
- [ ] API publique documentée
- [ ] Tableaux de bord personnalisables
- [ ] Rapports analytiques avancés

### 🐛 Bugs connus

#### Carte des chantiers (Leaflet)
- **Problème** : Les marqueurs ne s'affichent pas correctement
- **Cause** : Incompatibilité avec Next.js 15
- **Impact** : La carte s'affiche mais sans les pointeurs de chantiers
- **Priorité** : Moyenne
- **Statut** : Investigation en cours

#### Génération PDF sur certains NAS
- **Problème** : Erreurs lors de la génération de PDF
- **Cause** : Dépendances Chromium manquantes
- **Solution** : Utiliser le service PDF Docker
- **Priorité** : Faible (contournement disponible)

---

## 📊 Statistiques

### Code
- **Commits** : 2+ dans cette session
- **Fichiers modifiés** : 6
- **Lignes ajoutées** : 230+
- **Lignes supprimées** : 70+
- **Documentation** : 5 nouveaux fichiers MD

### Fonctionnalités
- **Modules** : 15+ (Chantiers, SAV, Outillage, etc.)
- **Pages** : 70+
- **Composants** : 100+
- **API Routes** : 200+
- **Tables BD** : 50+

---

## 🎯 Prochaines versions

### v0.2.0 (Prévu Q1 2026)
- Correction carte Leaflet
- PWA complète
- Application mobile
- Multilingue

### v0.3.0 (Prévu Q2 2026)
- Rapports analytiques
- Tableaux de bord personnalisés
- API publique
- Intégrations tierces

---

## 🔗 Liens utiles

- **GitHub** : https://github.com/MacGreg4000/OpenBTP
- **Issues** : https://github.com/MacGreg4000/OpenBTP/issues
- **Discussions** : https://github.com/MacGreg4000/OpenBTP/discussions

---

**Format basé sur** : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)  
**Versioning** : [Semantic Versioning](https://semver.org/lang/fr/)

