-- FCR 47 — Align debit_memos.ra_status with RA request / receipt / shipment facts
-- when the column drifted (e.g. pending while ra_number or outbound_tracking is set).
-- Improves API filters, summary counts, and any code that reads ra_status only.

-- Shipped: tracking or shipped_at implies shipped
UPDATE debit_memos
SET ra_status = 'shipped'
WHERE ra_status IS DISTINCT FROM 'shipped'
  AND (
    shipped_at IS NOT NULL
    OR NULLIF(TRIM(COALESCE(outbound_tracking, '')), '') IS NOT NULL
  );

-- Received: has RA number (or receipt timestamp) but not shipped
UPDATE debit_memos
SET ra_status = 'received'
WHERE ra_status NOT IN ('received', 'shipped')
  AND shipped_at IS NULL
  AND NULLIF(TRIM(COALESCE(outbound_tracking, '')), '') IS NULL
  AND (
    NULLIF(TRIM(COALESCE(ra_number, '')), '') IS NOT NULL
    OR ra_received_at IS NOT NULL
  );

-- Requested: request sent, no RA yet, not shipped
UPDATE debit_memos
SET ra_status = 'requested'
WHERE ra_status = 'pending'
  AND ra_requested_at IS NOT NULL
  AND NULLIF(TRIM(COALESCE(ra_number, '')), '') IS NULL
  AND ra_received_at IS NULL
  AND shipped_at IS NULL
  AND NULLIF(TRIM(COALESCE(outbound_tracking, '')), '') IS NULL;
