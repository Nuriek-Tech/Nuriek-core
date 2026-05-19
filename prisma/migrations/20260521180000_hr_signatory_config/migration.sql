-- Persist HR / Super Admin offer letter signatory (shared across browsers and prod deploys)
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "hrSignatory" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "hrSignatoryTitle" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "hrSignatureDataUrl" TEXT;
