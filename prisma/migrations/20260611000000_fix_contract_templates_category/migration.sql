-- La table contract_templates n'a jamais eu de migration (créée par db push à l'origine).
-- Cette migration garantit que la table, la colonne category et l'enum complet
-- existent en production — sinon les templates CGV retombent en CONTRAT et
-- l'activation d'un template désactive celui de l'autre catégorie.

CREATE TABLE IF NOT EXISTS `contract_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `htmlContent` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `category` ENUM('CONTRAT', 'CGV') NOT NULL DEFAULT 'CONTRAT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `contract_templates_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Si la table existait sans la colonne category (schéma d'avant nov. 2025)
ALTER TABLE `contract_templates`
    ADD COLUMN IF NOT EXISTS `category` ENUM('CONTRAT', 'CGV') NOT NULL DEFAULT 'CONTRAT';

-- Si la colonne existait avec un enum incomplet (sans CGV), l'élargir.
-- MODIFY est idempotent : sans effet si la définition est déjà correcte.
ALTER TABLE `contract_templates`
    MODIFY COLUMN `category` ENUM('CONTRAT', 'CGV') NOT NULL DEFAULT 'CONTRAT';

-- Réparer les valeurs invalides éventuelles (MariaDB insère '' quand on écrit
-- une valeur hors enum en mode non strict)
UPDATE `contract_templates`
SET `category` = 'CONTRAT'
WHERE `category` IS NULL OR `category` NOT IN ('CONTRAT', 'CGV');
