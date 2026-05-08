create table public.custom_package_items (
  id uuid not null default gen_random_uuid (),
  package_id uuid not null,
  ndc character varying(50) not null,
  product_id uuid null,
  product_name character varying(500) not null,
  "full" integer not null default 0,
  "partial" integer not null default 0,
  price_per_unit numeric(10, 2) not null,
  total_value numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  constraint custom_package_items_pkey primary key (id),
  constraint custom_package_items_package_id_fkey foreign KEY (package_id) references custom_packages (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_custom_package_items_package_id on public.custom_package_items using btree (package_id) TABLESPACE pg_default;

create index IF not exists idx_custom_package_items_ndc on public.custom_package_items using btree (ndc) TABLESPACE pg_default;

create index IF not exists idx_custom_package_items_product_id on public.custom_package_items using btree (product_id) TABLESPACE pg_default;

-- Migration script to add product_id column to existing table:
-- ALTER TABLE public.custom_package_items ADD COLUMN IF NOT EXISTS product_id uuid null;
-- CREATE INDEX IF NOT EXISTS idx_custom_package_items_product_id ON public.custom_package_items USING btree (product_id) TABLESPACE pg_default;
