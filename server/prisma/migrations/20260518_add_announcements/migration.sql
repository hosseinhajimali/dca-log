ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';

CREATE TABLE "announcements" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "message"      TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3),
  "sent_at"      TIMESTAMP(3),
  "sent_count"   INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
