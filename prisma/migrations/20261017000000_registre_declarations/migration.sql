-- CreateTable
CREATE TABLE `declaration_soustraitance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chantierId` VARCHAR(191) NOT NULL,
    `chantierNom` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `destinataire` VARCHAR(191) NOT NULL,
    `objet` TEXT NOT NULL,
    `contenuTexte` LONGTEXT NOT NULL,
    `contenuHtml` LONGTEXT NOT NULL,
    `soustraitants` LONGTEXT NOT NULL,
    `pieces` LONGTEXT NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `statut` VARCHAR(191) NOT NULL,
    `erreur` TEXT NULL,
    `envoyePar` VARCHAR(191) NULL,
    `envoyeParNom` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `declaration_soustraitance_chantierId_idx`(`chantierId`),
    INDEX `declaration_soustraitance_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

