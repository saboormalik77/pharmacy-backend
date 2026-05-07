-- Extend list_batches:
--   - p_all_debit_memos_shipped: only batches where every debit memo is shipped
--   - p_exclude_if_no_remaining_pharmacy_payout + p_all_debit_memos_paid_or_partial:
--     when either is true, require at least one pharmacy in the batch such that
--     (a) every debit memo for that pharmacy in the batch is paid or partial, and
--     (b) no non-failed pharmacy_payments row exists for that pharmacy + batch.
--     So a batch with two memos / two pharmacies can appear while only one is RD-paid.
-- Apply in Supabase SQL editor or via migration tooling.

CREATE OR REPLACE FUNCTION list_batches(
  p_status TEXT    DEFAULT NULL,
  p_page   INTEGER DEFAULT 1,
  p_limit  INTEGER DEFAULT 20,
  p_all_debit_memos_shipped BOOLEAN DEFAULT FALSE,
  p_exclude_if_no_remaining_pharmacy_payout BOOLEAN DEFAULT FALSE,
  p_all_debit_memos_paid_or_partial BOOLEAN DEFAULT FALSE
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
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
     AND (
       NOT (
         COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
         OR COALESCE(p_all_debit_memos_paid_or_partial, FALSE)
       )
       OR EXISTS (
         SELECT 1
           FROM (
             SELECT DISTINCT pharmacy_id
               FROM debit_memos
              WHERE batch_id = b.id
           ) ph
          WHERE NOT EXISTS (
            SELECT 1
              FROM debit_memos dm
             WHERE dm.batch_id = b.id
               AND dm.pharmacy_id = ph.pharmacy_id
               AND (dm.payment_status IS NULL OR dm.payment_status NOT IN ('paid', 'partial'))
          )
            AND NOT EXISTS (
              SELECT 1
                FROM pharmacy_payments pp
               WHERE pp.batch_id = b.id
                 AND pp.pharmacy_id = ph.pharmacy_id
                 AND pp.status IS DISTINCT FROM 'failed'
            )
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
         AND (
           NOT (
             COALESCE(p_exclude_if_no_remaining_pharmacy_payout, FALSE)
             OR COALESCE(p_all_debit_memos_paid_or_partial, FALSE)
           )
           OR EXISTS (
             SELECT 1
               FROM (
                 SELECT DISTINCT pharmacy_id
                   FROM debit_memos
                  WHERE batch_id = b.id
               ) ph
              WHERE NOT EXISTS (
                SELECT 1
                  FROM debit_memos dm
                 WHERE dm.batch_id = b.id
                   AND dm.pharmacy_id = ph.pharmacy_id
                   AND (dm.payment_status IS NULL OR dm.payment_status NOT IN ('paid', 'partial'))
              )
                AND NOT EXISTS (
                  SELECT 1
                    FROM pharmacy_payments pp
                   WHERE pp.batch_id = b.id
                     AND pp.pharmacy_id = ph.pharmacy_id
                     AND pp.status IS DISTINCT FROM 'failed'
                )
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
$$;
