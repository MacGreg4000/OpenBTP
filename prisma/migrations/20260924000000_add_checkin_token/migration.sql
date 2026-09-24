-- AlterTable
ALTER TABLE `companysettings` ADD COLUMN `checkinToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `companysettings_checkinToken_key` ON `companysettings`(`checkinToken`);

