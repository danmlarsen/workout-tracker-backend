-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('REGULAR', 'DEMO', 'SYSTEM');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "userType" "public"."UserType" NOT NULL DEFAULT 'REGULAR';