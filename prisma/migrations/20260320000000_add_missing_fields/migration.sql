-- Migration: ajout des champs manquants non inclus dans les migrations précédentes

-- Champs latitude/longitude sur Chantier (ajoutés via prisma db push sans migration)
ALTER TABLE `Chantier`
  ADD COLUMN IF NOT EXISTS `latitude` DOUBLE NULL,
  ADD COLUMN IF NOT EXISTS `longitude` DOUBLE NULL;

-- Table documentchunks pour le RAG
CREATE TABLE IF NOT EXISTS `documentchunks` (
  `id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `metadata` TEXT NOT NULL,
  `embedding` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
