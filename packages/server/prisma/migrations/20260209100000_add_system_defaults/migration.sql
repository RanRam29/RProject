-- CreateTable
CREATE TABLE "system_defaults" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "statuses" JSONB NOT NULL DEFAULT '[]',
    "labels" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_defaults_pkey" PRIMARY KEY ("id")
);
