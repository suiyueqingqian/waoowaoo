ALTER TABLE `consistency_experiment_runs`
  ADD COLUMN `currentStage` VARCHAR(191) NOT NULL DEFAULT 'created';

CREATE TABLE `consistency_experiment_artifacts` (
  `id` VARCHAR(191) NOT NULL,
  `runId` VARCHAR(191) NOT NULL,
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
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `consistency_experiment_artifacts_runId_idx` ON `consistency_experiment_artifacts`(`runId`);
CREATE INDEX `consistency_experiment_artifacts_kind_idx` ON `consistency_experiment_artifacts`(`kind`);
CREATE INDEX `consistency_experiment_artifacts_imageMediaId_idx` ON `consistency_experiment_artifacts`(`imageMediaId`);

ALTER TABLE `consistency_experiment_artifacts`
  ADD CONSTRAINT `consistency_experiment_artifacts_runId_fkey`
    FOREIGN KEY (`runId`) REFERENCES `consistency_experiment_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consistency_experiment_artifacts_imageMediaId_fkey`
    FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
