/*
  Warnings:

  - You are about to drop the column `exerciseType` on the `Exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "exerciseType",
ADD COLUMN     "exerciseCategory" TEXT NOT NULL DEFAULT 'strength',
ADD COLUMN     "instructions" TEXT;
