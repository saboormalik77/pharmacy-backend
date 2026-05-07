create table public.ndc_products (
  id uuid not null default gen_random_uuid (),
  product_ndc character varying(20) not null,
  product_type_name character varying(100) null,
  proprietary_name character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ndc_products_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_ndc_products_product_ndc on public.ndc_products using btree (product_ndc) TABLESPACE pg_default;

create index IF not exists idx_ndc_products_proprietary_name on public.ndc_products using btree (proprietary_name) TABLESPACE pg_default;