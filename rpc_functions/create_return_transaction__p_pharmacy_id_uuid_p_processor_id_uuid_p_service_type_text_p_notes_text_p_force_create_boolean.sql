-- Function : create_return_transaction
-- Arguments: p_pharmacy_id uuid, p_processor_id uuid, p_service_type text, p_notes text, p_force_create boolean
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.create_return_transaction(p_pharmacy_id uuid, p_processor_id uuid, p_service_type text, p_notes text, p_force_create boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.create_return_transaction(p_pharmacy_id uuid, p_processor_id uuid DEFAULT NULL::uuid, p_service_type text DEFAULT 'in_store'::text, p_notes text DEFAULT NULL::text, p_force_create boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pharmacy      RECORD;
  v_existing      RECORD;
  v_store_num     TEXT;
  v_date_str      TEXT;
  v_base_plate    TEXT;
  v_license_plate TEXT;
  v_collision_cnt INT;
  v_new           return_transactions;
BEGIN
  -- 1. Verify pharmacy exists
  SELECT id, pharmacy_name, store_number
    INTO v_pharmacy
    FROM pharmacy
   WHERE id = p_pharmacy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 404, 'message', 'Pharmacy not found');
  END IF;

  -- 2. Duplicate prevention (unless force_create)
  IF NOT p_force_create THEN
    SELECT id, license_plate, status
      INTO v_existing
      FROM return_transactions
     WHERE pharmacy_id = p_pharmacy_id
       AND status IN ('in_progress', 'paused')
     LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'error', true,
        'code', 409,
        'message', format(
          'This pharmacy already has an active return (%s, status: %s). Use forceCreate=true to override.',
          v_existing.license_plate, v_existing.status
        ),
        'existingId', v_existing.id,
        'existingLicensePlate', v_existing.license_plate
      );
    END IF;
  END IF;

  -- 3. Validate service type
  IF p_service_type NOT IN ('in_store', 'self_service', 'express') THEN
    RETURN jsonb_build_object('error', true, 'code', 400,
      'message', 'service_type must be one of: in_store, self_service, express');
  END IF;

  -- 4. Generate license plate: MMDDYY-23HA-XXXX
  v_store_num := COALESCE(v_pharmacy.store_number, UPPER(LEFT(p_pharmacy_id::text, 4)));
  v_date_str  := TO_CHAR(NOW(), 'MMDDYY');
  v_base_plate := v_date_str || '-23HA-' || v_store_num;

  SELECT COUNT(*) INTO v_collision_cnt
    FROM return_transactions
   WHERE license_plate LIKE v_base_plate || '%';

  IF v_collision_cnt = 0 THEN
    v_license_plate := v_base_plate;
  ELSE
    v_license_plate := v_base_plate || '-' || CHR(65 + v_collision_cnt); -- -A, -B, …
  END IF;

  -- 5. Insert
  INSERT INTO return_transactions (
    license_plate, pharmacy_id, processor_id, service_type,
    status, notes, time_in
  ) VALUES (
    v_license_plate, p_pharmacy_id, p_processor_id, p_service_type,
    'in_progress', NULLIF(TRIM(COALESCE(p_notes,'')), ''), NOW()
  ) RETURNING * INTO v_new;

  RETURN jsonb_build_object('error', false, 'data', _rt_to_json(v_new));
END;
$function$;
