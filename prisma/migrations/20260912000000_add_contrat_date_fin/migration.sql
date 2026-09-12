-- AlterTable
ALTER TABLE `contrat` ADD COLUMN `dateFin` DATETIME(3) NULL;


-- Rétro-remplissage : les contrats déjà générés n'avaient cette échéance
-- écrite QUE dans le texte du PDF (dateGeneration + 1 an), jamais en base.
-- Sans ce calcul, ils resteraient sans date de fin affichable après migration.
UPDATE contrat SET dateFin = DATE_ADD(dateGeneration, INTERVAL 1 YEAR) WHERE dateFin IS NULL;
