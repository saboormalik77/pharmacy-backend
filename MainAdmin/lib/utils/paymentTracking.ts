import type { DebitMemo } from '@/lib/types';

type MemoWithOutstanding = Pick<DebitMemo, 'amountRequested' | 'amountReceived'> & {
    outstandingAmount?: number | null;
};

/** Per-memo outstanding — matches Payment Tracking table rows. */
export function getMemoOutstanding(memo: MemoWithOutstanding): number {
    if (memo.outstandingAmount != null && !Number.isNaN(Number(memo.outstandingAmount))) {
        return Number(memo.outstandingAmount);
    }
    return (Number(memo.amountRequested) || 0) - (Number(memo.amountReceived) || 0);
}

/** Sum amountReceived across memos (source of truth for grouped return headers). */
export function sumMemosAmountReceived(
    memos: Pick<DebitMemo, 'amountReceived'>[] | undefined | null,
): number {
    if (!memos?.length) return 0;
    return memos.reduce((sum, memo) => sum + (Number(memo.amountReceived) || 0), 0);
}

/** Sum outstanding across memos (source of truth for unpaid grouped return headers). */
export function sumMemosOutstanding(memos: MemoWithOutstanding[] | undefined | null): number {
    if (!memos?.length) return 0;
    return memos.reduce((sum, memo) => sum + getMemoOutstanding(memo), 0);
}

/** Sum item counts across memos (source of truth for grouped return headers). */
export function sumMemosTotalItems(
    memos: Pick<DebitMemo, 'totalItems'>[] | undefined | null,
): number {
    if (!memos?.length) return 0;
    return memos.reduce((sum, memo) => sum + (Number(memo.totalItems) || 0), 0);
}

/** Sum ask values across memos (source of truth for grouped return headers). */
export function sumMemosTotalAskValue(
    memos: Pick<DebitMemo, 'totalAskValue'>[] | undefined | null,
): number {
    if (!memos?.length) return 0;
    return memos.reduce((sum, memo) => sum + (Number(memo.totalAskValue) || 0), 0);
}
