-- AlterTable
ALTER TABLE `companysettings` ADD COLUMN `renouvellementContratAuto` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `contrat` ADD COLUMN `dateEnvoi` DATETIME(3) NULL;

