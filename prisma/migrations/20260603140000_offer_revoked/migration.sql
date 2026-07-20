-- HR revoke internship/employment offers with audit trail
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "revokedById" TEXT;
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "revokeReason" TEXT;

DO $$ BEGIN
  ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
