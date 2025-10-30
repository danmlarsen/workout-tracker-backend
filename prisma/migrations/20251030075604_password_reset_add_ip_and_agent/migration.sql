-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;
