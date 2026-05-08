create table public.pharmacy (
  id uuid not null,
  email character varying(255) not null,
  name character varying(255) not null,
  pharmacy_name character varying(255) not null,
  npi_number character varying(50) null,
  dea_number character varying(50) null,
  phone character varying(20) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pharmacy_pkey primary key (id),
  constraint pharmacy_email_key unique (email),
  constraint pharmacy_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_pharmacy_email on public.pharmacy using btree (email) TABLESPACE pg_default;