-- AlterTable
ALTER TABLE "public"."WorkoutExercise" ADD COLUMN     "previousWorkoutExerciseId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_previousWorkoutExerciseId_fkey" FOREIGN KEY ("previousWorkoutExerciseId") REFERENCES "public"."WorkoutExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
