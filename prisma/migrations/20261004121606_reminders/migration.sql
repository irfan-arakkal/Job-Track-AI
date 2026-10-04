-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('NO_RESPONSE', 'FOLLOW_UP', 'INTERVIEW_TODAY', 'INTERVIEW_TOMORROW');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "interviewId" TEXT,
    "type" "ReminderType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "dedupeKey" VARCHAR(200) NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminders_dedupeKey_key" ON "reminders"("dedupeKey");

-- CreateIndex
CREATE INDEX "reminders_userId_status_dueAt_idx" ON "reminders"("userId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "reminders_applicationId_idx" ON "reminders"("applicationId");

-- CreateIndex
CREATE INDEX "reminders_interviewId_idx" ON "reminders"("interviewId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

