-- Rattachement d'un sous-traitant (indépendant) à un sous-traitant principal.
-- AlterTable
ALTER TABLE `soustraitant` ADD COLUMN `parentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `soustraitant_parentId_idx` ON `soustraitant`(`parentId`);

-- AddForeignKey
ALTER TABLE `soustraitant` ADD CONSTRAINT `soustraitant_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `soustraitant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

