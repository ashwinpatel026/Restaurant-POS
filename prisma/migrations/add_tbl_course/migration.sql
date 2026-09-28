CREATE SEQUENCE IF NOT EXISTS public.tbl_course_course_id_seq AS integer;

CREATE TABLE IF NOT EXISTS public.tbl_course
(
    course_id integer NOT NULL DEFAULT nextval('public.tbl_course_course_id_seq'::regclass),
    course_name character varying(50) COLLATE pg_catalog."default" NOT NULL,
    display_order integer NOT NULL,
    is_active boolean DEFAULT true,
    is_delete boolean DEFAULT false,
    store_code character varying(100) COLLATE pg_catalog."default",
    createdby bigint,
    createdon timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedby bigint,
    updatedon timestamp(3) without time zone,
    sync_id uuid NOT NULL DEFAULT gen_random_uuid(),
    sync_source character varying(20) COLLATE pg_catalog."default" DEFAULT 'location',
    CONSTRAINT tbl_course_pkey PRIMARY KEY (course_id)
);

ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS createdby bigint;
ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS createdon timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS updatedby bigint;
ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS updatedon timestamp(3) without time zone;
ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS sync_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.tbl_course ADD COLUMN IF NOT EXISTS sync_source character varying(20) DEFAULT 'location';

ALTER SEQUENCE public.tbl_course_course_id_seq OWNED BY public.tbl_course.course_id;

CREATE INDEX IF NOT EXISTS tbl_course_store_code_idx ON public.tbl_course (store_code);
CREATE INDEX IF NOT EXISTS tbl_course_sync_id_idx ON public.tbl_course (sync_id);
