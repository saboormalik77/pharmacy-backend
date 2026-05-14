-- Function : pharmacy_payment_calculate
-- Arguments: p_pharmacy_id uuid, p_batch_id uuid, p_company_fee_pct numeric, p_gpo_share_pct numeric
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.pharmacy_payment_calculate(p_pharmacy_id uuid, p_batch_id uuid, p_company_fee_pct numeric, p_gpo_share_pct numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.pharmacy_payment_calculate(p_pharmacy_id uuid, p_batch_id uuid, p_company_fee_pct numeric DEFAULT 27.0, p_gpo_share_pct numeric DEFAULT 0.0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total_credit   DECIMAL(12,2);
  v_company_fee    DECIMAL(12,2);
  v_gpo_share      DECIMAL(12,2);
  v_pharmacy_payout DECIMAL(12,2);
  v_gpo_name       TEXT;
  v_pharmacy_name  TEXT;
  v_batch_name     TEXT;
  v_memo_count     INTEGER;
BEGIN
  -- Validate pharmacy exists
  SELECT pharmacy_name INTO v_pharmacy_name FROM pharmacy WHERE id = p_pharmacy_id;
  IF v_pharmacy_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- Validate batch exists
  SELECT batch_name INTO v_batch_name FROM return_batches WHERE id = p_batch_id;
  IF v_batch_name IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Batch not found');
  END IF;

  -- Get GPO affiliation from pharmacy
  SELECT gpo_affiliation INTO v_gpo_name FROM pharmacy WHERE id = p_pharmacy_id;

  -- Sum all received payments from debit memos for this pharmacy in this batch
  SELECT COALESCE(SUM(amount_received), 0), COUNT(*)
    INTO v_total_credit, v_memo_count
  FROM debit_memos
  WHERE pharmacy_id = p_pharmacy_id
    AND batch_id = p_batch_id
    AND payment_status IN ('paid', 'partial');

  -- Calculate splits
  v_company_fee    := ROUND(v_total_credit * (p_company_fee_pct / 100.0), 2);
  v_gpo_share      := ROUND(v_total_credit * (p_gpo_share_pct / 100.0), 2);
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
