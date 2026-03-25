-- CreateTable
CREATE TABLE `bon_preparation` (
    `id` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `localisation` VARCHAR(191) NULL,
    `statut` VARCHAR(191) NOT NULL DEFAULT 'A_FAIRE',
    `magasinierId` VARCHAR(191) NOT NULL,
    `creePar` VARCHAR(191) NOT NULL,
    `lignes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bon_preparation_magasinierId_idx`(`magasinierId`),
    INDEX `bon_preparation_statut_idx`(`statut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bon_preparation` ADD CONSTRAINT `bon_preparation_magasinierId_fkey` FOREIGN KEY (`magasinierId`) REFERENCES `magasinier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bon_preparation` ADD CONSTRAINT `bon_preparation_creePar_fkey` FOREIGN KEY (`creePar`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
