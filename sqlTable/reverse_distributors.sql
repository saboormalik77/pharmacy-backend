create table public.reverse_distributors (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  code character varying(50) not null,
  contact_email character varying(255) null,
  contact_phone character varying(20) null,
  address jsonb null,
  portal_url text null,
  supported_formats text[] null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  fee_rates jsonb null,
  constraint reverse_distributors_pkey primary key (id),
  constraint reverse_distributors_code_key unique (code)
) TABLESPACE pg_default;

-- fee_rates structure example:
-- {
--   "30": { "percentage": 13.4, "reportDate": "2025-01-10" },
--   "60": { "percentage": 15.0, "reportDate": "2025-01-10" },
--   "90": { "percentage": 18.0, "reportDate": "2025-01-10" }
-- }

-- Migration for existing table:
-- ALTER TABLE public.reverse_distributors ADD COLUMN IF NOT EXISTS fee_rates jsonb null;

create index IF not exists idx_reverse_distributors_name on public.reverse_distributors using btree (name) TABLESPACE pg_default;

create index IF not exists idx_reverse_distributors_code on public.reverse_distributors using btree (code) TABLESPACE pg_default;

create index IF not exists idx_reverse_distributors_active on public.reverse_distributors using btree (is_active) TABLESPACE pg_default;