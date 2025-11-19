-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('COMPANY', 'DEALER', 'LOCATION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN', 'OUTLET_MANAGER', 'CAPTAIN', 'CASHIER', 'KITCHEN_STAFF');

-- CreateTable
CREATE TABLE "tbl_company" (
    "company_id" BIGSERIAL NOT NULL,
    "company_code" VARCHAR(100) NOT NULL,
    "company_name" VARCHAR(500) NOT NULL,
    "address" VARCHAR(1000),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_company_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "tbl_dealer" (
    "dealer_id" BIGSERIAL NOT NULL,
    "dealer_code" VARCHAR(100) NOT NULL,
    "dealer_name" VARCHAR(500) NOT NULL,
    "company_id" BIGINT NOT NULL,
    "address" VARCHAR(1000),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_dealer_pkey" PRIMARY KEY ("dealer_id")
);

-- CreateTable
CREATE TABLE "tbl_location" (
    "location_id" BIGSERIAL NOT NULL,
    "location_code" VARCHAR(100) NOT NULL,
    "location_name" VARCHAR(500) NOT NULL,
    "company_id" BIGINT NOT NULL,
    "dealer_id" BIGINT,
    "store_code" VARCHAR(100) NOT NULL,
    "address" VARCHAR(1000),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "sync_enabled" INTEGER NOT NULL DEFAULT 1,
    "last_sync_at" TIMESTAMP(3),
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "tbl_user" (
    "user_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "company_id" BIGINT,
    "dealer_id" BIGINT,
    "location_id" BIGINT,
    "role" "UserRole" NOT NULL,
    "access_level" "AccessLevel" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tbl_master_data_template" (
    "template_id" BIGSERIAL NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "template_type" VARCHAR(100) NOT NULL,
    "template_data" JSONB NOT NULL,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_master_data_template_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "tbl_sync_log" (
    "sync_log_id" BIGSERIAL NOT NULL,
    "location_id" BIGINT NOT NULL,
    "store_code" VARCHAR(100) NOT NULL,
    "sync_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "records_synced" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tbl_sync_log_pkey" PRIMARY KEY ("sync_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_company_company_code_key" ON "tbl_company"("company_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_dealer_dealer_code_key" ON "tbl_dealer"("dealer_code");

-- CreateIndex
CREATE INDEX "tbl_dealer_company_id_idx" ON "tbl_dealer"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_location_location_code_key" ON "tbl_location"("location_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_location_store_code_key" ON "tbl_location"("store_code");

-- CreateIndex
CREATE INDEX "tbl_location_company_id_idx" ON "tbl_location"("company_id");

-- CreateIndex
CREATE INDEX "tbl_location_dealer_id_idx" ON "tbl_location"("dealer_id");

-- CreateIndex
CREATE INDEX "tbl_location_store_code_idx" ON "tbl_location"("store_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_email_key" ON "tbl_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_username_key" ON "tbl_user"("username");

-- CreateIndex
CREATE INDEX "tbl_user_company_id_idx" ON "tbl_user"("company_id");

-- CreateIndex
CREATE INDEX "tbl_user_dealer_id_idx" ON "tbl_user"("dealer_id");

-- CreateIndex
CREATE INDEX "tbl_user_location_id_idx" ON "tbl_user"("location_id");

-- CreateIndex
CREATE INDEX "tbl_user_email_idx" ON "tbl_user"("email");

-- CreateIndex
CREATE INDEX "tbl_user_username_idx" ON "tbl_user"("username");

-- CreateIndex
CREATE INDEX "tbl_master_data_template_template_type_idx" ON "tbl_master_data_template"("template_type");

-- CreateIndex
CREATE INDEX "tbl_master_data_template_is_active_idx" ON "tbl_master_data_template"("is_active");

-- CreateIndex
CREATE INDEX "tbl_sync_log_location_id_idx" ON "tbl_sync_log"("location_id");

-- CreateIndex
CREATE INDEX "tbl_sync_log_store_code_idx" ON "tbl_sync_log"("store_code");

-- CreateIndex
CREATE INDEX "tbl_sync_log_status_idx" ON "tbl_sync_log"("status");

-- CreateIndex
CREATE INDEX "tbl_sync_log_started_at_idx" ON "tbl_sync_log"("started_at");

-- AddForeignKey
ALTER TABLE "tbl_dealer" ADD CONSTRAINT "tbl_dealer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "tbl_company"("company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_location" ADD CONSTRAINT "tbl_location_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "tbl_company"("company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_location" ADD CONSTRAINT "tbl_location_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "tbl_dealer"("dealer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user" ADD CONSTRAINT "tbl_user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "tbl_company"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user" ADD CONSTRAINT "tbl_user_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "tbl_dealer"("dealer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user" ADD CONSTRAINT "tbl_user_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "tbl_location"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_sync_log" ADD CONSTRAINT "tbl_sync_log_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "tbl_location"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;
