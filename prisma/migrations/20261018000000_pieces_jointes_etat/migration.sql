-- CreateTable
CREATE TABLE `piece_jointe_etat_avancement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `etatAvancementId` INTEGER NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `taille` INTEGER NOT NULL,
    `ajoutePar` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `piece_jointe_etat_avancement_etatAvancementId_idx`(`etatAvancementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `piece_jointe_etat_avancement` ADD CONSTRAINT `piece_jointe_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

