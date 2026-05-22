-- AlterTable
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "reportingManagerEmail" TEXT;
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "approvalActorEmail" TEXT;
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "Leave" ADD COLUMN IF NOT EXISTS "revokedById" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveApprovalToken" (
    "id" TEXT NOT NULL,
    "leaveId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApprovalToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveApprovalToken_tokenHash_key" ON "LeaveApprovalToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "LeaveApprovalToken_leaveId_idx" ON "LeaveApprovalToken"("leaveId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Leave" ADD CONSTRAINT "Leave_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeaveApprovalToken" ADD CONSTRAINT "LeaveApprovalToken_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "Leave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
