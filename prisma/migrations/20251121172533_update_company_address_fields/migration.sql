-- AlterTable: Add new address fields (nullable to preserve existing data)
ALTER TABLE "tbl_company" 
ADD COLUMN IF NOT EXISTS "address_line1" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "address_line2" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "state" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "country" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "zipcode" VARCHAR(20);

-- Optional: Migrate existing address data to address_line1 if address column exists
-- Uncomment the following lines if you want to copy existing address data:
-- UPDATE "tbl_company" 
-- SET "address_line1" = "address" 
-- WHERE "address" IS NOT NULL AND "address_line1" IS NULL;

-- Note: The old "address" column will remain in the database for now.
-- You can drop it later after verifying the migration worked correctly:
-- ALTER TABLE "tbl_company" DROP COLUMN IF EXISTS "address";

