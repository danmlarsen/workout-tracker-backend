/*
  Warnings:

  - A unique constraint covering the columns `[workoutExerciseId,setNumber]` on the table `WorkoutSet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `setNumber` to the `WorkoutSet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."WorkoutSet" ADD COLUMN     "setNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_workoutExerciseId_setNumber_key" ON "public"."WorkoutSet"("workoutExerciseId", "setNumber");
