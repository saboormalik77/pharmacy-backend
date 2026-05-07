-- FCR 39b — Group ship: copy FedEx labels to memos, list shipped groups, fix destination filter
-- Run after fcr_39_multi_memo_shipping.sql

-- ── ship_memo_group: also set fedex_labels on each memo in the group ──
CREATE OR REPLACE FUNCTION ship_memo_group(
  p_group_id          UUID,
  p_outbound_tracking TEXT,
  p_shipped_at        TIMESTAMPTZ DEFAULT NOW(),
  p_fedex_shipment_id TEXT DEFAULT NULL,
  p_fedex_labels      JSONB DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_group       shipment_groups;
  v_memo_count  INTEGER;
BEGIN
  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Shipment group not found');
  END IF;

  IF v_group.shipped_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Shipment group is already shipped');
  END IF;

  IF p_outbound_tracking IS NULL OR TRIM(p_outbound_tracking) = '' THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Outbound tracking number is required');
  END IF;

  UPDATE shipment_groups SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = COALESCE(p_shipped_at, NOW()),
    fedex_shipment_id = p_fedex_shipment_id,
    fedex_labels = p_fedex_labels
  WHERE id = p_group_id;

  UPDATE debit_memos SET
    outbound_tracking = TRIM(p_outbound_tracking),
    shipped_at = COALESCE(p_shipped_at, NOW()),
    ra_status = 'shipped',
    fedex_labels = CASE WHEN p_fedex_labels IS NOT NULL THEN p_fedex_labels ELSE fedex_labels END
  WHERE shipment_group_id = p_group_id;

  GET DIAGNOSTICS v_memo_count = ROW_COUNT;

  SELECT * INTO v_group FROM shipment_groups WHERE id = p_group_id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'group', _shipment_group_to_json(v_group),
      'memosShipped', v_memo_count
    )
  );
END;
$$;

-- ── list_memos_for_group_shipping: treat blank destination as no filter; case-insensitive ra_status ──
CREATE OR REPLACE FUNCTION list_memos_for_group_shipping(
  p_destination TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_rows jsonb;
  v_dest TEXT := NULLIF(TRIM(COALESCE(p_destination, '')), '');
BEGIN
  SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.destination, d.created_at), '[]'::jsonb)
  INTO v_rows
  FROM debit_memos d
  WHERE LOWER(TRIM(COALESCE(d.ra_status, ''))) = 'received'
    AND d.shipped_at IS NULL
    AND (
      d.shipment_group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM shipment_groups sg
        WHERE sg.id = d.shipment_group_id
          AND sg.shipped_at IS NULL
      )
    )
    AND d.ra_number IS NOT NULL
    AND TRIM(d.ra_number) != ''
    AND (v_dest IS NULL OR LOWER(TRIM(COALESCE(d.destination, ''))) = LOWER(v_dest));

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows
  );
END;
$$;

-- ── list_shipped_shipment_groups: paginated shipped groups with memos ──
CREATE OR REPLACE FUNCTION list_shipped_shipment_groups(
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20,
  p_destination TEXT DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_offset INTEGER;
  v_total  INTEGER;
  v_rows   jsonb;
  v_dest   TEXT := NULLIF(TRIM(COALESCE(p_destination, '')), '');
  v_lim    INTEGER := GREATEST(COALESCE(NULLIF(p_limit, 0), 20), 1);
BEGIN
  v_offset := (GREATEST(COALESCE(p_page, 1), 1) - 1) * v_lim;

  SELECT COUNT(*) INTO v_total
  FROM shipment_groups sg
  WHERE (
      sg.shipped_at IS NOT NULL
      OR (NULLIF(TRIM(COALESCE(sg.outbound_tracking, '')), '') IS NOT NULL)
    )
    AND (v_dest IS NULL OR LOWER(TRIM(COALESCE(sg.destination, ''))) = LOWER(v_dest));

  SELECT COALESCE(jsonb_agg(row_json ORDER BY shipped_sort DESC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'group', _shipment_group_to_json(sg),
        'memos', (
          SELECT COALESCE(jsonb_agg(_debit_memo_to_json(d) ORDER BY d.created_at), '[]'::jsonb)
          FROM debit_memos d WHERE d.shipment_group_id = sg.id
        )
      ) AS row_json,
      COALESCE(sg.shipped_at, sg.updated_at) AS shipped_sort
    FROM shipment_groups sg
    WHERE (
        sg.shipped_at IS NOT NULL
        OR (NULLIF(TRIM(COALESCE(sg.outbound_tracking, '')), '') IS NOT NULL)
      )
      AND (v_dest IS NULL OR LOWER(TRIM(COALESCE(sg.destination, ''))) = LOWER(v_dest))
    ORDER BY COALESCE(sg.shipped_at, sg.updated_at) DESC
    LIMIT v_lim OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'error', false,
    'data', v_rows,
    'pagination', jsonb_build_object(
      'page', GREATEST(COALESCE(p_page, 1), 1),
      'limit', v_lim,
      'total', v_total,
      'totalPages', CEIL(v_total::float / v_lim)::integer
    )
  );
END;
$$;
