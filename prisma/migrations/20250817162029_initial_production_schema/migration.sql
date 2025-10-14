-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `logo` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_task_types` (
    `id` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'administrative',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_task_types_taskType_key`(`taskType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admintask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `completedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `taskType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,

    INDEX `AdminTask_chantierId_idx`(`chantierId`),
    INDEX `AdminTask_completedBy_idx`(`completedBy`),
    UNIQUE INDEX `AdminTask_chantierId_taskType_key`(`chantierId`, `taskType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pret` (
    `id` VARCHAR(191) NOT NULL,
    `machineId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `datePret` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateRetourPrevue` DATETIME(3) NOT NULL,
    `dateRetourEffective` DATETIME(3) NULL,
    `statut` ENUM('EN_COURS', 'TERMINE') NOT NULL DEFAULT 'EN_COURS',
    `commentaire` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `emprunteur` VARCHAR(191) NOT NULL,

    INDEX `Pret_machineId_idx`(`machineId`),
    INDEX `Pret_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soustraitant` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `adresse` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `tva` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `SousTraitant_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contrat` (
    `id` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateGeneration` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateSignature` DATETIME(3) NULL,
    `estSigne` BOOLEAN NOT NULL DEFAULT false,
    `token` VARCHAR(191) NULL,

    UNIQUE INDEX `contrat_token_key`(`token`),
    INDEX `contrat_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fiches_techniques` (
    `id` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `categorie` VARCHAR(191) NOT NULL,
    `sousCategorie` VARCHAR(191) NULL,
    `fichierUrl` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `referenceCSC` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `dateCommande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 20,
    `sousTotal` DOUBLE NOT NULL DEFAULT 0,
    `totalOptions` DOUBLE NOT NULL DEFAULT 0,
    `tva` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'BROUILLON',
    `estVerrouillee` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Commande_chantierId_idx`(`chantierId`),
    INDEX `Commande_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lignecommande` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeId` INTEGER NOT NULL,
    `ordre` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `estOption` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LigneCommande_commandeId_idx`(`commandeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaires` TEXT NULL,
    `estFinalise` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `mois` VARCHAR(191) NULL,

    INDEX `etat_avancement_chantierId_idx`(`chantierId`),
    UNIQUE INDEX `etat_avancement_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `ligneCommandeId` INTEGER NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,

    INDEX `ligne_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avenant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `avenant_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companysettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'COMPANY_SETTINGS',
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tva` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `emailFrom` VARCHAR(191) NULL,
    `emailFromName` VARCHAR(191) NULL,
    `emailHost` VARCHAR(191) NULL,
    `emailPassword` VARCHAR(191) NULL,
    `emailPort` VARCHAR(191) NULL,
    `emailSecure` BOOLEAN NULL DEFAULT false,
    `emailUser` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commande_soustraitant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `dateCommande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NULL,
    `tauxTVA` DOUBLE NOT NULL DEFAULT 0,
    `sousTotal` DOUBLE NOT NULL DEFAULT 0,
    `tva` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'BROUILLON',
    `estVerrouillee` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commande_soustraitant_chantierId_idx`(`chantierId`),
    INDEX `commande_soustraitant_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_commande_soustraitant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commandeSousTraitantId` INTEGER NOT NULL,
    `ordre` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'QP',
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_commande_soustraitant_commandeSousTraitantId_idx`(`commandeSousTraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avenant_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `avenant_soustraitant_etat_avancement_soustraitantEtatAvancem_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ligne_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `article` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `quantitePrecedente` DOUBLE NOT NULL DEFAULT 0,
    `quantiteActuelle` DOUBLE NOT NULL DEFAULT 0,
    `quantiteTotale` DOUBLE NOT NULL DEFAULT 0,
    `montantPrecedent` DOUBLE NOT NULL DEFAULT 0,
    `montantActuel` DOUBLE NOT NULL DEFAULT 0,
    `montantTotal` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_soustraitant_etat_avancement_soustraitantEtatAvancemen_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentaires` TEXT NULL,
    `estFinalise` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `commandeSousTraitantId` INTEGER NULL,
    `etatAvancementId` INTEGER NOT NULL,

    INDEX `soustraitant_etat_avancement_commandeSousTraitantId_idx`(`commandeSousTraitantId`),
    INDEX `soustraitant_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    INDEX `soustraitant_etat_avancement_soustraitantId_idx`(`soustraitantId`),
    UNIQUE INDEX `soustraitant_etat_avancement_etatAvancementId_soustraitantId_key`(`etatAvancementId`, `soustraitantId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_soustraitant_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `soustraitantEtatAvancementId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `dateAjout` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_soustraitant_etat_avancement_soustraitantEtatAvancemen_idx`(`soustraitantEtatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `depense` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montant` DOUBLE NOT NULL,
    `description` TEXT NOT NULL,
    `categorie` VARCHAR(191) NOT NULL,
    `fournisseur` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `justificatif` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `depense_chantierId_idx`(`chantierId`),
    INDEX `depense_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `stickyNotes` TEXT NULL,
    `todos` TEXT NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'notes',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_notes_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rack` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `lignes` INTEGER NOT NULL,
    `colonnes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emplacement` (
    `id` VARCHAR(191) NOT NULL,
    `rackId` VARCHAR(191) NOT NULL,
    `ligne` INTEGER NOT NULL,
    `colonne` INTEGER NOT NULL,
    `codeQR` VARCHAR(191) NOT NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'libre',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emplacement_codeQR_key`(`codeQR`),
    INDEX `emplacement_rackId_idx`(`rackId`),
    UNIQUE INDEX `emplacement_rackId_ligne_colonne_key`(`rackId`, `ligne`, `colonne`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiau` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantite` INTEGER NOT NULL DEFAULT 1,
    `codeQR` VARCHAR(191) NULL,
    `emplacementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materiau_codeQR_key`(`codeQR`),
    INDEX `materiau_emplacementId_idx`(`emplacementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Avenant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `marcheId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Avenant_marcheId_fkey`(`marcheId`),
    UNIQUE INDEX `Avenant_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chantier` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `numeroIdentification` VARCHAR(191) NULL,
    `nomChantier` VARCHAR(191) NOT NULL,
    `dateCommencement` DATETIME(3) NULL,
    `dateFinPrevue` DATETIME(3) NULL,
    `etatChantier` VARCHAR(191) NULL,
    `clientAdresse` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `clientNom` VARCHAR(191) NULL,
    `clientTelephone` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `adresseChantier` VARCHAR(191) NULL,
    `avancement` DOUBLE NULL,
    `budget` DOUBLE NULL,
    `couleur` VARCHAR(191) NULL,
    `dateAcceptation` DATETIME(3) NULL,
    `dateDebutPreparation` DATETIME(3) NULL,
    `dateFinEffective` DATETIME(3) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `dureeEnJours` INTEGER NULL,
    `dateDebut` DATETIME(3) NULL,
    `dateFinReelle` DATETIME(3) NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'A_VENIR',
    `typeDuree` VARCHAR(191) NOT NULL DEFAULT 'CALENDRIER',
    `villeChantier` VARCHAR(191) NULL,

    UNIQUE INDEX `Chantier_chantierId_key`(`chantierId`),
    UNIQUE INDEX `Chantier_numeroIdentification_key`(`numeroIdentification`),
    INDEX `Chantier_clientId_idx`(`clientId`),
    INDEX `Chantier_contactId_idx`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `adresse` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `fonction` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,

    INDEX `contacts_clientId_fkey`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `metadata` JSON NULL,
    `estPlan` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Document_chantierId_idx`(`chantierId`),
    INDEX `Document_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentOuvrier` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateExpiration` DATETIME(3) NULL,
    `ouvrierId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentOuvrier_ouvrierId_idx`(`ouvrierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Etat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Etat_chantierId_numero_key`(`chantierId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneEtat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatId` INTEGER NOT NULL,
    `ligneMarcheId` INTEGER NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LigneEtat_etatId_idx`(`etatId`),
    INDEX `LigneEtat_ligneMarcheId_idx`(`ligneMarcheId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LigneMarche` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `article` INTEGER NOT NULL,
    `descriptif` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL,
    `quantite` DOUBLE NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `marcheId` INTEGER NOT NULL,
    `chantierId` VARCHAR(191) NULL,

    INDEX `LigneMarche_marcheId_idx`(`marcheId`),
    INDEX `LigneMarche_chantierId_fkey`(`chantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Machine` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `modele` VARCHAR(191) NOT NULL,
    `numeroSerie` VARCHAR(191) NULL,
    `localisation` VARCHAR(191) NOT NULL,
    `statut` ENUM('DISPONIBLE', 'PRETE', 'EN_PANNE', 'EN_REPARATION', 'MANQUE_CONSOMMABLE') NOT NULL DEFAULT 'DISPONIBLE',
    `dateAchat` DATETIME(3) NULL,
    `qrCode` VARCHAR(191) NOT NULL,
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Machine_qrCode_key`(`qrCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Marche` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `dateImport` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `montantTotal` DOUBLE NOT NULL,

    UNIQUE INDEX `Marche_chantierId_key`(`chantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Note` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `contenu` TEXT NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Note_chantierId_idx`(`chantierId`),
    INDEX `Note_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ouvrier` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `dateEntree` DATETIME(3) NOT NULL,
    `poste` VARCHAR(191) NOT NULL,
    `sousTraitantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ouvrier_sousTraitantId_idx`(`sousTraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ouvrier_interne` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `poste` VARCHAR(191) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_access_pin` (
    `id` VARCHAR(191) NOT NULL,
    `subjectType` ENUM('OUVRIER_INTERNE', 'SOUSTRAITANT') NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `codePIN` VARCHAR(191) NOT NULL,
    `estActif` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `public_access_pin_codePIN_key`(`codePIN`),
    INDEX `public_access_pin_subjectType_subjectId_idx`(`subjectType`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tache` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tache_chantierId_id_key`(`chantierId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'USER', 'BOT') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bonRegie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dates` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `nomChantier` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `tempsPreparation` DOUBLE NULL,
    `tempsTrajets` DOUBLE NULL,
    `tempsChantier` DOUBLE NULL,
    `nombreTechniciens` INTEGER NULL,
    `materiaux` VARCHAR(191) NULL,
    `nomSignataire` VARCHAR(191) NOT NULL,
    `signature` TEXT NOT NULL,
    `dateSignature` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `chantierId` VARCHAR(191) NULL,

    INDEX `bonRegie_chantierId_idx`(`chantierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reception_chantier` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NOT NULL,
    `dateCreation` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateLimite` DATETIME(3) NOT NULL,
    `codePIN` VARCHAR(191) NULL,
    `estFinalise` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reception_chantier_chantierId_idx`(`chantierId`),
    INDEX `reception_chantier_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `remarque_reception` (
    `id` VARCHAR(191) NOT NULL,
    `receptionId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `localisation` VARCHAR(191) NULL,
    `estResolue` BOOLEAN NOT NULL DEFAULT false,
    `dateResolution` DATETIME(3) NULL,
    `estValidee` BOOLEAN NOT NULL DEFAULT false,
    `estRejetee` BOOLEAN NOT NULL DEFAULT false,
    `raisonRejet` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `coordonneesPlan` JSON NULL,
    `planId` INTEGER NULL,
    `numeroSequentiel` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,

    INDEX `remarque_reception_receptionId_idx`(`receptionId`),
    INDEX `remarque_reception_planId_idx`(`planId`),
    INDEX `remarque_reception_createdById_idx`(`createdById`),
    UNIQUE INDEX `remarque_reception_receptionId_numeroSequentiel_key`(`receptionId`, `numeroSequentiel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_remarque` (
    `id` VARCHAR(191) NOT NULL,
    `remarqueId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `estPreuve` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_remarque_remarqueId_idx`(`remarqueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tag_remarque` (
    `id` VARCHAR(191) NOT NULL,
    `remarqueId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `typeTag` VARCHAR(191) NOT NULL DEFAULT 'PERSONNE',

    INDEX `tag_remarque_remarqueId_idx`(`remarqueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isGroup` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_message` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `fileType` VARCHAR(191) NULL,

    INDEX `chat_message_chatId_idx`(`chatId`),
    INDEX `chat_message_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participant` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `lastReadAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_participant_chatId_idx`(`chatId`),
    INDEX `chat_participant_userId_idx`(`userId`),
    UNIQUE INDEX `chat_participant_chatId_userId_key`(`chatId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `soustraitant_pin` (
    `id` VARCHAR(191) NOT NULL,
    `receptionId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NULL,
    `codePIN` VARCHAR(191) NOT NULL,
    `estInterne` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `soustraitant_pin_codePIN_key`(`codePIN`),
    INDEX `soustraitant_pin_receptionId_idx`(`receptionId`),
    INDEX `soustraitant_pin_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tags_nom_key`(`nom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_sav` (
    `id` VARCHAR(191) NOT NULL,
    `chantierId` VARCHAR(191) NULL,
    `numTicket` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `nomLibre` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('DEFAUT_CONFORMITE', 'MALFACON', 'USURE_PREMATUREE', 'MAINTENANCE', 'REPARATION', 'RETOUCHE', 'AUTRE') NOT NULL,
    `priorite` ENUM('CRITIQUE', 'HAUTE', 'NORMALE', 'BASSE') NOT NULL DEFAULT 'NORMALE',
    `statut` ENUM('NOUVEAU', 'EN_ATTENTE', 'ASSIGNE', 'PLANIFIE', 'EN_COURS', 'EN_ATTENTE_PIECES', 'EN_ATTENTE_VALIDATION', 'RESOLU', 'CLOS', 'ANNULE') NOT NULL DEFAULT 'NOUVEAU',
    `localisation` VARCHAR(191) NULL,
    `adresseIntervention` VARCHAR(191) NULL,
    `coordonnees` JSON NULL,
    `dateDemande` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateInterventionSouhaitee` DATETIME(3) NULL,
    `datePlanifiee` DATETIME(3) NULL,
    `dateIntervention` DATETIME(3) NULL,
    `dateResolution` DATETIME(3) NULL,
    `dateCloture` DATETIME(3) NULL,
    `technicienAssignId` VARCHAR(191) NULL,
    `ouvrierInterneAssignId` VARCHAR(191) NULL,
    `equipeAssignId` VARCHAR(191) NULL,
    `soustraitantAssignId` VARCHAR(191) NULL,
    `coutEstime` DOUBLE NULL DEFAULT 0,
    `coutReel` DOUBLE NULL DEFAULT 0,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `contactNom` VARCHAR(191) NULL,
    `contactTelephone` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,

    UNIQUE INDEX `ticket_sav_numTicket_key`(`numTicket`),
    INDEX `ticket_sav_chantierId_idx`(`chantierId`),
    INDEX `ticket_sav_statut_idx`(`statut`),
    INDEX `ticket_sav_technicienAssignId_idx`(`technicienAssignId`),
    INDEX `ticket_sav_ouvrierInterneAssignId_idx`(`ouvrierInterneAssignId`),
    INDEX `ticket_sav_soustraitantAssignId_idx`(`soustraitantAssignId`),
    INDEX `ticket_sav_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `start` DATETIME(3) NOT NULL,
    `end` DATETIME(3) NOT NULL,
    `status` ENUM('PREVU', 'EN_COURS', 'TERMINE') NOT NULL DEFAULT 'PREVU',
    `chantierId` VARCHAR(191) NULL,
    `savTicketId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `task_start_idx`(`start`),
    INDEX `task_end_idx`(`end`),
    INDEX `task_chantierId_idx`(`chantierId`),
    INDEX `task_savTicketId_idx`(`savTicketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_ouvrier_interne` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `ouvrierInterneId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_ouvrier_interne_ouvrierInterneId_idx`(`ouvrierInterneId`),
    UNIQUE INDEX `task_ouvrier_interne_taskId_ouvrierInterneId_key`(`taskId`, `ouvrierInterneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_soustraitant` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_soustraitant_soustraitantId_idx`(`soustraitantId`),
    UNIQUE INDEX `task_soustraitant_taskId_soustraitantId_key`(`taskId`, `soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_document` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_document_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intervention_sav` (
    `id` VARCHAR(191) NOT NULL,
    `ticketSAVId` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `type` ENUM('DIAGNOSTIC', 'REPARATION', 'REMPLACEMENT', 'RETOUCHE', 'MAINTENANCE', 'CONTROLE') NOT NULL DEFAULT 'DIAGNOSTIC',
    `statut` ENUM('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'REPORTEE', 'ANNULEE') NOT NULL DEFAULT 'PLANIFIEE',
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NULL,
    `dureeReelleMinutes` INTEGER NULL,
    `technicienId` VARCHAR(191) NOT NULL,
    `equipeId` VARCHAR(191) NULL,
    `materielsUtilises` TEXT NULL,
    `coutMateriel` DOUBLE NULL DEFAULT 0,
    `coutMainOeuvre` DOUBLE NULL DEFAULT 0,
    `resultat` TEXT NULL,
    `prochainAction` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `intervention_sav_ticketSAVId_idx`(`ticketSAVId`),
    INDEX `intervention_sav_technicienId_idx`(`technicienId`),
    INDEX `intervention_sav_dateDebut_idx`(`dateDebut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_sav` (
    `id` VARCHAR(191) NOT NULL,
    `ticketSAVId` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `nomOriginal` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `type` ENUM('FACTURE', 'DEVIS', 'RAPPORT', 'PLAN', 'FICHE_TECHNIQUE', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
    `description` TEXT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `document_sav_ticketSAVId_idx`(`ticketSAVId`),
    INDEX `document_sav_uploadedBy_idx`(`uploadedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_sav` (
    `id` VARCHAR(191) NOT NULL,
    `ticketSAVId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `nomOriginal` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `type` ENUM('CONSTAT', 'AVANT_INTERVENTION', 'PENDANT_INTERVENTION', 'APRES_INTERVENTION', 'DETAIL', 'VUE_ENSEMBLE') NOT NULL DEFAULT 'CONSTAT',
    `coordonnees` JSON NULL,
    `orientation` DOUBLE NULL,
    `prisePar` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_sav_ticketSAVId_idx`(`ticketSAVId`),
    INDEX `photo_sav_prisePar_idx`(`prisePar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_intervention_sav` (
    `id` VARCHAR(191) NOT NULL,
    `interventionSAVId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `nomOriginal` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `type` ENUM('CONSTAT', 'AVANT_INTERVENTION', 'PENDANT_INTERVENTION', 'APRES_INTERVENTION', 'DETAIL', 'VUE_ENSEMBLE') NOT NULL DEFAULT 'CONSTAT',
    `momentPrise` ENUM('AVANT', 'PENDANT', 'APRES') NOT NULL DEFAULT 'PENDANT',
    `prisePar` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_intervention_sav_interventionSAVId_idx`(`interventionSAVId`),
    INDEX `photo_intervention_sav_prisePar_idx`(`prisePar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commentaire_sav` (
    `id` VARCHAR(191) NOT NULL,
    `ticketSAVId` VARCHAR(191) NOT NULL,
    `contenu` TEXT NOT NULL,
    `type` ENUM('COMMENTAIRE', 'NOTE_TECHNIQUE', 'INSTRUCTION', 'FEEDBACK_CLIENT', 'NOTE_INTERNE') NOT NULL DEFAULT 'COMMENTAIRE',
    `estInterne` BOOLEAN NOT NULL DEFAULT false,
    `auteurId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commentaire_sav_ticketSAVId_idx`(`ticketSAVId`),
    INDEX `commentaire_sav_auteurId_idx`(`auteurId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificationtoken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verificationtoken_token_key`(`token`),
    UNIQUE INDEX `verificationtoken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DocumentTags` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DocumentTags_AB_unique`(`A`, `B`),
    INDEX `_DocumentTags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admintask` ADD CONSTRAINT `AdminTask_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admintask` ADD CONSTRAINT `AdminTask_completedBy_fkey` FOREIGN KEY (`completedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pret` ADD CONSTRAINT `Pret_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `Machine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pret` ADD CONSTRAINT `Pret_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contrat` ADD CONSTRAINT `contrat_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande` ADD CONSTRAINT `commande_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignecommande` ADD CONSTRAINT `lignecommande_commandeId_fkey` FOREIGN KEY (`commandeId`) REFERENCES `commande`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etat_avancement` ADD CONSTRAINT `etat_avancement_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_etat_avancement` ADD CONSTRAINT `ligne_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avenant_etat_avancement` ADD CONSTRAINT `avenant_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande_soustraitant` ADD CONSTRAINT `commande_soustraitant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commande_soustraitant` ADD CONSTRAINT `commande_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_commande_soustraitant` ADD CONSTRAINT `ligne_commande_soustraitant_commandeSousTraitantId_fkey` FOREIGN KEY (`commandeSousTraitantId`) REFERENCES `commande_soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avenant_soustraitant_etat_avancement` ADD CONSTRAINT `avenant_soustraitant_etat_avancement_soustraitantEtatAvance_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ligne_soustraitant_etat_avancement` ADD CONSTRAINT `ligne_soustraitant_etat_avancement_soustraitantEtatAvanceme_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_commandeSousTraitantId_fkey` FOREIGN KEY (`commandeSousTraitantId`) REFERENCES `commande_soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_soustraitant_etat_avancement` ADD CONSTRAINT `photo_soustraitant_etat_avancement_soustraitantEtatAvanceme_fkey` FOREIGN KEY (`soustraitantEtatAvancementId`) REFERENCES `soustraitant_etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emplacement` ADD CONSTRAINT `emplacement_rackId_fkey` FOREIGN KEY (`rackId`) REFERENCES `rack`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materiau` ADD CONSTRAINT `materiau_emplacementId_fkey` FOREIGN KEY (`emplacementId`) REFERENCES `emplacement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avenant` ADD CONSTRAINT `Avenant_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Avenant` ADD CONSTRAINT `Avenant_marcheId_fkey` FOREIGN KEY (`marcheId`) REFERENCES `Marche`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chantier` ADD CONSTRAINT `Chantier_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chantier` ADD CONSTRAINT `Chantier_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentOuvrier` ADD CONSTRAINT `DocumentOuvrier_ouvrierId_fkey` FOREIGN KEY (`ouvrierId`) REFERENCES `Ouvrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Etat` ADD CONSTRAINT `Etat_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneEtat` ADD CONSTRAINT `LigneEtat_etatId_fkey` FOREIGN KEY (`etatId`) REFERENCES `Etat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneEtat` ADD CONSTRAINT `LigneEtat_ligneMarcheId_fkey` FOREIGN KEY (`ligneMarcheId`) REFERENCES `LigneMarche`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneMarche` ADD CONSTRAINT `LigneMarche_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LigneMarche` ADD CONSTRAINT `LigneMarche_marcheId_fkey` FOREIGN KEY (`marcheId`) REFERENCES `Marche`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Marche` ADD CONSTRAINT `Marche_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonRegie` ADD CONSTRAINT `bonRegie_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_chantier` ADD CONSTRAINT `reception_chantier_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reception_chantier` ADD CONSTRAINT `reception_chantier_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remarque_reception` ADD CONSTRAINT `remarque_reception_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remarque_reception` ADD CONSTRAINT `remarque_reception_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remarque_reception` ADD CONSTRAINT `remarque_reception_receptionId_fkey` FOREIGN KEY (`receptionId`) REFERENCES `reception_chantier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_remarque` ADD CONSTRAINT `photo_remarque_remarqueId_fkey` FOREIGN KEY (`remarqueId`) REFERENCES `remarque_reception`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tag_remarque` ADD CONSTRAINT `tag_remarque_remarqueId_fkey` FOREIGN KEY (`remarqueId`) REFERENCES `remarque_reception`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_message` ADD CONSTRAINT `chat_message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participant` ADD CONSTRAINT `chat_participant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_pin` ADD CONSTRAINT `soustraitant_pin_receptionId_fkey` FOREIGN KEY (`receptionId`) REFERENCES `reception_chantier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `soustraitant_pin` ADD CONSTRAINT `soustraitant_pin_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sav` ADD CONSTRAINT `ticket_sav_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sav` ADD CONSTRAINT `ticket_sav_technicienAssignId_fkey` FOREIGN KEY (`technicienAssignId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sav` ADD CONSTRAINT `ticket_sav_ouvrierInterneAssignId_fkey` FOREIGN KEY (`ouvrierInterneAssignId`) REFERENCES `ouvrier_interne`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sav` ADD CONSTRAINT `ticket_sav_soustraitantAssignId_fkey` FOREIGN KEY (`soustraitantAssignId`) REFERENCES `soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_sav` ADD CONSTRAINT `ticket_sav_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_chantierId_fkey` FOREIGN KEY (`chantierId`) REFERENCES `Chantier`(`chantierId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_savTicketId_fkey` FOREIGN KEY (`savTicketId`) REFERENCES `ticket_sav`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_ouvrier_interne` ADD CONSTRAINT `task_ouvrier_interne_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_ouvrier_interne` ADD CONSTRAINT `task_ouvrier_interne_ouvrierInterneId_fkey` FOREIGN KEY (`ouvrierInterneId`) REFERENCES `ouvrier_interne`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_soustraitant` ADD CONSTRAINT `task_soustraitant_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_soustraitant` ADD CONSTRAINT `task_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_document` ADD CONSTRAINT `task_document_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intervention_sav` ADD CONSTRAINT `intervention_sav_ticketSAVId_fkey` FOREIGN KEY (`ticketSAVId`) REFERENCES `ticket_sav`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `intervention_sav` ADD CONSTRAINT `intervention_sav_technicienId_fkey` FOREIGN KEY (`technicienId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_sav` ADD CONSTRAINT `document_sav_ticketSAVId_fkey` FOREIGN KEY (`ticketSAVId`) REFERENCES `ticket_sav`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_sav` ADD CONSTRAINT `document_sav_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_sav` ADD CONSTRAINT `photo_sav_ticketSAVId_fkey` FOREIGN KEY (`ticketSAVId`) REFERENCES `ticket_sav`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_sav` ADD CONSTRAINT `photo_sav_prisePar_fkey` FOREIGN KEY (`prisePar`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_intervention_sav` ADD CONSTRAINT `photo_intervention_sav_interventionSAVId_fkey` FOREIGN KEY (`interventionSAVId`) REFERENCES `intervention_sav`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_intervention_sav` ADD CONSTRAINT `photo_intervention_sav_prisePar_fkey` FOREIGN KEY (`prisePar`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commentaire_sav` ADD CONSTRAINT `commentaire_sav_ticketSAVId_fkey` FOREIGN KEY (`ticketSAVId`) REFERENCES `ticket_sav`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commentaire_sav` ADD CONSTRAINT `commentaire_sav_auteurId_fkey` FOREIGN KEY (`auteurId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DocumentTags` ADD CONSTRAINT `_DocumentTags_A_fkey` FOREIGN KEY (`A`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DocumentTags` ADD CONSTRAINT `_DocumentTags_B_fkey` FOREIGN KEY (`B`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
