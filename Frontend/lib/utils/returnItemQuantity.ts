/** Fields used to derive unit quantity and full vs partial package returns. */
export type ReturnItemQuantityFields = {
    quantity?: number | null;
    quantityReturned?: number | null;
    fullPackageSize?: number | null;
    fullPackageQtyReturned?: number | null;
    isPartial?: boolean | null;
    partialPercentage?: number | null;
};

export type ReturnPackageKind = 'full' | 'partial' | 'unknown';

/**
 * Unit count shown in lists and edit forms (never normalized to package count).
 */
export function getReturnItemUnitsReturned(item: ReturnItemQuantityFields): number {
    const pkgSize = item.fullPackageSize ?? 0;
    const raw =
        item.fullPackageQtyReturned ??
        item.quantityReturned ??
        null;

    if (raw != null && raw > 0) {
        // Legacy rows: package count (1) stored instead of units for a full bottle
        if (
            !item.isPartial &&
            pkgSize > 1 &&
            raw === 1 &&
            (item.quantity === 1 || item.quantity == null)
        ) {
            return pkgSize;
        }
        return raw;
    }

    if (item.isPartial && pkgSize > 0 && item.partialPercentage != null) {
        return Math.round((item.partialPercentage / 100) * pkgSize);
    }

    if (!item.isPartial && pkgSize > 0 && item.quantity === 1) {
        return pkgSize;
    }

    return item.quantity ?? 0;
}

export function formatUnitsReturnedForForm(item: ReturnItemQuantityFields): string {
    const units = getReturnItemUnitsReturned(item);
    return units > 0 ? String(units) : '';
}

export function getReturnItemPackageKind(
    item: ReturnItemQuantityFields,
    unitsOverride?: number,
): ReturnPackageKind {
    const pkgSize = item.fullPackageSize ?? 0;
    const units = unitsOverride ?? getReturnItemUnitsReturned(item);
    if (pkgSize <= 0 || units <= 0) return 'unknown';
    if (item.isPartial) return 'partial';
    return units >= pkgSize ? 'full' : 'partial';
}

export function getPackageKindFromUnits(
    pkgSize: number,
    unitsReturned: number,
): ReturnPackageKind {
    if (pkgSize <= 0 || unitsReturned <= 0) return 'unknown';
    return unitsReturned >= pkgSize ? 'full' : 'partial';
}

/** e.g. "50% (15 of 30 units)" for partial rows */
export function formatPartialReturnDetail(
    item: ReturnItemQuantityFields,
    unitsOverride?: number,
): string | null {
    const pkgSize = item.fullPackageSize ?? 0;
    const units = unitsOverride ?? getReturnItemUnitsReturned(item);
    if (pkgSize <= 0 || units <= 0 || units >= pkgSize) return null;

    const pct =
        item.partialPercentage != null
            ? item.partialPercentage
            : Math.round((units / pkgSize) * 10000) / 100;

    return `${pct}% (${units} of ${pkgSize} units)`;
}
