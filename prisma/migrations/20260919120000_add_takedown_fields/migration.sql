-- Emergency takedown / hide (ETAP 13.3C). Purely additive: new nullable
-- columns only, no data is changed or removed. Article.status is a plain
-- VARCHAR, so the new "TAKEN_DOWN" status value needs no schema change.
ALTER TABLE `Article`
  ADD COLUMN `takedownAt` DATETIME(3) NULL,
  ADD COLUMN `takedownReason` TEXT NULL,
  ADD COLUMN `takedownById` VARCHAR(191) NULL,
  ADD COLUMN `takedownPreviousStatus` VARCHAR(191) NULL;

ALTER TABLE `Comment`
  ADD COLUMN `hiddenAt` DATETIME(3) NULL,
  ADD COLUMN `hiddenReason` TEXT NULL,
  ADD COLUMN `hiddenById` VARCHAR(191) NULL;

ALTER TABLE `Media`
  ADD COLUMN `quarantinedAt` DATETIME(3) NULL;
