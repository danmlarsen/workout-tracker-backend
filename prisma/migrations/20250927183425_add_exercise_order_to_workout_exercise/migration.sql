/*
  Warnings:

  - A unique constraint covering the columns `[workoutId,exerciseOrder]` on the table `WorkoutExercise` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `exerciseOrder` to the `WorkoutExercise` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."WorkoutExercise" ADD COLUMN     "exerciseOrder" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_workoutId_exerciseOrder_key" ON "public"."WorkoutExercise"("workoutId", "exerciseOrder");
