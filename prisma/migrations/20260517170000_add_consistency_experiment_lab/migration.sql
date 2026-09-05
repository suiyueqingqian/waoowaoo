CREATE TABLE `consistency_experiment_runs` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NOT NULL,
  `sourceEditScriptId` VARCHAR(191) NOT NULL,
  `strategy` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ready',
  `modelConfigSnapshot` JSON NOT NULL,
  `sourceSnapshotJson` JSON NOT NULL,
  `strategyInputJson` JSON NOT NULL,
  `strategyOutputJson` JSON NOT NULL,
  `errorMessage` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `consistency_experiment_panels` (
  `id` VARCHAR(191) NOT NULL,
  `runId` VARCHAR(191) NOT NULL,
  `sourceShotNumber` INTEGER NOT NULL,
  `sourceVideoBlockId` VARCHAR(191) NOT NULL,
  `panelIndex` INTEGER NOT NULL,
  `prompt` LONGTEXT NOT NULL,
  `imageUrl` TEXT NULL,
  `imageMediaId` VARCHAR(191) NULL,
  `candidateImages` TEXT NULL,
  `metadataJson` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ready',
  `errorMessage` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `consistency_experiment_videos` (
  `id` VARCHAR(191) NOT NULL,
  `runId` VARCHAR(191) NOT NULL,
  `sourceVideoBlockId` VARCHAR(191) NOT NULL,
  `sourceShotNumbers` JSON NOT NULL,
  `prompt` LONGTEXT NOT NULL,
  `referencePanelImageIds` JSON NOT NULL,
  `videoUrl` TEXT NULL,
  `videoMediaId` VARCHAR(191) NULL,
  `metadataJson` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `errorMessage` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `consistency_experiment_panels_runId_panelIndex_key`
  ON `consistency_experiment_panels`(`runId`, `panelIndex`);

CREATE INDEX `consistency_experiment_runs_projectId_idx` ON `consistency_experiment_runs`(`projectId`);
CREATE INDEX `consistency_experiment_runs_episodeId_idx` ON `consistency_experiment_runs`(`episodeId`);
CREATE INDEX `consistency_experiment_runs_sourceEditScriptId_idx` ON `consistency_experiment_runs`(`sourceEditScriptId`);
CREATE INDEX `consistency_experiment_runs_projectId_episodeId_sourceEditScriptId_idx`
  ON `consistency_experiment_runs`(`projectId`, `episodeId`, `sourceEditScriptId`);
CREATE INDEX `consistency_experiment_panels_runId_idx` ON `consistency_experiment_panels`(`runId`);
CREATE INDEX `consistency_experiment_panels_imageMediaId_idx` ON `consistency_experiment_panels`(`imageMediaId`);
CREATE INDEX `consistency_experiment_videos_runId_idx` ON `consistency_experiment_videos`(`runId`);
CREATE INDEX `consistency_experiment_videos_videoMediaId_idx` ON `consistency_experiment_videos`(`videoMediaId`);

ALTER TABLE `consistency_experiment_runs`
  ADD CONSTRAINT `consistency_experiment_runs_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consistency_experiment_runs_episodeId_fkey`
    FOREIGN KEY (`episodeId`) REFERENCES `project_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consistency_experiment_runs_sourceEditScriptId_fkey`
    FOREIGN KEY (`sourceEditScriptId`) REFERENCES `project_edit_scripts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `consistency_experiment_panels`
  ADD CONSTRAINT `consistency_experiment_panels_runId_fkey`
    FOREIGN KEY (`runId`) REFERENCES `consistency_experiment_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consistency_experiment_panels_imageMediaId_fkey`
    FOREIGN KEY (`imageMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `consistency_experiment_videos`
  ADD CONSTRAINT `consistency_experiment_videos_runId_fkey`
    FOREIGN KEY (`runId`) REFERENCES `consistency_experiment_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `consistency_experiment_videos_videoMediaId_fkey`
    FOREIGN KEY (`videoMediaId`) REFERENCES `media_objects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
