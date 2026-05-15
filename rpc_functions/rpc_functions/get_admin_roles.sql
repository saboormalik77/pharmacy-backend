-- Function : get_admin_roles
-- Arguments: none
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_admin_roles() CASCADE;

CREATE OR REPLACE FUNCTION public.get_admin_roles()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'roles', jsonb_build_array(
      jsonb_build_object(
        'value', 'super_admin',
        'label', 'Super Admin',
        'description', 'Full system access, manage all users, system configuration',
        'color', 'danger'
      ),
      jsonb_build_object(
        'value', 'manager',
        'label', 'Manager',
        'description', 'Manage pharmacies, approve documents, process payments, view analytics',
        'color', 'warning'
      ),
      jsonb_build_object(
        'value', 'reviewer',
        'label', 'Reviewer',
        'description', 'Review documents, approve/reject returns, view shipments',
        'color', 'info'
      ),
      jsonb_build_object(
        'value', 'support',
        'label', 'Support',
        'description', 'View-only access, customer support, answer queries, generate reports',
        'color', 'default'
      )
    )
  );
END;
$function$;
