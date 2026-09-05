ALTER TABLE `projects`
  ADD COLUMN `singleShotVideoModel` VARCHAR(191) NULL,
  ADD COLUMN `sequenceVideoModel` VARCHAR(191) NULL;

UPDATE `projects`
SET
  `singleShotVideoModel` = `videoModel`,
  `sequenceVideoModel` = 'ark::doubao-seedance-2-0-260128'
WHERE `singleShotVideoModel` IS NULL
  AND `sequenceVideoModel` IS NULL;
