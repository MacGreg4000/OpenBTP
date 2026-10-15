-- AlterTable
ALTER TABLE `DocumentOuvrier` ADD COLUMN `precision` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `document_soustraitant` ADD COLUMN `precision` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Ouvrier` ADD COLUMN `nationalite` VARCHAR(191) NULL,
    ADD COLUMN `statut` VARCHAR(191) NULL;

