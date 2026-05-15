-- Function : _batch_to_json
-- Arguments: b return_batches
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._batch_to_json(b return_batches) CASCADE;

CREATE OR REPLACE FUNCTION public._batch_to_json(b return_batches)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                      b.id,
    'batchMonth',              b.batch_month,
    'batchName',               b.batch_name,
    'status',                  b.status,
    'totalReturns',            b.total_returns,
    'totalDebitMemos',         b.total_debit_memos,
    'totalValue',              b.total_value,
    'cardinalFileGenerated',   b.cardinal_file_generated,
    'cardinalFileUrl',         b.cardinal_file_url,
    'cardinalSubmittedAt',     b.cardinal_submitted_at,
    'cardinalApprovedAt',      b.cardinal_approved_at,
    'closedAt',                b.closed_at,
    'createdAt',               b.created_at,
    'updatedAt',               b.updated_at
  );
$function$;
