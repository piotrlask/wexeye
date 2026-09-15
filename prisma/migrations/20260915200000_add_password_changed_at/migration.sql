-- Null until the password is ever explicitly changed — existing users keep
-- their current sessions valid; only a password reset starts invalidating
-- older JWTs issued before it. See src/auth.ts's `jwt` callback.
-- AlterTable
ALTER TABLE `User` ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;
