create table public.uploaded_documents (
  id uuid not null default gen_random_uuid (),
  pharmacy_id uuid not null,
  file_name character varying(500) not null,
  file_size bigint not null,
  file_type character varying(100) null,
  file_url text null,
  reverse_distributor_id uuid null,
  source character varying(50) null default 'manual_upload'::character varying,
  status character varying(50) null default 'uploading'::character varying,
  uploaded_at timestamp with time zone null default now(),
  processed_at timestamp with time zone null,
  error_message text null,
  extracted_items integer null default 0,
  total_credit_amount numeric(10, 2) null,
  processing_progress integer null default 0,
  report_date date null,
  constraint uploaded_documents_pkey primary key (id),
  constraint uploaded_documents_pharmacy_id_fkey foreign KEY (pharmacy_id) references pharmacy (id) on delete CASCADE,
  constraint uploaded_documents_reverse_distributor_id_fkey foreign KEY (reverse_distributor_id) references reverse_distributors (id),
  constraint uploaded_documents_source_check check (
    (
      (source)::text = any (
        (
          array[
            'manual_upload'::character varying,
            'email_forward'::character varying,
            'portal_fetch'::character varying,
            'api'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint uploaded_documents_status_check check (
    (
      (status)::text = any (
        (
          array[
            'uploading'::character varying,
            'processing'::character varying,
            'completed'::character varying,
            'failed'::character varying,
            'needs_review'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_uploaded_documents_pharmacy_id on public.uploaded_documents using btree (pharmacy_id) TABLESPACE pg_default;

create index IF not exists idx_uploaded_documents_reverse_distributor_id on public.uploaded_documents using btree (reverse_distributor_id) TABLESPACE pg_default;

create index IF not exists idx_uploaded_documents_status on public.uploaded_documents using btree (status) TABLESPACE pg_default;

create index IF not exists idx_uploaded_documents_report_date on public.uploaded_documents using btree (report_date) TABLESPACE pg_default;

create index IF not exists idx_uploaded_documents_uploaded_at on public.uploaded_documents using btree (uploaded_at) TABLESPACE pg_default;