-- ============================================================
-- FCR Module 25: FedEx API Integration
-- ============================================================
-- Adds:
--   1. Warehouse address columns on admin_settings
--   2. New columns on return_transactions: fedex_shipment_id, fedex_labels
--   3. Updated _rt_to_json to expose new fields
--   4. RPC: save_fedex_shipment_data
--   5. RPC: save_fedex_pickup_confirmation
--   6. Updated get_admin_settings / update_admin_settings for warehouse fields
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add warehouse address columns to admin_settings
-- ────────────────────────────────────────────────────────────
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS warehouse_name         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_street       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_city         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_state        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_zip          TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_country      TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS warehouse_phone        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_contact_name TEXT DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Add FedEx API columns to return_transactions
-- ────────────────────────────────────────────────────────────
ALTER TABLE return_transactions
  ADD COLUMN IF NOT EXISTS fedex_shipment_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fedex_labels      JSONB DEFAULT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Update _rt_to_json to include new columns
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _rt_to_json(r return_transactions)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'id',                       r.id,
    'licensePlate',             r.license_plate,
    'pharmacyId',               r.pharmacy_id,
    'pharmacyName',             COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = r.pharmacy_id), ''),
    'processorId',              r.processor_id,
    'processorName',            COALESCE((SELECT name FROM processors WHERE id = r.processor_id), ''),
    'serviceType',              r.service_type,
    'status',                   r.status,
    'fedexTracking',            r.fedex_tracking,
    'fedexPickupConfirmation',  r.fedex_pickup_confirmation,
    'totalItems',               r.total_items,
    'totalReturnableValue',     r.total_returnable_value,
    'totalNonReturnableValue',  r.total_non_returnable_value,
    'batchId',                  r.batch_id,
    'timeIn',                   r.time_in,
    'timeOut',                  r.time_out,
    'receivedInWarehouseDate',  r.received_in_warehouse_date,
    'verifiedIntegrity',        r.verified_integrity,
    'notes',                    r.notes,
    'finalizedAt',              r.finalized_at,
    'boxCount',                 r.box_count,
    'manifestGeneratedAt',      r.manifest_generated_at,
    'prpNumber',                r.prp_number,
    'packageTracking',          r.package_tracking,
    'fedexShipmentId',          r.fedex_shipment_id,
    'fedexLabels',              r.fedex_labels,
    'createdAt',                r.created_at,
    'updatedAt',                r.updated_at
  );
$$;

-- ────────────────────────────────────────────────────────────
-- 4. RPC: save_fedex_shipment_data
--    Stores tracking numbers, labels, and shipment ID from
--    the FedEx Ship API response onto a return transaction
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS save_fedex_shipment_data(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB, JSONB);

CREATE OR REPLACE FUNCTION save_fedex_shipment_data(
  p_id               UUID,
  p_fedex_shipment_id TEXT,
  p_fedex_tracking    TEXT    DEFAULT NULL,
  p_prp_number        TEXT    DEFAULT NULL,
  p_box_count         INTEGER DEFAULT NULL,
  p_package_tracking  JSONB   DEFAULT NULL,
  p_fedex_labels      JSONB   DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  IF v_row.status NOT IN ('completed', 'in_progress', 'paused') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', format('Cannot update shipping data for status "%s"', v_row.status));
  END IF;

  UPDATE return_transactions SET
    fedex_shipment_id  = COALESCE(p_fedex_shipment_id, fedex_shipment_id),
    fedex_tracking     = COALESCE(NULLIF(TRIM(p_fedex_tracking), ''), fedex_tracking),
    prp_number         = COALESCE(NULLIF(TRIM(p_prp_number), ''), prp_number),
    box_count          = COALESCE(p_box_count, box_count),
    package_tracking   = COALESCE(p_package_tracking, package_tracking),
    fedex_labels       = COALESCE(p_fedex_labels, fedex_labels),
    updated_at         = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: save_fedex_pickup_confirmation
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS save_fedex_pickup_confirmation(UUID, TEXT);

CREATE OR REPLACE FUNCTION save_fedex_pickup_confirmation(
  p_id                        UUID,
  p_fedex_pickup_confirmation TEXT
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row return_transactions;
BEGIN
  SELECT * INTO v_row FROM return_transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404,
      'message', 'Return transaction not found');
  END IF;

  UPDATE return_transactions SET
    fedex_pickup_confirmation = p_fedex_pickup_confirmation,
    updated_at                = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_row));
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. Update get_admin_settings to include warehouse fields
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_settings()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  SELECT jsonb_build_object(
    'siteName', COALESCE(s.site_name, 'PharmAdmin'),
    'siteEmail', COALESCE(s.site_email, 'admin@pharmadmin.com'),
    'timezone', COALESCE(s.timezone, 'America/New_York'),
    'language', COALESCE(s.language, 'en'),
    'emailNotifications', COALESCE(s.email_notifications, true),
    'documentApprovalNotif', COALESCE(s.document_approval_notif, true),
    'paymentNotif', COALESCE(s.payment_notif, true),
    'shipmentNotif', COALESCE(s.shipment_notif, true),
    'warehouseName', s.warehouse_name,
    'warehouseStreet', s.warehouse_street,
    'warehouseCity', s.warehouse_city,
    'warehouseState', s.warehouse_state,
    'warehouseZip', s.warehouse_zip,
    'warehouseCountry', COALESCE(s.warehouse_country, 'US'),
    'warehousePhone', s.warehouse_phone,
    'warehouseContactName', s.warehouse_contact_name,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  INTO v_settings
  FROM admin_settings s
  WHERE s.id = 1;

  IF v_settings IS NULL THEN
    INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object(
      'siteName', 'PharmAdmin',
      'siteEmail', 'admin@pharmadmin.com',
      'timezone', 'America/New_York',
      'language', 'en',
      'emailNotifications', true,
      'documentApprovalNotif', true,
      'paymentNotif', true,
      'shipmentNotif', true,
      'warehouseName', null,
      'warehouseStreet', null,
      'warehouseCity', null,
      'warehouseState', null,
      'warehouseZip', null,
      'warehouseCountry', 'US',
      'warehousePhone', null,
      'warehouseContactName', null,
      'createdAt', NOW(),
      'updatedAt', NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'error', false,
    'settings', v_settings
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. Update update_admin_settings to accept warehouse fields
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS update_admin_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_admin_settings(
  p_site_name               TEXT    DEFAULT NULL,
  p_site_email              TEXT    DEFAULT NULL,
  p_timezone                TEXT    DEFAULT NULL,
  p_language                TEXT    DEFAULT NULL,
  p_email_notifications     BOOLEAN DEFAULT NULL,
  p_document_approval_notif BOOLEAN DEFAULT NULL,
  p_payment_notif           BOOLEAN DEFAULT NULL,
  p_shipment_notif          BOOLEAN DEFAULT NULL,
  p_warehouse_name          TEXT    DEFAULT NULL,
  p_warehouse_street        TEXT    DEFAULT NULL,
  p_warehouse_city          TEXT    DEFAULT NULL,
  p_warehouse_state         TEXT    DEFAULT NULL,
  p_warehouse_zip           TEXT    DEFAULT NULL,
  p_warehouse_country       TEXT    DEFAULT NULL,
  p_warehouse_phone         TEXT    DEFAULT NULL,
  p_warehouse_contact_name  TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  IF p_timezone IS NOT NULL AND p_timezone NOT IN (
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'
  ) THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid timezone. Supported: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, America/Phoenix, America/Anchorage, Pacific/Honolulu, UTC'
    );
  END IF;

  IF p_language IS NOT NULL AND p_language NOT IN ('en', 'es', 'fr') THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Invalid language. Supported: en, es, fr'
    );
  END IF;

  INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

  UPDATE admin_settings
  SET
    site_name               = COALESCE(p_site_name, site_name),
    site_email              = COALESCE(p_site_email, site_email),
    timezone                = COALESCE(p_timezone, timezone),
    language                = COALESCE(p_language, language),
    email_notifications     = COALESCE(p_email_notifications, email_notifications),
    document_approval_notif = COALESCE(p_document_approval_notif, document_approval_notif),
    payment_notif           = COALESCE(p_payment_notif, payment_notif),
    shipment_notif          = COALESCE(p_shipment_notif, shipment_notif),
    warehouse_name          = COALESCE(p_warehouse_name, warehouse_name),
    warehouse_street        = COALESCE(p_warehouse_street, warehouse_street),
    warehouse_city          = COALESCE(p_warehouse_city, warehouse_city),
    warehouse_state         = COALESCE(p_warehouse_state, warehouse_state),
    warehouse_zip           = COALESCE(p_warehouse_zip, warehouse_zip),
    warehouse_country       = COALESCE(p_warehouse_country, warehouse_country),
    warehouse_phone         = COALESCE(p_warehouse_phone, warehouse_phone),
    warehouse_contact_name  = COALESCE(p_warehouse_contact_name, warehouse_contact_name),
    updated_at              = NOW()
  WHERE id = 1;

  SELECT jsonb_build_object(
    'siteName', s.site_name,
    'siteEmail', s.site_email,
    'timezone', s.timezone,
    'language', s.language,
    'emailNotifications', s.email_notifications,
    'documentApprovalNotif', s.document_approval_notif,
    'paymentNotif', s.payment_notif,
    'shipmentNotif', s.shipment_notif,
    'warehouseName', s.warehouse_name,
    'warehouseStreet', s.warehouse_street,
    'warehouseCity', s.warehouse_city,
    'warehouseState', s.warehouse_state,
    'warehouseZip', s.warehouse_zip,
    'warehouseCountry', COALESCE(s.warehouse_country, 'US'),
    'warehousePhone', s.warehouse_phone,
    'warehouseContactName', s.warehouse_contact_name,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  INTO v_settings
  FROM admin_settings s
  WHERE s.id = 1;

  RETURN jsonb_build_object(
    'error', false,
    'message', 'Settings updated successfully',
    'settings', v_settings
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. Grant permissions
-- ────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION save_fedex_shipment_data TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION save_fedex_pickup_confirmation TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_admin_settings TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_admin_settings TO authenticated, anon, service_role;
