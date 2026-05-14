-- ============================================================
-- Table   : public.notifications
-- ============================================================

DROP TABLE IF EXISTS public."notifications" CASCADE;

CREATE TABLE public."notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "read" boolean DEFAULT false,
    "action_url" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."notifications"
    ADD CONSTRAINT "notifications_type_check" CHECK (type::text = ANY (ARRAY['document_processed'::character varying::text, 'price_alert'::character varying::text, 'subscription'::character varying::text, 'system'::character varying::text, 'recommendation_ready'::character varying::text, 'credit_received'::character varying::text, 'shipment_update'::character varying::text, 'order_status'::character varying::text]));

ALTER TABLE public."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

