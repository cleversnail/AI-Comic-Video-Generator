-- AlterTable
ALTER TABLE `characters` ADD COLUMN `lock_level` VARCHAR(191) NULL,
    ADD COLUMN `variants` JSON NULL,
    ADD COLUMN `view_images` JSON NULL;

-- AlterTable
ALTER TABLE `shots` ADD COLUMN `first_frame_url` TEXT NULL,
    ADD COLUMN `last_frame_url` TEXT NULL;
