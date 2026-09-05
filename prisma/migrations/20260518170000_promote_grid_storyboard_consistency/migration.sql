-- Promote grid storyboard consistency into the production storyboard path.
-- Experiment rows are intentionally removed as database references only; media objects
-- and object storage files are not deleted.

CREATE TABLE `project_storyboard_blocking_artifacts` (
  `id` VARCHAR(191) NOT NULL,
  `storyboardId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `sourceVideoBlockId` VARCHAR(191) NULL,
  `groupIndex` INTEGER NULL,
  `prompt` LONGTEXT NULL,
  `imageUrl` TEXT NULL,
  `imageMediaId` VARCHAR(191) NULL,
  `candidateImages` TEXT NULL,
  `metadataJson` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `errorMessage` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `project_storyboard_blocking_artifacts_storyboardId_idx` ON `project_storyboard_blocking_artifacts`(`storyboardId`);
CREATE INDEX `project_storyboard_blocking_artifacts_kind_idx` ON `project_storyboard_blocking_artifacts`(`kind`);
CREATE INDEX `project_storyboard_blocking_artifacts_sourceVideoBlockId_idx` ON `project_storyboard_blocking_artifacts`(`sourceVideoBlockId`);
CREATE INDEX `project_storyboard_blocking_artifacts_imageMediaId_idx` ON `project_storyboard_blocking_artifacts`(`imageMediaId`);

ALTER TABLE `project_storyboard_blocking_artifacts`
  ADD CONSTRAINT `project_storyboard_blocking_artifacts_storyboardId_fkey`
  FOREIGN KEY (`storyboardId`) REFERENCES `project_storyboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_storyboard_blocking_artifacts`
  ADD CONSTRAINT `project_storyboard_blocking_artifacts_imageMediaId_fkey`
  FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS `consistency_experiment_videos`;
DROP TABLE IF EXISTS `consistency_experiment_panels`;
DROP TABLE IF EXISTS `consistency_experiment_artifacts`;
DROP TABLE IF EXISTS `consistency_experiment_runs`;
