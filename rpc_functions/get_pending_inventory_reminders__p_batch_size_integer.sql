-- Function : get_pending_inventory_reminders
-- Arguments: p_batch_size integer
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public.get_pending_inventory_reminders(p_batch_size integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_pending_inventory_reminders(p_batch_size integer DEFAULT 100)
 RETURNS TABLE(id uuid, pharmacy_id uuid, pharmacy_email character varying, pharmacy_name character varying, reminder_type character varying, title character varying, message text, total_items integer, total_potential_value numeric, items_summary jsonb, scheduled_for timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ir.id,
    ir.pharmacy_id,
    p.email AS pharmacy_email,
    p.name AS pharmacy_name,
    ir.reminder_type,
    ir.title,
    ir.message,
    ir.total_items,
    ir.total_potential_value,
    ir.items_summary,
    ir.scheduled_for
  FROM inventory_reminders ir
  JOIN pharmacy p ON p.id = ir.pharmacy_id
  WHERE ir.status = 'pending'
    AND ir.scheduled_for <= NOW()
  ORDER BY ir.scheduled_for ASC
  LIMIT p_batch_size;
END;
$function$;
