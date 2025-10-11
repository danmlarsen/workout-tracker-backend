-- CreateEnum
CREATE TYPE "public"."WorkoutStatus" AS ENUM ('ACTIVE', 'DRAFT', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Workout" ADD COLUMN     "status" "public"."WorkoutStatus" NOT NULL DEFAULT 'DRAFT';
