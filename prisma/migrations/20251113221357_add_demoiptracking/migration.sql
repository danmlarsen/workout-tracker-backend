/*
  Warnings:

  - You are about to drop the `DemoAccessToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."DemoAccessToken";

-- CreateTable
CREATE TABLE "public"."DemoIpTracking" (
    "id" SERIAL NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoIpTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoIpTracking_ipAddress_createdAt_idx" ON "public"."DemoIpTracking"("ipAddress", "createdAt");
