CREATE TYPE "Role" AS ENUM ('TEACHER', 'STUDENT');
CREATE TYPE "TransactionStatus" AS ENUM ('PAID', 'PENDING');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "classes" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "schedule" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");

CREATE TABLE "student_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "class_id" TEXT,
  "parent_name" TEXT,
  "parent_phone" TEXT,
  "monthly_fee" DECIMAL(10,2) NOT NULL,
  "address" TEXT,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");
CREATE INDEX "student_profiles_class_id_idx" ON "student_profiles"("class_id");

CREATE TABLE "notices" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "target_role" TEXT NOT NULL DEFAULT 'ALL',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "month" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "transactions_student_id_idx" ON "transactions"("student_id");
CREATE INDEX "transactions_month_idx" ON "transactions"("month");

CREATE TABLE "materials" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "drive_file_id" TEXT NOT NULL,
  "drive_view_link" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "materials_class_id_idx" ON "materials"("class_id");

ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "materials" ADD CONSTRAINT "materials_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
