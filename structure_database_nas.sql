-- =====================================================
-- STRUCTURE DE BASE DE DONNÉES OPENBTP
-- Généré pour import sur NAS
-- =====================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS `app_secotech` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `app_secotech`;

-- =====================================================
-- TABLES PRINCIPALES
-- =====================================================

-- Table des utilisateurs
CREATE TABLE `User` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `role` enum('ADMIN','MANAGER','USER','BOT') NOT NULL DEFAULT 'USER',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des clients
CREATE TABLE `Client` (
  `id` varchar(191) NOT NULL,
  `nom` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `adresse` varchar(191) DEFAULT NULL,
  `telephone` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des contacts
CREATE TABLE `contacts` (
  `id` varchar(191) NOT NULL,
  `prenom` varchar(191) NOT NULL,
  `nom` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `telephone` varchar(191) DEFAULT NULL,
  `fonction` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `clientId` varchar(191) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `contacts_clientId_fkey` (`clientId`),
  CONSTRAINT `contacts_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des chantiers
CREATE TABLE `Chantier` (
  `id` varchar(191) NOT NULL,
  `chantierId` varchar(191) NOT NULL,
  `numeroIdentification` varchar(191) UNIQUE DEFAULT NULL,
  `nomChantier` varchar(191) NOT NULL,
  `dateCommencement` datetime(3) DEFAULT NULL,
  `dateFinPrevue` datetime(3) DEFAULT NULL,
  `etatChantier` varchar(191) DEFAULT NULL,
  `clientAdresse` varchar(191) DEFAULT NULL,
  `clientEmail` varchar(191) DEFAULT NULL,
  `clientNom` varchar(191) DEFAULT NULL,
  `clientTelephone` varchar(191) DEFAULT NULL,
  `clientId` varchar(191) DEFAULT NULL,
  `contactId` varchar(191) DEFAULT NULL,
  `adresseChantier` varchar(191) DEFAULT NULL,
  `avancement` double DEFAULT NULL,
  `budget` double DEFAULT NULL,
  `couleur` varchar(191) DEFAULT NULL,
  `dateAcceptation` datetime(3) DEFAULT NULL,
  `dateDebutPreparation` datetime(3) DEFAULT NULL,
  `dateFinEffective` datetime(3) DEFAULT NULL,
  `description` text,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `dureeEnJours` int DEFAULT NULL,
  `dateDebut` datetime(3) DEFAULT NULL,
  `dateFinReelle` datetime(3) DEFAULT NULL,
  `statut` varchar(191) NOT NULL DEFAULT 'A_VENIR',
  `typeDuree` varchar(191) NOT NULL DEFAULT 'CALENDRIER',
  `villeChantier` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Chantier_chantierId_key` (`chantierId`),
  KEY `Chantier_clientId_idx` (`clientId`),
  KEY `Chantier_contactId_idx` (`contactId`),
  CONSTRAINT `Chantier_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE SET NULL,
  CONSTRAINT `Chantier_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des sous-traitants
CREATE TABLE `soustraitant` (
  `id` varchar(191) NOT NULL,
  `nom` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `contact` varchar(191) DEFAULT NULL,
  `adresse` varchar(191) DEFAULT NULL,
  `telephone` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `tva` varchar(191) DEFAULT NULL,
  `actif` boolean NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SousTraitant_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des commandes
CREATE TABLE `commande` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chantierId` varchar(191) NOT NULL,
  `clientId` varchar(191) DEFAULT NULL,
  `dateCommande` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reference` varchar(191) DEFAULT NULL,
  `tauxTVA` double NOT NULL DEFAULT 20,
  `sousTotal` double NOT NULL DEFAULT 0,
  `totalOptions` double NOT NULL DEFAULT 0,
  `tva` double NOT NULL DEFAULT 0,
  `total` double NOT NULL DEFAULT 0,
  `statut` varchar(191) NOT NULL DEFAULT 'BROUILLON',
  `estVerrouillee` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Commande_chantierId_idx` (`chantierId`),
  KEY `Commande_clientId_idx` (`clientId`),
  CONSTRAINT `Commande_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Commande_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des lignes de commande
CREATE TABLE `lignecommande` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commandeId` int NOT NULL,
  `ordre` int NOT NULL,
  `article` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'QP',
  `unite` varchar(191) NOT NULL,
  `prixUnitaire` double NOT NULL,
  `quantite` double NOT NULL,
  `total` double NOT NULL,
  `estOption` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `LigneCommande_commandeId_idx` (`commandeId`),
  CONSTRAINT `LigneCommande_commandeId_fkey` FOREIGN KEY (`commandeId`) REFERENCES `commande` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des états d'avancement
CREATE TABLE `etat_avancement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chantierId` varchar(191) NOT NULL,
  `numero` int NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `commentaires` text,
  `estFinalise` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `createdBy` varchar(191) NOT NULL,
  `mois` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `EtatAvancement_chantierId_numero_key` (`chantierId`,`numero`),
  KEY `EtatAvancement_chantierId_idx` (`chantierId`),
  CONSTRAINT `EtatAvancement_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des lignes d'état d'avancement
CREATE TABLE `ligne_etat_avancement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `etatAvancementId` int NOT NULL,
  `ligneCommandeId` int NOT NULL,
  `quantitePrecedente` double NOT NULL DEFAULT 0,
  `quantiteActuelle` double NOT NULL DEFAULT 0,
  `quantiteTotale` double NOT NULL DEFAULT 0,
  `montantPrecedent` double NOT NULL DEFAULT 0,
  `montantActuel` double NOT NULL DEFAULT 0,
  `montantTotal` double NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `article` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `prixUnitaire` double NOT NULL,
  `quantite` double NOT NULL,
  `type` varchar(191) NOT NULL,
  `unite` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `LigneEtatAvancement_etatAvancementId_idx` (`etatAvancementId`),
  CONSTRAINT `LigneEtatAvancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des avenants d'état d'avancement
CREATE TABLE `avenant_etat_avancement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `etatAvancementId` int NOT NULL,
  `article` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(191) NOT NULL,
  `unite` varchar(191) NOT NULL,
  `prixUnitaire` double NOT NULL,
  `quantite` double NOT NULL,
  `quantitePrecedente` double NOT NULL DEFAULT 0,
  `quantiteActuelle` double NOT NULL DEFAULT 0,
  `quantiteTotale` double NOT NULL DEFAULT 0,
  `montantPrecedent` double NOT NULL DEFAULT 0,
  `montantActuel` double NOT NULL DEFAULT 0,
  `montantTotal` double NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `AvenantEtatAvancement_etatAvancementId_idx` (`etatAvancementId`),
  CONSTRAINT `AvenantEtatAvancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des commandes sous-traitant
CREATE TABLE `commande_soustraitant` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chantierId` varchar(191) NOT NULL,
  `soustraitantId` varchar(191) NOT NULL,
  `dateCommande` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reference` varchar(191) DEFAULT NULL,
  `tauxTVA` double NOT NULL DEFAULT 0,
  `sousTotal` double NOT NULL DEFAULT 0,
  `tva` double NOT NULL DEFAULT 0,
  `total` double NOT NULL DEFAULT 0,
  `statut` varchar(191) NOT NULL DEFAULT 'BROUILLON',
  `estVerrouillee` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `CommandeSousTraitant_chantierId_idx` (`chantierId`),
  KEY `CommandeSousTraitant_soustraitantId_idx` (`soustraitantId`),
  CONSTRAINT `CommandeSousTraitant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CommandeSousTraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des lignes de commande sous-traitant
CREATE TABLE `ligne_commande_soustraitant` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commandeSousTraitantId` int NOT NULL,
  `ordre` int NOT NULL,
  `article` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'QP',
  `unite` varchar(191) NOT NULL,
  `prixUnitaire` double NOT NULL,
  `quantite` double NOT NULL,
  `total` double NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `LigneCommandeSousTraitant_commandeSousTraitantId_idx` (`commandeSousTraitantId`),
  CONSTRAINT `LigneCommandeSousTraitant_commandeSousTraitantId_fkey` FOREIGN KEY (`commandeSousTraitantId`) REFERENCES `commande_soustraitant` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des dépenses
CREATE TABLE `depense` (
  `id` varchar(191) NOT NULL,
  `chantierId` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `montant` double NOT NULL,
  `description` text NOT NULL,
  `categorie` varchar(191) NOT NULL,
  `fournisseur` varchar(191) DEFAULT NULL,
  `reference` varchar(191) DEFAULT NULL,
  `justificatif` varchar(191) DEFAULT NULL,
  `createdBy` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Depense_chantierId_idx` (`chantierId`),
  KEY `Depense_createdBy_idx` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des notes utilisateur
CREATE TABLE `user_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `stickyNotes` text,
  `todos` text,
  `mode` varchar(191) NOT NULL DEFAULT 'notes',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserNotes_userId_key` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des paramètres de l'entreprise
CREATE TABLE `companysettings` (
  `id` varchar(191) NOT NULL DEFAULT 'COMPANY_SETTINGS',
  `name` varchar(191) NOT NULL,
  `address` varchar(191) NOT NULL,
  `zipCode` varchar(191) NOT NULL,
  `city` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `tva` varchar(191) NOT NULL,
  `logo` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `emailFrom` varchar(191) DEFAULT NULL,
  `emailFromName` varchar(191) DEFAULT NULL,
  `emailHost` varchar(191) DEFAULT NULL,
  `emailPassword` varchar(191) DEFAULT NULL,
  `emailPort` varchar(191) DEFAULT NULL,
  `emailSecure` boolean DEFAULT false,
  `emailUser` varchar(191) DEFAULT NULL,
  `iban` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tâches
CREATE TABLE `task` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text,
  `start` datetime(3) NOT NULL,
  `end` datetime(3) NOT NULL,
  `status` enum('PREVU','EN_COURS','TERMINE') NOT NULL DEFAULT 'PREVU',
  `chantierId` varchar(191) DEFAULT NULL,
  `savTicketId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Task_start_idx` (`start`),
  KEY `Task_end_idx` (`end`),
  KEY `Task_chantierId_idx` (`chantierId`),
  KEY `Task_savTicketId_idx` (`savTicketId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des ouvriers internes
CREATE TABLE `ouvrier_interne` (
  `id` varchar(191) NOT NULL,
  `nom` varchar(191) NOT NULL,
  `prenom` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `telephone` varchar(191) DEFAULT NULL,
  `poste` varchar(191) DEFAULT NULL,
  `actif` boolean NOT NULL DEFAULT true,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tickets SAV
CREATE TABLE `ticket_sav` (
  `id` varchar(191) NOT NULL,
  `chantierId` varchar(191) DEFAULT NULL,
  `numTicket` varchar(191) NOT NULL,
  `titre` varchar(191) NOT NULL,
  `nomLibre` varchar(191) DEFAULT NULL,
  `description` text NOT NULL,
  `type` enum('DEFAUT_CONFORMITE','MALFACON','USURE_PREMATUREE','MAINTENANCE','REPARATION','RETOUCHE','AUTRE') NOT NULL,
  `priorite` enum('CRITIQUE','HAUTE','NORMALE','BASSE') NOT NULL DEFAULT 'NORMALE',
  `statut` enum('NOUVEAU','EN_ATTENTE','ASSIGNE','PLANIFIE','EN_COURS','EN_ATTENTE_PIECES','EN_ATTENTE_VALIDATION','RESOLU','CLOS','ANNULE') NOT NULL DEFAULT 'NOUVEAU',
  `localisation` varchar(191) DEFAULT NULL,
  `adresseIntervention` varchar(191) DEFAULT NULL,
  `coordonnees` json DEFAULT NULL,
  `dateDemande` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `dateInterventionSouhaitee` datetime(3) DEFAULT NULL,
  `datePlanifiee` datetime(3) DEFAULT NULL,
  `dateIntervention` datetime(3) DEFAULT NULL,
  `dateResolution` datetime(3) DEFAULT NULL,
  `dateCloture` datetime(3) DEFAULT NULL,
  `technicienAssignId` varchar(191) DEFAULT NULL,
  `ouvrierInterneAssignId` varchar(191) DEFAULT NULL,
  `equipeAssignId` varchar(191) DEFAULT NULL,
  `soustraitantAssignId` varchar(191) DEFAULT NULL,
  `coutEstime` double DEFAULT 0,
  `coutReel` double DEFAULT 0,
  `createdBy` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `contactNom` varchar(191) DEFAULT NULL,
  `contactTelephone` varchar(191) DEFAULT NULL,
  `contactEmail` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TicketSAV_numTicket_key` (`numTicket`),
  KEY `TicketSAV_chantierId_idx` (`chantierId`),
  KEY `TicketSAV_statut_idx` (`statut`),
  KEY `TicketSAV_technicienAssignId_idx` (`technicienAssignId`),
  KEY `TicketSAV_ouvrierInterneAssignId_idx` (`ouvrierInterneAssignId`),
  KEY `TicketSAV_soustraitantAssignId_idx` (`soustraitantAssignId`),
  KEY `TicketSAV_createdBy_idx` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLES DE RELATION
-- =====================================================

-- Table des tâches ouvriers internes
CREATE TABLE `task_ouvrier_interne` (
  `id` varchar(191) NOT NULL,
  `taskId` varchar(191) NOT NULL,
  `ouvrierInterneId` varchar(191) NOT NULL,
  `assignedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TaskOuvrierInterne_taskId_ouvrierInterneId_key` (`taskId`,`ouvrierInterneId`),
  KEY `TaskOuvrierInterne_ouvrierInterneId_idx` (`ouvrierInterneId`),
  CONSTRAINT `TaskOuvrierInterne_ouvrierInterneId_fkey` FOREIGN KEY (`ouvrierInterneId`) REFERENCES `ouvrier_interne` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TaskOuvrierInterne_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tâches sous-traitants
CREATE TABLE `task_soustraitant` (
  `id` varchar(191) NOT NULL,
  `taskId` varchar(191) NOT NULL,
  `soustraitantId` varchar(191) NOT NULL,
  `assignedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `TaskSousTraitant_taskId_soustraitantId_key` (`taskId`,`soustraitantId`),
  KEY `TaskSousTraitant_soustraitantId_idx` (`soustraitantId`),
  CONSTRAINT `TaskSousTraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TaskSousTraitant_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLES D'AUTHENTIFICATION
-- =====================================================

-- Table des comptes (NextAuth)
CREATE TABLE `account` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `providerAccountId` varchar(191) NOT NULL,
  `refresh_token` text,
  `access_token` text,
  `expires_at` int DEFAULT NULL,
  `token_type` varchar(191) DEFAULT NULL,
  `scope` varchar(191) DEFAULT NULL,
  `id_token` text,
  `session_state` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Account_provider_providerAccountId_key` (`provider`,`providerAccountId`),
  KEY `account_userId_fkey` (`userId`),
  CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des sessions (NextAuth)
CREATE TABLE `session` (
  `id` varchar(191) NOT NULL,
  `sessionToken` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Session_sessionToken_key` (`sessionToken`),
  KEY `session_userId_fkey` (`userId`),
  CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tokens de vérification (NextAuth)
CREATE TABLE `verificationtoken` (
  `identifier` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expires` datetime(3) NOT NULL,
  UNIQUE KEY `VerificationToken_identifier_token_key` (`identifier`,`token`),
  UNIQUE KEY `VerificationToken_token_key` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLES DE CHAT ET MESSAGERIE
-- =====================================================

-- Table des conversations
CREATE TABLE `chat` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `isGroup` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des messages
CREATE TABLE `chat_message` (
  `id` varchar(191) NOT NULL,
  `chatId` varchar(191) NOT NULL,
  `senderId` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `read` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `fileUrl` varchar(191) DEFAULT NULL,
  `fileName` varchar(191) DEFAULT NULL,
  `fileType` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ChatMessage_chatId_idx` (`chatId`),
  KEY `ChatMessage_senderId_idx` (`senderId`),
  CONSTRAINT `ChatMessage_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chat` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des participants aux conversations
CREATE TABLE `chat_participant` (
  `id` varchar(191) NOT NULL,
  `chatId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `isAdmin` boolean NOT NULL DEFAULT false,
  `lastReadAt` datetime(3) DEFAULT NULL,
  `joinedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ChatParticipant_chatId_userId_key` (`chatId`,`userId`),
  KEY `ChatParticipant_chatId_idx` (`chatId`),
  KEY `ChatParticipant_userId_idx` (`userId`),
  CONSTRAINT `ChatParticipant_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chat` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ChatParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLES DE RAG (Recherche Assistée par Génération)
-- =====================================================

-- Table des conversations RAG
CREATE TABLE `ragconversations` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `messages` longtext NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ragconversations_userId_fkey` (`userId`),
  CONSTRAINT `ragconversations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des chunks de documents
CREATE TABLE `documentchunks` (
  `id` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `metadata` text NOT NULL,
  `embedding` text,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLES DE TEMPLATES
-- =====================================================

-- Table des templates de contrats
CREATE TABLE `contract_templates` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `htmlContent` longtext NOT NULL,
  `isActive` boolean NOT NULL DEFAULT false,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ContractTemplate_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
