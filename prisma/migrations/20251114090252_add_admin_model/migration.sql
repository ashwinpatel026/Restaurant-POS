-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN');

-- CreateTable
CREATE TABLE "tbl_admin" (
    "admin_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "AdminRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_admin_email_key" ON "tbl_admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_admin_username_key" ON "tbl_admin"("username");

-- CreateIndex
CREATE INDEX "tbl_admin_email_idx" ON "tbl_admin"("email");

-- CreateIndex
CREATE INDEX "tbl_admin_username_idx" ON "tbl_admin"("username");
