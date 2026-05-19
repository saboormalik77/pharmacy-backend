-- Migration: Fix pharmacy payout batch visibility
-- - Show batch while any pharmacy has more paid memos than recorded payouts
-- - Hide batch once every pharmacy's payout count >= paid memo count (all done)
-- - Two flags are now independent AND conditions (not OR'd together)
-- Run in Supabase Dashboard → SQL Editor

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
     -- At least one pharmacy still needs a payout: paid memo count > recorded payout count
     AND (
       NOT COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
       OR EXISTS (
         SELECT 1
           FROM (
             SELECT dm.pharmacy_id, COUNT(*) AS paid_count
               FROM debit_memos dm
              WHERE dm.batch_id = b.id
                AND dm.payment_status IN ('paid', 'partial')
              GROUP BY dm.pharmacy_id
           ) paid
           LEFT JOIN (
             SELECT pp.pharmacy_id, COUNT(*) AS payout_count
               FROM pharmacy_payments pp
              WHERE pp.batch_id = b.id
                AND pp.status IS DISTINCT FROM 'failed'
              GROUP BY pp.pharmacy_id
           ) payouts ON payouts.pharmacy_id = paid.pharmacy_id
          WHERE paid.paid_count > COALESCE(payouts.payout_count, 0)
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
         -- At least one pharmacy still needs a payout: paid memo count > recorded payout count
         AND (
           NOT COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
           OR EXISTS (
             SELECT 1
               FROM (
                 SELECT dm.pharmacy_id, COUNT(*) AS paid_count
                   FROM debit_memos dm
                  WHERE dm.batch_id = b.id
                    AND dm.payment_status IN ('paid', 'partial')
                  GROUP BY dm.pharmacy_id
               ) paid
               LEFT JOIN (
                 SELECT pp.pharmacy_id, COUNT(*) AS payout_count
                   FROM pharmacy_payments pp
                  WHERE pp.batch_id = b.id
                    AND pp.status IS DISTINCT FROM 'failed'
                  GROUP BY pp.pharmacy_id
               ) payouts ON payouts.pharmacy_id = paid.pharmacy_id
              WHERE paid.paid_count > COALESCE(payouts.payout_count, 0)
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
