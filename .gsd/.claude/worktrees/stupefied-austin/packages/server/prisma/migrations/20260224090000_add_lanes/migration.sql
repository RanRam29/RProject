-- CreateTable: lanes
CREATE TABLE "lanes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lanes_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add lane_id FK to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "lane_id" UUID;

-- AddForeignKey: lanes.project_id → projects.id
ALTER TABLE "lanes" ADD CONSTRAINT "lanes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: tasks.lane_id → lanes.id
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lane_id_fkey" FOREIGN KEY ("lane_id") REFERENCES "lanes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
