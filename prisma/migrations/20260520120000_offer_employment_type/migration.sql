-- AlterTable
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "employmentType" TEXT NOT NULL DEFAULT 'Full-time';
