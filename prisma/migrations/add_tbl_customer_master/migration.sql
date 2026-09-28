CREATE SEQUENCE IF NOT EXISTS public.tbl_customer_master_customer_id_seq AS bigint;

CREATE TABLE IF NOT EXISTS public.tbl_customer_master
(
    customer_id bigint NOT NULL DEFAULT nextval('public.tbl_customer_master_customer_id_seq'::regclass),
    customer_code character varying(40) COLLATE pg_catalog."default" NOT NULL,
    phone_number character varying(20) COLLATE pg_catalog."default" NOT NULL,
    customer_name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    address_line1 character varying(255) COLLATE pg_catalog."default",
    address_line2 character varying(150) COLLATE pg_catalog."default",
    city character varying(100) COLLATE pg_catalog."default",
    state character varying(100) COLLATE pg_catalog."default",
    zip_code character varying(20) COLLATE pg_catalog."default",
    email character varying(150) COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    country character varying(50) COLLATE pg_catalog."default",
    is_delete boolean DEFAULT false,
    store_code character varying(50) COLLATE pg_catalog."default",
    business_name character varying(100) COLLATE pg_catalog."default",
    createdby bigint,
    updatedby bigint,
    sync_id uuid NOT NULL DEFAULT gen_random_uuid(),
    sync_source character varying(20) COLLATE pg_catalog."default" DEFAULT 'location',
    CONSTRAINT tbl_customer_master_pkey PRIMARY KEY (customer_id)
);

ALTER TABLE public.tbl_customer_master ADD COLUMN IF NOT EXISTS createdby bigint;
ALTER TABLE public.tbl_customer_master ADD COLUMN IF NOT EXISTS updatedby bigint;
ALTER TABLE public.tbl_customer_master ADD COLUMN IF NOT EXISTS sync_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.tbl_customer_master ADD COLUMN IF NOT EXISTS sync_source character varying(20) DEFAULT 'location';

ALTER SEQUENCE public.tbl_customer_master_customer_id_seq OWNED BY public.tbl_customer_master.customer_id;

CREATE INDEX IF NOT EXISTS tbl_customer_master_store_code_idx ON public.tbl_customer_master (store_code);
CREATE INDEX IF NOT EXISTS tbl_customer_master_customer_code_idx ON public.tbl_customer_master (customer_code);
CREATE INDEX IF NOT EXISTS tbl_customer_master_phone_number_idx ON public.tbl_customer_master (phone_number);
CREATE INDEX IF NOT EXISTS tbl_customer_master_sync_id_idx ON public.tbl_customer_master (sync_id);
