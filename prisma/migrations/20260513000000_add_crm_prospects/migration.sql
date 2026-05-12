-- CreateTable
CREATE TABLE `prospect_entreprise` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'AUTRE',
    `adresse` VARCHAR(191) NULL,
    `codePostal` VARCHAR(191) NULL,
    `ville` VARCHAR(191) NULL,
    `pays` VARCHAR(191) NULL DEFAULT 'Belgique',
    `telephone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `siteWeb` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prospect_entreprise_nom_idx`(`nom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prospect_contact` (
    `id` VARCHAR(191) NOT NULL,
    `entrepriseId` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prospect_contact_entrepriseId_idx`(`entrepriseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prospect_rappel` (
    `id` VARCHAR(191) NOT NULL,
    `entrepriseId` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dateRappel` DATETIME(3) NOT NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'EN_ATTENTE',
    `emailEnvoye` BOOLEAN NOT NULL DEFAULT false,
    `creePar` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prospect_rappel_entrepriseId_idx`(`entrepriseId`),
    INDEX `prospect_rappel_dateRappel_statut_idx`(`dateRappel`, `statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prospect_activite` (
    `id` VARCHAR(191) NOT NULL,
    `entrepriseId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creePar` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prospect_activite_entrepriseId_idx`(`entrepriseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `prospect_contact` ADD CONSTRAINT `prospect_contact_entrepriseId_fkey` FOREIGN KEY (`entrepriseId`) REFERENCES `prospect_entreprise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prospect_rappel` ADD CONSTRAINT `prospect_rappel_entrepriseId_fkey` FOREIGN KEY (`entrepriseId`) REFERENCES `prospect_entreprise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prospect_rappel` ADD CONSTRAINT `prospect_rappel_creePar_fkey` FOREIGN KEY (`creePar`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prospect_activite` ADD CONSTRAINT `prospect_activite_entrepriseId_fkey` FOREIGN KEY (`entrepriseId`) REFERENCES `prospect_entreprise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prospect_activite` ADD CONSTRAINT `prospect_activite_creePar_fkey` FOREIGN KEY (`creePar`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
