-- AlterTable
ALTER TABLE `soustraitant` ADD COLUMN `rappelCheckinActif` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `representantEmail` VARCHAR(191) NULL,
    ADD COLUMN `representantFonction` VARCHAR(191) NULL,
    ADD COLUMN `representantGsm` VARCHAR(191) NULL,
    ADD COLUMN `representantNom` VARCHAR(191) NULL,
    ADD COLUMN `representantPrenom` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contrat` ADD COLUMN `templateVersion` VARCHAR(191) NULL;


-- Les sous-traitants ayant déjà un contrat-cadre signé sont inscrits au rappel
-- Checkinatwork (même règle qu'à la signature d'un nouveau contrat).
UPDATE soustraitant SET rappelCheckinActif = true
WHERE id IN (SELECT DISTINCT soustraitantId FROM contrat WHERE estSigne = true);
