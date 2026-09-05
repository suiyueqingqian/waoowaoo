CREATE TABLE `project_assistant_threads` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NULL,
  `assistantId` VARCHAR(191) NOT NULL,
  `scopeRef` VARCHAR(191) NOT NULL,
  `messagesJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `project_assistant_threads_projectId_userId_assistantId_scope_key`
  ON `project_assistant_threads`(`projectId`, `userId`, `assistantId`, `scopeRef`);

CREATE INDEX `project_assistant_threads_projectId_episodeId_updatedAt_idx`
  ON `project_assistant_threads`(`projectId`, `episodeId`, `updatedAt`);

CREATE INDEX `project_assistant_threads_userId_updatedAt_idx`
  ON `project_assistant_threads`(`userId`, `updatedAt`);

ALTER TABLE `project_assistant_threads`
  ADD CONSTRAINT `project_assistant_threads_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `project_assistant_threads_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
