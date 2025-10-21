# 📖 Guide Utilisateur - OpenBTP

Guide complet d'utilisation de l'application OpenBTP pour la gestion de chantiers BTP.

## 📋 Table des matières

- [Introduction](#introduction)
- [Rôles et permissions](#rôles-et-permissions)
- [Gestion des chantiers](#gestion-des-chantiers)
- [Gestion des clients](#gestion-des-clients)
- [Commandes et devis](#commandes-et-devis)
- [États d'avancement](#états-davancement)
- [Documents et rapports](#documents-et-rapports)
- [Réception de chantier](#réception-de-chantier)
- [Gestion des sous-traitants](#gestion-des-sous-traitants)
- [Planning](#planning)
- [Service Après-Vente (SAV)](#service-après-vente-sav)
- [Outillage](#outillage)
- [Bons de régie](#bons-de-régie)
- [Inventaire](#inventaire)
- [Administration](#administration)

---

## 👋 Introduction

OpenBTP est une application web complète de gestion de chantiers BTP qui permet de :
- 📊 Gérer vos chantiers de A à Z
- 💰 Créer et suivre les commandes/devis
- 📈 Suivre l'avancement des travaux
- 📄 Générer et envoyer des documents professionnels
- 🤝 Gérer les sous-traitants et leurs interventions
- 📅 Planifier les ressources et les équipes
- 🔧 Gérer le SAV et les interventions
- 🛠️ Suivre l'outillage et les machines

---

## 👥 Rôles et permissions

OpenBTP utilise 4 niveaux de rôles :

### 🔴 ADMIN (Administrateur)
**Accès complet** à toutes les fonctionnalités :
- ✅ Gestion des utilisateurs
- ✅ Configuration de l'entreprise
- ✅ Suppression de données
- ✅ Accès aux paramètres système
- ✅ Gestion des templates
- ✅ Toutes les fonctionnalités des autres rôles

### 🟡 MANAGER (Gestionnaire)
**Gestion opérationnelle** :
- ✅ Création et modification de chantiers
- ✅ Gestion des commandes et états d'avancement
- ✅ Génération et envoi de documents
- ✅ Gestion des sous-traitants
- ✅ Validation des documents
- ❌ Pas de suppression de données importantes
- ❌ Pas d'accès aux paramètres système

### 🟢 USER (Utilisateur)
**Utilisation quotidienne** :
- ✅ Consultation des chantiers
- ✅ Ajout de notes et rapports
- ✅ Upload de documents et photos
- ✅ Création de bons de régie
- ❌ Pas de modification des chantiers
- ❌ Pas de gestion des utilisateurs

### 🤖 BOT
Rôle système pour les automatisations.

---

## 🏗️ Gestion des chantiers

### Créer un nouveau chantier

1. **Menu** → **Chantiers** → Bouton **"Nouveau chantier"**

2. **Remplir les informations** :
   - **Nom du chantier** (requis)
   - **Client** : Sélectionner un client existant ou créer un nouveau
   - **Adresse du chantier** (requis)
   - **Date de début** (requis)
   - **Date de fin prévue** (optionnel)
   - **Montant prévisionnel** (optionnel)
   - **État** : En préparation / En cours / Terminé
   - **Description** (optionnel)

3. **Cliquer sur "Créer le chantier"**

Le chantier reçoit automatiquement un **identifiant unique** (ex: `CH-2025-ABC123`).

### Modifier un chantier

1. Depuis la liste des chantiers, cliquer sur l'**icône crayon** (✏️)
2. Ou depuis la page du chantier → **Modifier**
3. Modifier les informations
4. **Enregistrer les modifications**

### Actions disponibles sur un chantier

Depuis la fiche d'un chantier, vous avez accès à :

| Icône | Fonctionnalité | Description |
|-------|---------------|-------------|
| ✏️ | **Modifier** | Éditer les informations du chantier |
| 💰 | **Commande** | Créer/gérer le devis client |
| 📊 | **États** | Gérer les états d'avancement |
| 📁 | **Documents** | Gérer les documents et photos |
| 📝 | **Notes** | Ajouter des notes et tâches |
| 📄 | **Rapports** | Créer des rapports de visite |
| ✅ | **Réception** | Gérer la réception de chantier |

### Filtrer et rechercher

**Filtres disponibles** :
- **Par nom** : Recherche textuelle
- **Par état** : En préparation / En cours / Terminé
- **Par client** : Voir tous les chantiers d'un client

**Tri** :
- Date de création
- Date de début
- Nom du chantier
- Montant

### Statistiques des chantiers

Le dashboard affiche :
- 📊 Nombre total de chantiers
- 🟢 Chantiers en cours
- 🟡 Chantiers en préparation
- ⚪ Chantiers terminés
- 💰 Montant total des chantiers actifs

---

## 👤 Gestion des clients

### Créer un client

1. **Menu** → **Chantiers** → **Nouveau chantier** → **Nouveau client**
2. Ou depuis un chantier existant

**Informations requises** :
- **Nom** ou **Raison sociale**
- **Email** (pour l'envoi de documents)
- **Téléphone**
- **Adresse complète**

**Informations optionnelles** :
- Numéro de TVA
- Contact principal
- Notes internes

### Gérer les contacts d'un client

Chaque client peut avoir plusieurs contacts :
1. Accéder à la fiche client
2. Section **"Contacts"**
3. Ajouter un nouveau contact avec :
   - Prénom et nom
   - Email
   - Téléphone
   - Fonction

**Utilité** : Les contacts sont utilisés pour l'envoi d'états d'avancement et de documents.

### Voir les chantiers d'un client

1. Depuis la liste des chantiers
2. Cliquer sur le **nom du client**
3. Vous verrez tous les chantiers de ce client

---

## 💰 Commandes et devis

### Créer une commande client

1. **Chantier** → Icône **€** (Commande)
2. Si aucune commande n'existe, cliquer sur **"Créer une commande"**

### Ajouter des lignes à la commande

**Deux types de lignes** :
- **QP (Quantité × Prix)** : Forfaitaire
- **DP (Détail du Prix)** : Au métré

**Pour ajouter une ligne** :
1. Cliquer sur **"Nouvelle ligne"**
2. Remplir :
   - **Article** : Nom de la prestation
   - **Description** : Détails techniques
   - **Type** : QP ou DP
   - **Unité** : m², ml, u, ens, etc.
   - **Quantité**
   - **Prix unitaire**
3. Enregistrer

💡 **Astuce** : Le total se calcule automatiquement.

### Options de commande

Certaines lignes peuvent être marquées comme **"Options"** :
- ☑️ Cocher la case "Option"
- Ces lignes apparaîtront séparément dans le devis
- Le client peut les accepter ou refuser

### Verrouiller la commande

Une fois la commande validée par le client :
1. Cliquer sur **"Verrouiller la commande"**
2. **Important** : Une commande verrouillée ne peut plus être modifiée
3. Cela permet de créer les états d'avancement

⚠️ **Attention** : Vérifiez bien toutes les informations avant de verrouiller !

---

## 📊 États d'avancement

Les états d'avancement permettent de facturer progressivement le client selon l'avancement des travaux.

### Créer un état d'avancement client

**Prérequis** : La commande doit être verrouillée.

1. **Chantier** → **États d'avancement**
2. Section **"État d'avancement Client"**
3. Cliquer sur **"Nouvel état d'avancement"**

### Remplir un état d'avancement

Pour chaque ligne de la commande :
- **Quantité précédente** : Quantité facturée aux états précédents
- **Quantité actuelle** : Quantité à facturer dans cet état
- **Quantité totale** : Somme cumulée

💡 **Astuce** : Les montants se calculent automatiquement.

**Ajouter un commentaire** : Expliquer l'avancement (optionnel)

**Indiquer le mois** : Pour faciliter le suivi (ex: "Octobre 2025")

### Finaliser un état d'avancement

1. Vérifier toutes les quantités
2. Cliquer sur **"Finaliser l'état"**
3. ⚠️ Un état finalisé **ne peut plus être modifié**

### Envoyer un état d'avancement au client

Une fois l'état finalisé, l'**icône enveloppe** (📧) apparaît :

1. Cliquer sur l'icône **enveloppe**
2. Une modale s'ouvre avec :
   - **Destinataire** : Sélectionner un contact du client
   - **Sujet** : Pré-rempli (modifiable)
   - **Message** : Email type (modifiable)
   - **Pièce jointe** : Le PDF de l'état d'avancement
3. Cliquer sur **"Envoyer"**

📧 Le client reçoit l'état d'avancement en PDF par email.

### États d'avancement sous-traitants

Pour chaque sous-traitant ayant une commande :

1. **Chantier** → **États d'avancement**
2. Section du sous-traitant
3. Cliquer sur **"Nouvel état d'avancement"**

Le fonctionnement est identique aux états clients :
- Remplir les quantités réalisées
- Finaliser
- Envoyer par email (icône 📧)

### Exporter un état en Excel

Depuis la liste des états :
1. Cliquer sur l'**icône Excel** (📥)
2. Le fichier se télécharge automatiquement

---

## 📁 Documents et rapports

### Types de documents

OpenBTP gère plusieurs types de documents :

#### Documents de chantier
- Plans
- Contrats
- CSC (Cahier des Clauses Spéciales)
- Cautionnements
- Métrés
- Correspondance

#### Photos de chantier
- Photos d'avancement
- Photos de problèmes
- Photos de réception

#### Rapports de visite
- Compte-rendu de réunion
- Rapport d'avancement
- Rapport de problèmes

#### Fiches techniques
- Produits utilisés
- Documentation technique

### Uploader des documents

1. **Chantier** → **Documents**
2. **Glisser-déposer** des fichiers dans la zone prévue
3. Ou cliquer sur **"Sélectionner des fichiers"**

**Pour chaque document** :
- Ajouter des **tags** pour le classer
- Les tags permettent de filtrer et retrouver facilement les documents

**Tags disponibles** :
- Administratif
- Cautionnement
- Contrat
- CSC
- Plans
- Métrés
- Correspondance

### Modifier les tags d'un document

1. Cliquer sur le bouton **"Tags"** à côté du document
2. Sélectionner/Désélectionner les tags
3. Cliquer sur **"Enregistrer les tags"**

### Créer un rapport de visite

Les rapports de visite permettent de documenter vos visites de chantier avec photos et observations.

1. **Chantier** → **Rapports** → **"Nouveau rapport"**

2. **Informations générales** :
   - Date de la visite
   - Chantier (automatique)

3. **Personnes présentes** :
   - Ajouter les noms et fonctions
   - Ex: "Jean Dupont - Chef de chantier"

4. **Gestion des tags** :
   - Créer des tags personnalisés pour organiser vos remarques
   - Ex: "Plomberie", "Électricité", "Maçonnerie", etc.
   - Ces tags permettront de générer des **rapports filtrés** par corps de métier

5. **Notes et observations** :
   - Ajouter des notes détaillées
   - Assigner des **tags** à chaque note
   - Les notes peuvent être filtrées par tag

6. **Photos** :
   - Prendre ou uploader des photos
   - Ajouter une **annotation** à chaque photo
   - Assigner des **tags** aux photos
   - Filtrer les photos par tag

7. **Enregistrer le rapport** :
   - Cliquer sur **"Enregistrer le rapport"**
   - Le PDF est généré et ajouté aux documents du chantier

### Générer un rapport filtré par tag

Cette fonctionnalité permet de créer des rapports spécialisés par corps de métier :

1. Dans la section **"Gestion des tags"**
2. Sélectionner le tag désiré (ex: "Plomberie")
3. Cliquer sur **"Générer rapport filtré"**

📄 **Résultat** : Un PDF contenant uniquement :
- Les notes taguées "Plomberie"
- Les photos taguées "Plomberie"
- Les personnes présentes (toujours incluses)

**Cas d'usage** : Envoyer à chaque sous-traitant uniquement ce qui le concerne.

### Envoyer un rapport par email

1. **Chantier** → **Rapports**
2. Cliquer sur le rapport à envoyer
3. Icône **enveloppe** (📧)
4. **Modale d'envoi** :
   - Sélectionner les **destinataires** (client, sous-traitants, emails personnalisés)
   - Choisir le **type de rapport** :
     - "Rapport complet" : Tout inclus
     - "Rapport filtré: [Tag]" : Seulement ce tag
   - Modifier l'email si nécessaire
5. Cliquer sur **"Envoyer"**

📧 Les destinataires reçoivent le PDF par email.

---

## ✅ Réception de chantier

La réception de chantier permet de gérer les remarques de fin de travaux avec un système de codes PIN pour les clients et sous-traitants.

### Créer une réception

1. **Chantier** → **Réception**
2. Si aucune réception n'existe, cliquer sur **"Créer une réception"**
3. Définir la **date limite** pour les remarques
4. La réception est créée avec un **code PIN principal**

### Générer des codes PIN

**Trois types de codes PIN** :

1. **Code PIN principal** (client)
   - Généré automatiquement à la création
   - Permet au client d'ajouter des remarques

2. **Code PIN équipe interne**
   - Pour vos collaborateurs
   - Permet d'ajouter des remarques internes

3. **Codes PIN sous-traitants**
   - Un code par sous-traitant
   - Permet aux sous-traitants de répondre aux remarques

**Créer un code PIN** :
1. Dans la page de réception → **"Générer un code PIN"**
2. Choisir le type (Interne / Sous-traitant)
3. Si sous-traitant, sélectionner lequel
4. Le code PIN est généré (6 chiffres)

### Partager les codes PIN

**Trois méthodes** :

1. **Copier le lien** :
   - Bouton **"Copier le lien"**
   - Envoyer le lien par email/SMS
   - Format : `https://votre-domaine.com/public/reception?pin=123456`

2. **Afficher le QR Code** :
   - Scanner avec un smartphone
   - Accès direct sans saisir le code

3. **Communiquer le code** :
   - Donner le code à 6 chiffres
   - Le destinataire le saisit sur `/public/reception`

### Ajouter une remarque (client/sous-traitant)

**Via l'accès public** (`/public/reception`) :

1. Entrer le **code PIN**
2. La liste des remarques existantes s'affiche
3. Cliquer sur **"Nouvelle remarque"**
4. Remplir :
   - **Description** du problème/remarque
   - **Localisation** (ex: "Salon, mur ouest")
   - Ajouter une **photo** (optionnel)
5. Enregistrer

**Via l'interface admin** :

1. **Chantier** → **Réception** → **"Nouvelle remarque"**
2. Remplir les informations
3. Possibilité de pointer sur un **plan** (si plan uploadé)

### Gérer les remarques (admin)

Pour chaque remarque, 3 actions possibles :

1. ✅ **Valider** : La remarque est acceptée, les travaux seront effectués
2. ❌ **Rejeter** : La remarque est refusée (indiquer une raison)
3. 🔧 **Résoudre** : Marquer la remarque comme traitée (ajouter une photo de preuve)

### Finaliser la réception

Une fois toutes les remarques traitées :
1. Cliquer sur **"Finaliser la réception"**
2. Un **PDF de réception** est généré
3. La réception ne peut plus être modifiée

---

## 🤝 Gestion des sous-traitants

### Ajouter un sous-traitant

1. **Menu** → **Sous-traitants** → **"Nouveau sous-traitant"**
2. Remplir :
   - **Nom de l'entreprise** (requis)
   - **Email** (requis)
   - **Contact principal**
   - **Téléphone**
   - **Adresse**
   - **Numéro de TVA**

### Générer un contrat de sous-traitance

1. **Sous-traitants** → Sélectionner un sous-traitant
2. Cliquer sur **"Générer un contrat"**
3. Le système utilise le **template actif** configuré dans l'admin
4. Le PDF est généré et peut être :
   - Téléchargé
   - Envoyé au sous-traitant pour signature électronique

### Signature électronique de contrat

Le sous-traitant reçoit un **lien unique** :
1. Il accède au contrat via le lien
2. Il lit le contrat
3. Il signe électroniquement (signature tactile)
4. Le contrat signé est enregistré
5. L'admin est notifié

### Créer une commande pour un sous-traitant

Pour confier des travaux à un sous-traitant :

1. **Chantier** → **États d'avancement**
2. Section **"Ajouter un nouveau sous-traitant"**
3. Sélectionner le sous-traitant
4. Page **"Sélection des postes"**
5. Saisir les postes de travaux :
   - Article
   - Description
   - Quantité
   - Prix unitaire
6. Cliquer sur **"Créer la commande"**

### Valider et verrouiller la commande sous-traitant

1. Vérifier tous les postes
2. Cliquer sur **"Valider et verrouiller"**
3. ⚠️ La commande ne pourra plus être modifiée
4. Vous pouvez maintenant créer des **états d'avancement sous-traitant**

### Gérer les ouvriers d'un sous-traitant

Pour chaque sous-traitant, vous pouvez gérer ses ouvriers :

1. **Sous-traitants** → Sélectionner → **"Ouvriers"**
2. **Ajouter un ouvrier** :
   - Nom et prénom
   - Numéro de carte d'identité
   - Documents (carte d'identité, attestations, etc.)

**Utilité** : Assurer la conformité (Loi Breyne, registre unique du personnel)

---

## 📅 Planning

### Planning général des chantiers

**Menu** → **Planning**

Affichage sous forme de **diagramme de Gantt** :
- 📊 Vue d'ensemble de tous les chantiers
- 🔴 Chantiers en cours en vert
- 🟡 Chantiers en préparation en jaune
- ⚫ Chantiers terminés en gris

**Fonctionnalités** :
- Zoom sur une période
- Filtrer par état
- Voir les chevauchements de chantiers

### Planning des ressources

**Menu** → **Planning ressources** (à venir)

Permet de planifier :
- Les équipes par chantier
- Les machines et outils
- Les sous-traitants
- Les livraisons

---

## 🔧 Service Après-Vente (SAV)

Le module SAV permet de gérer toutes les demandes de service après-vente.

### Créer un ticket SAV

1. **Menu** → **SAV** → **"Nouveau ticket"**
2. Remplir le formulaire :

**Informations générales** :
- **Titre** : Description courte (requis)
- **Description** : Détails du problème (requis)
- **Type** : 
  - Panne électrique
  - Fuite d'eau
  - Problème chauffage
  - Défaut de construction
  - Autre
- **Priorité** :
  - 🔴 URGENTE (intervention immédiate)
  - 🟠 HAUTE (dans les 24h)
  - 🟡 NORMALE (dans la semaine)
  - 🟢 BASSE (quand possible)

**Localisation** :
- Chantier concerné (si applicable)
- Localisation précise
- Adresse d'intervention

**Contact** :
- Nom du contact sur place
- Téléphone
- Email

**Assignation** :
- Ouvrier interne (équipe)
- OU Sous-traitant externe
- Date d'intervention souhaitée

3. **Joindre des documents/photos** (optionnel)
4. Cliquer sur **"Créer le ticket"**

### Suivre un ticket SAV

Page de détail du ticket avec **5 onglets** :

#### 📋 Informations
- Statut actuel
- Détails du problème
- Contact
- Assignation

**Modifier les informations** :
- Cliquer sur **"Modifier"**
- Changer les informations
- Enregistrer

**Changer le statut** :
- NOUVEAU → EN_ATTENTE → ASSIGNE → PLANIFIE → EN_COURS → RESOLU → CLOS
- Ou ANNULE si le ticket n'est plus pertinent

#### 🔨 Interventions
Liste des interventions effectuées :

**Créer une intervention** :
1. Onglet **"Interventions"**
2. **"Nouvelle intervention"**
3. Remplir :
   - Titre
   - Description des travaux
   - Date de début
   - Date de fin (une fois terminée)
   - Technicien
4. Enregistrer

**Utilité** : Historique complet des actions menées

#### 📄 Documents
Documents liés au ticket :
- Devis de réparation
- Factures
- Attestations
- Rapports d'expertise

**Ajouter un document** :
- Glisser-déposer ou sélectionner
- Le document est attaché au ticket

#### 📸 Photos
Photos du problème et des réparations :
- Photos "avant travaux"
- Photos "pendant travaux"
- Photos "après travaux"

**Ajouter des photos** :
- Upload multiple
- Annotation possible

#### 💬 Commentaires
Fil de discussion sur le ticket :
- Échanges internes
- Historique des actions
- Mise à jour du client

**Ajouter un commentaire** :
- Écrire le message
- Envoyer
- Tous les participants sont notifiés

### Statistiques SAV

Le dashboard SAV affiche :
- 📊 Nombre total de tickets
- 🆕 Nouveaux tickets
- ⏳ En cours
- ✅ Résolus ce mois
- 📈 Temps moyen de résolution

---

## 🛠️ Outillage

Gestion centralisée de tous vos outils et machines.

### Ajouter une machine

1. **Menu** → **Outillage** → **"Nouvelle machine"**
2. Remplir :
   - **Nom** : Ex: "Perforateur Hilti"
   - **Modèle** : Ex: "TE 6-A36"
   - **Numéro de série** (optionnel)
   - **Localisation** : Dépôt, chantier, camion...
   - **Statut** : Disponible / En panne / En réparation / Manque consommable
   - **Date d'achat** (optionnel)
   - **Commentaire** (optionnel)

3. Un **QR Code** est automatiquement généré

### États des machines

| Statut | Description | Icône |
|--------|-------------|-------|
| ✅ **Disponible** | Prêt à être utilisé | Vert |
| ⏰ **Prêté** | En cours d'utilisation | Bleu |
| ❌ **En panne** | Hors service | Rouge |
| 🔧 **En réparation** | Chez le réparateur | Jaune |
| ⚠️ **Manque consommable** | Besoin de réapprovisionnement | Orange |

### Prêter une machine

1. Depuis la liste → Cliquer sur la machine
2. Bouton **"Nouveau prêt"**
3. Remplir :
   - **Emprunteur** : Nom de la personne
   - **Date de retour prévue**
   - **Commentaire** (optionnel)
4. Enregistrer

➡️ Le statut passe automatiquement à "Prêté"

### Retourner une machine

1. Depuis la fiche de la machine
2. Section **"Prêt en cours"**
3. Bouton **"Retour de prêt"**
4. Indiquer l'**état de la machine** :
   - Disponible (bon état)
   - En panne (à réparer)
   - Manque consommable
5. Ajouter un commentaire si nécessaire
6. Confirmer

### Scanner un QR Code

Pour une gestion rapide sur le terrain :

1. **Menu** → **Outillage** → **"Scanner"**
2. Autoriser l'accès à la caméra
3. Scanner le QR Code sur la machine
4. Accès direct à la fiche de la machine
5. Actions rapides :
   - Prêter
   - Retourner
   - Changer le statut

### Supprimer une machine (ADMIN uniquement)

1. **Icône poubelle** (🗑️) visible uniquement pour les administrateurs
2. Confirmation requise
3. ⚠️ La machine ne peut pas être supprimée si elle est actuellement prêtée
4. L'historique des prêts est supprimé avec la machine

---

## 📝 Bons de régie

Les bons de régie permettent de facturer des travaux non prévus ou des interventions ponctuelles.

### Créer un bon de régie

**Via l'accès public** (recommandé pour saisie sur chantier) :

1. Accéder à `/public/bon-regie`
2. Ou utiliser le **lien partagé** depuis l'interface admin
3. Remplir le formulaire :

**Informations générales** :
- Dates (ex: "Du 15/10 au 17/10/2025")
- Nom du client
- Nom du chantier
- Description des travaux

**Détails d'exécution** :
- Temps de préparation (heures)
- Temps de trajets (heures)
- Temps sur chantier (heures)
- Nombre de techniciens
- Liste des matériaux utilisés

**Signature client** :
- Nom du signataire
- Signature tactile (sur smartphone/tablette)
- Date automatique

4. Cliquer sur **"Enregistrer"**

📄 Le bon de régie est enregistré et visible dans l'interface admin.

### Associer un bon de régie à un chantier

1. **Menu** → **Bons de régie**
2. Trouver le bon non associé
3. Cliquer sur **"Associer à un chantier"**
4. Sélectionner le chantier dans la liste
5. Cliquer sur **"Associer"**

✅ Le bon est maintenant lié au chantier et un **PDF est généré** automatiquement dans les documents du chantier.

### Consulter les bons de régie

**Liste complète** :
- Menu → **Bons de régie**
- Affichage de tous les bons (associés ou non)

**Par chantier** :
- Depuis un chantier → **Documents**
- Les bons associés apparaissent avec le type "bon-regie"

### Supprimer un bon de régie (ADMIN uniquement)

1. **Icône poubelle** (🗑️) visible uniquement pour les administrateurs
2. Confirmation requise
3. Le bon de régie est définitivement supprimé

---

## 📦 Inventaire

Gestion de l'inventaire des matériaux avec système de rayonnages.

### Créer un rack (rayonnage)

1. **Menu** → **Inventaire** → **"Nouveau rack"**
2. Définir :
   - Nom du rack (ex: "Rack A")
   - Position (ex: "Dépôt principal")
   - Nombre de lignes (hauteur)
   - Nombre de colonnes (largeur)
3. Enregistrer

📊 Un **QR Code** est généré pour chaque emplacement.

### Ajouter un matériau

1. **Inventaire** → **"Nouveau matériau"**
2. Remplir :
   - Nom du matériau
   - Description
   - Quantité
   - Emplacement (rack, ligne, colonne)
3. Scanner ou saisir le QR Code de l'emplacement
4. Enregistrer

### Scanner un emplacement

1. Scanner le QR Code d'un emplacement
2. Voir le contenu de l'emplacement
3. Ajouter/Retirer des matériaux
4. Mettre à jour les quantités

---

## 🗂️ Administration

### Gestion des utilisateurs (ADMIN uniquement)

**Menu** → **Utilisateurs**

#### Créer un utilisateur

1. **"Nouveau utilisateur"**
2. Remplir :
   - Nom complet
   - Email (servira d'identifiant)
   - Rôle : ADMIN / MANAGER / USER
   - Mot de passe temporaire
3. Enregistrer

💡 **Conseil** : Demandez à l'utilisateur de changer son mot de passe à la première connexion.

#### Modifier un utilisateur

1. Icône **crayon** (✏️)
2. Modifier les informations
3. **Changer le rôle** si nécessaire
4. Enregistrer

#### Désactiver un utilisateur

1. Modifier l'utilisateur
2. Option **"Actif"** → Décocher
3. L'utilisateur ne peut plus se connecter mais ses données sont conservées

### Configuration de l'entreprise

**Menu** → **Paramètres** → **"Informations de l'entreprise"**

#### Informations générales
- Nom de l'entreprise
- Adresse complète
- Numéro de TVA
- Téléphone / Email
- Représentant légal

#### Logo
- Upload d'un logo (PNG, JPG, SVG)
- Utilisé sur tous les documents générés
- Taille recommandée : 300×150 px

#### Informations bancaires
- IBAN
- BIC/SWIFT
- Nom de la banque

### Configuration des emails

**Paramètres** → **"Configuration email"**

Deux modes de configuration :

#### Mode 1 : Configuration manuelle
- Serveur SMTP
- Port (587 pour TLS, 465 pour SSL, 25 pour non sécurisé)
- Nom d'utilisateur
- Mot de passe
- Sécurité : SSL/TLS

#### Mode 2 : Fournisseurs courants

**Gmail** :
- SMTP : `smtp.gmail.com`
- Port : 587
- Utilisateur : votre.email@gmail.com
- Mot de passe : Mot de passe d'application (pas votre mot de passe Gmail)
- SSL/TLS : TLS

**Office 365** :
- SMTP : `smtp.office365.com`
- Port : 587
- Utilisateur : votre.email@votreentreprise.com
- TLS activé

**OVH** :
- SMTP : `ssl0.ovh.net`
- Port : 587
- Utilisateur : votre.email@votredomaine.com

💡 **Test** : Après configuration, testez l'envoi d'un email en envoyant un état d'avancement.

### Gestion des templates de contrats

**Menu** → **Admin** → **"Templates de contrats"**

Consultez le guide détaillé : [README_TEMPLATES_CONTRATS.md](./README_TEMPLATES_CONTRATS.md)

#### Créer un template
1. **"Nouveau template"**
2. Nom du template
3. Description
4. Contenu HTML avec variables dynamiques
5. Enregistrer

#### Variables disponibles
Voir la section complète dans le guide des templates.

#### Activer un template
- Un seul template peut être actif à la fois
- Icône **check** (✓) pour activer
- Le template actif est utilisé pour tous les nouveaux contrats

### Catégories de documents (ADMIN)

**Menu** → **Admin** → **"Catégories de documents"**

Gérer les catégories et types de documents :
- Ajouter de nouveaux types
- Modifier les existants
- Organiser la classification

---

## 💡 Fonctionnalités avancées

### Notes et tâches

Chaque chantier a un système de **notes personnalisées** :

1. **Chantier** → **Notes et tâches**
2. Deux sections :
   - **Tâches administratives** : Générées automatiquement par le système
   - **Notes personnelles** : Vos propres notes et rappels

**Tâches administratives automatiques** :
- Ouverture du chantier
- Dossier technique à compléter
- Vérification des assurances
- Photos avant/après travaux
- Réception de chantier

**Cocher les tâches** : Marquer comme complétées au fur et à mesure.

### Chat interne

Communication en temps réel entre utilisateurs :

1. Icône **message** en haut à droite
2. Sélectionner un utilisateur
3. Envoyer des messages
4. Notifications en temps réel

### Choix clients

Système de gestion des choix du client pendant les travaux :

1. **Menu** → **Choix clients**
2. **"Nouveau choix"**
3. Associer à un chantier
4. Décrire les options proposées
5. Le client peut consulter et choisir via un lien

### Système RAG / IA (Optionnel)

Si Ollama est configuré, vous avez accès à :

1. **Assistant IA** pour répondre aux questions techniques
2. **Recherche sémantique** dans vos documents
3. **Suggestions automatiques**

Configuration :
- **Menu** → **Admin** → **"RAG Admin"**
- Indexer vos fiches techniques
- Configurer les modèles IA

---

## 🔐 Sécurité et bonnes pratiques

### Mots de passe

- ✅ Utiliser des mots de passe **forts** (min. 12 caractères)
- ✅ Combiner majuscules, minuscules, chiffres, caractères spéciaux
- ✅ Changer régulièrement les mots de passe
- ❌ Ne jamais partager vos identifiants
- ❌ Ne jamais réutiliser le même mot de passe

### Sauvegardes

**Recommandations** :
- 💾 Sauvegarder la base de données **quotidiennement**
- 📁 Sauvegarder le dossier `public/` (documents uploadés)
- 🔄 Tester régulièrement la restauration
- ☁️ Conserver des sauvegardes hors site

**Script de sauvegarde MySQL** :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u openbtp -p openbtp > backup_$DATE.sql
gzip backup_$DATE.sql
```

### Accès et permissions

**Principe du moindre privilège** :
- ✅ Donner uniquement les droits nécessaires
- ✅ Utiliser le rôle USER pour les employés simples
- ✅ Réserver ADMIN aux personnes de confiance
- ✅ Utiliser MANAGER pour les chefs de chantier

### Protection des données (RGPD)

- 🔒 Les données clients sont chiffrées en base
- 🗑️ Possibilité de supprimer les données d'un client
- 📋 Export des données client possible
- 🔐 Accès sécurisé par authentification

Consultez également : [ANONYMISATION.md](./ANONYMISATION.md)

---

## 📱 Accès mobiles et publics

### Portail public sous-traitants/ouvriers

URL : `/public/portail`

Les sous-traitants et ouvriers peuvent accéder à leurs informations via un code PIN :
- Voir leurs chantiers assignés
- Consulter les documents
- Voir les photos de chantier
- Créer des bons de régie
- Ajouter des remarques de réception

### Réception publique

URL : `/public/reception`

Permet aux clients et sous-traitants d'ajouter des remarques de réception avec un code PIN.

### Bon de régie public

URL : `/public/bon-regie`

Saisie rapide de bons de régie sur chantier, sans connexion :
- Sur smartphone/tablette
- Signature tactile du client
- Synchronisation automatique

---

## 📞 Support et aide

### Logs de l'application

Pour diagnostiquer un problème :

```bash
# Logs de l'application (si démarrage avec script)
tail -f logs/app-*.log

# Logs Next.js (mode dev)
# Visibles directement dans le terminal
```

### Console du navigateur

En cas de problème dans l'interface :
1. Appuyer sur **F12**
2. Onglet **Console**
3. Vérifier s'il y a des erreurs (en rouge)
4. Onglet **Network** pour voir les requêtes API

### Vérifier l'état du système

1. **Menu** → **Dashboard**
2. Widgets affichant :
   - État des chantiers
   - Tâches en retard
   - Documents expirant
   - Tickets SAV urgents

### Contacter le support

Pour obtenir de l'aide :
1. Créer une **issue** sur GitHub
2. Fournir :
   - Description du problème
   - Logs pertinents
   - Étapes pour reproduire
   - Version de l'application

---

## 🎓 Conseils d'utilisation

### Workflow recommandé pour un nouveau chantier

1. ✅ **Créer le client** (si nouveau)
2. ✅ **Créer le chantier** avec toutes les informations
3. ✅ **Créer la commande client** avec tous les postes
4. ✅ **Verrouiller la commande** une fois validée par le client
5. ✅ **Créer les états d'avancement** au fil de l'avancement
6. ✅ **Uploader les documents** (plans, contrat, etc.)
7. ✅ **Créer des rapports de visite** régulièrement
8. ✅ **Ajouter les sous-traitants** avec leurs commandes
9. ✅ **Créer la réception** en fin de travaux
10. ✅ **Finaliser** et archiver

### Organisation des documents

**Utiliser les tags** :
- 📋 Tous les documents importants : "Administratif"
- 📜 Contrats signés : "Contrat"
- 📐 Plans d'exécution : "Plans"
- 💰 Cautions et garanties : "Cautionnement"
- 📏 Métrés et calculs : "Métrés"

**Nommer clairement** :
- ❌ "Doc1.pdf", "Image.jpg"
- ✅ "Plan-RDC-v2.pdf", "Contrat-signe-client.pdf"

### Bonnes pratiques états d'avancement

- 📅 Créer un état par **mois** ou selon accord contractuel
- 💬 Ajouter toujours un **commentaire** pour expliquer l'avancement
- 📸 Joindre des **photos** pour justifier l'avancement
- ✅ **Finaliser** uniquement quand tout est vérifié
- 📧 **Envoyer au client** dès finalisation

### Utilisation des rapports filtrés

**Cas d'usage** :

Vous avez 5 corps de métier sur un chantier :
1. Créer les tags : "Plomberie", "Électricité", "Maçonnerie", "Menuiserie", "Peinture"
2. Lors du rapport de visite, taguer chaque remarque et photo
3. Générer **5 rapports filtrés**, un par corps de métier
4. Envoyer chaque rapport au sous-traitant concerné

🎯 **Avantage** : Chaque sous-traitant reçoit uniquement ce qui le concerne, plus professionnel et lisible.

---

## 🆘 Questions fréquentes (FAQ)

### Comment changer mon mot de passe ?

1. Cliquer sur votre **nom** (en haut à droite)
2. **"Mon profil"**
3. **"Changer le mot de passe"**
4. Entrer l'ancien puis le nouveau
5. Enregistrer

### Comment ajouter un logo sur les documents ?

1. **Paramètres** → **"Informations de l'entreprise"**
2. Section **"Logo"**
3. Uploader votre logo (PNG recommandé, fond transparent)
4. Enregistrer

Le logo apparaîtra sur :
- États d'avancement
- Rapports de visite
- Contrats
- Bons de régie
- Réceptions

### Puis-je modifier un état d'avancement finalisé ?

❌ **Non**, un état finalisé est verrouillé pour garantir la traçabilité.

**Solution** : Créer un nouvel état d'avancement pour corriger.

### Comment récupérer un document supprimé ?

❌ Les documents supprimés ne peuvent **pas être récupérés**.

**Prévention** : 
- Faire des sauvegardes régulières
- Confirmer toujours avant de supprimer

### Combien d'utilisateurs puis-je créer ?

✅ **Illimité** - Vous pouvez créer autant d'utilisateurs que nécessaire.

### L'application fonctionne-t-elle hors ligne ?

⚠️ **Partiellement** :
- Les rapports de visite peuvent être créés hors ligne
- La synchronisation se fait automatiquement au retour en ligne
- Les autres fonctionnalités nécessitent une connexion

### Comment exporter les données ?

**Par chantier** :
- États d'avancement : Export Excel
- Rapports : Export PDF
- Documents : Téléchargement individuel

**Export global** :
- Sauvegarde de la base de données : `mysqldump`

---

## 📚 Ressources supplémentaires

- 📦 [Guide d'installation](./INSTALLATION.md)
- 🚀 [Démarrage automatique NAS](./README_DEMARRAGE_AUTO_NAS.md)
- 💾 [Import de base de données](./README_IMPORT_NAS.md)
- 📄 [Templates de contrats](./README_TEMPLATES_CONTRATS.md)
- 🔒 [Anonymisation des données](./ANONYMISATION.md)

---

**Dernière mise à jour** : Octobre 2025  
**Version** : 0.1.0  
**Licence** : Open Source

