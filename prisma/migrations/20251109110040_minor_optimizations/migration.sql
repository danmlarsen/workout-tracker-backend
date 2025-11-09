/*
  Warnings:

  - You are about to drop the column `completedAt` on the `WorkoutSet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[previousWorkoutExerciseId]` on the table `WorkoutExercise` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."WorkoutSet" DROP COLUMN "completedAt",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_previousWorkoutExerciseId_key" ON "public"."WorkoutExercise"("previousWorkoutExerciseId");
