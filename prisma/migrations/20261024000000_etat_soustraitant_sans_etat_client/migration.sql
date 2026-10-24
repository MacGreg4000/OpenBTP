-- Un état d'avancement sous-traitant ne dépend plus d'un état client :
-- lien facultatif, et supprimer un état client ne supprime plus les états sous-traitants.

-- DropForeignKey
ALTER TABLE `soustraitant_etat_avancement` DROP FOREIGN KEY `soustraitant_etat_avancement_etatAvancementId_fkey`;

-- AlterTable
ALTER TABLE `soustraitant_etat_avancement` MODIFY `etatAvancementId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `soustraitant_etat_avancement` ADD CONSTRAINT `soustraitant_etat_avancement_etatAvancementId_fkey` FOREIGN KEY (`etatAvancementId`) REFERENCES `etat_avancement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
