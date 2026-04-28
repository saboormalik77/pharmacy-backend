'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldAlert, X, Loader2, Archive, Ban } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    updateTransactionItem,
    moveItemToWineCellar,
    resolveTransactionItem,
} from '@/lib/store/returnTransactionsSlice';
import { verifyItemV2 } from '@/lib/store/warehouseSlice';
import { checkReturnability } from '@/lib/store/policiesSlice';
import type { VerificationV2Item, ReturnabilityCheckResult } from '@/lib/types';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import {
    NON_RETURNABLE_REASONS,
    isValidNonReturnableReason,
} from '@/lib/constants/nonReturnableReasons';

// Helper functions
const normalizeNdc = (ndc: string): string => ndc.replace(/\D/g, '');
const normalizeDateKey = (date?: string): string => date?.slice(0, 10) || '';

export default function VerifyItemPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    
    const returnId = params.id as string;
    const itemId = searchParams.get('itemId');
    const { v2Summary, isActionLoading } = useAppSelector(s => s.warehouse);
    
    // Find the item to verify
    const verifyingItem = v2Summary?.items?.find(item => item.id === itemId) || null;
    
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

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message: msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const handleBack = () => {
        router.push(`/warehouse/verification/${returnId}`);
    };

    // Set initial quantity when item loads
    useEffect(() => {
        if (verifyingItem && !verifyActualQty) {
            setVerifyActualQty(verifyingItem.quantity?.toString() || '');
        }
    }, [verifyingItem, verifyActualQty]);

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

        const result = await dispatch(verifyItemV2({ transactionId: returnId, itemId, ...body }));
        if (!verifyItemV2.fulfilled.match(result)) {
            showToast((result.payload as string) || 'Failed to verify item', 'error');
            return false;
        }
        return true;
    };

    const handleVerifyItem = async () => {
        if (!verifyStatus || !verifyingItem) return;

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
        
        // Navigate back to verification page after save
        router.push(`/warehouse/verification/${returnId}`);
    };

    const handleViewPolicy = () => {
        if (policyResult) {
            sessionStorage.setItem('policyResult', JSON.stringify(policyResult));
            router.push(`/warehouse/verification/${returnId}/policy`);
        }
    };

    if (!verifyingItem) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-2xl mx-auto">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500">Item not found</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Verification
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Verify Item</h1>
                            <p className="text-sm text-gray-500 font-medium">
                                {verifyingItem.proprietaryName || verifyingItem.genericName || 'Unknown Item'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Item Info */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><span className="font-medium text-gray-500">NDC:</span> <span className="font-mono text-gray-900">{verifyingItem.ndc || '—'}</span></div>
                            <div><span className="font-medium text-gray-500">Lot:</span> <span className="text-gray-900">{verifyingItem.lotNumber || '—'}</span></div>
                            <div><span className="font-medium text-gray-500">Expires:</span> <span className="text-gray-900">{verifyingItem.expirationDate || '—'}</span></div>
                            <div><span className="font-medium text-gray-500">Quantity:</span> <span className="text-gray-900">{verifyingItem.quantity}</span></div>
                            {verifyingItem.manufacturer && (
                                <div className="md:col-span-2"><span className="font-medium text-gray-500">Manufacturer:</span> <span className="text-gray-900">{verifyingItem.manufacturer}</span></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Verification Form */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 space-y-6">
                        {/* Verification Status */}
                        <div>
                            <label className="text-sm font-medium text-gray-900 mb-3 block">Verification Status</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { value: 'correct', label: 'Correct', color: 'green' },
                                    { value: 'damaged', label: 'Damaged', color: 'red' },
                                    { value: 'missing', label: 'Missing', color: 'gray' },
                                    { value: 'wrong_item', label: 'Wrong Item', color: 'orange' },
                                ].map(status => (
                                    <label key={status.value} className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                        verifyStatus === status.value 
                                            ? `border-${status.color}-400 bg-${status.color}-50` 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                        <input 
                                            type="radio" 
                                            name="verify_status" 
                                            value={status.value} 
                                            checked={verifyStatus === status.value} 
                                            onChange={() => setVerifyStatus(status.value)} 
                                            className={`text-${status.color}-600`} 
                                        />
                                        <span className={`text-sm font-medium ${
                                            verifyStatus === status.value ? `text-${status.color}-700` : 'text-gray-700'
                                        }`}>
                                            {status.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Quantity verification for damaged/wrong items */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'wrong_item') && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">Actual Quantity</label>
                                <input
                                    type="number"
                                    value={verifyActualQty}
                                    onChange={e => setVerifyActualQty(e.target.value)}
                                    placeholder={`Expected: ${verifyingItem.quantity}`}
                                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        )}

                        {/* Condition notes for damaged/wrong items */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'wrong_item') && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">Condition Notes</label>
                                <textarea 
                                    rows={3} 
                                    placeholder="Describe the issue..." 
                                    value={verifyNotes} 
                                    onChange={e => setVerifyNotes(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                />
                            </div>
                        )}

                        {/* FCR-52: Non-returnable reason for damaged/missing/wrong_item — required */}
                        {(verifyStatus === 'damaged' || verifyStatus === 'missing' || verifyStatus === 'wrong_item') && (
                            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                                <label className="block text-sm font-semibold text-red-800 mb-2">
                                    Non-Returnable Reason <span className="text-red-600">*</span>
                                </label>
                                <p className="text-xs text-red-700 mb-2">
                                    This item will be marked as non-returnable. Please choose the reason from the list below.
                                </p>
                                <select
                                    value={nonReturnableReason}
                                    onChange={e => setNonReturnableReason(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-red-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                            <div className="space-y-4 p-4 rounded-lg border border-primary-200 bg-primary-50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-primary-800">Policy Check & Routing</h3>
                                    {isPolicyChecking && <Loader2 className="w-5 h-5 animate-spin text-primary-600" />}
                                </div>

                                {!verifyingItem.ndc || !verifyingItem.expirationDate ? (
                                    <p className="text-sm text-amber-700">
                                        Missing NDC or expiration date, so policy could not run. Choose routing manually.
                                    </p>
                                ) : policyResult && policyResult.status !== 'tbd' ? (
                                    <div className="space-y-3">
                                        <div className="text-sm text-gray-700 space-y-2">
                                            <p>
                                                <span className="font-medium">Policy Status:</span>{' '}
                                                <span className={policyResult.status === 'returnable' ? 'text-green-700 font-semibold' : policyResult.status === 'non_returnable' ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>
                                                    {policyResult.status.replace('_', ' ')}
                                                </span>
                                            </p>
                                            {policyResult.destination && (
                                                <p><span className="font-medium">Destination:</span> {policyResult.destination}</p>
                                            )}
                                            {policyResult.expectedReturnableDate && (
                                                <p><span className="font-medium">Expected Returnable:</span> {policyResult.expectedReturnableDate}</p>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-amber-700 bg-amber-100 border border-amber-300 rounded px-3 py-2">
                                                🔒 Policy determined routing - cannot be changed
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={handleViewPolicy}
                                                className="text-sm text-primary-600 hover:text-primary-800 underline font-medium"
                                            >
                                                View Policy
                                            </button>
                                        </div>

                                        {/* Policy-locked routing display */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={`p-4 border-2 rounded-lg ${policyResult.status === 'returnable' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-100'}`}>
                                                <input type="radio" checked={policyResult.status === 'returnable'} disabled className="mr-2" />
                                                <span className={`text-sm font-medium ${policyResult.status === 'returnable' ? 'text-green-700' : 'text-gray-500'}`}>
                                                    ✓ Returnable
                                                </span>
                                            </div>
                                            <div className={`p-4 border-2 rounded-lg ${policyResult.status === 'non_returnable' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-100'}`}>
                                                <input type="radio" checked={policyResult.status === 'non_returnable'} disabled className="mr-2" />
                                                <span className={`text-sm font-medium ${policyResult.status === 'non_returnable' ? 'text-red-700' : 'text-gray-500'}`}>
                                                    ✗ Non-Returnable
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {policyResult.status === 'returnable' && policyResult.destination && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Destination (from policy)</label>
                                                <input
                                                    type="text"
                                                    value={policyResult.destination}
                                                    disabled
                                                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-100 text-gray-600"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600">
                                            {policyResult?.status === 'tbd' 
                                                ? 'Policy status is TBD. Please choose routing manually.' 
                                                : 'Policy check could not return a result. You can still choose routing manually.'
                                            }
                                        </p>
                                        
                                        {/* Manual routing selection */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className={`flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                                returnStatus === 'returnable' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}>
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
                                                    className="text-green-600 focus:ring-green-500" 
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-green-700">
                                                        <CheckCircle className="w-4 h-4 inline mr-1" />Returnable
                                                    </p>
                                                </div>
                                            </label>
                                            <label className={`flex items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                                returnStatus === 'non_returnable' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                            }`}>
                                                <input 
                                                    type="radio" 
                                                    name="return_status" 
                                                    value="non_returnable" 
                                                    checked={returnStatus === 'non_returnable'} 
                                                    onChange={() => {
                                                        setReturnStatus('non_returnable');
                                                        setDisposition(nonReturnableRoute);
                                                    }} 
                                                    className="text-red-600 focus:ring-red-500" 
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-red-700">
                                                        <Ban className="w-4 h-4 inline mr-1" />Non-Returnable
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        {returnStatus === 'returnable' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                                                <select 
                                                    value={manualDestination} 
                                                    onChange={e => setManualDestination(e.target.value)} 
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                                            </div>
                                        )}

                                        {returnStatus === 'non_returnable' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Non-Returnable Route</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                                                            nonReturnableRoute === 'wine_cellar' ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
                                                        }`}>
                                                            <input 
                                                                type="radio" 
                                                                checked={nonReturnableRoute === 'wine_cellar'} 
                                                                onChange={() => {
                                                                    setNonReturnableRoute('wine_cellar');
                                                                    setDisposition('wine_cellar');
                                                                    // Auto-set wine cellar reason
                                                                    setNonReturnableReason('date');
                                                                }} 
                                                            />
                                                            <Archive className="w-4 h-4 text-purple-600" />
                                                            <span className="text-sm font-medium text-purple-800">Wine Cellar</span>
                                                        </label>
                                                        <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                                                            nonReturnableRoute === 'destruction' ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                                        }`}>
                                                            <input 
                                                                type="radio" 
                                                                checked={nonReturnableRoute === 'destruction'} 
                                                                onChange={() => {
                                                                    setNonReturnableRoute('destruction');
                                                                    setDisposition('destruction');
                                                                    // Clear auto-set reason so user must choose
                                                                    if (nonReturnableReason === 'date') {
                                                                        setNonReturnableReason('');
                                                                    }
                                                                }} 
                                                            />
                                                            <Ban className="w-4 h-4 text-red-600" />
                                                            <span className="text-sm font-medium text-red-800">Destruction</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* FCR-52: Required reason dropdown */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Non-Returnable Reason <span className="text-red-600">*</span>
                                                    </label>
                                                    {nonReturnableRoute === 'wine_cellar' ? (
                                                        <div className="p-3 rounded-md border border-purple-200 bg-purple-50">
                                                            <p className="text-sm font-medium text-purple-800">
                                                                🍷 Wine Cellar items are automatically assigned reason: <strong>"Past Expiration Date"</strong>
                                                            </p>
                                                            <p className="text-xs text-purple-700 mt-1">
                                                                This indicates the item is being shelved for future return when policy allows.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={nonReturnableReason}
                                                            onChange={e => setNonReturnableReason(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Returnable Date *</label>
                                                        <input
                                                            type="date"
                                                            value={wineCellarDate}
                                                            onChange={e => setWineCellarDate(e.target.value)}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* FCR-52: Policy-locked routing — show reason
                                    dropdown so admin can confirm/override even
                                    in the policy path (it's required). */}
                                {policyResult && policyResult.status === 'non_returnable' && (
                                    <div className="space-y-2 pt-2 border-t border-primary-200">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Non-Returnable Reason <span className="text-red-600">*</span>
                                        </label>
                                        {disposition === 'wine_cellar' ? (
                                            <div className="p-3 rounded-md border border-purple-200 bg-purple-50">
                                                <p className="text-sm font-medium text-purple-800">
                                                    🍷 Wine Cellar routing uses reason: <strong>"Past Expiration Date"</strong>
                                                </p>
                                                <p className="text-xs text-purple-700 mt-1">
                                                    This is automatically set for wine cellar items based on policy determination.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={nonReturnableReason}
                                                    onChange={e => setNonReturnableReason(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                                >
                                                    <option value="">— Select a reason —</option>
                                                    {NON_RETURNABLE_REASONS.map(r => (
                                                        <option key={r.id} value={r.value}>{r.label}</option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500">
                                                    Pre-selected based on the policy result; please confirm or change before saving.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                            <textarea 
                                rows={3} 
                                value={verifyNotes} 
                                onChange={e => setVerifyNotes(e.target.value)}
                                placeholder="Any additional notes about this verification..."
                                className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleBack} 
                                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={
                                    !verifyStatus
                                    || isActionLoading
                                    || (verifyStatus === 'correct' && isPolicyChecking)
                                    || (verifyStatus === 'correct' && returnStatus === 'non_returnable' && nonReturnableRoute === 'wine_cellar' && !wineCellarDate)
                                    || (verifyStatus === 'correct' && returnStatus === 'non_returnable' && nonReturnableRoute !== 'wine_cellar' && !isValidNonReturnableReason(nonReturnableReason))
                                    || ((verifyStatus === 'damaged' || verifyStatus === 'missing' || verifyStatus === 'wrong_item') && !isValidNonReturnableReason(nonReturnableReason))
                                }
                                onClick={handleVerifyItem}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 flex items-center gap-2 transition"
                            >
                                {isActionLoading && <Loader2 className="w-4 h-4 animate-spin" />} 
                                Save & Return
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}