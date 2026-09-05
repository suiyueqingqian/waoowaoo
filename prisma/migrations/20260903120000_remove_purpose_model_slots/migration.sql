-- Per-purpose default model slots are replaced by the Assistant-chosen model
-- pool. The Assistant model stays the single fixed slot on UserPreference.
ALTER TABLE `Project`
  DROP COLUMN `analysisModel`,
  DROP COLUMN `imageModel`,
  DROP COLUMN `videoModel`,
  DROP COLUMN `musicModel`,
  DROP COLUMN `characterModel`,
  DROP COLUMN `locationModel`,
  DROP COLUMN `editModel`;

ALTER TABLE `UserPreference`
  DROP COLUMN `analysisModel`,
  DROP COLUMN `characterModel`,
  DROP COLUMN `locationModel`,
  DROP COLUMN `editModel`,
  DROP COLUMN `videoModel`,
  DROP COLUMN `musicModel`;
