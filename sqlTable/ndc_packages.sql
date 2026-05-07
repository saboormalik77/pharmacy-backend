create table public.ndc_packages (
  id uuid not null default gen_random_uuid (),
  product_ndc character varying(20) not null,
  ndc_package_code character varying(20) not null,
  package_description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ndc_packages_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_ndc_packages_ndc_package_code on public.ndc_packages using btree (ndc_package_code) TABLESPACE pg_default;

create index IF not exists idx_ndc_packages_product_ndc on public.ndc_packages using btree (product_ndc) TABLESPACE pg_default;