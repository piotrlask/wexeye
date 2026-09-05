-- One row per rate-limited login/registration attempt (basic brute-force /
-- mass-account-creation protection — see src/lib/rateLimit.ts). No foreign
-- keys: rows are looked up by ip/email/kind + a time window, not joined.
-- CreateTable
CREATE TABLE `AuthAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuthAttempt_kind_ip_createdAt_idx`(`kind`, `ip`, `createdAt`),
    INDEX `AuthAttempt_kind_email_createdAt_idx`(`kind`, `email`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
