-- Soft-delete marker for account deletion (ETAP 12.4). Non-null means the
-- account has been anonymized and deactivated; the row itself is kept so
-- Article/Comment/Purchase/etc. (all RESTRICT FKs to User) and financial
-- history survive intact. See src/app/panel/actions.ts's deleteAccountAction.
ALTER TABLE `User` ADD COLUMN `deletedAt` DATETIME(3) NULL;
