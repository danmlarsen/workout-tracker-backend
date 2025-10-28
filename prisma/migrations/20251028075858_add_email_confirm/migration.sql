-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailConfirmationToken" TEXT,
ADD COLUMN     "emailConfirmationTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false;
