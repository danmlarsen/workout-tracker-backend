/*
  Warnings:

  - You are about to drop the column `image` on the `Exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "image",
ADD COLUMN     "exerciseType" TEXT NOT NULL DEFAULT 'strength',
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryMuscleGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetMuscleGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "completedAt" TIMESTAMP(3);
