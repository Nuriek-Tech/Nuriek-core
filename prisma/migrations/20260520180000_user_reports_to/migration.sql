-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reportsToId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
