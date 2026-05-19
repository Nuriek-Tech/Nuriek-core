-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FOUNDER', 'HR_ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'INTERN', 'CONTRACTOR');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

-- AlterTable Attendance
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "breakStart" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "breakEnd" TIMESTAMP(3);

-- AlterTable SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "officeName" TEXT NOT NULL DEFAULT 'Bangalore (HQ)';

-- CreateTable AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
