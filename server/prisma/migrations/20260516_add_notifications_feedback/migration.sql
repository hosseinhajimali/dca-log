-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DCA_REMINDER', 'SELL_RULE_MET', 'BUYING_RULE_MET');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('COMPLAINT', 'FEEDBACK', 'LOGIN_ISSUE', 'APP_ISSUE', 'FEATURE_REQUEST', 'OTHER');

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "type"       "NotificationType" NOT NULL,
    "title"      TEXT NOT NULL,
    "message"    TEXT NOT NULL,
    "is_read"    BOOLEAN NOT NULL DEFAULT false,
    "metadata"   JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feedbacks
CREATE TABLE "feedbacks" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT,
    "category"   "FeedbackCategory" NOT NULL,
    "message"    TEXT NOT NULL,
    "is_read"    BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
