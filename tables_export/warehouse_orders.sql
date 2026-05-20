-- ============================================================
-- Table   : public.warehouse_orders
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_orders" CASCADE;

CREATE TABLE public."warehouse_orders" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "order_number" varchar(100) NOT NULL,
    "package_id" uuid,
    "return_id" uuid,
    "pharmacy_id" uuid NOT NULL,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "total_items" integer DEFAULT 0,
    "refundable_items" integer DEFAULT 0,
    "non_refundable_items" integer DEFAULT 0,
    "total_estimated_credit" numeric DEFAULT 0,
    "actual_credit" numeric,
    "variance" numeric,
    "received_by" uuid,
    "inspected_by" uuid,
    "processed_by" uuid,
    "notes" text,
    "received_at" timestamptz,
    "completed_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_orders_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'received'::character varying::text, 'inspecting'::character varying::text, 'classifying'::character varying::text, 'processing'::character varying::text, 'completed'::character varying::text, 'exception'::character varying::text]));

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_inspected_by_fkey" FOREIGN KEY (inspected_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_received_by_fkey" FOREIGN KEY (received_by) REFERENCES auth.users(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_return_id_fkey" FOREIGN KEY (return_id) REFERENCES returns(id);

ALTER TABLE public."warehouse_orders"
    ADD CONSTRAINT "warehouse_orders_order_number_key" UNIQUE (order_number);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_orders_order_number_key ON public.warehouse_orders USING btree (order_number);

