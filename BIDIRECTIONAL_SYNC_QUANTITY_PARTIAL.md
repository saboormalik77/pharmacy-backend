# Bidirectional Sync: Quantity ↔ % Remaining

## Overview
The partial bottle form now includes intelligent bidirectional synchronization between `Quantity` and `% Remaining` fields when a package is marked as partial.

## How It Works

### 1. User Changes Quantity → Auto-Update % Remaining
**File**: `admin/app/warehouse/returns/[id]/add-items/page.tsx`

**Function**: `handleQuantityChange(value: string)`

When user modifies the Quantity field:
- The new quantity is updated
- If in partial mode (`isPartial = true`) AND `fullPackageSize` is set:
  - Calculates new percentage: `(newQuantity / fullPackageSize) * 100`
  - Clamps result to valid range [1, 100]
  - Updates `partialPercentage` field automatically

**Example**:
- Full Package Size: 60 tablets
- User enters Quantity: 30
- System calculates: (30 / 60) × 100 = **50%**
- Partial Percentage auto-updates to: **50.00**

### 2. User Changes % Remaining → Auto-Update Quantity
**Function**: `handlePartialPercentageChange(value: string)`

When user modifies the % Remaining field:
- The new percentage is normalized and validated (1-100 range)
- If `fullPackageSize` is set:
  - Calculates new quantity: `(partialPercentage / 100) * fullPackageSize`
  - Rounds to 1 decimal place for precision
  - Updates `quantity` field automatically

**Example**:
- Full Package Size: 60 tablets
- User enters % Remaining: 75
- System calculates: (75 / 100) × 60 = 45 tablets
- Quantity auto-updates to: **45**

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| **Clear % while in partial mode** | Percentage clears, quantity unchanged |
| **Empty fullPackageSize** | Sync is skipped; user must enter both fields manually |
| **fullPackageSize = 0** | Sync is skipped (division by zero protection) |
| **Partial mode OFF** | Sync disabled; both fields work independently |
| **Invalid percentage input** | Normalized to valid range or cleared if invalid |
| **Quantity > fullPackageSize** | Percentage clamped to max 100% |
| **Quantity < 1** | Percentage clamped to min 1% |

## Updated Estimated Value Calculation

The **Estimated Value** now uses the synced quantity:
```
If isPartial:
  Estimated Value = StandardPrice × Quantity × (PercentRemaining / 100)
Else:
  Estimated Value = StandardPrice × Quantity
```

**Example with sync**:
- Standard Price: $10.00
- Full Package Size: 60
- User enters Quantity: 30 (auto-syncs % to 50%)
- Estimated Value: $10.00 × 30 × (50 / 100) = **$150.00**

---

Alternatively:
- Standard Price: $10.00
- Full Package Size: 60
- User enters % Remaining: 75% (auto-syncs Quantity to 45)
- Estimated Value: $10.00 × 45 × (75 / 100) = **$337.50**

## Frontend-Only Implementation

This bidirectional sync is purely frontend validation/convenience:
- No database schema changes required
- No API changes required
- Backend continues to receive `quantity`, `partialPercentage`, and `fullPackageSize` as before
- Backend calculates `estimated_value` using the same formula

## Rounding & Precision

- **Quantity**: Rounded to 1 decimal place when calculated from %
  - Allows 30.5 tablets if needed
  - Input via keyboard: accepts full precision
- **Percentage**: Normalized to 0.01 precision (step="0.01" in HTML input)
  - Allows 50.25% granularity
  - Clamped to [1, 100] range

## User Experience Improvements

1. **Faster workflow**: User can enter EITHER quantity OR %, not both
2. **Error prevention**: Can't accidentally create mismatched quantity/% pairs
3. **Real-time feedback**: Estimated Value updates as soon as either field changes
4. **Validation**: Invalid percentages are immediately rejected; out-of-range quantities are clamped

## Technical Details

**Dependency Management**:
- `handleQuantityChange` depends on: `form.isPartial`, `form.fullPackageSize`
- `handlePartialPercentageChange` depends on: `form.fullPackageSize`
- Both use `getNormalizedPartialPercentage()` for range validation
- Both use `updateField()` to modify state

**Infinite Loop Prevention**:
- Each handler updates only ONE field at a time
- Does not immediately re-trigger its own logic
- React's unidirectional data flow prevents cycles

## Testing Checklist

- [ ] Scan product with known package size
- [ ] Enter partial mode with % = 100
- [ ] Change quantity → verify % updates correctly
- [ ] Change % → verify quantity updates correctly
- [ ] Leave fullPackageSize empty → verify sync is skipped
- [ ] Verify estimated value follows formula: `price × qty × (percent/100)`
- [ ] Verify form saves successfully after sync
- [ ] Edit partial item → verify both fields are editable and synced
