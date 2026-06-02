-- Persist joining date so internship duration/end date stay in sync with form.
ALTER TABLE "OfferLetter" ADD COLUMN IF NOT EXISTS "joiningDate" TIMESTAMP(3);
