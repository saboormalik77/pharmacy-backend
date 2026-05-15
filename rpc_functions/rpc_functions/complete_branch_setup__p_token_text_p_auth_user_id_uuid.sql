-- Function : complete_branch_setup
-- Arguments: p_token text, p_auth_user_id uuid
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.complete_branch_setup(p_token text, p_auth_user_id uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.complete_branch_setup(p_token text, p_auth_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invite RECORD;
  v_pharmacy_id UUID;
  v_address JSONB;
  v_role_id UUID;
BEGIN
  SELECT * INTO v_invite
  FROM pharmacy_branch_invites
  WHERE invite_token = TRIM(p_token) AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', true, 'code', 400, 'message', 'Invalid or expired invite');
  END IF;

  v_address := jsonb_build_object(
    'street', COALESCE(v_invite.street, ''),
    'city',   COALESCE(v_invite.city, ''),
    'state',  COALESCE(v_invite.state, ''),
    'zip',    COALESCE(v_invite.zip, '')
  );

  INSERT INTO pharmacy (
    id, email, name, pharmacy_name, phone,
    physical_address, status, parent_pharmacy_id, can_manage_branches,
    dea_number, dea_expiration_date, fax_number,
    primary_wholesaler, wholesaler_account_number, secondary_wholesaler,
    service_type, days_between_visits,
    last_visit_date, next_visit_date,
    assigned_processor_id, assigned_sales_person_id,
    created_at, updated_at
  ) VALUES (
    p_auth_user_id, v_invite.email,
    COALESCE(v_invite.contact_name, v_invite.pharmacy_name),
    v_invite.pharmacy_name, v_invite.phone,
    v_address, 'active', v_invite.parent_pharmacy_id, FALSE,
    v_invite.dea_number, v_invite.dea_expiration, v_invite.fax,
    v_invite.wholesaler, v_invite.wholesaler_account, v_invite.secondary_wholesaler,
    v_invite.service_type, v_invite.days_between_visits,
    v_invite.last_visit_date, v_invite.next_visit_date,
    v_invite.processor_id, v_invite.sales_person_id,
    NOW(), NOW()
  ) RETURNING id INTO v_pharmacy_id;

  IF v_invite.pending_role_ids IS NOT NULL AND cardinality(v_invite.pending_role_ids) > 0 THEN
    FOREACH v_role_id IN ARRAY v_invite.pending_role_ids
    LOOP
      IF EXISTS (
        SELECT 1 FROM pharmacy_roles
        WHERE id = v_role_id AND parent_pharmacy_id = v_invite.parent_pharmacy_id
      ) THEN
        INSERT INTO pharmacy_branch_role_assignments (branch_pharmacy_id, role_id, assigned_by)
        VALUES (v_pharmacy_id, v_role_id, v_invite.parent_pharmacy_id)
        ON CONFLICT (branch_pharmacy_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  UPDATE pharmacy_branch_invites
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'error', false,
    'data', jsonb_build_object(
      'pharmacyId',       v_pharmacy_id,
      'parentPharmacyId', v_invite.parent_pharmacy_id,
      'status',           'active'
    )
  );
END;
$function$;
