-- Table: public.roles

-- DROP TABLE IF EXISTS public.roles;

CREATE TABLE IF NOT EXISTS public.roles
(
    role_id bigint NOT NULL DEFAULT nextval('roles_role_id_seq'::regclass),
    role_code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    role_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    is_system_role boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    sync_id uuid NOT NULL,
    sync_source character varying(20) COLLATE pg_catalog."default" DEFAULT 'server'::character varying,
    created_on timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on timestamp(3) without time zone,
    CONSTRAINT roles_pkey PRIMARY KEY (role_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.roles
    OWNER to postgres;
-- Index: roles_role_code_idx

-- DROP INDEX IF EXISTS public.roles_role_code_idx;

CREATE INDEX IF NOT EXISTS roles_role_code_idx
    ON public.roles USING btree
    (role_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: roles_role_code_key

-- DROP INDEX IF EXISTS public.roles_role_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS roles_role_code_key
    ON public.roles USING btree
    (role_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: roles_sync_id_idx

-- DROP INDEX IF EXISTS public.roles_sync_id_idx;

CREATE INDEX IF NOT EXISTS roles_sync_id_idx
    ON public.roles USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: roles_sync_id_key

-- DROP INDEX IF EXISTS public.roles_sync_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS roles_sync_id_key
    ON public.roles USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

--===============================================================

-- Table: public.permissions

-- DROP TABLE IF EXISTS public.permissions;

CREATE TABLE IF NOT EXISTS public.permissions
(
    permission_id bigint NOT NULL DEFAULT nextval('permissions_permission_id_seq'::regclass),
    permission_code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    permission_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    module character varying(100) COLLATE pg_catalog."default" NOT NULL,
    action character varying(100) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    sync_id uuid NOT NULL,
    sync_source character varying(20) COLLATE pg_catalog."default" DEFAULT 'server'::character varying,
    created_on timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_on timestamp(3) without time zone,
    CONSTRAINT permissions_pkey PRIMARY KEY (permission_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.permissions
    OWNER to postgres;
-- Index: permissions_module_idx

-- DROP INDEX IF EXISTS public.permissions_module_idx;

CREATE INDEX IF NOT EXISTS permissions_module_idx
    ON public.permissions USING btree
    (module COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: permissions_permission_code_idx

-- DROP INDEX IF EXISTS public.permissions_permission_code_idx;

CREATE INDEX IF NOT EXISTS permissions_permission_code_idx
    ON public.permissions USING btree
    (permission_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: permissions_permission_code_key

-- DROP INDEX IF EXISTS public.permissions_permission_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS permissions_permission_code_key
    ON public.permissions USING btree
    (permission_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: permissions_sync_id_idx

-- DROP INDEX IF EXISTS public.permissions_sync_id_idx;

CREATE INDEX IF NOT EXISTS permissions_sync_id_idx
    ON public.permissions USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: permissions_sync_id_key

-- DROP INDEX IF EXISTS public.permissions_sync_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS permissions_sync_id_key
    ON public.permissions USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

    --===============================================================

    -- Table: public.role_permissions

-- DROP TABLE IF EXISTS public.role_permissions;

CREATE TABLE IF NOT EXISTS public.role_permissions
(
    role_permission_id bigint NOT NULL DEFAULT nextval('role_permissions_role_permission_id_seq'::regclass),
    role_code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    permission_code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    sync_id uuid NOT NULL,
    sync_source character varying(20) COLLATE pg_catalog."default" DEFAULT 'server'::character varying,
    created_on timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id),
    CONSTRAINT role_permissions_permission_code_fkey FOREIGN KEY (permission_code)
        REFERENCES public.permissions (permission_code) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT role_permissions_role_code_fkey FOREIGN KEY (role_code)
        REFERENCES public.roles (role_code) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.role_permissions
    OWNER to postgres;
-- Index: role_permissions_permission_code_idx

-- DROP INDEX IF EXISTS public.role_permissions_permission_code_idx;

CREATE INDEX IF NOT EXISTS role_permissions_permission_code_idx
    ON public.role_permissions USING btree
    (permission_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: role_permissions_role_code_idx

-- DROP INDEX IF EXISTS public.role_permissions_role_code_idx;

CREATE INDEX IF NOT EXISTS role_permissions_role_code_idx
    ON public.role_permissions USING btree
    (role_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: role_permissions_role_code_permission_code_key

-- DROP INDEX IF EXISTS public.role_permissions_role_code_permission_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_code_permission_code_key
    ON public.role_permissions USING btree
    (role_code COLLATE pg_catalog."default" ASC NULLS LAST, permission_code COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: role_permissions_sync_id_idx

-- DROP INDEX IF EXISTS public.role_permissions_sync_id_idx;

CREATE INDEX IF NOT EXISTS role_permissions_sync_id_idx
    ON public.role_permissions USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: role_permissions_sync_id_key

-- DROP INDEX IF EXISTS public.role_permissions_sync_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_sync_id_key
    ON public.role_permissions USING btree
    (sync_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;