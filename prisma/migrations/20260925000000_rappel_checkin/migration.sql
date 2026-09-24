-- AlterTable
ALTER TABLE `companysettings` ADD COLUMN `rappelCheckinEmailTest` VARCHAR(191) NULL,
    ADD COLUMN `rappelCheckinHeure` VARCHAR(191) NOT NULL DEFAULT '06:30',
    ADD COLUMN `rappelCheckinJoursFeries` TEXT NULL,
    ADD COLUMN `rappelCheckinMode` VARCHAR(191) NOT NULL DEFAULT 'DESACTIVE';

-- CreateTable
CREATE TABLE `rappel_checkin_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `canal` VARCHAR(191) NOT NULL DEFAULT 'EMAIL',
    `dateRappel` VARCHAR(191) NOT NULL,
    `declencheur` VARCHAR(191) NOT NULL,
    `modeTest` BOOLEAN NOT NULL DEFAULT false,
    `soustraitantId` VARCHAR(191) NOT NULL,
    `soustraitantNom` VARCHAR(191) NOT NULL,
    `destinataire` VARCHAR(191) NOT NULL,
    `destinataireReel` VARCHAR(191) NULL,
    `contratReference` VARCHAR(191) NULL,
    `contratVersion` VARCHAR(191) NULL,
    `objet` TEXT NOT NULL,
    `contenuTexte` LONGTEXT NOT NULL,
    `contenuHtml` LONGTEXT NOT NULL,
    `chantiersSnapshot` LONGTEXT NOT NULL,
    `lien` TEXT NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `statut` VARCHAR(191) NOT NULL,
    `erreur` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rappel_checkin_log_soustraitantId_dateRappel_idx`(`soustraitantId`, `dateRappel`),
    INDEX `rappel_checkin_log_dateRappel_idx`(`dateRappel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

