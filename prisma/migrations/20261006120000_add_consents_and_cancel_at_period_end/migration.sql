-- P0-08: registration consent (Terms acceptance time + age declaration) and
-- self-service subscription cancellation flag. Purely additive: nullable
-- columns and one boolean with a default; no existing data changes.
ALTER TABLE `User`
  ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `ageConfirmation` VARCHAR(191) NULL;

ALTER TABLE `Subscription`
  ADD COLUMN `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false;
