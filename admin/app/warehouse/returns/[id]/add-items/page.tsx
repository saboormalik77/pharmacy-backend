'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, ScanLine, Keyboard, CheckCircle,
    AlertTriangle, RotateCcw, X, Camera, Archive, ShieldCheck,
    FileText, Ban, Info, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useReturnEditProtection } from '@/hooks/useReturnLockStatus';
import {
    fetchReturnTransactionById,
    scanBarcode,
    addTransactionItem,
    deleteTransactionItem,
    fetchTransactionItems,
} from '@/lib/store/returnTransactionsSlice';
import { BarcodeScanResponse, ReturnabilityCheckResult, ReturnTransactionItem } from '@/lib/types';
import { apiClient } from '@/lib/api/apiClient';
import {
    NON_RETURNABLE_REASONS,
    isValidNonReturnableReason,
} from '@/lib/constants/nonReturnableReasons';

// Dynamically imported so it only loads in the browser (uses WebRTC APIs)
const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

// ── Constants ──────────────────────────────────────────────────

const RETURN_REASONS = [
    '', 'Expired', 'Short-dated', 'Damaged', 'Recalled', 'Overstock',
    'Discontinued', 'Wrong product', 'Formulary change', 'Other',
];

const DEA_SCHEDULE_OPTIONS = [
    '', 'CI', 'CII', 'CIII', 'CIV', 'CV', 'Non-Controlled'
];

const EMPTY_FORM = {
    ndc: '', ndc10: '', gtin: '', proprietaryName: '', genericName: '',
    manufacturer: '', packageDescription: '', dosageForm: '',
    strengthValue: '', strengthUnit: '',
    route: '', lotNumber: '', serialNumber: '', expirationDate: '',
    standardPrice: '', fullPackageSize: '',
    fullPackageQtyReturned: '', qtyMode: 'units' as 'units' | 'percent',
    returnStatus: 'tbd' as 'returnable' | 'non_returnable' | 'tbd',
    nonReturnableReason: '',
    deaSchedule: '', productType: '',
    returnReason: '', memo: '',
    scanSource: 'manual' as string,
    rawScanData: '',
};

type FormState = typeof EMPTY_FORM;

type ScannedPrices = {
    bestFullPrice: number | null;
    bestPartialPrice: number | null;
};

/** Splits a combined strength string like "500 mg" or "10 MG/ML" into value + unit. */
function parseStrength(strength: string): { value: string; unit: string } {
    if (!strength) return { value: '', unit: '' };
    const match = strength.trim().match(/^([\d.,/]+)\s*(.*)$/);
    if (match) return { value: match[1].trim(), unit: match[2].trim() };
    return { value: strength, unit: '' };
}

// ── Page ───────────────────────────────────────────────────────

export default function AddItemsPage() {
    const router = useRouter();
    const params = useParams();
    const transactionId = params.id as string;
    const dispatch = useAppDispatch();
    const { currentTransaction: tx, isScanLoading, isItemActionLoading, items } = useAppSelector(
        (state) => state.returnTransactions
    );

    // Return lock status protection
    const { canEdit, isLocked, checkActionAllowed } = useReturnEditProtection(transactionId);

    const scanInputRef = useRef<HTMLInputElement>(null);
    /** `${ndc}|${exp}|${dosage}` for last successful policy check — avoids duplicate fetch after scan vs effect */
    const policySyncKeyRef = useRef('');
    const policyCheckRequestIdRef = useRef(0);
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
    const [mode, setMode] = useState<'camera' | 'usb' | 'manual'>('camera');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [manualNdc, setManualNdc] = useState('');
    const [scanError, setScanError] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [itemCount, setItemCount] = useState(0);
    const [recentlyAddedItems, setRecentlyAddedItems] = useState<ReturnTransactionItem[]>([]);
    const [activeTab, setActiveTab] = useState<'list' | 'form'>('form');
    const [lastWarning, setLastWarning] = useState('');
    const [lastClassification, setLastClassification] = useState<{ item: string; status: string; policyCheck?: ReturnabilityCheckResult; wineCellarItem?: any } | null>(null);
    const [scannedPrices, setScannedPrices] = useState<ScannedPrices | null>(null);
    const [preCheckResult, setPreCheckResult] = useState<ReturnabilityCheckResult | null>(null);
    const [isPreChecking, setIsPreChecking] = useState(false);
    // Policy auto-detection state
    const [policyAutoCheck, setPolicyAutoCheck] = useState<ReturnabilityCheckResult | null>(null);
    const [isPolicyChecking, setIsPolicyChecking] = useState(false);
    const [policyModalOpen, setPolicyModalOpen] = useState(false);
    // Field-level validation errors
    const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
    // Track which fields came from QR scan (these should be uneditable)
    const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());
    // Expected returnable date for manual wine cellar move
    const [wineCellarDate, setWineCellarDate] = useState('');
    const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
    // Manual destination when no policy found
    const [manualDestination, setManualDestination] = useState('');
    const [reverseDistributors, setReverseDistributors] = useState<{ id: string; name: string; email: string }[]>([]);

    // Fetch reverse distributors once on mount for the manual destination dropdown
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.get<{ status: string; data: { id: string; name: string; email: string }[] }>(
                    '/admin/reverse-distributors', true
                );
                setReverseDistributors(res.data || []);
            } catch {
                // non-critical — dropdown stays empty
            }
        })();
    }, []);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (transactionId) {
            dispatch(fetchReturnTransactionById(transactionId));
            dispatch(fetchTransactionItems({ transactionId }));
        }
    }, [dispatch, transactionId]);

    useEffect(() => {
        if (items) {
            setRecentlyAddedItems(items);
            setItemCount(items.length);
        }
    }, [items]);

    useEffect(() => {
        if (mode === 'usb') scanInputRef.current?.focus();
    }, [mode]);

    const updateField = useCallback((field: keyof FormState, value: string | boolean | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setFormErrors(prev => { const next = new Set(prev); next.delete(field as string); return next; });
    }, []);

    const estimatedValue = (() => {
        const price = parseFloat(form.standardPrice) || 0;
        if (price <= 0) return 0;
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;

        if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) return price;

        const pct = form.qtyMode === 'units'
            ? Math.min(100, (qtyNum / pkgSize) * 100)
            : Math.min(100, qtyNum);

        return price * (pct / 100);
    })();

    /** Same rules as Est. Value, but list price is reduced by 30% first (matches DB `estimated_store_value`). */
    const estimatedStoreValue = (() => {
        const price = parseFloat(form.standardPrice) || 0;
        if (price <= 0) return 0;
        const storeBase = price * 0.70;
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;

        if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) {
            return Math.round(storeBase * 100) / 100;
        }

        const pct = form.qtyMode === 'units'
            ? Math.min(100, (qtyNum / pkgSize) * 100)
            : Math.min(100, qtyNum);

        return Math.round(storeBase * (pct / 100) * 100) / 100;
    })();

    // ── Barcode scan handler ───────────────────────────────────

    const deriveIsPartial = useCallback((): boolean => {
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
        if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) return false;
        const units = form.qtyMode === 'units' ? qtyNum : (qtyNum / 100) * pkgSize;
        return units < pkgSize;
    }, [form.fullPackageSize, form.fullPackageQtyReturned, form.qtyMode]);

    /*
     * Policy checks are intentionally disabled on processor add-items flow.
     * Warehouse verification in MainAdmin now owns policy/wine-cellar/destruction routing.
     */
    const runPolicyCheck = async (_ndc: string, _expirationDate: string, _dosageForm?: string) => {
        setIsPolicyChecking(false);
        setPolicyAutoCheck(null);
        setPreCheckResult(null);
        policySyncKeyRef.current = '';
        return null;
    };

    const handleScan = async (raw: string) => {
        if (!raw.trim() || isScanLoading) return;

        // Check if return is locked
        if (!checkActionAllowed('scan items')) {
            return;
        }
        
        setScanError('');
        setLastWarning('');
        setPreCheckResult(null);
        setIsPreChecking(false);
        setPolicyAutoCheck(null);
        policySyncKeyRef.current = '';
        setManualDestination('');

        const result = await dispatch(scanBarcode(raw.trim()));

        if (scanBarcode.fulfilled.match(result)) {
            const data = result.payload as BarcodeScanResponse;
            const af = data.autoFill;
            const nextScannedPrices: ScannedPrices = {
                bestFullPrice: data.pricing.bestFullPrice,
                bestPartialPrice: data.pricing.bestPartialPrice,
            };

            setScannedPrices(nextScannedPrices);

            const parsedStrength = parseStrength(af.strength || '');
            const bestPrice = data.pricing.bestFullPrice ?? data.pricing.bestPartialPrice;

            // Build the new form (status will be updated by policy check below)
            const newForm: FormState = {
                ndc: af.ndc || '',
                ndc10: af.ndc10 || '',
                gtin: af.gtin || '',
                proprietaryName: af.proprietaryName || '',
                genericName: af.genericName || '',
                manufacturer: af.manufacturer || '',
                packageDescription: af.packageDescription || '',
                dosageForm: af.dosageForm || '',
                strengthValue: parsedStrength.value,
                strengthUnit: parsedStrength.unit,
                route: af.route || '',
                lotNumber: af.lotNumber || '',
                serialNumber: af.serialNumber || '',
                expirationDate: af.expirationDate || '',
                standardPrice: bestPrice != null ? String(bestPrice) : '',
                fullPackageSize: af.fullPackageSize ? String(af.fullPackageSize) : '',
                fullPackageQtyReturned: '',
                qtyMode: 'units',
                returnStatus: 'tbd',
                nonReturnableReason: '',
                deaSchedule: af.deaSchedule || '',
                productType: af.productType || '',
                returnReason: '',
                memo: '',
                scanSource: af.scanSource || 'gs1_qr',
                rawScanData: raw.trim(),
            };
            // Duplicate check: block if NDC + Serial Number already exist in this return
            if (newForm.ndc && newForm.serialNumber) {
                const isDuplicate = recentlyAddedItems.some(
                    item =>
                        item.ndc === newForm.ndc &&
                        item.serialNumber === newForm.serialNumber
                );
                if (isDuplicate) {
                    setScanError(
                        `Duplicate item! NDC "${newForm.ndc}" with serial number "${newForm.serialNumber}" has already been added to this return.`
                    );
                    setScanInput('');
                    return;
                }
            }

            setForm(newForm);

            // Track which fields came from QR scan to make them uneditable
            const fieldsFromScan = new Set<string>();
            if (af.ndc) fieldsFromScan.add('ndc');
            if (af.ndc10) fieldsFromScan.add('ndc10');
            if (af.gtin) fieldsFromScan.add('gtin');
            if (af.proprietaryName) fieldsFromScan.add('proprietaryName');
            if (af.genericName) fieldsFromScan.add('genericName');
            if (af.manufacturer) fieldsFromScan.add('manufacturer');
            if (af.packageDescription) fieldsFromScan.add('packageDescription');
            if (af.dosageForm) fieldsFromScan.add('dosageForm');
            if (af.strength) { fieldsFromScan.add('strengthValue'); fieldsFromScan.add('strengthUnit'); }
            if (af.route) fieldsFromScan.add('route');
            if (af.lotNumber) fieldsFromScan.add('lotNumber');
            if (af.serialNumber) fieldsFromScan.add('serialNumber');
            if (af.expirationDate) fieldsFromScan.add('expirationDate');
            if (af.fullPackageSize) fieldsFromScan.add('fullPackageSize');
            if (af.deaSchedule) fieldsFromScan.add('deaSchedule');
            if (af.productType) fieldsFromScan.add('productType');
            setScannedFields(fieldsFromScan);

            if (!data.product) {
                setScanError('Barcode parsed but product not found in database. Fields partially filled — please complete manually.');
            }

            setScanInput('');

            // Policy check runs via useEffect when NDC + expiration are set (covers manual expiry edits too)
        } else {
            setScannedPrices(null);
            setScanError(result.payload as string || 'Scan failed. Try manual entry.');
            setScanInput('');
        }
    };

    // Called by QrScannerModal after a successful camera scan
    const handleCameraScan = useCallback((raw: string) => {
        setCameraOpen(false);
        handleScan(raw);
    // handleScan is stable (dispatch is stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!isScanLoading) void handleScan(scanInput);
        }
    };

    const handleManualLookup = () => {
        if (!manualNdc.trim() || isScanLoading) return;
        void handleScan(manualNdc.trim());
        // Keep manual NDC visible after Lookup (do not clear — user may retry or adjust)
    };

    // ── Validation ─────────────────────────────────────────────

    const validateForm = (): boolean => {
        const errors = new Set<string>();
        if (!form.ndc.trim()) errors.add('ndc');
        if (!form.proprietaryName.trim() && !form.genericName.trim()) {
            errors.add('proprietaryName');
            errors.add('genericName');
        }
        if (!form.manufacturer.trim()) errors.add('manufacturer');
        if (!form.lotNumber.trim()) errors.add('lotNumber');
        if (!form.expirationDate.trim()) errors.add('expirationDate');
        setFormErrors(errors);
        if (errors.size > 0) {
            const missing: string[] = [];
            if (errors.has('ndc')) missing.push('NDC');
            if (errors.has('proprietaryName')) missing.push('Drug Name (Proprietary or Generic)');
            if (errors.has('manufacturer')) missing.push('Manufacturer');
            if (errors.has('lotNumber')) missing.push('Lot Number');
            if (errors.has('expirationDate')) missing.push('Expiration Date');
            showToast(`Please fill in required fields: ${missing.join(', ')}.`, 'error');
            return false;
        }
        return true;
    };

    /** Converts raw API / DB error strings into user-friendly messages. */
    const friendlyError = (raw: string): string => {
        if (!raw) return 'Failed to save item. Please try again.';
        const r = raw.toLowerCase();
        if (r.includes('not-null') || r.includes('null value') || r.includes('violates not-null'))
            return 'A required field is missing. Please check all required fields and try again.';
        if (r.includes('duplicate') || r.includes('unique') || r.includes('already exists'))
            return 'This item has already been added to this return.';
        if (r.includes('invalid input syntax') || r.includes('invalid date'))
            return 'One of the fields contains an invalid value. Please check the form and try again.';
        if (r.includes('foreign key') || r.includes('not present in table'))
            return 'A referenced record was not found. Please refresh and try again.';
        if (r.includes('network') || r.includes('fetch') || r.includes('timeout'))
            return 'Network error. Please check your connection and try again.';
        if (r.includes('unauthorized') || r.includes('403') || r.includes('401'))
            return 'You are not authorized to perform this action. Please log in again.';
        return 'Failed to save item. Please try again.';
    };

    // ── Save item ──────────────────────────────────────────────

    const handleSave = async (_skipWineCellarCheck = false) => {
        if (!validateForm()) return;
        
        // Check if return is locked
        if (!checkActionAllowed('add items')) {
            return;
        }

        // FCR-52: Reason is required when explicitly adding as non_returnable
        if (form.returnStatus === 'non_returnable' && !isValidNonReturnableReason(form.nonReturnableReason)) {
            showToast('Please select a non-returnable reason for this item.', 'error');
            return;
        }

        // ── Compute quantity / partial from the new Qty Returned field ──
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyInput = parseFloat(form.fullPackageQtyReturned) || 0;

        // Validate quantity does not exceed full package size
        if (pkgSize > 0 && form.fullPackageQtyReturned.trim() && qtyInput > 0) {
            if (form.qtyMode === 'units' && qtyInput > pkgSize) {
                showToast(`Quantity returned (${qtyInput}) cannot exceed full package size (${pkgSize})`, 'error');
                return;
            }
            if (form.qtyMode === 'percent' && qtyInput > 100) {
                showToast('Percentage returned cannot exceed 100%', 'error');
                return;
            }
        }

        let payloadQuantity = 1;
        let payloadIsPartial = false;
        let payloadPartialPercentage: number | null = null;

        if (form.fullPackageQtyReturned.trim() && qtyInput > 0) {
            if (pkgSize > 0) {
                let unitsReturned: number;
                let pctReturned: number;
                if (form.qtyMode === 'units') {
                    unitsReturned = qtyInput;
                    pctReturned = (unitsReturned / pkgSize) * 100;
                } else {
                    pctReturned = qtyInput;
                    unitsReturned = (pctReturned / 100) * pkgSize;
                }
                if (unitsReturned >= pkgSize || pctReturned >= 100) {
                    payloadQuantity = 1;
                    payloadIsPartial = false;
                } else {
                    payloadQuantity = 1;
                    payloadIsPartial = true;
                    payloadPartialPercentage = Math.min(100, Math.max(1, pctReturned));
                }
            } else {
                // No package size — treat input as unit count, assume full
                payloadQuantity = Math.round(qtyInput) || 1;
                payloadIsPartial = false;
            }
        }

        const payload: Record<string, any> = {};
        if (form.ndc) payload.ndc = form.ndc;
        if (form.ndc10) payload.ndc10 = form.ndc10;
        if (form.gtin) payload.gtin = form.gtin;
        if (form.proprietaryName) payload.proprietaryName = form.proprietaryName;
        if (form.genericName) payload.genericName = form.genericName;
        if (form.manufacturer) payload.manufacturer = form.manufacturer;
        if (form.packageDescription) payload.packageDescription = form.packageDescription;
        if (form.dosageForm) payload.dosageForm = form.dosageForm;
        const strengthCombined = [form.strengthValue, form.strengthUnit].filter(Boolean).join(' ');
        if (strengthCombined) payload.strength = strengthCombined;
        if (form.route) payload.route = form.route;
        if (form.lotNumber) payload.lotNumber = form.lotNumber;
        if (form.serialNumber) payload.serialNumber = form.serialNumber;
        if (form.expirationDate) payload.expirationDate = form.expirationDate;
        if (form.standardPrice) payload.standardPrice = parseFloat(form.standardPrice);
        payload.quantity = payloadQuantity;
        if (form.fullPackageSize) payload.fullPackageSize = parseInt(form.fullPackageSize);
        if (form.fullPackageQtyReturned && parseFloat(form.fullPackageQtyReturned) > 0) payload.fullPackageQtyReturned = parseInt(form.fullPackageQtyReturned);
        payload.isPartial = payloadIsPartial;
        if (payloadIsPartial && payloadPartialPercentage != null) payload.partialPercentage = payloadPartialPercentage;
        payload.returnStatus = form.returnStatus;
        if (form.returnStatus === 'non_returnable' && form.nonReturnableReason) {
            payload.nonReturnableReason = form.nonReturnableReason;
        }
        if (form.returnReason) payload.returnReason = form.returnReason;
        if (form.deaSchedule) payload.deaSchedule = form.deaSchedule;
        // Automatically set deaForm222Required for Schedule II items
        if (form.deaSchedule === 'CII') payload.deaForm222Required = true;
        if (form.productType) payload.productType = form.productType;
        if (form.memo) payload.memo = form.memo;
        payload.scanSource = form.scanSource;
        if (form.rawScanData) payload.rawScanData = form.rawScanData;

        const result = await dispatch(addTransactionItem({ transactionId, payload }));

        if (addTransactionItem.fulfilled.match(result)) {
            const name = form.proprietaryName || form.ndc || 'Item';
            const savedItem = result.payload.item;
            if (savedItem) {
                setActiveTab('list');
            }

            showToast(`${name} saved! Ready for next scan.`);

            if (result.payload.warning) {
                setLastWarning(result.payload.warning);
            } else {
                setLastWarning('');
            }

            setLastClassification({
                item: name,
                status: savedItem?.returnStatus || form.returnStatus,
                policyCheck: undefined,
                wineCellarItem: undefined,
            });

            setForm({ ...EMPTY_FORM });
            setFormErrors(new Set());
            setScannedFields(new Set());
            setManualDestination('');
            setNonReturnableRoute('destruction');
            setScannedPrices(null);
            setScanError('');
            setScanInput('');
            setPreCheckResult(null);
            setPolicyAutoCheck(null);
            setIsPolicyChecking(false);
            setPolicyModalOpen(false);
            if (mode === 'usb') scanInputRef.current?.focus();
        } else {
            showToast(friendlyError(result.payload as string), 'error');
        }
    };

    // ── Manual Wine Cellar move (no policy + user selected non-returnable) ──
    // Calls POST /api/admin/wine-cellar directly — does NOT touch return items table.

    const handleMoveToWineCellarManual = async () => {
        showToast('Wine cellar routing is now handled by warehouse verification.', 'warning');
    };

    const handleClearForm = () => {
        setForm({ ...EMPTY_FORM });
        setFormErrors(new Set());
        setScannedFields(new Set());
        setWineCellarDate('');
        setManualDestination('');
        setNonReturnableRoute('destruction');
        setScannedPrices(null);
        setScanError('');
        setLastWarning('');
        setLastClassification(null);
        setPreCheckResult(null);
        setIsPreChecking(false);
        setPolicyAutoCheck(null);
        setIsPolicyChecking(false);
        setPolicyModalOpen(false);
        if (mode === 'usb') scanInputRef.current?.focus();
    };

    const handleRemoveRecentItem = async (itemId: string) => {
        if (!checkActionAllowed('remove item')) {
            return;
        }

        const result = await dispatch(deleteTransactionItem({ transactionId, itemId }));
        if (deleteTransactionItem.fulfilled.match(result)) {
            showToast('Item removed successfully', 'success');
        } else {
            showToast('Failed to remove item. Please try again.', 'error');
        }
    };

    // ── Render ─────────────────────────────────────────────────

    if (!tx) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    /** While barcode/NDC lookup API runs — lock scan inputs + product form */
    const scanFetching = isScanLoading;

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Lock Status Warning */}
            {isLocked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-[4px] p-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Return is Locked</p>
                            <p className="text-xs text-yellow-700">This return cannot be modified after finalization to prevent data discrepancies.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera QR Scanner Modal */}
            {cameraOpen && (
                <QrScannerModal
                    onScan={handleCameraScan}
                    onClose={() => setCameraOpen(false)}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.push(`/warehouse/returns/${transactionId}`)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Return
                    </button>
                    <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 text-primary-600" /> Adding Products
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span className="font-mono font-semibold text-gray-800">{tx.licensePlate}</span>
                        <span>·</span>
                        <span>{tx.pharmacyName}</span>
                        {itemCount > 0 && (
                            <>
                                <span>·</span>
                                <Badge variant="success"><span className="text-[10px]">{itemCount} added</span></Badge>
                            </>
                        )}
                    </div>
                </div>
                <button onClick={() => router.push(`/warehouse/returns/${transactionId}`)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                    Done Adding
                </button>
            </div>

            {/* Tabs - Only show when items exist */}
            {recentlyAddedItems.length > 0 && (
                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 ${
                            activeTab === 'list'
                                ? 'border-primary-600 text-primary-700 bg-primary-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Products ({recentlyAddedItems.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 ${
                            activeTab === 'form'
                                ? 'border-primary-600 text-primary-700 bg-primary-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5" />
                            Scan &amp; Add
                        </div>
                    </button>
                </div>
            )}

            {/* Tab Content: Product List */}
            {activeTab === 'list' && recentlyAddedItems.length > 0 && (
                <div className="bg-white rounded-[4px] shadow px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-semibold text-gray-700">Products Added in This Session</h2>
                        <p className="text-[10px] text-gray-500">{recentlyAddedItems.length} item{recentlyAddedItems.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {recentlyAddedItems.map((item) => (
                            <div key={item.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-[4px] hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {item.proprietaryName || item.genericName || 'Unknown Product'}
                                        </p>
                                        <Badge variant={
                                            item.returnStatus === 'returnable' ? 'success' : 
                                            item.returnStatus === 'non_returnable' ? 'danger' : 
                                            'warning'
                                        }>
                                            <span className="text-[10px]">
                                                {item.returnStatus === 'tbd' ? 'TBD' : 
                                                 item.returnStatus === 'returnable' ? 'Returnable' : 
                                                 'Non-Returnable'}
                                            </span>
                                        </Badge>
                                        {item.isPartial && (
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-semibold">
                                                Partial {item.partialPercentage}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                                        <div><span className="text-gray-500">NDC:</span> <span className="font-semibold text-gray-900 font-mono">{item.ndc || '—'}</span></div>
                                        <div><span className="text-gray-500">Lot:</span> <span className="font-medium text-gray-800">{item.lotNumber || '—'}</span></div>
                                        <div><span className="text-gray-500">Exp:</span> <span className="font-medium text-gray-800">{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '—'}</span></div>
                                        <div><span className="text-gray-500">Serial Number:</span> <span className="font-bold text-gray-600">{item.serialNumber || '0.00'}</span></div>
                                        {item.manufacturer && (
                                            <div className="col-span-2"><span className="text-gray-500">Manufacturer:</span> <span className="font-medium text-gray-800">{item.manufacturer}</span></div>
                                        )}
                                        {item.destination && (
                                            <div className="col-span-2"><span className="text-gray-500">Destination:</span> <span className="font-medium text-gray-800 capitalize">{item.destination}</span></div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveRecentItem(item.id)}
                                    disabled={isItemActionLoading}
                                    className="flex-shrink-0 p-2 rounded border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Remove this item"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Content: Scan & Add Form */}
            {(activeTab === 'form' || recentlyAddedItems.length === 0) && (
                <>
            {/* Scan / Manual Toggle */}
            <div className="bg-white rounded-[4px] shadow px-4 py-3">
                {/* Mode tabs */}
                <div className="flex gap-1.5 mb-3">
                    {([
                        { key: 'camera', icon: Camera,   label: 'Camera QR' },
                        { key: 'usb',    icon: ScanLine,  label: 'USB Scanner' },
                        { key: 'manual', icon: Keyboard,  label: 'Manual NDC' },
                    ] as const).map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMode(key)}
                            disabled={scanFetching || !canEdit}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                mode === key
                                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                    ))}
                </div>

                {/* ── Camera mode ───────────────────────────── */}
                {mode === 'camera' && (
                    <div>
                        <button
                            onClick={() => {
                                if (checkActionAllowed('scan with camera')) {
                                    setCameraOpen(true);
                                }
                            }}
                            disabled={scanFetching || !canEdit}
                            className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-dashed rounded transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                !canEdit 
                                    ? 'border-gray-300 bg-gray-100 text-gray-400' 
                                    : 'border-primary-300 bg-primary-50 hover:bg-primary-100 hover:border-primary-400'
                            }`}
                        >
                            {scanFetching ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" />
                                    <span className="text-xs font-medium text-primary-600">Looking up product...</span>
                                </>
                            ) : (
                                <>
                                    <Camera className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-primary-700">Open Camera Scanner</span>
                                    <span className="text-[10px] text-primary-400">— tap to scan QR / barcode</span>
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">Works with QR codes, GS1 barcodes, and standard barcodes</p>
                    </div>
                )}

                {/* ── USB Scanner mode ──────────────────────── */}
                {mode === 'usb' && (
                    <div>
                        <div className="relative">
                            <ScanLine className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScanKeyDown}
                                disabled={!canEdit || scanFetching}
                                placeholder={!canEdit ? "Return is locked - cannot scan items" : "Scan with USB/Bluetooth scanner — press Enter after scan"}
                                className={`w-full pl-8 pr-8 py-2 text-xs border-2 rounded focus:outline-none focus:ring-2 ${
                                    !canEdit 
                                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'border-primary-300 bg-primary-50 focus:ring-slate-500 focus:border-primary-500'
                                }`}
                                autoFocus={canEdit}
                            />
                            {scanFetching && (
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Connect USB or Bluetooth barcode scanner — types code automatically and sends Enter.</p>
                    </div>
                )}

                {/* ── Manual NDC mode ───────────────────────── */}
                {mode === 'manual' && (
                    <div>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={manualNdc}
                                onChange={e => setManualNdc(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && canEdit && !scanFetching) handleManualLookup();
                                }}
                                disabled={!canEdit || scanFetching}
                                placeholder={!canEdit ? "Return is locked - cannot add items" : "Enter NDC (e.g. 43547-3250-06) and press Enter or Lookup..."}
                                className={`flex-1 px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 ${
                                    !canEdit 
                                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'border-gray-300 focus:ring-slate-500'
                                }`}
                                autoFocus={canEdit}
                            />
                            <button onClick={() => {
                                if (checkActionAllowed('lookup NDC')) {
                                    handleManualLookup();
                                }
                            }} disabled={scanFetching || !manualNdc.trim() || !canEdit} className="px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {scanFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Enter the full NDC from the bottle label (e.g. <span className="font-mono">43547-3250-06</span>).</p>
                    </div>
                )}

                {/* Scan error */}
                {scanError && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}
                {lastWarning && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{lastWarning}</span>
                    </div>
                )}
            </div>

            {/* Classification Result (after save) */}
            {/* {lastClassification && (
                <div className={`rounded-[4px] border px-3 py-2 ${
                    lastClassification.wineCellarItem ? 'bg-purple-50 border-purple-300' :
                    lastClassification.status === 'returnable' ? 'bg-green-50 border-green-300' :
                    lastClassification.status === 'non_returnable' ? 'bg-red-50 border-red-300' :
                    'bg-yellow-50 border-yellow-300'
                }`}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                lastClassification.wineCellarItem ? 'bg-purple-200' :
                                lastClassification.status === 'returnable' ? 'bg-green-200' :
                                lastClassification.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                            }`}>
                                {lastClassification.wineCellarItem ? <Archive className="w-3.5 h-3.5 text-purple-700" /> :
                                 lastClassification.status === 'returnable' ? <CheckCircle className="w-3.5 h-3.5 text-green-700" /> :
                                 lastClassification.status === 'non_returnable' ? <X className="w-3.5 h-3.5 text-red-700" /> :
                                 <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" />}
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${
                                    lastClassification.wineCellarItem ? 'text-purple-800' :
                                    lastClassification.status === 'returnable' ? 'text-green-800' :
                                    lastClassification.status === 'non_returnable' ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                    {lastClassification.item} — {
                                        lastClassification.wineCellarItem ? 'MOVED TO WINE CELLAR' :
                                        lastClassification.status === 'returnable' ? 'RETURNABLE' :
                                        lastClassification.status === 'non_returnable' ? 'NON-RETURNABLE' : 'TBD (Needs Research)'
                                    }
                                </p>
                                {lastClassification.wineCellarItem && (
                                    <div className="mt-0.5 text-[10px] space-y-0.5 text-purple-700">
                                        <p className="font-medium">✓ Shelved in Wine Cellar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setLastClassification(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )} */}

            {/* Product Form */}
            <div className="bg-white rounded-[4px] shadow px-4 py-3">
                <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Product Information</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    <Field label="NDC" value={form.ndc} onChange={v => updateField('ndc', v)} placeholder="e.g. 43547-3250-06" required hasError={formErrors.has('ndc')} readOnly={scannedFields.has('ndc')} disabled={scanFetching} />
                    <Field label="Proprietary Name" value={form.proprietaryName} onChange={v => updateField('proprietaryName', v)} placeholder="Brand name" required hasError={formErrors.has('proprietaryName')} readOnly={scannedFields.has('proprietaryName')} disabled={scanFetching} />
                    <Field label="Generic Name" value={form.genericName} onChange={v => updateField('genericName', v)} placeholder="Generic name" hasError={formErrors.has('genericName')} readOnly={scannedFields.has('genericName')} disabled={scanFetching} />
                    <Field label="Manufacturer" value={form.manufacturer} onChange={v => updateField('manufacturer', v)} placeholder="Manufacturer" required hasError={formErrors.has('manufacturer')} readOnly={scannedFields.has('manufacturer')} disabled={scanFetching} />
                    <Field label="Package Description" value={form.packageDescription} onChange={v => updateField('packageDescription', v)} placeholder="e.g. 60 TABLET in BOTTLE" readOnly={scannedFields.has('packageDescription')} disabled={scanFetching} />
                    <Field label="Dosage Form" value={form.dosageForm} onChange={v => updateField('dosageForm', v)} placeholder="e.g. TABLET" readOnly={scannedFields.has('dosageForm')} disabled={scanFetching} />

                    {/* Strength */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                            Strength
                            {(scannedFields.has('strengthValue') || scannedFields.has('strengthUnit')) && <span className="text-gray-400 ml-1 text-[9px]">(scanned)</span>}
                        </label>
                        <div className="flex gap-1">
                            <input 
                                type="text" 
                                value={form.strengthValue} 
                                onChange={e => !scannedFields.has('strengthValue') && !scanFetching && updateField('strengthValue', e.target.value)} 
                                placeholder="500" 
                                disabled={scanFetching}
                                readOnly={scannedFields.has('strengthValue')}
                                className={`w-1/2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                    scanFetching || scannedFields.has('strengthValue') 
                                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                                        : 'border-gray-300 focus:ring-slate-500'
                                }`} 
                            />
                            <input 
                                type="text" 
                                value={form.strengthUnit} 
                                onChange={e => !scannedFields.has('strengthUnit') && !scanFetching && updateField('strengthUnit', e.target.value)} 
                                placeholder="mg" 
                                disabled={scanFetching}
                                readOnly={scannedFields.has('strengthUnit')}
                                className={`w-1/2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                    scanFetching || scannedFields.has('strengthUnit') 
                                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                                        : 'border-gray-300 focus:ring-slate-500'
                                }`} 
                            />
                        </div>
                    </div>

                    <Field label="Route" value={form.route} onChange={v => updateField('route', v)} placeholder="e.g. ORAL" readOnly={scannedFields.has('route')} disabled={scanFetching} />
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    DEA Schedule
                                    {scannedFields.has('deaSchedule') && <span className="text-gray-400 ml-1 text-[9px]">(scanned)</span>}
                                </label>
                                <select
                                    value={form.deaSchedule}
                                    onChange={e => !scannedFields.has('deaSchedule') && !scanFetching && updateField('deaSchedule', e.target.value)}
                                    disabled={scanFetching || scannedFields.has('deaSchedule')}
                                    className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                        scanFetching || scannedFields.has('deaSchedule')
                                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`}
                                >
                                    {DEA_SCHEDULE_OPTIONS.map(option => (
                                        <option key={option} value={option}>
                                            {option || '— Select DEA Schedule —'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                    <Field label="Lot Number" value={form.lotNumber} onChange={v => updateField('lotNumber', v)} placeholder="Lot #" required hasError={formErrors.has('lotNumber')} readOnly={scannedFields.has('lotNumber')} disabled={scanFetching} />
                    <Field label="Serial Number" value={form.serialNumber} onChange={v => updateField('serialNumber', v)} placeholder="Serial #" readOnly={scannedFields.has('serialNumber')} disabled={scanFetching} />
                    <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                            Expiration Date<span className="text-red-500 ml-0.5">*</span>
                            {scannedFields.has('expirationDate') && <span className="text-gray-400 ml-1 text-[9px]">(scanned)</span>}
                        </label>
                        <input
                            type="date"
                            value={form.expirationDate}
                            onChange={e => { if (!scannedFields.has('expirationDate') && !scanFetching) updateField('expirationDate', e.target.value); }}
                            disabled={scanFetching}
                            readOnly={scannedFields.has('expirationDate')}
                            className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                formErrors.has('expirationDate')
                                    ? 'border-red-400 bg-red-50 focus:ring-red-400'
                                    : scanFetching || scannedFields.has('expirationDate')
                                    ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                    : 'border-gray-300 focus:ring-slate-500'
                            }`}
                        />
                        {formErrors.has('expirationDate') && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                    </div>
                </div>

                <hr className="my-3 border-gray-100" />
                <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity Pricing</h2>

                {(() => {
                    const pkgSize = parseFloat(form.fullPackageSize) || 0;
                    const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
                    let isPartialDerived = false;
                    let pctDerived = 0;
                    let unitsDerived = 0;
                    if (form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0) {
                        if (form.qtyMode === 'units') { unitsDerived = qtyNum; pctDerived = (qtyNum / pkgSize) * 100; }
                        else { pctDerived = qtyNum; unitsDerived = (pctDerived / 100) * pkgSize; }
                        isPartialDerived = unitsDerived < pkgSize && pctDerived < 100;
                    }
                    return (
                        <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {/* <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Price ($)</label>
                                <input type="number" step="0.01" min="0" value={form.standardPrice} onChange={e => updateField('standardPrice', e.target.value)} placeholder="0.00" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
                            </div> */}
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    Pkg Size
                                    {scannedFields.has('fullPackageSize') && <span className="text-gray-400 ml-1 text-[9px]">(scanned)</span>}
                                </label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={form.fullPackageSize} 
                                    onChange={e => !scannedFields.has('fullPackageSize') && !scanFetching && updateField('fullPackageSize', e.target.value)} 
                                    placeholder="e.g. 60" 
                                    disabled={scanFetching}
                                    readOnly={scannedFields.has('fullPackageSize')}
                                    className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                        scanFetching || scannedFields.has('fullPackageSize')
                                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-300 focus:ring-slate-500'
                                    }`} 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    Qty Returned <span className="text-gray-400">({form.qtyMode === 'units' ? 'units' : '%'})</span>
                                </label>
                                <div className="flex gap-1">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        step="any" 
                                        value={form.fullPackageQtyReturned} 
                                        onChange={e => {
                                            if (scanFetching) return;
                                            const value = e.target.value;
                                            const numValue = parseFloat(value);
                                            const maxAllowed = form.qtyMode === 'units' ? pkgSize : 100;
                                            
                                            // Allow empty value or values within limits
                                            if (value === '' || (numValue >= 0 && numValue <= maxAllowed)) {
                                                updateField('fullPackageQtyReturned', value);
                                            }
                                        }}
                                        placeholder={form.qtyMode === 'units' ? '45' : '75'} 
                                        disabled={scanFetching}
                                        className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${scanFetching ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' : 'border-gray-300'}`} 
                                    />
                                    <button type="button" onClick={() => !scanFetching && updateField('qtyMode', form.qtyMode === 'units' ? 'percent' : 'units')} disabled={scanFetching} className="px-1.5 text-[10px] font-semibold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Toggle units/percent">
                                        {form.qtyMode === 'units' ? '#' : '%'}
                                    </button>
                                </div>
                                {form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0 && (
                                    <>
                                        {form.qtyMode === 'units' && qtyNum > pkgSize ? (
                                            <p className="text-[10px] mt-0.5 font-medium text-red-600">
                                                Quantity cannot exceed package size ({pkgSize})
                                            </p>
                                        ) : form.qtyMode === 'percent' && qtyNum > 100 ? (
                                            <p className="text-[10px] mt-0.5 font-medium text-red-600">
                                                Percentage cannot exceed 100%
                                            </p>
                                        ) : (
                                            <p className="text-[10px] mt-0.5 font-medium text-green-600">
                                                {isPartialDerived ? `Partial — ${pctDerived.toFixed(1)}% (${unitsDerived.toFixed(1)} units)` : 'Full bottle'}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        {/* <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Est. Value</label>
                                <input type="text" readOnly value={`$${estimatedValue.toFixed(2)}`} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 font-medium" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Est. Store Value <span className="text-gray-400 font-normal">(−30%)</span></label>
                                <input type="text" readOnly value={`$${estimatedStoreValue.toFixed(2)}`} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 font-medium" />
                            </div>
                        </div> */}
                        </>
                    );
                })()}

                <hr className="my-3 border-gray-100" />

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Return Reason</label>
                        <select value={form.returnReason} onChange={e => updateField('returnReason', e.target.value)} disabled={scanFetching} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed">
                            {RETURN_REASONS.map(r => <option key={r} value={r}>{r || '— Select reason —'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Memo</label>
                        <input type="text" value={form.memo} onChange={e => updateField('memo', e.target.value)} placeholder="Optional memo" disabled={scanFetching} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:cursor-not-allowed" />
                    </div>
                </div>

                {/* Destination and non-returnable routing are handled in warehouse verification. */}

                {/* Action Buttons */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => handleSave()} disabled={scanFetching || isItemActionLoading || (!form.ndc && !form.proprietaryName) || !canEdit} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                            {isItemActionLoading
                                ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>
                                : <><CheckCircle className="w-3 h-3" />Save &amp; Scan Next</>}
                        </button>
                        <button type="button" onClick={handleClearForm} disabled={scanFetching} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                        <button onClick={() => router.push(`/warehouse/returns/${transactionId}`)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-gray-500 hover:bg-gray-100 transition-colors">
                            <X className="w-3 h-3" /> Cancel
                        </button>
                    </div>
                </div>
            </div>
            </>
            )}

        </div>
    );
}

// ── Reusable field component ───────────────────────────────────

function Field({ label, value, onChange, placeholder, required, hasError, readOnly, disabled }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    hasError?: boolean;
    readOnly?: boolean;
    /** API loading — disables input (distinct from scanned read-only) */
    disabled?: boolean;
}) {
    const fetching = !!disabled;
    const scannedLocked = !!readOnly && !fetching;
    const muted = fetching || readOnly;
    return (
        <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                {readOnly && <span className="text-gray-400 ml-1 text-[9px]">(scanned)</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={e => !readOnly && !fetching && onChange(e.target.value)}
                placeholder={placeholder}
                disabled={fetching}
                readOnly={scannedLocked}
                className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                    hasError
                        ? 'border-red-400 bg-red-50 focus:ring-red-400'
                        : muted
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:ring-slate-500'
                }`}
            />
            {hasError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
        </div>
    );
}

// ── Policy detail row ──────────────────────────────────────────

function PolicyDetail({ label, value, capitalize, highlight }: {
    label: string;
    value: string;
    capitalize?: boolean;
    highlight?: 'green' | 'red' | 'purple';
}) {
    const valueClass = highlight === 'green' ? 'text-green-700 font-semibold'
        : highlight === 'red' ? 'text-red-700 font-semibold'
        : highlight === 'purple' ? 'text-purple-700 font-semibold'
        : 'text-gray-900';
    return (
        <div className="bg-gray-50 rounded p-2 border border-gray-100">
            <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
            <p className={`text-xs ${valueClass} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
        </div>
    );
}
