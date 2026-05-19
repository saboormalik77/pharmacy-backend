-- Migration: Track which debit memo is covered by which pharmacy payout
-- - Adds pharmacy_payout_id to debit_memos
-- - Calculate only sums memos not yet covered (pharmacy_payout_id IS NULL)
-- - Create marks covered memos and removes the duplicate-payment block
-- - list_batches uses pharmacy_payout_id IS NULL for pending-payout check
-- Run in Supabase Dashboard → SQL Editor (run AFTER migrate_list_batches_partial_payout.sql)

-- Step 1: Add the column
ALTER TABLE debit_memos
  ADD COLUMN IF NOT EXISTS pharmacy_payout_id uuid REFERENCES pharmacy_payments(id);

-- Step 2: Reset any incorrect backfill from a previous run of this migration
UPDATE debit_memos SET pharmacy_payout_id = NULL WHERE pharmacy_payout_id IS NOT NULL;

-- Step 2b: Smart backfill — for each existing payout, greedily mark only enough memos
-- (sorted by amount DESC) to cover that payout's total_credit_received.
-- This avoids over-assigning when a second payout is still pending.
DO $$
DECLARE
  pp          RECORD;
  dm          RECORD;
  running_sum DECIMAL(12,2);
BEGIN
  FOR pp IN
    SELECT id, pharmacy_id, batch_id, total_credit_received
      FROM pharmacy_payments
     WHERE batch_id IS NOT NULL
       AND status  != 'failed'
     ORDER BY created_at ASC
  LOOP
    running_sum := 0;
    FOR dm IN
      SELECT id, amount_received
        FROM debit_memos
       WHERE pharmacy_id      = pp.pharmacy_id
         AND batch_id         = pp.batch_id
         AND payment_status  IN ('paid', 'partial')
         AND pharmacy_payout_id IS NULL
       ORDER BY amount_received DESC
    LOOP
      EXIT WHEN running_sum >= pp.total_credit_received;
      UPDATE debit_memos SET pharmacy_payout_id = pp.id WHERE id = dm.id;
      running_sum := running_sum + dm.amount_received;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Update _debit_memo_to_json to expose pharmacyPayoutId
CREATE OR REPLACE FUNCTION public._debit_memo_to_json(d debit_memos)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                 d.id,
    'batchId',            d.batch_id,
    'pharmacyId',         d.pharmacy_id,
    'pharmacyName',       COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = d.pharmacy_id), ''),
    'memoNumber',         d.memo_number,
    'destination',        d.destination,
    'labelerId',          d.labeler_id,
    'labelerName',        d.labeler_name,
    'totalItems',         d.total_items,
    'totalAskValue',      d.total_ask_value,
    'totalReceivedValue', d.total_received_value,
    'raNumber',           d.ra_number,
    'raRequestedAt',      d.ra_requested_at,
    'raReceivedAt',       d.ra_received_at,
    'raStatus',           d.ra_status,
    'ticklerDate',        d.tickler_date,
    'baggieManifest',     d.baggie_manifest,
    'outboundTracking',   d.outbound_tracking,
    'shippedAt',          d.shipped_at,
    'paymentStatus',      d.payment_status,
    'amountRequested',    d.amount_requested,
    'amountReceived',     d.amount_received,
    'paymentReceivedAt',  d.payment_received_at,
    'paymentReference',   d.payment_reference,
    'paymentNotes',       d.payment_notes,
    'creditMemoUrl',      d.credit_memo_url,
    'pharmacyPayoutId',   d.pharmacy_payout_id,
    'createdAt',          d.created_at,
    'updatedAt',          d.updated_at
  );
$function$;

-- Step 4: Update pharmacy_payment_calculate — only sum uncovered memos
CREATE OR REPLACE FUNCTION public.pharmacy_payment_calculate(
  p_pharmacy_id uuid,
  p_batch_id uuid,
  p_company_fee_pct numeric DEFAULT 27.0,
  p_gpo_share_pct numeric DEFAULT 0.0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total_credit    DECIMAL(12,2);
  v_company_fee     DECIMAL(12,2);
  v_gpo_share       DECIMAL(12,2);
  v_pharmacy_payout DECIMAL(12,2);
  v_gpo_name        TEXT;
  v_pharmacy_name   TEXT;
  v_batch_name      TEXT;
  v_memo_count      INTEGER;
BEGIN
  SELECT pharmacy_name INTO v_pharmacy_name FROM pharmacy WHERE id = p_pharmacy_id;
  IF v_pharmacy_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  SELECT batch_name INTO v_batch_name FROM return_batches WHERE id = p_batch_id;
  IF v_batch_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;

  -- Only sum memos not yet covered by a prior payout
  SELECT COALESCE(SUM(amount_received), 0), COUNT(*)
    INTO v_total_credit, v_memo_count
    FROM debit_memos
   WHERE pharmacy_id  = p_pharmacy_id
     AND batch_id     = p_batch_id
     AND payment_status IN ('paid', 'partial')
     AND pharmacy_payout_id IS NULL;

  IF v_memo_count = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'No uncovered paid memos found for this pharmacy in this batch');
  END IF;

  v_company_fee     := ROUND(v_total_credit * (p_company_fee_pct / 100.0), 2);
  v_gpo_share       := ROUND(v_total_credit * (p_gpo_share_pct  / 100.0), 2);
  v_pharmacy_payout := v_total_credit - v_company_fee - v_gpo_share;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',          p_pharmacy_id,
      'pharmacyName',        v_pharmacy_name,
      'batchId',             p_batch_id,
      'batchName',           v_batch_name,
      'gpoName',             v_gpo_name,
      'totalCreditReceived', v_total_credit,
      'memoCount',           v_memo_count,
      'companyFeePercent',   p_company_fee_pct,
      'companyFee',          v_company_fee,
      'gpoSharePercent',     p_gpo_share_pct,
      'gpoShare',            v_gpo_share,
      'pharmacyPayout',      v_pharmacy_payout
    )
  );
END;
$function$;

-- Step 5: Update pharmacy_payment_create
-- - Remove the duplicate-payment block (allow multiple payouts per pharmacy+batch)
-- - After inserting, mark the covered memos with the new payment ID
CREATE OR REPLACE FUNCTION public.pharmacy_payment_create(
  p_pharmacy_id uuid,
  p_batch_id uuid DEFAULT NULL::uuid,
  p_total_credit_received numeric DEFAULT 0,
  p_company_fee_percent numeric DEFAULT 27.0,
  p_company_fee numeric DEFAULT 0,
  p_gpo_share numeric DEFAULT 0,
  p_pharmacy_payout numeric DEFAULT 0,
  p_payment_method text DEFAULT NULL::text,
  p_payment_reference text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_payment  pharmacy_payments;
  v_gpo_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = p_pharmacy_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  IF p_batch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM return_batches WHERE id = p_batch_id) THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('wire', 'check', 'zelle', 'cash') THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid payment_method. Must be: wire, check, zelle, cash');
  END IF;

  BEGIN
    SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;
  EXCEPTION
    WHEN undefined_column THEN v_gpo_name := NULL;
  END;

  INSERT INTO pharmacy_payments (
    pharmacy_id, batch_id, total_credit_received, company_fee,
    company_fee_percent, gpo_share, gpo_name, pharmacy_payout,
    payment_method, payment_reference, notes, created_by, status
  ) VALUES (
    p_pharmacy_id, p_batch_id, p_total_credit_received, p_company_fee,
    p_company_fee_percent, p_gpo_share, v_gpo_name, p_pharmacy_payout,
    p_payment_method, p_payment_reference, p_notes, p_created_by, 'pending'
  )
  RETURNING * INTO v_payment;

  -- Mark the uncovered paid memos as covered by this new payout
  IF p_batch_id IS NOT NULL THEN
    UPDATE debit_memos
       SET pharmacy_payout_id = v_payment.id
     WHERE pharmacy_id        = p_pharmacy_id
       AND batch_id           = p_batch_id
       AND payment_status    IN ('paid', 'partial')
       AND pharmacy_payout_id IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'data', _pharmacy_payment_to_json(v_payment)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', true, 'code', 500, 'message', 'Internal error: ' || SQLERRM);
END;
$function$;

-- Step 6: Update list_batches — use pharmacy_payout_id IS NULL for pending-payout check
CREATE OR REPLACE FUNCTION public.list_batches(
  p_status text DEFAULT NULL::text,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
  p_all_debit_memos_shipped boolean DEFAULT false,
  p_exclude_if_no_remaining_pharmacy_payout boolean DEFAULT false,
  p_all_debit_memos_paid_or_partial boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_offset  INTEGER;
  v_total   INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * p_limit;

  SELECT COUNT(*) INTO v_total
    FROM return_batches b
   WHERE (p_status IS NULL OR b.status = p_status)
     AND (
       NOT COALESCE(p_all_debit_memos_shipped, FALSE)
       OR (
         EXISTS (SELECT 1 FROM debit_memos dm WHERE dm.batch_id = b.id)
         AND NOT EXISTS (
           SELECT 1 FROM debit_memos dm
           WHERE dm.batch_id = b.id
             AND (dm.ra_status IS DISTINCT FROM 'shipped')
         )
       )
     )
     -- At least one pharmacy has at least one manufacturer-paid memo
     AND (
       NOT COALESCE(p_all_debit_memos_paid_or_partial, FALSE)
       OR EXISTS (
         SELECT 1 FROM debit_memos dm
         WHERE dm.batch_id = b.id
           AND dm.payment_status IN ('paid', 'partial')
       )
     )
     -- At least one paid memo not yet covered by a pharmacy payout
     AND (
       NOT COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
       OR EXISTS (
         SELECT 1 FROM debit_memos dm
         WHERE dm.batch_id = b.id
           AND dm.payment_status IN ('paid', 'partial')
           AND dm.pharmacy_payout_id IS NULL
       )
     );

  SELECT COALESCE(jsonb_agg(row_json ORDER BY batch_month DESC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT _batch_to_json(b) AS row_json, b.batch_month
        FROM return_batches b
       WHERE (p_status IS NULL OR b.status = p_status)
         AND (
           NOT COALESCE(p_all_debit_memos_shipped, FALSE)
           OR (
             EXISTS (SELECT 1 FROM debit_memos dm WHERE dm.batch_id = b.id)
             AND NOT EXISTS (
               SELECT 1 FROM debit_memos dm
               WHERE dm.batch_id = b.id
                 AND (dm.ra_status IS DISTINCT FROM 'shipped')
             )
           )
         )
         -- At least one pharmacy has at least one manufacturer-paid memo
         AND (
           NOT COALESCE(p_all_debit_memos_paid_or_partial, FALSE)
           OR EXISTS (
             SELECT 1 FROM debit_memos dm
             WHERE dm.batch_id = b.id
               AND dm.payment_status IN ('paid', 'partial')
           )
         )
         -- At least one paid memo not yet covered by a pharmacy payout
         AND (
           NOT COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
           OR EXISTS (
             SELECT 1 FROM debit_memos dm
             WHERE dm.batch_id = b.id
               AND dm.payment_status IN ('paid', 'partial')
               AND dm.pharmacy_payout_id IS NULL
           )
         )
       ORDER BY b.batch_month DESC
       LIMIT p_limit OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_results,
    'pagination', jsonb_build_object(
      'page',  p_page, 'limit', p_limit,
      'total', v_total, 'totalPages', CEIL(v_total::numeric / p_limit)
    )
  );
END;
$function$;
