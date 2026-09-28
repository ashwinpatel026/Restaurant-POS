CREATE TABLE IF NOT EXISTS public.tbl_store
(
    storeid bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1 ),
    storename character varying(50) COLLATE pg_catalog."default",
    storeaddress1 character varying(200) COLLATE pg_catalog."default",
    storeaddress2 character varying(200) COLLATE pg_catalog."default",
    storecity character varying(30) COLLATE pg_catalog."default",
    storestate character varying(20) COLLATE pg_catalog."default",
    storezipcode character varying(10) COLLATE pg_catalog."default",
    storephonenumber character varying(15) COLLATE pg_catalog."default",
    storefaxnumber character varying(15) COLLATE pg_catalog."default",
    storeaccountnumber character varying(30) COLLATE pg_catalog."default",
    storeroutingnumber character varying(30) COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    created_by integer NOT NULL,
    created_on timestamp(6) without time zone NOT NULL DEFAULT now(),
    updated_by integer,
    updated_on timestamp(6) without time zone,
    is_delete boolean DEFAULT false,
    store_code character varying(50) COLLATE pg_catalog."default" DEFAULT ''::character varying,
    company_code character varying(50) COLLATE pg_catalog."default",
    CONSTRAINT tbl_store_pkey PRIMARY KEY (storeid)
);

CREATE INDEX IF NOT EXISTS tbl_store_store_code_idx ON public.tbl_store (store_code);
