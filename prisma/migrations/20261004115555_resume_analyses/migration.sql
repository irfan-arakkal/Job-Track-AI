-- CreateTable
CREATE TABLE "resume_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobTitle" VARCHAR(200),
    "jobDescription" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_analyses_userId_createdAt_idx" ON "resume_analyses"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "resume_analyses_resumeId_idx" ON "resume_analyses"("resumeId");

-- CreateIndex
CREATE INDEX "resume_analyses_applicationId_idx" ON "resume_analyses"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "resumes_id_userId_key" ON "resumes"("id", "userId");

-- AddForeignKey
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_resumeId_userId_fkey" FOREIGN KEY ("resumeId", "userId") REFERENCES "resumes"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-written: the score must be a percentage.
ALTER TABLE "resume_analyses"
  ADD CONSTRAINT "resume_analyses_score_range" CHECK ("matchScore" BETWEEN 0 AND 100);
