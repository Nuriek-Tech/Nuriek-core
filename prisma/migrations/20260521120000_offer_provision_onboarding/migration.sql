-- AlterTable
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "provisionedUserId" TEXT;
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "provisionedAt" TIMESTAMP(3);
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "onboardingEmailedAt" TIMESTAMP(3);
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "onboardingWorkEmail" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_provisionedUserId_fkey" FOREIGN KEY ("provisionedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
