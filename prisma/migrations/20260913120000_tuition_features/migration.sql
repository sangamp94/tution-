-- Safe/idempotent tuition feature migration.
-- This migration may be re-run after a previously failed deployment without
-- failing merely because some objects were already created.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "tuitions" (
  "id" TEXT NOT NULL,
  "tutor_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "default_fee" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tuitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tuitions_tutor_id_key" ON "tuitions"("tutor_id");

ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "tuition_id" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "tutor_name" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP(3);
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP(3);
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "days_of_week" TEXT;
CREATE INDEX IF NOT EXISTS "classes_tuition_id_idx" ON "classes"("tuition_id");

ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "tuition_id" TEXT;
ALTER TABLE "notices" ADD COLUMN IF NOT EXISTS "content" TEXT;
CREATE INDEX IF NOT EXISTS "notices_tuition_id_idx" ON "notices"("tuition_id");

CREATE TABLE IF NOT EXISTS "students_info" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tuition_id" TEXT NOT NULL,
  "grade_class" TEXT,
  "joining_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "custom_fee" DECIMAL(10,2),
  CONSTRAINT "students_info_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "students_info_user_id_key" ON "students_info"("user_id");
CREATE INDEX IF NOT EXISTS "students_info_tuition_id_idx" ON "students_info"("tuition_id");

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_class_id_student_id_date_key" ON "attendance"("class_id", "student_id", "date");
CREATE INDEX IF NOT EXISTS "attendance_student_id_idx" ON "attendance"("student_id");
CREATE INDEX IF NOT EXISTS "attendance_class_id_idx" ON "attendance"("class_id");

CREATE TABLE IF NOT EXISTS "fee_payments" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "tuition_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "for_month" TEXT NOT NULL,
  "next_due_date" TIMESTAMP(3),
  "status" "TransactionStatus" NOT NULL DEFAULT 'PAID',
  CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fee_payments_student_id_idx" ON "fee_payments"("student_id");
CREATE INDEX IF NOT EXISTS "fee_payments_tuition_id_idx" ON "fee_payments"("tuition_id");
CREATE INDEX IF NOT EXISTS "fee_payments_for_month_idx" ON "fee_payments"("for_month");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tuitions_tutor_id_fkey') THEN
    ALTER TABLE "tuitions" ADD CONSTRAINT "tuitions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_tuition_id_fkey') THEN
    ALTER TABLE "classes" ADD CONSTRAINT "classes_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_tuition_id_fkey') THEN
    ALTER TABLE "notices" ADD CONSTRAINT "notices_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_info_user_id_fkey') THEN
    ALTER TABLE "students_info" ADD CONSTRAINT "students_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_info_tuition_id_fkey') THEN
    ALTER TABLE "students_info" ADD CONSTRAINT "students_info_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_class_id_fkey') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_fkey') THEN
    ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fee_payments_student_id_fkey') THEN
    ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fee_payments_tuition_id_fkey') THEN
    ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
