-- ============================================================
-- FCR Module 51 — Pharmacy Reports Hub
-- Replaces the legacy external reports.html flow with fully
-- in-house RPC functions that pull data from our own Supabase
-- tables (return_transactions, return_transaction_items, pharmacy).
--
-- Four report shapes are produced, each for a given pharmacy +
-- reference number (which maps to return_transactions.license_plate):
--   1. Return Packet              -> reportreturn.pdf
--        - Return Goods Summary
--        - Manufacturer Credit Summary (grouped)
--        - Returnable Products (grouped by manufacturer)
--        - Needs Review (grouped by non-returnable reason)
--   2. Controlled Substance       -> Controlled Substance Report.pdf
--        - All DEA Schedule II-V items in a single flat table
--   3. Proof of Destruction (CTRL)-> Controls.pdf
--        - CII-CV items sent to destruction, with destruction
--          footer (Date Received / Destroyed / Shipped, etc.)
--   4. Proof of Destruction (NON) -> Non Controls.pdf
--        - Non-controlled items sent to destruction
--
-- A dropdown-helper function is also provided to replicate the
-- "YYYY-MM-DD | RefNum | $Amount" picker used on reports.html.
--
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- HELPER: normalize dea_schedule values
--   Our schema stores dea_schedule as a free-form TEXT so over
--   time we've seen "2", "II", "CII", "C-II", "C2", Schedule II
--   etc. Normalize to a canonical 'I'..'V' token. Returns NULL
--   when the row is not a controlled substance.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _normalize_dea_schedule(p_raw TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v TEXT;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;

  v := UPPER(REGEXP_REPLACE(p_raw, '[^0-9IVC]', '', 'g'));
  -- strip leading "C" (controlled prefix)
  IF v LIKE 'C%' THEN v := SUBSTRING(v FROM 2); END IF;

  IF v = '1' OR v = 'I'   THEN RETURN 'I';   END IF;
  IF v = '2' OR v = 'II'  THEN RETURN 'II';  END IF;
  IF v = '3' OR v = 'III' THEN RETURN 'III'; END IF;
  IF v = '4' OR v = 'IV'  THEN RETURN 'IV';  END IF;
  IF v = '5' OR v = 'V'   THEN RETURN 'V';   END IF;

  RETURN NULL;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- HELPER: pharmacy header JSON (shared by all reports)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _pharmacy_reports_header(p_pharmacy_id UUID)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'pharmacyId',        p.id,
    'pharmacyName',      COALESCE(p.pharmacy_name, p.name, ''),
    'corporateName',     COALESCE(p.corporate_name, ''),
    'storeNumber',       COALESCE(p.store_number, ''),
    'deaNumber',         COALESCE(p.dea_number, ''),
    'deaExpirationDate', p.dea_expiration_date,
    'npiNumber',         COALESCE(p.npi_number, ''),
    'stateLicenseNumber',COALESCE(p.state_license_number, ''),
    'licenseExpiryDate', p.license_expiry_date,
    'contactPhone',      COALESCE(p.contact_phone, p.phone, ''),
    'faxNumber',         COALESCE(p.fax_number, ''),
    'email',             COALESCE(p.email, ''),
    'contactName',       '',
    'primaryWholesaler', COALESCE(p.primary_wholesaler, ''),
    'wholesalerAccountNumber', COALESCE(p.wholesaler_account_number, ''),
    -- Nicely formatted single-line address for report headers
    'address',           CASE
      WHEN p.physical_address IS NOT NULL AND jsonb_typeof(p.physical_address) = 'object' THEN
        TRIM(BOTH ', ' FROM CONCAT_WS(', ',
          NULLIF(TRIM(COALESCE(p.physical_address->>'street', '')),  ''),
          NULLIF(TRIM(COALESCE(p.physical_address->>'city',   '')),  ''),
          TRIM(CONCAT_WS(' ',
            NULLIF(TRIM(COALESCE(p.physical_address->>'state','')), ''),
            NULLIF(TRIM(COALESCE(p.physical_address->>'zip',  '')), '')
          ))
        ))
      ELSE COALESCE(p.mailing_address, '')
    END,
    -- Detailed address components for multi-line layouts (Controls.pdf style)
    'street',            COALESCE(p.physical_address->>'street', ''),
    'city',              COALESCE(p.physical_address->>'city', ''),
    'state',             COALESCE(p.physical_address->>'state', ''),
    'zip',               COALESCE(p.physical_address->>'zip', ''),
    -- Raw physical address JSON for downstream formatting flexibility
    'physicalAddress',   p.physical_address
  )
  FROM pharmacy p
  WHERE p.id = p_pharmacy_id;
$$;


-- ════════════════════════════════════════════════════════════
-- HELPER: processor info block (the "Processed By" section
-- that appears on every PDF). Falls back to a sensible default
-- if the return has no processor assigned yet.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _pharmacy_reports_processor(p_processor_id UUID)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_processor_id IS NULL THEN
      jsonb_build_object(
        'processorId',   NULL,
        'name',          'Pharmacy Returns Center',
        'address',       '',
        'phone',         '',
        'deaNumber',     '',
        'email',         ''
      )
    ELSE
      jsonb_build_object(
        'processorId',   pr.id,
        'name',          COALESCE(pr.name, 'Pharmacy Returns Center'),
        'address',       '',
        'phone',         COALESCE(pr.phone, ''),
        'deaNumber',     '',
        'email',         COALESCE(pr.email, '')
      )
  END
  FROM (SELECT 1) dummy
  LEFT JOIN processors pr ON pr.id = p_processor_id;
$$;


-- ════════════════════════════════════════════════════════════
-- HELPER: resolve a return transaction by pharmacy + license_plate
-- Returns the full return_transactions row or NULL.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _pharmacy_reports_find_txn(
  p_pharmacy_id UUID,
  p_ref_num     TEXT
)
RETURNS return_transactions LANGUAGE sql STABLE AS $$
  SELECT rt.*
    FROM return_transactions rt
   WHERE rt.pharmacy_id = p_pharmacy_id
     AND rt.license_plate = p_ref_num
   LIMIT 1;
$$;


-- ════════════════════════════════════════════════════════════
-- 1. list_pharmacy_report_returns
--    Feeds the dropdown on reports.html:
--        YYYY-MM-DD | {refNum} | ${Amount}
--    Only returns transactions that are at least verified/completed.
--    Statuses included (in order they appear through the lifecycle):
--       completed      → pharmacy marked it complete
--       finalized      → pharmacy locked + manifest generated
--       received       → received at the warehouse
--       verified       → warehouse finished item-level verification
--       closed_out     → the return has been batched / closed
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION list_pharmacy_report_returns(
  p_pharmacy_id UUID,
  p_limit       INT  DEFAULT 200
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_items jsonb;
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;

  SELECT COALESCE(jsonb_agg(row_json ORDER BY ordering DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT
        jsonb_build_object(
          'refNum',       rt.license_plate,
          'licensePlate', rt.license_plate,
          'date',         TO_CHAR(COALESCE(rt.finalized_at, rt.time_out, rt.created_at), 'YYYY-MM-DD'),
          'rawDate',      COALESCE(rt.finalized_at, rt.time_out, rt.created_at),
          'amount',       ROUND(COALESCE(rt.total_returnable_value, 0)
                             + COALESCE(rt.total_non_returnable_value, 0), 2),
          'returnableValue',     COALESCE(rt.total_returnable_value, 0),
          'nonReturnableValue',  COALESCE(rt.total_non_returnable_value, 0),
          'totalItems',          COALESCE(rt.total_items, 0),
          'status',              rt.status,
          'serviceType',         rt.service_type,
          'transactionId',       rt.id,
          -- Pre-formatted label (matches reports.html exactly)
          'label', TO_CHAR(COALESCE(rt.finalized_at, rt.time_out, rt.created_at), 'YYYY-MM-DD')
                || ' | ' || rt.license_plate
                || ' | $' || TO_CHAR(
                     COALESCE(rt.total_returnable_value, 0) + COALESCE(rt.total_non_returnable_value, 0),
                     'FM999,999,990.00')
        ) AS row_json,
        COALESCE(rt.finalized_at, rt.time_out, rt.created_at) AS ordering
      FROM return_transactions rt
      WHERE rt.pharmacy_id = p_pharmacy_id
        AND rt.status IN ('completed', 'finalized', 'received', 'verified', 'closed_out')
      ORDER BY COALESCE(rt.finalized_at, rt.time_out, rt.created_at) DESC
      LIMIT GREATEST(LEAST(p_limit, 1000), 1)
    ) sub;

  RETURN jsonb_build_object('error', false, 'returns', v_items);
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 2. get_pharmacy_return_packet
--    Drives reportreturn.pdf (Return Packet):
--      * Pharmacy + Processor header blocks
--      * Totals: returnable / non-returnable / grand
--      * Manufacturer Credit Summary (returnable items grouped)
--      * Returnable items grouped by manufacturer
--      * Needs Review items grouped by non_returnable_reason
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_pharmacy_return_packet(
  p_pharmacy_id UUID,
  p_ref_num     TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn          return_transactions;
  v_items        jsonb;
  v_ret_items    jsonb;
  v_nonret_items jsonb;
  v_mfg_credits  jsonb;
  v_needs_review jsonb;
  v_returnable   DECIMAL(12,2);
  v_nonret       DECIMAL(12,2);
  v_total_items  INT;
  v_total_ret_items INT;
  v_total_nonret_items INT;
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;
  IF p_ref_num IS NULL OR LENGTH(TRIM(p_ref_num)) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'refNum is required');
  END IF;

  v_txn := _pharmacy_reports_find_txn(p_pharmacy_id, p_ref_num);
  IF v_txn.id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found for this pharmacy');
  END IF;

  -- All items (for raw access + total count)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COUNT(*)::int
    INTO v_items, v_total_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id;

  -- Returnable items only (flat list + subtotal)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'ZZZ'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COALESCE(SUM(rti.estimated_value), 0),
         COUNT(*)::int
    INTO v_ret_items, v_returnable, v_total_ret_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND rti.return_status = 'returnable';

  -- Non-returnable items only (flat list + subtotal)
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(rti.non_returnable_reason, 'Other'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COALESCE(SUM(rti.estimated_value), 0),
         COUNT(*)::int
    INTO v_nonret_items, v_nonret, v_total_nonret_items
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND rti.return_status = 'non_returnable';

  -- Manufacturer Credit Summary — returnable items grouped by manufacturer
  SELECT COALESCE(jsonb_agg(grp ORDER BY grp->>'manufacturer'), '[]'::jsonb)
    INTO v_mfg_credits
    FROM (
      SELECT jsonb_build_object(
        'manufacturer', COALESCE(NULLIF(TRIM(manufacturer), ''), 'UNKNOWN'),
        'itemCount',    COUNT(*)::int,
        'totalValue',   ROUND(COALESCE(SUM(estimated_value), 0)::numeric, 2),
        'items',        jsonb_agg(_rti_to_json(rti) ORDER BY
                          COALESCE(proprietary_name, generic_name, ''),
                          COALESCE(ndc, ''))
      ) AS grp
      FROM return_transaction_items rti
      WHERE transaction_id = v_txn.id
        AND return_status = 'returnable'
      GROUP BY COALESCE(NULLIF(TRIM(manufacturer), ''), 'UNKNOWN')
    ) mfg;

  -- Needs Review — non-returnable items grouped by reason
  SELECT COALESCE(jsonb_agg(grp ORDER BY grp->>'reason'), '[]'::jsonb)
    INTO v_needs_review
    FROM (
      SELECT jsonb_build_object(
        'reason',       COALESCE(NULLIF(TRIM(non_returnable_reason), ''), 'Other'),
        'itemCount',    COUNT(*)::int,
        'totalValue',   ROUND(COALESCE(SUM(estimated_value), 0)::numeric, 2),
        'items',        jsonb_agg(_rti_to_json(rti) ORDER BY
                          COALESCE(proprietary_name, generic_name, ''),
                          COALESCE(ndc, ''))
      ) AS grp
      FROM return_transaction_items rti
      WHERE transaction_id = v_txn.id
        AND return_status = 'non_returnable'
      GROUP BY COALESCE(NULLIF(TRIM(non_returnable_reason), ''), 'Other')
    ) rr;

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'return_packet',
    'reportTitle', 'Return Packet',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',               v_txn.license_plate,
      'licensePlate',         v_txn.license_plate,
      'status',               v_txn.status,
      'serviceType',          v_txn.service_type,
      'createdAt',            v_txn.created_at,
      'finalizedAt',          v_txn.finalized_at,
      'timeIn',               v_txn.time_in,
      'timeOut',              v_txn.time_out,
      'reportDate',           TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',          TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY'),
      'fedexTracking',        v_txn.fedex_tracking,
      'notes',                v_txn.notes,
      'totalItems',           v_total_items,
      'totalReturnableItems', v_total_ret_items,
      'totalNonReturnableItems', v_total_nonret_items,
      'totalReturnableValue', ROUND(v_returnable::numeric, 2),
      'totalNonReturnableValue', ROUND(v_nonret::numeric, 2),
      'totalEstimate',        ROUND((v_returnable + v_nonret)::numeric, 2)
    ),
    'items',              v_items,
    'returnableItems',    v_ret_items,
    'nonReturnableItems', v_nonret_items,
    'manufacturerCredits', v_mfg_credits,
    'needsReviewByReason', v_needs_review,
    'totals', jsonb_build_object(
      'totalItems',               v_total_items,
      'totalReturnableItems',     v_total_ret_items,
      'totalNonReturnableItems',  v_total_nonret_items,
      'totalReturnableValue',     ROUND(v_returnable::numeric, 2),
      'totalNonReturnableValue',  ROUND(v_nonret::numeric, 2),
      'grandTotal',               ROUND((v_returnable + v_nonret)::numeric, 2)
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 3. get_pharmacy_controlled_substance_report
--    Drives Controlled Substance Report.pdf:
--      * ALL items with any DEA schedule (I-V) from the return
--      * Flat list (no sub-groups) — mirrors the PDF exactly
--      * Disposition of these items is detailed on the other
--        destruction reports.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_pharmacy_controlled_substance_report(
  p_pharmacy_id UUID,
  p_ref_num     TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn     return_transactions;
  v_items   jsonb;
  v_count   INT;
  v_total   DECIMAL(12,2);
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;
  IF p_ref_num IS NULL OR LENGTH(TRIM(p_ref_num)) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'refNum is required');
  END IF;

  v_txn := _pharmacy_reports_find_txn(p_pharmacy_id, p_ref_num);
  IF v_txn.id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found for this pharmacy');
  END IF;

  -- All DEA-scheduled items, normalized and ordered by schedule
  -- (II first, then III, IV, V, I).
  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    CASE _normalize_dea_schedule(rti.dea_schedule)
                      WHEN 'II'  THEN 1
                      WHEN 'III' THEN 2
                      WHEN 'IV'  THEN 3
                      WHEN 'V'   THEN 4
                      WHEN 'I'   THEN 5
                      ELSE 9 END,
                    COALESCE(rti.proprietary_name, rti.generic_name, '')), '[]'::jsonb),
         COUNT(*)::int,
         COALESCE(SUM(rti.estimated_value), 0)
    INTO v_items, v_count, v_total
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND _normalize_dea_schedule(rti.dea_schedule) IS NOT NULL;

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'controlled_substance',
    'reportTitle', 'Controlled Substance Report',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',        v_txn.license_plate,
      'debitMemoNum',  v_txn.license_plate,
      'licensePlate',  v_txn.license_plate,
      'status',        v_txn.status,
      'createdAt',     v_txn.created_at,
      'finalizedAt',   v_txn.finalized_at,
      'reportDate',    TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',   TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY')
    ),
    'items',         v_items,
    'totals', jsonb_build_object(
      'totalItems',         v_count,
      'totalEstimatedValue', ROUND(v_total::numeric, 2)
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 4. get_pharmacy_destruction_controls
--    Drives Controls.pdf (Proof of Destruction — Controls):
--      * Only CII-CV items that are going to destruction:
--          - return_status = 'non_returnable'       (default for NR)
--          - OR destination = 'destruction'         (explicit)
--          - OR dea_form_222_required = true        (always-destroy path)
--      * Destruction dates: pulled from the return lifecycle
--          receivedAt   = time_in / created_at
--          verifiedAt   = verified_at
--          shippedAt    = finalized_at / time_out
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_pharmacy_destruction_controls(
  p_pharmacy_id UUID,
  p_ref_num     TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_items jsonb;
  v_count INT;
  v_total DECIMAL(12,2);
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;
  IF p_ref_num IS NULL OR LENGTH(TRIM(p_ref_num)) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'refNum is required');
  END IF;

  v_txn := _pharmacy_reports_find_txn(p_pharmacy_id, p_ref_num);
  IF v_txn.id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found for this pharmacy');
  END IF;

  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    _normalize_dea_schedule(rti.dea_schedule),
                    COALESCE(rti.proprietary_name, rti.generic_name, '')), '[]'::jsonb),
         COUNT(*)::int,
         COALESCE(SUM(rti.estimated_value), 0)
    INTO v_items, v_count, v_total
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND _normalize_dea_schedule(rti.dea_schedule) IS NOT NULL
     AND (
       rti.return_status = 'non_returnable'
       OR rti.destination = 'destruction'
       OR COALESCE(rti.dea_form_222_required, false) = true
     );

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'destruction_controls',
    'reportTitle', 'Proof of Destruction — Controls',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',       v_txn.license_plate,
      'licensePlate', v_txn.license_plate,
      'status',       v_txn.status,
      'createdAt',    v_txn.created_at,
      'finalizedAt',  v_txn.finalized_at,
      'reportDate',   TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',  TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY'),
      -- Destruction lifecycle dates
      'receivedAt',   TO_CHAR(COALESCE(v_txn.time_in, v_txn.created_at), 'MM/DD/YYYY'),
      'verifiedAt',   CASE WHEN v_txn.verified_at IS NOT NULL
                           THEN TO_CHAR(v_txn.verified_at, 'MM/DD/YYYY') ELSE '' END,
      'shippedAt',    CASE WHEN v_txn.finalized_at IS NOT NULL
                           THEN TO_CHAR(v_txn.finalized_at, 'MM/DD/YYYY')
                           WHEN v_txn.time_out IS NOT NULL
                           THEN TO_CHAR(v_txn.time_out, 'MM/DD/YYYY')
                           ELSE '' END,
      'destroyedAt',  ''
    ),
    'items',         v_items,
    'totals', jsonb_build_object(
      'totalItems',         v_count,
      'totalEstimatedValue', ROUND(v_total::numeric, 2)
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 5. get_pharmacy_destruction_non_controls
--    Drives Non Controls.pdf (Proof of Destruction — NON-Controls):
--      * Items with NO DEA schedule (RX / OTC) that are going to
--        destruction (non_returnable or destination = 'destruction')
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_pharmacy_destruction_non_controls(
  p_pharmacy_id UUID,
  p_ref_num     TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_txn   return_transactions;
  v_items jsonb;
  v_count INT;
  v_total DECIMAL(12,2);
BEGIN
  IF p_pharmacy_id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'pharmacy_id is required');
  END IF;
  IF p_ref_num IS NULL OR LENGTH(TRIM(p_ref_num)) = 0 THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'refNum is required');
  END IF;

  v_txn := _pharmacy_reports_find_txn(p_pharmacy_id, p_ref_num);
  IF v_txn.id IS NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Return not found for this pharmacy');
  END IF;

  SELECT COALESCE(jsonb_agg(_rti_to_json(rti) ORDER BY
                    COALESCE(NULLIF(TRIM(rti.manufacturer), ''), 'ZZZ'),
                    COALESCE(rti.proprietary_name, rti.generic_name, ''),
                    COALESCE(rti.ndc, '')), '[]'::jsonb),
         COUNT(*)::int,
         COALESCE(SUM(rti.estimated_value), 0)
    INTO v_items, v_count, v_total
    FROM return_transaction_items rti
   WHERE rti.transaction_id = v_txn.id
     AND _normalize_dea_schedule(rti.dea_schedule) IS NULL
     AND (
       rti.return_status = 'non_returnable'
       OR rti.destination = 'destruction'
     );

  RETURN jsonb_build_object(
    'error',       false,
    'reportType',  'destruction_non_controls',
    'reportTitle', 'Proof of Destruction — Non Controls',
    'pharmacy',    _pharmacy_reports_header(p_pharmacy_id),
    'processor',   _pharmacy_reports_processor(v_txn.processor_id),
    'return', jsonb_build_object(
      'refNum',       v_txn.license_plate,
      'licensePlate', v_txn.license_plate,
      'status',       v_txn.status,
      'createdAt',    v_txn.created_at,
      'finalizedAt',  v_txn.finalized_at,
      'reportDate',   TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'YYYY-MM-DD'),
      'serviceDate',  TO_CHAR(COALESCE(v_txn.finalized_at, v_txn.time_out, v_txn.created_at), 'MM/DD/YYYY'),
      'receivedAt',   TO_CHAR(COALESCE(v_txn.time_in, v_txn.created_at), 'MM/DD/YYYY'),
      'verifiedAt',   CASE WHEN v_txn.verified_at IS NOT NULL
                           THEN TO_CHAR(v_txn.verified_at, 'MM/DD/YYYY') ELSE '' END,
      'shippedAt',    CASE WHEN v_txn.finalized_at IS NOT NULL
                           THEN TO_CHAR(v_txn.finalized_at, 'MM/DD/YYYY')
                           WHEN v_txn.time_out IS NOT NULL
                           THEN TO_CHAR(v_txn.time_out, 'MM/DD/YYYY')
                           ELSE '' END,
      'destroyedAt',  ''
    ),
    'items',         v_items,
    'totals', jsonb_build_object(
      'totalItems',         v_count,
      'totalEstimatedValue', ROUND(v_total::numeric, 2)
    )
  );
END;
$$;


-- ════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION _pharmacy_reports_header(UUID)                                 TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION _pharmacy_reports_processor(UUID)                              TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION _pharmacy_reports_find_txn(UUID, TEXT)                         TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION _normalize_dea_schedule(TEXT)                                  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION list_pharmacy_report_returns(UUID, INT)                        TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_pharmacy_return_packet(UUID, TEXT)                         TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_pharmacy_controlled_substance_report(UUID, TEXT)           TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_pharmacy_destruction_controls(UUID, TEXT)                  TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_pharmacy_destruction_non_controls(UUID, TEXT)              TO service_role, authenticated;
