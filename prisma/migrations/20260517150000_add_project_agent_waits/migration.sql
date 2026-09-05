CREATE TABLE `project_agent_waits` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `assistantId` VARCHAR(64) NOT NULL,
  `scopeRef` VARCHAR(64) NOT NULL,
  `episodeId` VARCHAR(191) NULL,
  `operationId` VARCHAR(128) NOT NULL,
  `taskIds` JSON NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `terminalStatus` VARCHAR(32) NULL,
  `terminalTaskIds` JSON NULL,
  `failedTaskIds` JSON NULL,
  `followUpKey` VARCHAR(96) NULL,
  `followedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolvedAt` DATETIME(3) NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `project_agent_waits_projectId_userId_assistantId_scopeRef_status_createdAt_idx`
  ON `project_agent_waits`(`projectId`, `userId`, `assistantId`, `scopeRef`, `status`, `createdAt`);

CREATE INDEX `project_agent_waits_projectId_status_createdAt_idx`
  ON `project_agent_waits`(`projectId`, `status`, `createdAt`);

CREATE INDEX `project_agent_waits_followUpKey_idx`
  ON `project_agent_waits`(`followUpKey`);

ALTER TABLE `project_agent_waits`
  ADD CONSTRAINT `project_agent_waits_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_agent_waits`
  ADD CONSTRAINT `project_agent_waits_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
