CREATE TABLE `project_commands` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NULL,
  `source` VARCHAR(191) NOT NULL,
  `commandType` VARCHAR(191) NOT NULL,
  `scopeRef` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
  `summary` TEXT NULL,
  `rawInput` JSON NULL,
  `normalizedInput` JSON NULL,
  `currentPlanId` VARCHAR(191) NULL,
  `latestRunId` VARCHAR(191) NULL,
  `errorCode` VARCHAR(191) NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `execution_plans` (
  `id` VARCHAR(191) NOT NULL,
  `commandId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
  `summary` TEXT NULL,
  `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
  `riskSummary` JSON NULL,
  `policySnapshot` JSON NULL,
  `contextSnapshot` JSON NULL,
  `linkedTaskId` VARCHAR(191) NULL,
  `linkedRunId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `execution_plan_steps` (
  `id` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `stepKey` VARCHAR(191) NOT NULL,
  `skillId` VARCHAR(191) NOT NULL,
  `orderIndex` INTEGER NOT NULL,
  `scopeRef` VARCHAR(191) NULL,
  `dependsOnJson` JSON NULL,
  `inputArtifactsJson` JSON NULL,
  `outputArtifactsJson` JSON NULL,
  `invalidatesJson` JSON NULL,
  `mutationKind` VARCHAR(191) NOT NULL,
  `riskLevel` VARCHAR(191) NOT NULL,
  `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `plan_approvals` (
  `id` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `commandId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `reason` TEXT NULL,
  `responseNote` TEXT NULL,
  `approvedAt` DATETIME(3) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `graph_runs`
  ADD COLUMN `commandId` VARCHAR(191) NULL,
  ADD COLUMN `planId` VARCHAR(191) NULL;

ALTER TABLE `graph_steps`
  ADD COLUMN `skillId` VARCHAR(191) NULL,
  ADD COLUMN `scopeRef` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `execution_plans_commandId_key` ON `execution_plans`(`commandId`);
CREATE UNIQUE INDEX `execution_plan_steps_planId_stepKey_key` ON `execution_plan_steps`(`planId`, `stepKey`);

CREATE INDEX `project_commands_projectId_createdAt_idx` ON `project_commands`(`projectId`, `createdAt`);
CREATE INDEX `project_commands_projectId_episodeId_createdAt_idx` ON `project_commands`(`projectId`, `episodeId`, `createdAt`);
CREATE INDEX `project_commands_userId_createdAt_idx` ON `project_commands`(`userId`, `createdAt`);
CREATE INDEX `project_commands_status_createdAt_idx` ON `project_commands`(`status`, `createdAt`);

CREATE INDEX `execution_plans_commandId_idx` ON `execution_plans`(`commandId`);
CREATE INDEX `execution_plans_projectId_createdAt_idx` ON `execution_plans`(`projectId`, `createdAt`);
CREATE INDEX `execution_plans_projectId_episodeId_createdAt_idx` ON `execution_plans`(`projectId`, `episodeId`, `createdAt`);
CREATE INDEX `execution_plans_status_createdAt_idx` ON `execution_plans`(`status`, `createdAt`);

CREATE INDEX `execution_plan_steps_planId_orderIndex_idx` ON `execution_plan_steps`(`planId`, `orderIndex`);

CREATE INDEX `plan_approvals_planId_createdAt_idx` ON `plan_approvals`(`planId`, `createdAt`);
CREATE INDEX `plan_approvals_commandId_createdAt_idx` ON `plan_approvals`(`commandId`, `createdAt`);
CREATE INDEX `plan_approvals_projectId_status_createdAt_idx` ON `plan_approvals`(`projectId`, `status`, `createdAt`);

CREATE INDEX `graph_runs_commandId_idx` ON `graph_runs`(`commandId`);
CREATE INDEX `graph_runs_planId_idx` ON `graph_runs`(`planId`);

ALTER TABLE `project_commands`
  ADD CONSTRAINT `project_commands_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `project_commands_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `execution_plans`
  ADD CONSTRAINT `execution_plans_commandId_fkey`
    FOREIGN KEY (`commandId`) REFERENCES `project_commands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `execution_plans_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `execution_plan_steps`
  ADD CONSTRAINT `execution_plan_steps_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `execution_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `plan_approvals`
  ADD CONSTRAINT `plan_approvals_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `execution_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `plan_approvals_commandId_fkey`
    FOREIGN KEY (`commandId`) REFERENCES `project_commands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `plan_approvals_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `plan_approvals_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `graph_runs`
  ADD CONSTRAINT `graph_runs_commandId_fkey`
    FOREIGN KEY (`commandId`) REFERENCES `project_commands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `graph_runs_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `execution_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
