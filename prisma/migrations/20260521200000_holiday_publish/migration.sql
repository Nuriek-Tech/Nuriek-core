-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Publish existing holidays for all employees
UPDATE "Holiday" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
