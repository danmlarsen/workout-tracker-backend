/*
  Warnings:

  - You are about to drop the column `exerciseCategory` on the `Exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "exerciseCategory",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'strength';
