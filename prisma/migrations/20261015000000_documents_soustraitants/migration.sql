-- AlterTable
ALTER TABLE `soustraitant` ADD COLUMN `documentsRequisOuvrier` TEXT NULL,
    ADD COLUMN `documentsRequisSociete` TEXT NULL;

-- AlterTable
ALTER TABLE `DocumentOuvrier` ADD COLUMN `archive` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `archiveLe` DATETIME(3) NULL,
    ADD COLUMN `cheminNas` TEXT NULL;

-- AlterTable
ALTER TABLE `Ouvrier` ADD COLUMN `actif` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `document_soustraitant` (
    `id` VARCHAR(191) NOT NULL,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `dateExpiration` DATETIME(3) NULL,
    `archive` BOOLEAN NOT NULL DEFAULT false,
    `archiveLe` DATETIME(3) NULL,
    `cheminNas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `document_soustraitant_soustraitantId_idx`(`soustraitantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `document_soustraitant` ADD CONSTRAINT `document_soustraitant_soustraitantId_fkey` FOREIGN KEY (`soustraitantId`) REFERENCES `soustraitant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

