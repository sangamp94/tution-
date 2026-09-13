-- CreateEnum
CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "student_signup_requests" (
    "id" TEXT NOT NULL,
    "tuition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "grade_class" TEXT,
    "custom_fee" DECIMAL(10,2),
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "student_signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_signup_requests_tuition_id_status_idx" ON "student_signup_requests"("tuition_id", "status");

-- CreateIndex
CREATE INDEX "student_signup_requests_phone_idx" ON "student_signup_requests"("phone");

-- AddForeignKey
ALTER TABLE "student_signup_requests" ADD CONSTRAINT "student_signup_requests_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
