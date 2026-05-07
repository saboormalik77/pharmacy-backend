create table public.products (
  id uuid not null default gen_random_uuid (),
  ndc character varying(50) not null,
  product_name character varying(500) not null,
  manufacturer character varying(255) null,
  strength character varying(100) null,
  dosage_form character varying(100) null,
  package_size integer null,
  wac numeric(10, 2) null,
  awp numeric(10, 2) null,
  dea_schedule character varying(10) null,
  return_eligibility jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id),
  constraint products_ndc_key unique (ndc)
) TABLESPACE pg_default;

create index IF not exists idx_products_ndc on public.products using btree (ndc) TABLESPACE pg_default;