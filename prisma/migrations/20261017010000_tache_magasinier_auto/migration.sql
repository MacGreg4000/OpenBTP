-- AlterTable
ALTER TABLE `tache_magasinier` ADD COLUMN `creeParMagasinier` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `creePar` VARCHAR(191) NULL;

