-- Run only after stopping active Agent turns and backing up the database.
-- Reset ALL legacy selections, including Assistant reasoning effort: none of
-- the old defaults are promoted to a user-selected fixed parameter.
UPDATE `user_preferences` SET `capabilityDefaults` = NULL;
ALTER TABLE `projects` DROP COLUMN `capabilityOverrides`;
