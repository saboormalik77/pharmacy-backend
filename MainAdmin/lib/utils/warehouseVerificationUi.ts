/**
 * Whether the warehouse v2 UI should show the "how many boxes received?" step first.
 * Matches DB signals: warehouse_start_verification sets verified_at and pieces_received.
 */
export function shouldShowWarehouseBoxCountStep(transaction: {
    status?: string;
    verificationCompletedAt?: string | null;
    verifiedAt?: string | null;
    piecesReceived?: number | null;
} | null | undefined): boolean {
    if (!transaction || transaction.status !== 'received') return false;
    if (transaction.verificationCompletedAt) return false;
    if (transaction.verifiedAt) return false;
    if (transaction.piecesReceived != null) return false;
    return true;
}

/** Hide "Complete verification" when v2 (or equivalent) already finished. */
export function isWarehouseVerificationAlreadyCompleted(transaction: {
    status?: string;
    verificationCompletedAt?: string | null;
    verifiedIntegrity?: boolean | null;
} | null | undefined): boolean {
    if (!transaction) return false;
    if (transaction.verificationCompletedAt) return true;
    const st = transaction.status;
    if (st === 'verified' || st === 'closed' || st === 'closed_out') return true;
    if (st === 'received' && transaction.verifiedIntegrity === true) return true;
    return false;
}
