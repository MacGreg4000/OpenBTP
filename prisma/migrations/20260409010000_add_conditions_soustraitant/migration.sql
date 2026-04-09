-- AlterTable: ajout des champs conditions tarifaires sur le sous-traitant
ALTER TABLE `soustraitant`
  ADD COLUMN `conditionsGenerales` TEXT NULL,
  ADD COLUMN `conditionsParticulieres` TEXT NULL;
