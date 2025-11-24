-- CreateTable
CREATE TABLE IF NOT EXISTS "tbl_master_printer" (
    "printer_id" BIGSERIAL NOT NULL,
    "printer_code" VARCHAR(100) NOT NULL,
    "printer_name" VARCHAR(200),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_printer_pkey" PRIMARY KEY ("printer_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tbl_master_printer_printer_code_key" ON "tbl_master_printer"("printer_code");

