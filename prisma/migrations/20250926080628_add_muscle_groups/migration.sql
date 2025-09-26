/*
  Warnings:

  - You are about to drop the column `muscleGroup` on the `Exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Exercise" DROP COLUMN "muscleGroup",
ADD COLUMN     "muscleGroups" TEXT[];
