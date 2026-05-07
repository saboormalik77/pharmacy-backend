create table public.subscription_plans (
  id character varying(50) not null,
  name character varying(100) not null,
  description text null,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly numeric(10, 2) not null default 0,
  stripe_price_id_monthly character varying(255) null,
  stripe_price_id_yearly character varying(255) null,
  stripe_product_id character varying(255) null,
  features jsonb not null default '[]'::jsonb,
  max_documents integer null,
  max_distributors integer null,
  analytics_features jsonb null default '[]'::jsonb,
  support_level character varying(50) null,
  is_active boolean null default true,
  display_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscription_plans_pkey primary key (id),
  constraint subscription_plans_id_check check (
    (
      (id)::text = any (
        (
          array[
            'free'::character varying,
            'basic'::character varying,
            'premium'::character varying,
            'enterprise'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint subscription_plans_support_level_check check (
    (
      (support_level)::text = any (
        (
          array[
            'email'::character varying,
            'priority'::character varying,
            'dedicated'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_subscription_plans_is_active on public.subscription_plans using btree (is_active) TABLESPACE pg_default;