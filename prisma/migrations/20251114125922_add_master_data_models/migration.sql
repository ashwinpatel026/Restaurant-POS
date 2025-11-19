-- CreateTable
CREATE TABLE "tbl_master_time_events" (
    "id" BIGSERIAL NOT NULL,
    "Event_code" VARCHAR(100) NOT NULL,
    "EventName" VARCHAR(100) NOT NULL,
    "GlobalPrice_Amount_Add" DECIMAL(18,2),
    "GlobalPrice_Amount_Disc" DECIMAL(18,2),
    "GlobalPrice_Per_Add" DECIMAL(18,2),
    "GlobalPrice_Per_Disc" DECIMAL(18,2),
    "Monday" VARCHAR(50),
    "Mon_StartTime" VARCHAR(10),
    "Mon_EndTime" VARCHAR(10),
    "Tuesday" VARCHAR(50),
    "Tue_StartTime" VARCHAR(10),
    "Tue_EndTime" VARCHAR(10),
    "Wednesday" VARCHAR(50),
    "Wed_StartTime" VARCHAR(10),
    "Wed_EndTime" VARCHAR(10),
    "Thursday" VARCHAR(50),
    "Thu_StartTime" VARCHAR(10),
    "Thu_EndTime" VARCHAR(10),
    "FriDay" VARCHAR(50),
    "Fri_StartTime" VARCHAR(10),
    "Fri_EndTime" VARCHAR(10),
    "Saturday" VARCHAR(50),
    "Sat_StartTime" VARCHAR(10),
    "Sat_EndTime" VARCHAR(10),
    "SunDay" VARCHAR(50),
    "Sun_StartTime" VARCHAR(10),
    "Sun_EndTime" VARCHAR(10),
    "Event_Start_Date" DATE,
    "Event_End_Date" DATE,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "Created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Created_by" BIGINT,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_master_time_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_prep_zone" (
    "prep_zone_id" BIGSERIAL NOT NULL,
    "prep_zone_code" VARCHAR(100) NOT NULL,
    "prep_zone_name" VARCHAR(500),
    "station_code" VARCHAR(100),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "send_to_expediter" INTEGER,
    "always_print_ticket" INTEGER,
    "printer_code" VARCHAR(100),
    "backup_printer_code" VARCHAR(100),
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_prep_zone_pkey" PRIMARY KEY ("prep_zone_id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_master" (
    "menu_master_id" BIGSERIAL NOT NULL,
    "menu_master_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(500),
    "label_name" VARCHAR(500),
    "color_code" VARCHAR(100),
    "prep_zone_code" JSONB,
    "station_code" JSONB,
    "is_event_menu" INTEGER,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_menu_master_pkey" PRIMARY KEY ("menu_master_id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_master_event" (
    "id" BIGSERIAL NOT NULL,
    "menu_master_code" VARCHAR(100) NOT NULL,
    "event_code" VARCHAR(100) NOT NULL,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_master_menu_master_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_category" (
    "menu_category_id" BIGSERIAL NOT NULL,
    "menu_master_code" VARCHAR(100) NOT NULL,
    "menu_category_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200),
    "color_code" VARCHAR(100),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_menu_category_pkey" PRIMARY KEY ("menu_category_id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_category_modifier" (
    "id" BIGSERIAL NOT NULL,
    "menu_category_code" VARCHAR(100) NOT NULL,
    "modifier_group_code" VARCHAR(100) NOT NULL,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_master_menu_category_modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_item" (
    "menu_item_id" BIGSERIAL NOT NULL,
    "menu_item_code" VARCHAR(100) NOT NULL,
    "menu_category_code" VARCHAR(100),
    "name" VARCHAR(500),
    "kitchen_name" VARCHAR(150),
    "label_name" VARCHAR(500),
    "color_code" VARCHAR(100),
    "calories" VARCHAR(100),
    "description" TEXT,
    "item_size" VARCHAR(50),
    "sku_plu" BIGINT,
    "is_alcohol" INTEGER NOT NULL DEFAULT 0,
    "menu_img" TEXT,
    "price_strategy" INTEGER,
    "card_price" DECIMAL(10,2),
    "cash_price" DECIMAL(10,2),
    "is_price" INTEGER NOT NULL DEFAULT 1,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "stockinhand" DECIMAL(18,2),
    "is_out_stock" INTEGER,
    "item_contain_alcohol" INTEGER,
    "is_pos_visible" INTEGER,
    "is_kiosk_order_pay" INTEGER,
    "is_online_order_by_app" INTEGER,
    "is_online_ordering" INTEGER,
    "is_customer_invoice" INTEGER,
    "tax_code" VARCHAR(50),
    "inherit_tax_inclusion" BOOLEAN NOT NULL DEFAULT true,
    "is_tax_included" BOOLEAN NOT NULL DEFAULT false,
    "inherit_dining_tax" BOOLEAN NOT NULL DEFAULT true,
    "dining_tax_effect" VARCHAR(50) DEFAULT 'No Effect',
    "disqualify_dining_tax_exemption" BOOLEAN NOT NULL DEFAULT false,
    "inherit_modifier_group" BOOLEAN NOT NULL DEFAULT true,
    "prep_zone_code" JSONB,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_menu_item_pkey" PRIMARY KEY ("menu_item_id")
);

-- CreateTable
CREATE TABLE "tbl_master_modifier_group" (
    "id" BIGSERIAL NOT NULL,
    "modifier_group_code" VARCHAR(100) NOT NULL,
    "group_name" VARCHAR(200),
    "label_name" VARCHAR(100),
    "is_required" INTEGER NOT NULL DEFAULT 0,
    "is_multiselect" INTEGER NOT NULL DEFAULT 0,
    "min_selection" INTEGER,
    "max_selection" INTEGER,
    "show_default_top" INTEGER NOT NULL DEFAULT 0,
    "inherit_from_menu_group" INTEGER NOT NULL DEFAULT 0,
    "price_strategy" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_modifier_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_modifier_item" (
    "id" BIGSERIAL NOT NULL,
    "modifier_item_code" VARCHAR(100) NOT NULL,
    "modifier_group_code" VARCHAR(100),
    "name" VARCHAR(500),
    "label_name" VARCHAR(100),
    "color_code" VARCHAR(100),
    "price" DECIMAL(10,2),
    "is_default" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" BIGINT,
    "updatedon" TIMESTAMP(3),

    CONSTRAINT "tbl_master_modifier_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_menu_item_modifier_group" (
    "id" BIGSERIAL NOT NULL,
    "menu_item_code" VARCHAR(100),
    "modifier_group_code" VARCHAR(100),
    "inherit_from_menu_group" INTEGER NOT NULL DEFAULT 1,
    "is_inherit_from_menu_category" INTEGER NOT NULL DEFAULT 1,
    "is_required" INTEGER NOT NULL DEFAULT 0,
    "is_multiselect" INTEGER NOT NULL DEFAULT 0,
    "min_selection" INTEGER,
    "max_selection" INTEGER,
    "createdby" BIGINT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_master_menu_item_modifier_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_master_tax" (
    "tbl_tax_id" BIGSERIAL NOT NULL,
    "tax_code" VARCHAR(100) NOT NULL,
    "taxname" VARCHAR(30) NOT NULL,
    "taxrate" DECIMAL(22,2) NOT NULL DEFAULT 0.00,
    "created_by" BIGINT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_master_tax_pkey" PRIMARY KEY ("tbl_tax_id")
);

-- CreateTable
CREATE TABLE "tbl_master_station" (
    "tbl_station_id" BIGSERIAL NOT NULL,
    "station_code" VARCHAR(100) NOT NULL,
    "stationname" VARCHAR(100),
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "station_groups" JSONB,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_on" TIMESTAMP(3),

    CONSTRAINT "tbl_master_station_pkey" PRIMARY KEY ("tbl_station_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_time_events_Event_code_key" ON "tbl_master_time_events"("Event_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_prep_zone_prep_zone_code_key" ON "tbl_master_prep_zone"("prep_zone_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_master_menu_master_code_key" ON "tbl_master_menu_master"("menu_master_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_master_event_menu_master_code_event_code_key" ON "tbl_master_menu_master_event"("menu_master_code", "event_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_category_menu_category_code_key" ON "tbl_master_menu_category"("menu_category_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_category_modifier_menu_category_code_modifi_key" ON "tbl_master_menu_category_modifier"("menu_category_code", "modifier_group_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_item_menu_item_code_key" ON "tbl_master_menu_item"("menu_item_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_modifier_group_modifier_group_code_key" ON "tbl_master_modifier_group"("modifier_group_code");

-- CreateIndex
CREATE INDEX "tbl_master_modifier_group_modifier_group_code_idx" ON "tbl_master_modifier_group"("modifier_group_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_modifier_item_modifier_item_code_key" ON "tbl_master_modifier_item"("modifier_item_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_menu_item_modifier_group_menu_item_code_modifier_key" ON "tbl_master_menu_item_modifier_group"("menu_item_code", "modifier_group_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_tax_tax_code_key" ON "tbl_master_tax"("tax_code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_master_station_station_code_key" ON "tbl_master_station"("station_code");

-- AddForeignKey
ALTER TABLE "tbl_master_menu_master_event" ADD CONSTRAINT "tbl_master_menu_master_event_menu_master_code_fkey" FOREIGN KEY ("menu_master_code") REFERENCES "tbl_master_menu_master"("menu_master_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_master_event" ADD CONSTRAINT "tbl_master_menu_master_event_event_code_fkey" FOREIGN KEY ("event_code") REFERENCES "tbl_master_time_events"("Event_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_category" ADD CONSTRAINT "tbl_master_menu_category_menu_master_code_fkey" FOREIGN KEY ("menu_master_code") REFERENCES "tbl_master_menu_master"("menu_master_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_category_modifier" ADD CONSTRAINT "tbl_master_menu_category_modifier_menu_category_code_fkey" FOREIGN KEY ("menu_category_code") REFERENCES "tbl_master_menu_category"("menu_category_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_category_modifier" ADD CONSTRAINT "tbl_master_menu_category_modifier_modifier_group_code_fkey" FOREIGN KEY ("modifier_group_code") REFERENCES "tbl_master_modifier_group"("modifier_group_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_item" ADD CONSTRAINT "tbl_master_menu_item_menu_category_code_fkey" FOREIGN KEY ("menu_category_code") REFERENCES "tbl_master_menu_category"("menu_category_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_modifier_item" ADD CONSTRAINT "tbl_master_modifier_item_modifier_group_code_fkey" FOREIGN KEY ("modifier_group_code") REFERENCES "tbl_master_modifier_group"("modifier_group_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_item_modifier_group" ADD CONSTRAINT "tbl_master_menu_item_modifier_group_menu_item_code_fkey" FOREIGN KEY ("menu_item_code") REFERENCES "tbl_master_menu_item"("menu_item_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_master_menu_item_modifier_group" ADD CONSTRAINT "tbl_master_menu_item_modifier_group_modifier_group_code_fkey" FOREIGN KEY ("modifier_group_code") REFERENCES "tbl_master_modifier_group"("modifier_group_code") ON DELETE SET NULL ON UPDATE CASCADE;
