create table public.custom_packages (
  id uuid not null default gen_random_uuid (),
  package_number character varying(100) not null,
  pharmacy_id uuid not null,
  distributor_name character varying(255) not null,
  distributor_id uuid null,
  total_items integer null default 0,
  total_estimated_value numeric(10, 2) null default 0,
  fee_rate numeric(5, 2) null default 0,
  fee_amount numeric(10, 2) null default 0,
  net_estimated_value numeric(10, 2) null default 0,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status boolean not null default false,
  constraint custom_packages_pkey primary key (id),
  constraint custom_packages_package_number_key unique (package_number),
  constraint custom_packages_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint custom_packages_distributor_id_fkey foreign KEY (distributor_id) references reverse_distributors (id),
  constraint custom_packages_pharmacy_id_fkey foreign KEY (pharmacy_id) references pharmacy (id) on delete CASCADE
) TABLESPACE pg_default;

-- Migration for existing table:
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS fee_rate numeric(5, 2) null default 0;
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS fee_amount numeric(10, 2) null default 0;
ALTER TABLE public.custom_packages ADD COLUMN IF NOT EXISTS net_estimated_value numeric(10, 2) null default 0;

create index IF not exists idx_custom_packages_pharmacy_id on public.custom_packages using btree (pharmacy_id) TABLESPACE pg_default;

create index IF not exists idx_custom_packages_package_number on public.custom_packages using btree (package_number) TABLESPACE pg_default;

create index IF not exists idx_custom_packages_distributor_id on public.custom_packages using btree (distributor_id) TABLESPACE pg_default;

create index IF not exists idx_custom_packages_status on public.custom_packages using btree (status) TABLESPACE pg_default;