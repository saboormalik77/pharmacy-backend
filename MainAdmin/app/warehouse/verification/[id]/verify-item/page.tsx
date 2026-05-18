'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldAlert, X, Loader2, Archive, Ban, DollarSign, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    updateTransactionItem,
    updateTransactionItemPrice,
    moveItemToWineCellar,
    resolveTransactionItem,
} from '@/lib/store/returnTransactionsSlice';
import { verifyItemV2, fetchVerificationSummary } from '@/lib/store/warehouseSlice';
import { checkReturnability } from '@/lib/store/policiesSlice';
import { upsertNDCPricing } from '@/lib/store/ndcPricingSlice';
import type { VerificationV2Item, ReturnabilityCheckResult, NDCPricingUpsertPayload } from '@/lib/types';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import {
    NON_RETURNABLE_REASONS,
    isValidNonReturnableReason,
} from '@/lib/constants/nonReturnableReasons';

// Helper functions
const normalizeNdc = (ndc: string): string => ndc.replace(/\D/g, '');
const normalizeDateKey = (date?: string): string => date?.slice(0, 10) || '';

// ─── NDC Pricing Book (mirrors MainAdmin/app/ndc-pricing/page.tsx) ───────────
const PRICE_SOURCES = [
    'Avella 2016 Price List',
    'Avella 2018 Price List',
    'Good RX Retail',
    'Labeler Credit Memo',
    'Price Chopper 2016',
    'Processor Added "PA"',
    'Single Item DM',
    'User Add During Close-Out',
    'Westcliff 2017',
    'Imported from Return Reports',
    'Manual Entry',
];

const PRICE_DESTINATIONS = [
    { value: 'inmar', label: 'Inmar' },
    { value: 'qualanex', label: 'Qualanex' },
    { value: 'pharmalink', label: 'PharmaLink' },
    { value: 'other', label: 'Other' },
];

const estimatedStoreFromCurrent = (current: number | undefined): number | undefined => {
    if (current == null || Number.isNaN(current) || current < 0) return undefined;
    return Math.round(current * 0.7 * 100) / 100;
};

const buildProductNameFromItem = (item: VerificationV2Item): string => {
    const prop = (item.proprietaryName || '').trim();
    const gen = (item.genericName || '').trim();
    if (prop && gen && prop.toLowerCase() !== gen.toLowerCase()) return `${prop} (${gen})`;
    return prop || gen || '';
};

interface ResolvedPrice {
    found: boolean;
    /** Historical average ask price from payment history (FCR-56). Preferred over currentPrice. */
    avgAskPrice?: number | null;
    /** Manually-entered price from the NDC Pricing Book. */
    currentPrice: number | null;
    productName: string | null;
    priceSource: string | null;
    closeOutDestination: string | null;
    estimatedStorePrice: number | null;
}

export default function VerifyItemPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    
    const returnId = params.id as string;
    const itemId = searchParams.get('itemId');
    const { v2Summary, isActionLoading, isLoading } = useAppSelector(s => s.warehouse);
    const verificationBootstrapKeyRef = useRef<string | null>(null);

    // Find the item to verify
    const verifyingItem = v2Summary?.items?.find(item => item.id === itemId) || null;

    // Refetch summary when the store lost this return's items (e.g. after visiting /policy and back)
    useEffect(() => {
        if (!returnId || !itemId) return;

        const summaryMatches = v2Summary?.transaction?.id === returnId;
        const hasItem = !!(summaryMatches && v2Summary?.items?.some(i => i.id === itemId));
        if (hasItem) {
            verificationBootstrapKeyRef.current = null;
            return;
        }

        const key = `${returnId}:${itemId}`;
        if (verificationBootstrapKeyRef.current === key) return;

        verificationBootstrapKeyRef.current = key;
        void dispatch(fetchVerificationSummary(returnId));
    }, [returnId, itemId, v2Summary, dispatch]);
    
    // State
    const [verifyStatus, setVerifyStatus] = useState('correct'); // Auto-set to "correct"
    const [verifyActualQty, setVerifyActualQty] = useState(verifyingItem?.quantity?.toString() || '');
    const [verifyNotes, setVerifyNotes] = useState('');
    const [policyResult, setPolicyResult] = useState<ReturnabilityCheckResult | null>(null);
    const [isPolicyChecking, setIsPolicyChecking] = useState(false);
    const [policyChecked, setPolicyChecked] = useState(false); // Track if policy was already checked
    const [returnStatus, setReturnStatus] = useState<'returnable' | 'non_returnable'>('returnable');
    const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
    const [disposition, setDisposition] = useState<'returnable' | 'wine_cellar' | 'destruction'>('returnable');
    const [wineCellarDate, setWineCellarDate] = useState('');
    const [manualDestination, setManualDestination] = useState('');
    const [reverseDistributors, setReverseDistributors] = useState<Array<{id: string; name: string; email: string}>>([]);
    const [loadingDistributors, setLoadingDistributors] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    // FCR-52: Required when an item ends up non_returnable
    const [nonReturnableReason, setNonReturnableReason] = useState<string>('');
    // Serial number and lot number for verification
    const [verifySerialNumber, setVerifySerialNumber] = useState('');
    const [verifyLotNumber, setVerifyLotNumber] = useState('');

    // ─── NDC Pricing gate ────────────────────────────────────────────────
    const [resolvedPrice, setResolvedPrice] = useState<ResolvedPrice | null>(null);
    const [priceLookupLoading, setPriceLookupLoading] = useState(false);
    const [priceLookupChecked, setPriceLookupChecked] = useState(false);
    const [priceForm, setPriceForm] = useState<NDCPricingUpsertPayload>({
        ndc: '',
        productName: '',
        currentPrice: undefined,
        estimatedStorePrice: undefined,
        lastReimbursement: undefined,
        priceSource: '',
        closeOutDestination: '',
    });
    const [savingPrice, setSavingPrice] = useState(false);

    const hasNdc = !!verifyingItem?.ndc?.trim();
    // A price is considered available if either the historical avg ask price
    // (preferred, from payment history) or the manually-entered current price
    // is a real positive number.
    const resolvedEffectivePrice =
        (resolvedPrice?.avgAskPrice ?? 0) > 0
            ? resolvedPrice!.avgAskPrice!
            : (resolvedPrice?.currentPrice ?? 0) > 0
                ? resolvedPrice!.currentPrice!
                : null;
    const priceAvailable = !!resolvedPrice?.found && resolvedEffectivePrice != null;
    // Verification is gated on pricing only when the item has a usable NDC.
    const priceGateActive = hasNdc && priceLookupChecked && !priceAvailable;

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message: msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleBack = () => {
        router.push(`/warehouse/verification/${returnId}`);
    };

    // Set initial quantity, serial, and lot when item loads
    useEffect(() => {
        if (verifyingItem) {
            if (!verifyActualQty) {
                setVerifyActualQty(verifyingItem.quantity?.toString() || '');
            }
            if (!verifySerialNumber && verifyingItem.serialNumber) {
                setVerifySerialNumber(verifyingItem.serialNumber);
            }
            if (!verifyLotNumber && verifyingItem.lotNumber) {
                setVerifyLotNumber(verifyingItem.lotNumber);
            }
        }
    }, [verifyingItem, verifyActualQty, verifySerialNumber, verifyLotNumber]);

    const fetchReverseDistributors = useCallback(async () => {
        if (reverseDistributors.length > 0) return;
        
        setLoadingDistributors(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: Array<{id: string; name: string; email: string}> }>('/admin/reverse-distributors');
            
            if (res.status === 'success' && res.data) {
                setReverseDistributors(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch reverse distributors:', error);
            showToast('Failed to load destinations', 'error');
        } finally {
            setLoadingDistributors(false);
        }
    }, [reverseDistributors.length, showToast]);

    // Policy check effect - runs only ONCE when item loads
    useEffect(() => {
        if (!verifyingItem || policyChecked) {
            return;
        }

        const ndc = verifyingItem.ndc?.trim();
        const expirationDate = normalizeDateKey(verifyingItem.expirationDate);

        if (!ndc || !expirationDate) {
            setPolicyChecked(true); // Mark as checked even if no valid data
            return;
        }

        let cancelled = false;
        setIsPolicyChecking(true);
        setPolicyChecked(true); // Mark as checked to prevent re-runs

        (async () => {
            const result = await dispatch(checkReturnability({
                ndc,
                expirationDate,
                dosageForm: verifyingItem.dosageForm || undefined,
                isPartial: verifyingItem.isPartial || false,
            }));

            if (cancelled) return;

            if (checkReturnability.fulfilled.match(result)) {
                const policy = result.payload;
                setPolicyResult(policy);

                const reason = String(policy.reason || '').toLowerCase();
                const routeToWineCellar =
                    reason === 'too_early' || reason === 'deferred_inside_policy_period';

                if (policy.status === 'returnable') {
                    setReturnStatus('returnable');
                    setDisposition('returnable');
                    fetchReverseDistributors();
                } else {
                    setReturnStatus('non_returnable');
                    if (routeToWineCellar) {
                        setDisposition('wine_cellar');
                        setNonReturnableRoute('wine_cellar');
                        if (policy.expectedReturnableDate) {
                            setWineCellarDate(policy.expectedReturnableDate.slice(0, 10));
                        }
                    } else {
                        setDisposition('destruction');
                        setNonReturnableRoute('destruction');
                    }

                    // FCR-52: Seed reason from policy when applicable so the
                    // user just confirms it. They can still override with the
                    // dropdown.
                    const policyToCanonical: Record<string, string> = {
                        too_early: 'date',
                        too_late: 'too_far_past_expiration',
                        deferred_inside_policy_period: 'date',
                        policy_exception: 'manufacturer_no_returns',
                        no_partials: 'manufacturer_no_partials',
                        dosage_form_not_accepted: 'manufacturer_no_returns',
                        not_returnable_in_policy_window: 'manufacturer_no_returns',
                    };
                    const seeded = policyToCanonical[reason];
                    if (seeded && isValidNonReturnableReason(seeded)) {
                        setNonReturnableReason(seeded);
                    }
                }

                if (policy.destination) {
                    setManualDestination(policy.destination);
                }
            } else {
                setPolicyResult(null);
            }

            setIsPolicyChecking(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch, verifyingItem]); // Removed fetchReverseDistributors and verifyStatus

    // ─── NDC Pricing lookup (runs once per item) ─────────────────────────
    useEffect(() => {
        if (!verifyingItem || priceLookupChecked) return;

        const ndc = verifyingItem.ndc?.trim();
        if (!ndc) {
            // No NDC on the item — cannot look up; do not gate verification.
            setPriceLookupChecked(true);
            return;
        }

        let cancelled = false;
        setPriceLookupLoading(true);

        (async () => {
            try {
                const { apiClient } = await import('@/lib/api/apiClient');
                const response = await apiClient.get<{
                    status: string;
                    data: ResolvedPrice;
                }>(`/admin/ndc-pricing/resolve/${encodeURIComponent(ndc)}`, true);

                if (cancelled) return;

                const data = response?.data || null;
                setResolvedPrice(data);

                // Pre-fill the price-entry form so the admin only needs to
                // confirm or adjust. Prefer avgAskPrice (historical data) over
                // currentPrice when currentPrice is absent.
                const prefillPrice =
                    (data?.currentPrice ?? 0) > 0
                        ? data!.currentPrice!
                        : (data?.avgAskPrice ?? 0) > 0
                            ? data!.avgAskPrice!
                            : undefined;
                if (!data?.found || !prefillPrice) {
                    setPriceForm({
                        ndc,
                        productName:
                            data?.productName ||
                            buildProductNameFromItem(verifyingItem),
                        currentPrice: prefillPrice,
                        estimatedStorePrice: prefillPrice
                            ? estimatedStoreFromCurrent(prefillPrice)
                            : undefined,
                        lastReimbursement: undefined,
                        priceSource: (data?.avgAskPrice ?? 0) > 0 ? 'Historical Avg Ask' : '',
                        closeOutDestination: '',
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('NDC price lookup failed:', err);
                    setResolvedPrice({
                        found: false,
                        avgAskPrice: null,
                        currentPrice: null,
                        productName: null,
                        priceSource: null,
                        closeOutDestination: null,
                        estimatedStorePrice: null,
                    });
                    setPriceForm({
                        ndc,
                        productName: buildProductNameFromItem(verifyingItem),
                        currentPrice: undefined,
                        estimatedStorePrice: undefined,
                        lastReimbursement: undefined,
                        priceSource: '',
                        closeOutDestination: '',
                    });
                }
            } finally {
                if (!cancelled) {
                    setPriceLookupLoading(false);
                    setPriceLookupChecked(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [verifyingItem, priceLookupChecked]);

    const handleSaveNdcPrice = async () => {
        if (!priceForm.ndc) {
            showToast('NDC is required to save pricing', 'error');
            return;
        }
        if (priceForm.currentPrice == null || !Number.isFinite(priceForm.currentPrice) || priceForm.currentPrice <= 0) {
            showToast('Enter a valid current price (greater than 0)', 'error');
            return;
        }

        setSavingPrice(true);
        const payload: NDCPricingUpsertPayload = {
            ndc: priceForm.ndc,
            productName: priceForm.productName || undefined,
            currentPrice: priceForm.currentPrice,
            estimatedStorePrice:
                priceForm.estimatedStorePrice ?? estimatedStoreFromCurrent(priceForm.currentPrice),
            lastReimbursement: priceForm.lastReimbursement,
            priceSource: priceForm.priceSource || 'Manual Entry',
            closeOutDestination: priceForm.closeOutDestination || undefined,
        };

        const result = await dispatch(upsertNDCPricing(payload));

        if (!upsertNDCPricing.fulfilled.match(result)) {
            setSavingPrice(false);
            showToast((result.payload as string) || 'Failed to save NDC price', 'error');
            return;
        }

        const rec = result.payload;

        // FCR-56d: prefer the freshly-computed avg_ask_price as the canonical
        // standard_price for this item. The SQL upsert_ndc_pricing now seeds
        // ndc_payment_history and calls recompute, so rec.avgAskPrice may
        // already be updated. Fall back to currentPrice if avg is absent.
        const effectiveStandardPrice =
            (rec.avgAskPrice ?? 0) > 0
                ? rec.avgAskPrice!
                : (rec.currentPrice ?? 0) > 0
                    ? rec.currentPrice!
                    : null;

        // Back-propagate onto this return-transaction item so downstream
        // surfaces (close-out batch, debit memos, totals) see the value.
        if (verifyingItem && effectiveStandardPrice != null && effectiveStandardPrice > 0) {
            const updateResult = await dispatch(updateTransactionItemPrice({
                transactionId: returnId,
                itemId: verifyingItem.id,
                standardPrice: effectiveStandardPrice,
            }));
            if (!updateTransactionItemPrice.fulfilled.match(updateResult)) {
                setSavingPrice(false);
                showToast(
                    (updateResult.payload as string) ||
                        'Saved to NDC book but failed to update item price on this return',
                    'error',
                );
                return;
            }
        }

        setSavingPrice(false);
        setResolvedPrice({
            found: true,
            avgAskPrice: rec.avgAskPrice ?? null,
            currentPrice: rec.currentPrice,
            productName: rec.productName,
            priceSource: rec.priceSource,
            closeOutDestination: rec.closeOutDestination,
            estimatedStorePrice: rec.estimatedStorePrice,
        });
        showToast('Price saved to NDC Pricing Book and applied to this item');
    };

    const runPhysicalVerification = async (
        itemId: string,
        verificationStatus: string,
        actualQuantity?: number,
        conditionNotes?: string,
        reasonOverride?: string,
    ): Promise<boolean> => {
        const body: any = { verificationStatus };
        if (actualQuantity != null) body.actualQuantity = actualQuantity;
        if (conditionNotes) body.conditionNotes = conditionNotes;
        if (reasonOverride) body.nonReturnableReason = reasonOverride;
        if (verifySerialNumber) body.serialNumber = verifySerialNumber;
        if (verifyLotNumber) body.lotNumber = verifyLotNumber;

        const result = await dispatch(verifyItemV2({ transactionId: returnId, itemId, ...body }));
        if (!verifyItemV2.fulfilled.match(result)) {
            showToast((result.payload as string) || 'Failed to verify item', 'error');
            return false;
        }
        return true;
    };

    const handleVerifyItem = async () => {
        if (!verifyStatus || !verifyingItem) return;

        // FCR: NDC Pricing gate — items with an NDC must have a price in the
        // pricing book before verification is allowed.
        if (priceGateActive) {
            showToast('Enter and save the NDC price before verifying this item.', 'error');
            return;
        }

        const parsedQty = verifyActualQty !== '' ? Number(verifyActualQty) : undefined;
        const actualQty = parsedQty != null && Number.isFinite(parsedQty) ? parsedQty : undefined;
        const notes = verifyNotes.trim() || undefined;

        // FCR-52: damaged / missing / wrong_item all flip the row to
        // non_returnable, so a reason is required.
        if (verifyStatus !== 'correct') {
            if (!nonReturnableReason || !isValidNonReturnableReason(nonReturnableReason)) {
                showToast('Please select a non-returnable reason for this item.', 'error');
                return;
            }
            const verified = await runPhysicalVerification(
                verifyingItem.id,
                verifyStatus,
                actualQty,
                notes,
                nonReturnableReason,
            );
            if (!verified) return;
            showToast('Item verified');
            router.push(`/warehouse/verification/${returnId}`);
            return;
        }

        if (returnStatus === 'non_returnable' && nonReturnableRoute === 'wine_cellar' && !wineCellarDate) {
            showToast('Expected returnable date is required for wine cellar', 'error');
            return;
        }

        // FCR-52: When the user is explicitly marking a `correct` item as
        // non_returnable from the policy/routing section, a reason is required.
        if (returnStatus === 'non_returnable') {
            // Wine cellar items automatically use 'date' reason
            if (nonReturnableRoute === 'wine_cellar') {
                if (!nonReturnableReason) {
                    setNonReturnableReason('date');
                }
            } else {
                if (!nonReturnableReason || !isValidNonReturnableReason(nonReturnableReason)) {
                    showToast('Please select a non-returnable reason for this item.', 'error');
                    return;
                }
            }
        }

        if (returnStatus === 'returnable') {
            const destination = manualDestination.trim() || policyResult?.destination || undefined;
            const updateResult = await dispatch(updateTransactionItem({
                transactionId: returnId,
                itemId: verifyingItem.id,
                payload: {
                    returnStatus: 'returnable',
                    destination,
                    ...(notes ? { memo: notes } : {}),
                },
            }));
            if (!updateTransactionItem.fulfilled.match(updateResult)) {
                showToast((updateResult.payload as string) || 'Failed to mark item returnable', 'error');
                return;
            }
        } else {
            // non_returnable
            if (nonReturnableRoute === 'wine_cellar') {
                const wcResult = await dispatch(moveItemToWineCellar({
                    transactionId: returnId,
                    itemId: verifyingItem.id,
                    expectedReturnableDate: wineCellarDate,
                    notes,
                }));
                if (!moveItemToWineCellar.fulfilled.match(wcResult)) {
                    showToast((wcResult.payload as string) || 'Failed to move item to wine cellar', 'error');
                    return;
                }
                // After wine-cellar move, persist canonical reason if user picked one.
                if (nonReturnableReason && isValidNonReturnableReason(nonReturnableReason)) {
                    await dispatch(updateTransactionItem({
                        transactionId: returnId,
                        itemId: verifyingItem.id,
                        payload: { nonReturnableReason } as any,
                    }));
                }
            } else {
                // destruction
                const resolveResult = await dispatch(resolveTransactionItem({
                    transactionId: returnId,
                    itemId: verifyingItem.id,
                    payload: {
                        new_status: 'non_returnable',
                        non_returnable_route: 'destruction',
                        reason: nonReturnableReason,
                        ...(notes ? { memo: notes } : {}),
                    },
                }));
                if (!resolveTransactionItem.fulfilled.match(resolveResult)) {
                    showToast((resolveResult.payload as string) || 'Failed to route item to destruction', 'error');
                    return;
                }
            }
        }

        const verified = await runPhysicalVerification(
            verifyingItem.id,
            'correct',
            actualQty,
            notes,
            returnStatus === 'non_returnable' ? nonReturnableReason : undefined,
        );
        if (!verified) return;

        const dispositionLabel =
            returnStatus === 'returnable'
                ? 'returnable'
                : nonReturnableRoute === 'wine_cellar'
                    ? 'wine cellar'
                    : 'destruction';
        showToast(`Item verified and routed to ${dispositionLabel}`);
        
        router.push(`/warehouse/verification/${returnId}`);
    };

    const handleViewPolicy = () => {
        if (policyResult && itemId) {
            sessionStorage.setItem('policyResult', JSON.stringify(policyResult));
            sessionStorage.setItem('verificationVerifyItemId', itemId);
            router.push(`/warehouse/verification/${returnId}/policy`);
        }
    };

    if (!itemId) {
        return (
            <div className="space-y-3">
                <div className="w-full">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm mb-4 transition-colors cursor-pointer font-medium hover:underline" style={{ color: 'var(--outline)' }}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    <div className="rounded-[4px] border shadow-sm p-12 text-center" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--on-surface-variant)' }} />
                        <p className="font-medium" style={{ color: 'var(--on-surface)' }}>No item selected</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>Open this page from verification with a valid item link.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!verifyingItem) {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[240px] gap-3">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--secondary)' }} />
                    <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading item…</p>
                </div>
            );
        }
        return (
            <div className="space-y-3">
                <div className="w-full">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm mb-4 transition-colors cursor-pointer font-medium hover:underline" style={{ color: 'var(--outline)' }}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    <div className="rounded-[4px] border shadow-sm p-12 text-center" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--on-surface-variant)' }} />
                        <p className="font-medium" style={{ color: 'var(--on-surface)' }}>Item not found</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>The item you&apos;re looking for could not be found.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            
            <div className="w-full">
                {/* Header */}
                <div className="mb-5">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm mb-4 transition-colors cursor-pointer font-medium hover:underline" style={{ color: 'var(--outline)' }}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    
                    <div className="rounded-[4px] p-3 shadow-lg text-white" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-[4px]">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="font-heading text-headline font-bold text-white">Verify Item</h1>
                                <p className="text-sm font-medium mt-1 truncate" style={{ color: 'color-mix(in srgb, var(--on-primary) 82%, transparent)' }}>
                                    {verifyingItem.proprietaryName || verifyingItem.genericName || 'Unknown Item'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Item Info */}
                <div className="bg-[var(--surface-container-lowest)] rounded-[4px] border shadow-sm mb-5" style={{ borderColor: 'var(--outline-variant)' }}>
                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--on-surface)' }}>Product Information</h2>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">NDC</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--on-surface)' }}>{verifyingItem.ndc || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Lot</span>
                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{verifyingItem.lotNumber || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Expires</span>
                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{verifyingItem.expirationDate || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Pkg Size</span>
                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>
                                    {verifyingItem.fullPackageSize ? `${verifyingItem.fullPackageSize} units` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Full Qty</span>
                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>
                                    {verifyingItem.isPartial ? '—' : (verifyingItem.fullPackageQtyReturned ?? verifyingItem.quantity ?? '—')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Partial Qty</span>
                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>
                                    {verifyingItem.isPartial ? (
                                        verifyingItem.partialPercentage 
                                            ? `${verifyingItem.quantity || 0} (${verifyingItem.partialPercentage}%)`
                                            : (verifyingItem.quantity ?? '—')
                                    ) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[var(--on-surface-variant)] font-medium">Serial No</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--on-surface)' }}>{verifyingItem.serialNumber || '—'}</span>
                            </div>
                            {verifyingItem.manufacturer && (
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-[var(--on-surface-variant)] font-medium">Manufacturer</span>
                                    <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{verifyingItem.manufacturer}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* NDC Pricing — gates verification until a price exists in the book */}
                {hasNdc && (
                    <div className="bg-[var(--surface-container-lowest)] rounded-[4px] border shadow-sm mb-5" style={{ borderColor: 'var(--outline-variant)' }}>
                        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                NDC Pricing
                            </h2>
                            {priceLookupLoading && <Loader2 className="w-4 h-4 animate-spin text-[var(--on-surface-variant)]" />}
                        </div>

                        <div className="p-5 space-y-4">
                            {priceLookupLoading && !priceLookupChecked ? (
                                <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Looking up price for NDC <span className="font-mono font-semibold">{verifyingItem.ndc}</span>...
                                </div>
                            ) : priceAvailable && resolvedPrice ? (
                                <div className="rounded-[4px] border p-4" style={{ borderColor: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' }}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--status-success)' }} />
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                                                    Price found in NDC Pricing Book
                                                </p>
                                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                                    <div className="flex justify-between sm:block">
                                                        <span style={{ color: 'var(--on-surface-variant)' }}>
                                                            {(resolvedPrice.avgAskPrice ?? 0) > 0 ? 'Avg Ask Price:' : 'Current Price:'}
                                                        </span>
                                                        <span className="ml-2 font-mono font-bold" style={{ color: 'var(--on-secondary-container)' }}>
                                                            ${resolvedEffectivePrice!.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {resolvedPrice.priceSource && (
                                                        <div className="flex justify-between sm:block">
                                                            <span style={{ color: 'var(--on-surface-variant)' }}>Source:</span>
                                                            <span className="ml-2" style={{ color: 'var(--on-surface)' }}>{resolvedPrice.priceSource}</span>
                                                        </div>
                                                    )}
                                                    {resolvedPrice.closeOutDestination && (
                                                        <div className="flex justify-between sm:block">
                                                            <span style={{ color: 'var(--on-surface-variant)' }}>Destination:</span>
                                                            <span className="ml-2 capitalize" style={{ color: 'var(--on-surface)' }}>{resolvedPrice.closeOutDestination}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-[4px] border p-3 flex items-start gap-2" style={{ borderColor: 'var(--tertiary)', backgroundColor: 'var(--status-warning-bg)' }}>
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-warning)' }} />
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                                                No price found for NDC <span className="font-mono">{verifyingItem.ndc}</span>
                                            </p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                                                Verification is blocked until you enter the price below — it will be saved to the NDC Pricing Book and reused next time.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>NDC</label>
                                            <input
                                                type="text"
                                                value={priceForm.ndc}
                                                disabled
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] bg-[var(--surface-container)] font-mono"
                                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>
                                                Product Name <span className="text-[var(--outline)] font-normal normal-case">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={priceForm.productName || ''}
                                                onChange={e => setPriceForm(d => ({ ...d, productName: e.target.value }))}
                                                placeholder="Auto-filled from item"
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>
                                                Current Price ($) <span className="normal-case" style={{ color: 'var(--error)' }}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={priceForm.currentPrice ?? ''}
                                                placeholder="e.g. 16.80"
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    const cp = v === '' ? undefined : parseFloat(v);
                                                    const parsed = cp != null && !Number.isNaN(cp) ? cp : undefined;
                                                    setPriceForm(d => ({
                                                        ...d,
                                                        currentPrice: parsed,
                                                        estimatedStorePrice: estimatedStoreFromCurrent(parsed),
                                                    }));
                                                }}
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>Last Reimbursement ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={priceForm.lastReimbursement ?? ''}
                                                placeholder="e.g. 12.50"
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    const n = v === '' ? undefined : parseFloat(v);
                                                    setPriceForm(d => ({ ...d, lastReimbursement: n != null && !Number.isNaN(n) ? n : undefined }));
                                                }}
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>Price Source</label>
                                            <select
                                                value={priceForm.priceSource || ''}
                                                onChange={e => setPriceForm(d => ({ ...d, priceSource: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[var(--surface-container-lowest)]"
                                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                                            >
                                                <option value="">— Select source —</option>
                                                {PRICE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface)' }}>Close-Out Destination</label>
                                            <select
                                                value={priceForm.closeOutDestination || ''}
                                                onChange={e => setPriceForm(d => ({ ...d, closeOutDestination: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-amber-500 bg-[var(--surface-container-lowest)]"
                                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                                            >
                                                <option value="">— Select destination —</option>
                                                {PRICE_DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="button"
                                            onClick={handleSaveNdcPrice}
                                            disabled={
                                                savingPrice
                                                || priceForm.currentPrice == null
                                                || !Number.isFinite(priceForm.currentPrice)
                                                || priceForm.currentPrice <= 0
                                            }
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                                            style={{ backgroundColor: 'var(--secondary)', color: 'var(--on-secondary)' }}
                                        >
                                            {savingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Price &amp; Unblock Verification
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Verification Form */}
                <div className="bg-[var(--surface-container-lowest)] rounded-[4px] border shadow-sm" style={{ borderColor: 'var(--outline-variant)' }}>
                    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--on-surface)' }}>Verification Details</h2>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Verification Status */}
                        <div>
                            <label className="text-sm font-semibold mb-2.5 block" style={{ color: 'var(--on-surface)' }}>Verification Status</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'correct', label: 'Correct', color: 'green', icon: CheckCircle },
                                    { value: 'damaged', label: 'Damaged', color: 'red', icon: XCircle },
                                ].map(status => {
                                    const Icon = status.icon;
                                    return (
                                        <label key={status.value} className={`flex items-center gap-3 p-3.5 border-2 rounded-[4px] cursor-pointer transition-all ${
                                            verifyStatus === status.value 
                                                ? status.color === 'green' 
                                                    ? 'shadow-sm' 
                                                    : 'shadow-sm'
                                                : 'border-[var(--outline-variant)] hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-low)]'
                                        }`}
                                        style={
                                            verifyStatus === status.value
                                                ? status.color === 'green'
                                                    ? { borderColor: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' }
                                                    : { borderColor: 'var(--error)', backgroundColor: 'var(--status-danger-bg)' }
                                                : undefined
                                        }
                                        >
                                            <input 
                                                type="radio" 
                                                name="verify_status" 
                                                value={status.value} 
                                                checked={verifyStatus === status.value} 
                                                onChange={() => setVerifyStatus(status.value)} 
                                                className={status.color === 'green' ? 'accent-[var(--secondary)]' : 'accent-[var(--error)]'} 
                                            />
                                            <Icon className="w-4 h-4" style={{
                                                color: verifyStatus === status.value
                                                    ? (status.color === 'green' ? 'var(--secondary)' : 'var(--error)')
                                                    : 'var(--outline)',
                                            }} />
                                            <span className="text-sm font-semibold" style={{
                                                color: verifyStatus === status.value
                                                    ? 'var(--on-surface)'
                                                    : 'var(--on-surface)',
                                            }}>
                                                {status.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Serial Number and Lot Number Verification */}
                        {verifyStatus === 'correct' && (
                            <div className="space-y-3 p-4 rounded-[4px] border shadow-sm" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Product Verification</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--on-surface-variant)' }}>Serial Number</label>
                                        <input
                                            type="text"
                                            value={verifySerialNumber}
                                            onChange={e => setVerifySerialNumber(e.target.value)}
                                            placeholder="Scan or enter serial number"
                                            className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                        />
                                        {verifyingItem?.serialNumber && (
                                            <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Expected: {verifyingItem.serialNumber}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--on-surface-variant)' }}>Lot Number</label>
                                        <input
                                            type="text"
                                            value={verifyLotNumber}
                                            onChange={e => setVerifyLotNumber(e.target.value)}
                                            placeholder="Scan or enter lot number"
                                            className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                        />
                                        {verifyingItem?.lotNumber && (
                                            <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--on-surface-variant)' }}>Expected: {verifyingItem.lotNumber}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quantity verification for damaged/wrong items */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'wrong_item') && (
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--on-surface)' }}>Actual Quantity</label>
                                <input
                                    type="number"
                                    value={verifyActualQty}
                                    onChange={e => setVerifyActualQty(e.target.value)}
                                    placeholder={`Expected: ${verifyingItem.quantity}`}
                                    className="w-full px-3 py-2.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                />
                            </div>
                        )}

                        {/* Condition notes for damaged/wrong items */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'wrong_item') && (
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--on-surface)' }}>Condition Notes</label>
                                <textarea 
                                    rows={3} 
                                    placeholder="Describe the issue..." 
                                    value={verifyNotes} 
                                    onChange={e => setVerifyNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                />
                            </div>
                        )}

                        {/* FCR-52: Non-returnable reason for damaged/missing/wrong_item — required */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'missing' || verifyStatus === 'wrong_item') && (
                            <div className="p-4 rounded-[4px] border shadow-sm" style={{ borderColor: 'var(--error)', backgroundColor: 'var(--status-danger-bg)' }}>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                                    <label className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                                        Non-Returnable Reason <span style={{ color: 'var(--error)' }}>*</span>
                                    </label>
                                </div>
                                <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                                    This item will be marked as non-returnable. Please choose the reason from the list below.
                                </p>
                                <select
                                    value={nonReturnableReason}
                                    onChange={e => setNonReturnableReason(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] shadow-sm cursor-pointer"
                                    style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                >
                                    <option value="">— Select a reason —</option>
                                    {NON_RETURNABLE_REASONS.map(r => (
                                        <option key={r.id} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

{/* Policy Check & Routing */}
                        {verifyStatus === 'correct' && (
                            <div className="space-y-4 p-4 rounded-[4px] border shadow-sm" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--on-surface)' }}>Policy Check & Routing</h3>
                                    </div>
                                </div>

                                {isPolicyChecking ? (
                                    <p className="text-sm flex items-center gap-2 rounded-[4px] border px-3 py-2" style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                                        <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--secondary)' }} />
                                        Checking manufacturer return policy…
                                    </p>
                                ) : !verifyingItem.ndc || !verifyingItem.expirationDate ? (
                                    <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                        Missing NDC or expiration date, so policy could not run. Choose routing manually.
                                    </p>
                                ) : policyResult && policyResult.status !== 'tbd' ? (
                                    <div className="space-y-3">
                                        <div className="text-sm space-y-2">
                                            <p style={{ color: 'var(--on-surface)' }}>
                                                <span className="font-medium" style={{ color: 'var(--on-surface)' }}>Policy Status:</span>{' '}
                                                <span className="font-semibold capitalize" style={{
                                                    color: policyResult.status === 'returnable'
                                                        ? 'var(--secondary)'
                                                        : policyResult.status === 'non_returnable'
                                                            ? 'var(--error)'
                                                            : 'var(--status-warning)',
                                                }}>
                                                    {policyResult.status.replace('_', ' ')}
                                                </span>
                                            </p>
                                            {policyResult.destination && (
                                                <p style={{ color: 'var(--on-surface)' }}>
                                                    <span className="font-medium" style={{ color: 'var(--on-surface)' }}>Destination:</span>{' '}
                                                    {policyResult.destination}
                                                </p>
                                            )}
                                            {policyResult.expectedReturnableDate && (
                                                <p style={{ color: 'var(--on-surface)' }}>
                                                    <span className="font-medium" style={{ color: 'var(--on-surface)' }}>Expected Returnable:</span>{' '}
                                                    {policyResult.expectedReturnableDate}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <p
                                                className="text-sm rounded px-3 py-2 border flex-1"
                                                style={{
                                                    color: 'var(--on-surface)',
                                                    backgroundColor: 'var(--surface-container-lowest)',
                                                    borderColor: 'var(--outline-variant)',
                                                    borderLeftWidth: 4,
                                                    borderLeftStyle: 'solid',
                                                    borderLeftColor: 'var(--tertiary)',
                                                }}
                                            >
                                                🔒 Policy determined routing — cannot be changed
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={handleViewPolicy}
                                                className="text-sm underline font-medium whitespace-nowrap shrink-0"
                                                style={{ color: 'var(--secondary)' }}
                                            >
                                                View Policy
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                className="p-4 border-2 rounded-[4px]"
                                                style={
                                                    policyResult.status === 'returnable'
                                                        ? { borderColor: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' }
                                                        : { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }
                                                }
                                            >
                                                <input type="radio" checked={policyResult.status === 'returnable'} disabled className="mr-2 accent-[var(--secondary)]" />
                                                <span className="text-sm font-medium" style={{ color: policyResult.status === 'returnable' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                                                    ✓ Returnable
                                                </span>
                                            </div>
                                            <div
                                                className="p-4 border-2 rounded-[4px]"
                                                style={
                                                    policyResult.status === 'non_returnable'
                                                        ? { borderColor: 'var(--error)', backgroundColor: 'var(--status-danger-bg)' }
                                                        : { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }
                                                }
                                            >
                                                <input type="radio" checked={policyResult.status === 'non_returnable'} disabled className="mr-2 accent-[var(--error)]" />
                                                <span className="text-sm font-medium" style={{ color: policyResult.status === 'non_returnable' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>
                                                    ✗ Non-Returnable
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {policyResult.status === 'returnable' && policyResult.destination && (
                                            <div>
                                                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--on-surface)' }}>Destination (from policy)</label>
                                                <input
                                                    type="text"
                                                    value={policyResult.destination}
                                                    disabled
                                                    className="mt-2 w-full px-3 py-2 text-sm border rounded-[4px]"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                            {policyResult?.status === 'tbd' 
                                                ? 'Policy status is TBD. Please choose routing manually.' 
                                                : 'Policy check could not return a result. You can still choose routing manually.'
                                        }
                                        </p>
                                        
                                        {/* Manual routing selection */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <label
                                                className="flex items-center gap-2 p-4 border-2 rounded-[4px] cursor-pointer transition-colors border-[var(--outline-variant)] hover:border-[var(--outline-variant)]"
                                                style={
                                                    returnStatus === 'returnable'
                                                        ? { borderColor: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' }
                                                        : undefined
                                                }
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="return_status" 
                                                    value="returnable" 
                                                    checked={returnStatus === 'returnable'} 
                                                    onChange={() => {
                                                        setReturnStatus('returnable');
                                                        setDisposition('returnable');
                                                        fetchReverseDistributors();
                                                    }} 
                                                    className="accent-[var(--secondary)]"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                                                        <CheckCircle className="w-4 h-4 inline mr-1" style={{ color: 'var(--secondary)' }} />Returnable
                                                    </p>
                                                </div>
                                            </label>
                                            <label
                                                className="flex items-center gap-2 p-4 border-2 rounded-[4px] cursor-pointer transition-colors border-[var(--outline-variant)] hover:border-[var(--outline-variant)]"
                                                style={
                                                    returnStatus === 'non_returnable'
                                                        ? { borderColor: 'var(--error)', backgroundColor: 'var(--status-danger-bg)' }
                                                        : undefined
                                                }
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="return_status" 
                                                    value="non_returnable" 
                                                    checked={returnStatus === 'non_returnable'} 
                                                    onChange={() => {
                                                        setReturnStatus('non_returnable');
                                                        setDisposition(nonReturnableRoute);
                                                    }} 
                                                    className="accent-[var(--error)]"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                                                        <Ban className="w-4 h-4 inline mr-1" style={{ color: 'var(--error)' }} />Non-Returnable
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        {returnStatus === 'returnable' && (
                                            <div>
                                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>
                                                    Destination <span style={{ color: 'var(--error)' }}>*</span>
                                                </label>
                                                <select 
                                                    value={manualDestination} 
                                                    onChange={e => setManualDestination(e.target.value)} 
                                                    className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    style={{
                                                        borderColor: !manualDestination.trim() ? 'var(--error)' : 'var(--outline-variant)',
                                                        backgroundColor: !manualDestination.trim() ? 'var(--error-container)' : 'var(--surface-container-lowest)',
                                                        color: 'var(--on-surface)',
                                                    }}
                                                    disabled={loadingDistributors}
                                                >
                                                    <option value="">
                                                        {loadingDistributors ? 'Loading destinations...' : '— Select Destination —'}
                                                    </option>
                                                    {reverseDistributors.map(dist => (
                                                        <option key={dist.id} value={dist.name.toLowerCase()}>
                                                            {dist.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {!manualDestination.trim() && (
                                                    <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>Destination is required to save this item.</p>
                                                )}
                                            </div>
                                        )}

                                        {returnStatus === 'non_returnable' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>Non-Returnable Route</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <label
                                                            className="flex items-center gap-2 p-3 border-2 rounded-[4px] cursor-pointer"
                                                            style={{
                                                                borderColor: nonReturnableRoute === 'wine_cellar' ? 'var(--tertiary)' : 'var(--outline-variant)',
                                                                backgroundColor: 'var(--surface-container-lowest)',
                                                            }}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                checked={nonReturnableRoute === 'wine_cellar'} 
                                                                onChange={() => {
                                                                    setNonReturnableRoute('wine_cellar');
                                                                    setDisposition('wine_cellar');
                                                                    setNonReturnableReason('date');
                                                                }} 
                                                                className="shrink-0 accent-[var(--tertiary)]"
                                                                style={{ width: '1rem', height: '1rem' }}
                                                            />
                                                            <Archive className="w-4 h-4 shrink-0" style={{ color: nonReturnableRoute === 'wine_cellar' ? 'var(--tertiary)' : 'var(--on-surface-variant)' }} />
                                                            <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Wine Cellar</span>
                                                        </label>
                                                        <label
                                                            className="flex items-center gap-2 p-3 border-2 rounded-[4px] cursor-pointer"
                                                            style={
                                                                nonReturnableRoute === 'destruction'
                                                                    ? { borderColor: 'var(--error)', backgroundColor: 'var(--status-danger-bg)' }
                                                                    : { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }
                                                            }
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                checked={nonReturnableRoute === 'destruction'} 
                                                                onChange={() => {
                                                                    setNonReturnableRoute('destruction');
                                                                    setDisposition('destruction');
                                                                    if (nonReturnableReason === 'date') {
                                                                        setNonReturnableReason('');
                                                                    }
                                                                }} 
                                                                className="shrink-0 accent-[var(--error)]"
                                                                style={{ width: '1rem', height: '1rem' }}
                                                            />
                                                            <Ban className="w-4 h-4" style={{ color: 'var(--error)' }} />
                                                            <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Destruction</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>
                                                        Non-Returnable Reason <span style={{ color: 'var(--error)' }}>*</span>
                                                    </label>
                                                    {nonReturnableRoute === 'wine_cellar' ? (
                                                        <div className="p-3 rounded-[4px] border border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                                                            <p className="text-sm font-medium text-[var(--on-surface)]">
                                                                Wine Cellar items are automatically assigned reason: <strong>"Past Expiration Date"</strong>
                                                            </p>
                                                            <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                                                                This indicates the item is being shelved for future return when policy allows.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={nonReturnableReason}
                                                            onChange={e => setNonReturnableReason(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border rounded-[4px] bg-[var(--surface-container-lowest)] focus:outline-none focus:ring-2 focus:ring-[var(--error)]"
                                                            style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                                                        >
                                                            <option value="">— Select a reason —</option>
                                                            {NON_RETURNABLE_REASONS.map(r => (
                                                                <option key={r.id} value={r.value}>{r.label}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                {nonReturnableRoute === 'wine_cellar' && (
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>Expected Returnable Date *</label>
                                                        <input
                                                            type="date"
                                                            value={wineCellarDate}
                                                            onChange={e => setWineCellarDate(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {policyResult && policyResult.status === 'non_returnable' && (
                                    <div className="space-y-2 pt-2 border-t border-[var(--outline-variant)]">
                                        <label className="block text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                                            Non-Returnable Reason <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        {disposition === 'wine_cellar' ? (
                                            <div className="p-3 rounded-[4px] border border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                                                <p className="text-sm font-medium text-[var(--on-surface)]">
                                                    Wine Cellar routing uses reason: <strong>"Past Expiration Date"</strong>
                                                </p>
                                                <p className="text-xs text-[var(--on-surface-variant)] mt-1">
                                                    This is automatically set for wine cellar items based on policy determination.
                                                </p>
                                            </div>
                                        ) : (
                                            <select
                                                value={nonReturnableReason}
                                                onChange={e => setNonReturnableReason(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded-[4px] bg-[var(--surface-container-lowest)] focus:outline-none focus:ring-2 focus:ring-[var(--error)]"
                                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                                            >
                                                <option value="">— Select a reason —</option>
                                                {NON_RETURNABLE_REASONS.map(r => (
                                                    <option key={r.id} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="pt-1">
                            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--on-surface)' }}>Notes (optional)</label>
                            <textarea 
                                rows={3} 
                                value={verifyNotes} 
                                onChange={e => setVerifyNotes(e.target.value)}
                                placeholder="Any additional notes about this verification..."
                                className="w-full px-3 py-2.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                            />
                        </div>
                    </div>

                    <div className="border-t px-5 py-4 rounded-b-xl flex items-center justify-between gap-3" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <div className="flex flex-col gap-1">
                            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>* indicates required field</p>
                            {priceGateActive && (
                                <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Save the NDC price above to enable verification.
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2.5">
                            <button 
                                onClick={handleBack} 
                                className="px-4 py-2.5 text-sm font-semibold border rounded-[4px] hover:bg-[var(--surface-container-low)] transition-colors cursor-pointer"
                                style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={
                                    !verifyStatus
                                    || isActionLoading
                                    || priceLookupLoading
                                    || priceGateActive
                                    || (verifyStatus === 'correct' && isPolicyChecking)
                                    || (verifyStatus === 'correct' && returnStatus === 'non_returnable' && nonReturnableRoute === 'wine_cellar' && !wineCellarDate)
                                    || (verifyStatus === 'correct' && returnStatus === 'non_returnable' && nonReturnableRoute !== 'wine_cellar' && !isValidNonReturnableReason(nonReturnableReason))
                                    || ((verifyStatus === 'damaged' || verifyStatus === 'missing' || verifyStatus === 'wrong_item') && !isValidNonReturnableReason(nonReturnableReason))
                                    || (verifyStatus === 'correct' && returnStatus === 'returnable' && (!policyResult || policyResult.status === 'tbd') && !manualDestination.trim())
                                }
                                onClick={handleVerifyItem}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                            >
                                {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />} 
                                <CheckCircle className="w-4 h-4" />
                                Save & Return
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}