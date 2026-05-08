/**
 * Build selectable months from the current calendar month forward (no past months),
 * up to monthsForward ahead (default 46), excluding months that already have a batch (YYYY-MM).
 */
export function buildAvailableBatchMonthOptions(
    usedMonths: string[],
    monthsForward = 46
): { value: string; label: string }[] {
    const used = new Set(usedMonths.map((m) => (m.length >= 7 ? m.slice(0, 7) : m)));
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + monthsForward, 1);
    while (cursor <= end) {
        const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        if (!used.has(ym)) {
            out.push({
                value: ym,
                label: cursor.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            });
        }
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
}
