-- Migration: Expand enum CHECK constraints
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Expand labeler_type on manufacturer_policies
--    Adds: manufacturer, distributor, repackager
ALTER TABLE public.manufacturer_policies
    DROP CONSTRAINT IF EXISTS manufacturer_policies_labeler_type_check;

ALTER TABLE public.manufacturer_policies
    ADD CONSTRAINT manufacturer_policies_labeler_type_check
    CHECK (labeler_type = ANY (ARRAY[
        'generic'::text,
        'brand'::text,
        'manufacturer'::text,
        'distributor'::text,
        'repackager'::text
    ]));

-- 2. Expand reimbursement_type on manufacturer_return_policies
--    Adds: credit, check, ach  (existing: batch, per_item)
ALTER TABLE public.manufacturer_return_policies
    DROP CONSTRAINT IF EXISTS manufacturer_return_policies_reimbursement_type_check;

ALTER TABLE public.manufacturer_return_policies
    ADD CONSTRAINT manufacturer_return_policies_reimbursement_type_check
    CHECK (reimbursement_type = ANY (ARRAY[
        'batch'::text,
        'per_item'::text,
        'credit'::text,
        'check'::text,
        'ach'::text
    ]));
