ALTER TABLE `project_edit_scripts`
  ADD COLUMN `screenplayText` LONGTEXT NULL;

CREATE TABLE `project_edit_screenplays` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NOT NULL,
  `userPrompt` LONGTEXT NOT NULL,
  `screenplayText` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ready',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `project_edit_screenplays_episodeId_key`(`episodeId`),
  INDEX `project_edit_screenplays_projectId_idx`(`projectId`),
  INDEX `project_edit_screenplays_episodeId_idx`(`episodeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `project_edit_screenplays`
  ADD CONSTRAINT `project_edit_screenplays_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_edit_screenplays`
  ADD CONSTRAINT `project_edit_screenplays_episodeId_fkey`
  FOREIGN KEY (`episodeId`) REFERENCES `project_episodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
