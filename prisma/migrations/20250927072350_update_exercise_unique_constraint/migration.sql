/*
  Warnings:

  - A unique constraint covering the columns `[name,userId,equipment]` on the table `Exercise` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Exercise_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_userId_equipment_key" ON "public"."Exercise"("name", "userId", "equipment");
