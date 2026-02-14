-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "completed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_completed_at_idx" ON "tasks"("completed_at");
