-- Task Change History (field-level activity tracking)
CREATE TABLE "task_change_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_change_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_change_history_task_id_created_at_idx" ON "task_change_history"("task_id", "created_at");
CREATE INDEX "task_change_history_user_id_idx" ON "task_change_history"("user_id");

ALTER TABLE "task_change_history"
    ADD CONSTRAINT "task_change_history_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_change_history"
    ADD CONSTRAINT "task_change_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Time Entries (time tracking per task)
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "description" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "stopped_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");
CREATE INDEX "time_entries_task_id_user_id_idx" ON "time_entries"("task_id", "user_id");

ALTER TABLE "time_entries"
    ADD CONSTRAINT "time_entries_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
