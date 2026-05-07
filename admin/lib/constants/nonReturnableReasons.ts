/**
 * Non-returnable reason codes used across the app.
 *
 * These reasons match the standardised RSI policy codes and are stored on
 * `return_transaction_items.non_returnable_reason` whenever an item is
 * marked as non_returnable (either by warehouse verification or manually).
 *
 * The "All" option (id: '0') is only used as a filter sentinel — it must
 * NEVER be persisted to the database.
 */
export interface NonReturnableReasonOption {
  id: string;
  value: string;
  label: string;
}

export const NON_RETURNABLE_REASONS: NonReturnableReasonOption[] = [
  { id: '1',  value: 'manufacturer_no_returns',          label: 'Manufacturer Does Not Accept Returns' },
  { id: '2',  value: 'sold_non_returnable',              label: 'Product Sold On A Non-Returnable Basis' },
  { id: '3',  value: 'manufacturer_no_partials',         label: 'Manufacturer Does Not Accept Partials' },
  { id: '4',  value: 'repackaged',                       label: 'Repackaged Product' },
  { id: '5',  value: 'too_far_past_expiration',          label: 'Product is too Far Past Expiration Date' },
  { id: '6',  value: 'minimum_quantity_not_met',         label: "Product Doesn't Meet Minimum Quantity" },
  { id: '7',  value: 'sample',                           label: 'Sample Product' },
  { id: '8',  value: 'rx_label_on_product',              label: 'Prescription Label On Product' },
  { id: '9',  value: 'label_defaced_or_damaged',         label: 'Label Defaced / Product Damaged' },
  { id: '10', value: 'lot_non_returnable',               label: 'Lot Number Is Non-Returnable' },
  { id: '11', value: 'minimum_value_not_met',            label: "Product Doesn't Meet Minimum $ Value" },
  { id: '12', value: 'other',                            label: 'Other' },
  { id: '13', value: 'free_complimentary',               label: 'Free/complimentary item' },
  { id: '14', value: 'not_in_original_package',          label: 'Product not in original package' },
  { id: '15', value: 'overfilled_container',             label: 'Overfilled container' },
  { id: '16', value: 'too_far_in_date',                  label: 'Product too far in-date' },
  { id: '17', value: 'destroy_at_customer_request',      label: 'Destroy at customer request' },
  { id: '18', value: 'compounded',                       label: 'Compounded product' },
];

/**
 * Legacy reason codes that may already be stored in the database from earlier
 * versions of the app. They map onto the new richer set above for display
 * purposes. They remain valid for backwards compatibility.
 */
export const LEGACY_NON_RETURNABLE_REASONS: NonReturnableReasonOption[] = [
  { id: 'L1', value: 'date',     label: 'Past Expiration Date' },
  { id: 'L2', value: 'policy',   label: 'Manufacturer Policy' },
  { id: 'L3', value: 'no_data',  label: 'No Policy Data Available' },
  { id: 'L4', value: 'manual',   label: 'Manually Set' },
];

const ALL_REASONS_BY_VALUE = new Map<string, NonReturnableReasonOption>();
[...NON_RETURNABLE_REASONS, ...LEGACY_NON_RETURNABLE_REASONS].forEach(r => {
  ALL_REASONS_BY_VALUE.set(r.value, r);
});

/**
 * Get a human-friendly label for a stored non_returnable_reason value.
 * Falls back to a Title-Cased version of the raw string when unknown.
 */
export function formatNonReturnableReason(value?: string | null): string {
  if (!value) return '—';
  const found = ALL_REASONS_BY_VALUE.get(value.trim());
  if (found) return found.label;
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function isValidNonReturnableReason(value?: string | null): boolean {
  if (!value) return false;
  return ALL_REASONS_BY_VALUE.has(value.trim());
}

export const NON_RETURNABLE_REASON_VALUES = NON_RETURNABLE_REASONS.map(r => r.value);
export const ALL_NON_RETURNABLE_REASON_VALUES: string[] = [
  ...NON_RETURNABLE_REASONS.map(r => r.value),
  ...LEGACY_NON_RETURNABLE_REASONS.map(r => r.value),
];
