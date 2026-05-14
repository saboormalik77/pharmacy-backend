-- Function : upsert_buying_group_domain
-- Arguments: p_buying_group_id uuid, p_domain text, p_admin_hostname text, p_pharmacy_hostname text
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.upsert_buying_group_domain(p_buying_group_id uuid, p_domain text, p_admin_hostname text, p_pharmacy_hostname text) CASCADE;

CREATE OR REPLACE FUNCTION public.upsert_buying_group_domain(p_buying_group_id uuid, p_domain text, p_admin_hostname text DEFAULT NULL::text, p_pharmacy_hostname text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id UUID;
  v_domain TEXT;
  v_admin_host TEXT;
  v_pharmacy_host TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin WHERE id = p_buying_group_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('error', true, 'message', 'Buying group not found');
  END IF;

  -- Clean all hostnames: strip protocol, paths, ports
  v_domain := clean_hostname(p_domain);
  v_admin_host := clean_hostname(p_admin_hostname);
  v_pharmacy_host := clean_hostname(p_pharmacy_hostname);

  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN jsonb_build_object('error', true, 'message', 'Domain is required');
  END IF;

  -- Check if domain is already used by a different buying group
  DECLARE
    existing_group_name TEXT;
    conflict_type TEXT;
  BEGIN
    SELECT 
      a.name,
      CASE 
        WHEN bgd.domain = v_domain THEN 'main domain'
        WHEN bgd.admin_hostname = v_domain THEN 'admin subdomain'
        WHEN bgd.pharmacy_hostname = v_domain THEN 'pharmacy subdomain'
        ELSE 'domain'
      END
    INTO existing_group_name, conflict_type
    FROM buying_group_domains bgd
    JOIN admin a ON bgd.buying_group_id = a.id
    WHERE (
      bgd.domain = v_domain 
      OR bgd.admin_hostname = v_domain 
      OR bgd.pharmacy_hostname = v_domain
    )
    AND bgd.buying_group_id != p_buying_group_id
    LIMIT 1;
    
    IF existing_group_name IS NOT NULL THEN
      RETURN jsonb_build_object(
        'error', true, 
        'message', 'Domain "' || v_domain || '" is already used as ' || conflict_type || ' by buying group "' || existing_group_name || '"'
      );
    END IF;
  END;

  INSERT INTO buying_group_domains (buying_group_id, domain, admin_hostname, pharmacy_hostname)
  VALUES (p_buying_group_id, v_domain, v_admin_host, v_pharmacy_host)
  ON CONFLICT (domain) DO UPDATE SET
    admin_hostname    = COALESCE(EXCLUDED.admin_hostname, buying_group_domains.admin_hostname),
    pharmacy_hostname = COALESCE(EXCLUDED.pharmacy_hostname, buying_group_domains.pharmacy_hostname),
    updated_at        = NOW()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('error', false, 'message', 'Domain configured', 'id', v_id);
END;
$function$;
