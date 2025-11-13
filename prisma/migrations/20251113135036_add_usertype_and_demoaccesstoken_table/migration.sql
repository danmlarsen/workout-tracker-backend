-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('REGULAR', 'DEMO', 'SYSTEM');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "userType" "public"."UserType" NOT NULL DEFAULT 'REGULAR';

-- CreateTable
CREATE TABLE "public"."DemoAccessToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsages" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DemoAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoAccessToken_token_key" ON "public"."DemoAccessToken"("token");
