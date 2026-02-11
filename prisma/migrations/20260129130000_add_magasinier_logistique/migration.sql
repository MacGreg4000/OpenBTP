-- CreateTable
CREATE TABLE `magasinier` (
    `id` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tache_magasinier` (
    `id` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dateEncodage` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dateExecution` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statut` VARCHAR(191) NOT NULL DEFAULT 'A_FAIRE',
    `magasinierId` VARCHAR(191) NOT NULL,
    `creePar` VARCHAR(191) NOT NULL,
    `dateValidation` DATETIME(3) NULL,
    `commentaire` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tache_magasinier_magasinierId_idx`(`magasinierId`),
    INDEX `tache_magasinier_dateExecution_idx`(`dateExecution`),
    INDEX `tache_magasinier_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_tache_magasinier` (
    `id` VARCHAR(191) NOT NULL,
    `tacheId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `ordre` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_tache_magasinier_tacheId_idx`(`tacheId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `public_access_pin` MODIFY `subjectType` ENUM('OUVRIER_INTERNE', 'SOUSTRAITANT', 'MAGASINIER') NOT NULL;

-- AddForeignKey
ALTER TABLE `tache_magasinier` ADD CONSTRAINT `tache_magasinier_magasinierId_fkey` FOREIGN KEY (`magasinierId`) REFERENCES `magasinier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tache_magasinier` ADD CONSTRAINT `tache_magasinier_creePar_fkey` FOREIGN KEY (`creePar`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_tache_magasinier` ADD CONSTRAINT `photo_tache_magasinier_tacheId_fkey` FOREIGN KEY (`tacheId`) REFERENCES `tache_magasinier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
