-- Function : _pharmacy_payment_to_json
-- Arguments: p pharmacy_payments
-- Type     : FUNCTION
-- =============================================================

DROP FUNCTION IF EXISTS public._pharmacy_payment_to_json(p pharmacy_payments) CASCADE;

CREATE OR REPLACE FUNCTION public._pharmacy_payment_to_json(p pharmacy_payments)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'id',                     p.id,
    'pharmacyId',             p.pharmacy_id,
    'pharmacyName',           COALESCE((SELECT pharmacy_name FROM pharmacy WHERE id = p.pharmacy_id), ''),
    'batchId',                p.batch_id,
    'batchName',              COALESCE((SELECT batch_name FROM return_batches WHERE id = p.batch_id), ''),
    'batchMonth',             (SELECT batch_month FROM return_batches WHERE id = p.batch_id),
    'totalCreditReceived',    p.total_credit_received,
    'companyFee',             p.company_fee,
    'companyFeePercent',      p.company_fee_percent,
    'gpoShare',               p.gpo_share,
    'gpoName',                p.gpo_name,
    'pharmacyPayout',         p.pharmacy_payout,
    'paymentMethod',          p.payment_method,
    'paymentReference',       p.payment_reference,
    'paidAt',                 p.paid_at,
    'status',                 p.status,
    'notes',                  p.notes,
    'createdBy',              p.created_by,
    'createdAt',              p.created_at,
    'updatedAt',              p.updated_at,
    'paymentType',            p.payment_type,
    'checkNumber',            p.check_number,
    'checkDate',              p.check_date,
    'returnReferenceNumber',  p.return_reference_number,
    'pharmacyAccountNumber',  p.pharmacy_account_number,
    'serviceDate',            p.service_date,
    'grossCreditAmount',      p.gross_credit_amount,
    'includedCreditAmount',   p.included_credit_amount,
    'directCreditAmount',     p.direct_credit_amount,
    'porCreditAmount',        p.por_credit_amount,
    'rsiFeeIncludedPercent',  p.rsi_fee_included_percent,
    'rsiFeeDirectPercent',    p.rsi_fee_direct_percent,
    'isLegacy',               p.is_legacy
  );
$function$;
