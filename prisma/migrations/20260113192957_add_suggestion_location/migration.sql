-- CreateTable
CREATE TABLE IF NOT EXISTS "tbl_suggestion" (
    "suggestion_id" BIGSERIAL NOT NULL,
    "suggestion_code" VARCHAR(50) NOT NULL,
    "suggestion_text" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prep_zone_code" VARCHAR(50),
    "store_code" VARCHAR(50),
    "suggestion_desc" VARCHAR(1000),
    "is_delete" BOOLEAN NOT NULL DEFAULT false,
    "sync_id" UUID DEFAULT gen_random_uuid(),
    "sync_source" VARCHAR(20) DEFAULT 'server',

    CONSTRAINT "tbl_suggestion_pkey" PRIMARY KEY ("suggestion_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_suggestion_suggestion_code_key" ON "tbl_suggestion"("suggestion_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tbl_suggestion_category_idx" ON "tbl_suggestion"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tbl_suggestion_store_code_idx" ON "tbl_suggestion"("store_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tbl_suggestion_is_active_idx" ON "tbl_suggestion"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_suggestion_sync_id_key" ON "tbl_suggestion"("sync_id");
