create table public.return_reports (
  id uuid not null default gen_random_uuid (),
  document_id uuid not null,
  pharmacy_id uuid not null,
  data jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint return_reports_pkey primary key (id),
  constraint return_reports_document_id_fkey foreign KEY (document_id) references uploaded_documents (id) on delete CASCADE,
  constraint return_reports_pharmacy_id_fkey foreign KEY (pharmacy_id) references pharmacy (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_return_reports_document_id on public.return_reports using btree (document_id) TABLESPACE pg_default;

create index IF not exists idx_return_reports_pharmacy_id on public.return_reports using btree (pharmacy_id) TABLESPACE pg_default;

create index IF not exists idx_return_reports_created_at on public.return_reports using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_return_reports_data_gin on public.return_reports using gin (data) TABLESPACE pg_default;