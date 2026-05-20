-- Function : complete_pharmacy_setup
-- Arguments: p_token text, p_auth_user_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.complete_pharmacy_setup(p_token text, p_auth_user_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.complete_pharmacy_setup(p_token text, p_auth_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
BEGIN
  -- Validate token
  SELECT * INTO v_invite
  FROM pharmacy_invites
  WHERE invite_token = TRIM(p_token)
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  -- Build address object
  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city', COALESCE(v_invite.city, ''),
    'state', COALESCE(v_invite.state, ''),
    'zip', COALESCE(v_invite.zip, '')
  );

  -- Create the pharmacy record now with the auth user ID.
  -- `created_by` carries the owning buying group (admin.id of the super_admin
  -- that created this invite). It is stored as TEXT on pharmacy_invites but
  -- as UUID on pharmacy, so only propagate when the string is a valid UUID
  -- (otherwise fall back to NULL, e.g. invites created by MainAdmin).
  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_by,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id,
    v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name,
    v_invite.phone,
    v_address,
    'active',
    v_invite.dea_number,
    v_invite.dea_expiration,
    v_invite.fax,
    v_invite.wholesaler,
    v_invite.wholesaler_account,
    v_invite.secondary_wholesaler,
    v_invite.service_type,
    v_invite.days_between_visits,
    v_invite.last_visit_date,
    v_invite.next_visit_date,
    v_invite.processor_id,
    v_invite.sales_person_id,
    CASE
      WHEN v_invite.created_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN v_invite.created_by::UUID
      ELSE NULL
    END,
    NOW(),
    NOW()
  ) RETURNING id INTO v_pharmacy_id;

  -- Mark invite as completed
  UPDATE pharmacy_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId', v_pharmacy_id,
      'status', 'active'
    )
  );
END;
$function$;
