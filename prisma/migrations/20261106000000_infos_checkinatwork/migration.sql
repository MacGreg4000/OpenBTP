-- Informations Checkinatwork : numéro national et numéro d'entreprise de
-- l'ouvrier, numéro du document (déclaration Limosa L-1). Ajouts uniquement.
-- AlterTable
ALTER TABLE `Ouvrier` ADD COLUMN `numeroNational` VARCHAR(191) NULL,
    ADD COLUMN `numeroEntreprise` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DocumentOuvrier` ADD COLUMN `numero` VARCHAR(191) NULL;
