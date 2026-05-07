create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  pharmacy_id uuid not null,
  plan character varying(50) not null,
  status character varying(50) null default 'trial'::character varying,
  current_period_start timestamp with time zone null,
  current_period_end timestamp with time zone null,
  cancel_at_period_end boolean null default false,
  payment_method jsonb null,
  price numeric(10, 2) null,
  billing_interval character varying(20) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  stripe_customer_id character varying(255) null,
  stripe_subscription_id character varying(255) null,
  stripe_price_id character varying(255) null,
  stripe_current_period_start timestamp with time zone null,
  stripe_current_period_end timestamp with time zone null,
  stripe_cancel_at_period_end boolean null default false,
  stripe_canceled_at timestamp with time zone null,
  stripe_ended_at timestamp with time zone null,
  stripe_latest_invoice_id character varying(255) null,
  stripe_payment_method_id character varying(255) null,
  trial_start timestamp with time zone null,
  trial_end timestamp with time zone null,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_pharmacy_id_fkey foreign KEY (pharmacy_id) references pharmacy (id) on delete CASCADE,
  constraint subscriptions_billing_interval_check check (
    (
      (billing_interval)::text = any (
        (
          array[
            'monthly'::character varying,
            'yearly'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint subscriptions_plan_check check (
    (
      (plan)::text = any (
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
  constraint subscriptions_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'trial'::character varying,
            'expired'::character varying,
            'cancelled'::character varying,
            'past_due'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_stripe_customer_id on public.subscriptions using btree (stripe_customer_id) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_stripe_subscription_id on public.subscriptions using btree (stripe_subscription_id) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_pharmacy_id on public.subscriptions using btree (pharmacy_id) TABLESPACE pg_default;