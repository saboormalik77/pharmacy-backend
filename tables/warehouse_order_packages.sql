-- ============================================================
-- Table   : public.warehouse_order_packages
-- ============================================================

DROP TABLE IF EXISTS public."warehouse_order_packages" CASCADE;

CREATE TABLE public."warehouse_order_packages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "warehouse_order_id" uuid NOT NULL,
    "package_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "warehouse_order_packages_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."warehouse_order_packages"
    ADD CONSTRAINT "warehouse_order_packages_package_id_fkey" FOREIGN KEY (package_id) REFERENCES warehouse_packages(id) ON DELETE CASCADE;

ALTER TABLE public."warehouse_order_packages"
    ADD CONSTRAINT "warehouse_order_packages_warehouse_order_id_fkey" FOREIGN KEY (warehouse_order_id) REFERENCES warehouse_orders(id) ON DELETE CASCADE;

