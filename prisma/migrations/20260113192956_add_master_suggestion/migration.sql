-- CreateTable
CREATE TABLE IF NOT EXISTS "tbl_master_suggestion" (
    "suggestion_id" BIGSERIAL NOT NULL,
    "suggestion_code" VARCHAR(50) NOT NULL,
    "suggestion_text" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "prep_zone_code" VARCHAR(50),
    "suggestion_desc" VARCHAR(1000),
    "is_delete" BOOLEAN NOT NULL DEFAULT false,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),
    "sync_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_source" VARCHAR(20) DEFAULT 'server',

    CONSTRAINT "tbl_master_suggestion_pkey" PRIMARY KEY ("suggestion_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_master_suggestion_suggestion_code_key" ON "tbl_master_suggestion"("suggestion_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tbl_master_suggestion_category_idx" ON "tbl_master_suggestion"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tbl_master_suggestion_is_active_idx" ON "tbl_master_suggestion"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_master_suggestion_sync_id_key" ON "tbl_master_suggestion"("sync_id");
