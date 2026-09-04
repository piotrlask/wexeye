-- VARCHAR(191) silently truncated article bodies, comments, hashtags, and
-- media/link URLs at 191 characters — far too short for real content.
ALTER TABLE `Article` MODIFY COLUMN `body` TEXT NOT NULL;
ALTER TABLE `Article` MODIFY COLUMN `reviewNote` TEXT NULL;
ALTER TABLE `Article` MODIFY COLUMN `hashtags` TEXT NULL;
ALTER TABLE `Comment` MODIFY COLUMN `body` TEXT NOT NULL;
ALTER TABLE `Media` MODIFY COLUMN `url` TEXT NOT NULL;
ALTER TABLE `AdPurchase` MODIFY COLUMN `mediaUrl` TEXT NULL;
ALTER TABLE `AdPurchase` MODIFY COLUMN `linkUrl` TEXT NULL;
