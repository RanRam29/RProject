-- AlterTable: add Gantt fields to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_milestone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_hours" INTEGER NOT NULL DEFAULT 0;
