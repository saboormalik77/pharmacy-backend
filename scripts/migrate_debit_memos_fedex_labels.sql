-- Migration: add fedex_labels column to debit_memos
-- Required for individual-memo FedEx shipments (non-grouped)

ALTER TABLE public.debit_memos
  ADD COLUMN IF NOT EXISTS fedex_labels jsonb;
