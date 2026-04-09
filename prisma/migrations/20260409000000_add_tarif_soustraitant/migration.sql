-- CreateTable
CREATE TABLE `ligne_tarif_soustraitant` (
    `id` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `ordre` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'LIGNE',
    `article` VARCHAR(191) NULL,
    `descriptif` TEXT NOT NULL,
    `unite` VARCHAR(191) NULL,
    `prixUnitaire` DOUBLE NULL,
    `remarques` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ligne_tarif_soustraitant_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ligne_tarif_soustraitant` ADD CONSTRAINT `ligne_tarif_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
