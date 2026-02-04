-- AlterTable: add factureNumero to etat_avancement (nullable, no data loss)
ALTER TABLE `etat_avancement` ADD COLUMN `factureNumero` VARCHAR(191) NULL;
