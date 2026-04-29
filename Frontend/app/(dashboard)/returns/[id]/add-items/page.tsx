'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    ArrowLeft, Loader2, ScanLine, Keyboard, CheckCircle,
    AlertTriangle, RotateCcw, X, Camera, Archive, ShieldCheck,
    FileText, Ban, Info, Trash2,
} from 'lucide-react';

// Dynamically imported so it only loads in the browser (uses WebRTC APIs)
const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils/format';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

interface ReturnTransaction {
    id: string;
    licensePlate: string;
    status: string;
    pharmacyId: string;
    pharmacyName?: string;
}

interface ReturnTransactionItem {
    id: string;
    ndc: string;
    proprietaryName?: string;
    genericName?: string;
    manufacturer?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: string;
    standardPrice?: number;
    quantity: number;
    isPartial?: boolean;
    partialPercentage?: number;
    estimatedValue?: number;
    estimatedStoreValue?: number;
    returnStatus: string;
    destination?: string;
    wineCellarId?: string;
    memo?: string;
}

interface PolicyCheckResult {
    status: 'returnable' | 'non_returnable' | 'tbd';
    reason?: string;
    destination?: string;
    expectedReturnableDate?: string;
    manufacturerName?: string;
    discountRate?: number;
    reimbursementType?: string;
    partialsAccepted?: boolean;
    returnableWithinPolicyPeriod?: boolean;
    policyNumber?: number;
    autoRaEmail?: string;
    policyDescription?: string;
    windowStart?: string;
    windowEnd?: string;
}

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

    const [tx, setTx] = useState<ReturnTransaction | null>(null);

    const scanInputRef = useRef<HTMLInputElement>(null);
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
    // NOTE: Classification display removed - moved to warehouse verification
    // const [lastClassification, setLastClassification] = useState<{ item: string; status: string; policyCheck?: PolicyCheckResult; wineCellarItem?: any } | null>(null);
    const [scannedPrices, setScannedPrices] = useState<ScannedPrices | null>(null);
    const [preCheckResult, setPreCheckResult] = useState<PolicyCheckResult | null>(null);
    const [isPreChecking, setIsPreChecking] = useState(false);
    const [policyAutoCheck, setPolicyAutoCheck] = useState<PolicyCheckResult | null>(null);
    const [isPolicyChecking, setIsPolicyChecking] = useState(false);
    const [policyModalOpen, setPolicyModalOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
    // Track which fields came from API/scan data (these should be uneditable)
    const [scannedFields, setScannedFields] = useState<Set<string>>(new Set());
    const [wineCellarDate, setWineCellarDate] = useState('');
    const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
    const [manualDestination, setManualDestination] = useState('');
    const [reverseDistributors, setReverseDistributors] = useState<{ id: string; name: string; email: string }[]>([]);
    const [isScanLoading, setIsScanLoading] = useState(false);
    const [isItemActionLoading, setIsItemActionLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.get<any>('/reverse-distributors', {}, true);
                setReverseDistributors(res.data || []);
            } catch {
                // non-critical
            }
        })();
    }, []);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (!transactionId) return;
        (async () => {
            try {
                const res = await apiClient.get<any>(`/return-transactions/${transactionId}`, {}, true);
                if (res.status === 'success') setTx(res.data);
            } catch (err: any) {
                console.error('Error fetching transaction:', err);
            }
        })();
    }, [transactionId]);

    const fetchItems = useCallback(async () => {
        if (!transactionId) return;
        try {
            const res = await apiClient.get<any>(`/return-transactions/${transactionId}/items`, {}, true);
            if (res.status === 'success') {
                const fetched = res.data.items || [];
                setRecentlyAddedItems(fetched);
                setItemCount(fetched.length);
            }
        } catch (err: any) {
            console.error('Error fetching items:', err);
        }
    }, [transactionId]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

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

    // ── Policy check ──────────────────────────────────────────

    const deriveIsPartial = useCallback((): boolean => {
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
        if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) return false;
        const units = form.qtyMode === 'units' ? qtyNum : (qtyNum / 100) * pkgSize;
        return units < pkgSize;
    }, [form.fullPackageSize, form.fullPackageQtyReturned, form.qtyMode]);

    /*
     * Policy checks are intentionally disabled on pharmacy add-items flow.
     * Warehouse verification in MainAdmin now owns policy/wine-cellar/destruction routing.
     */
    const runPolicyCheck = async (_ndc: string, _expirationDate: string, _dosageForm?: string): Promise<PolicyCheckResult | null> => {
        setIsPolicyChecking(false);
        setPolicyAutoCheck(null);
        setPreCheckResult(null);
        policySyncKeyRef.current = '';
        return null;
    };

    // ── Barcode scan handler ──────────────────────────────────

    const handleScan = async (raw: string) => {
        if (!raw.trim()) return;

        setScanError('');
        setLastWarning('');
        setPreCheckResult(null);
        setIsPreChecking(false);
        setPolicyAutoCheck(null);
        policySyncKeyRef.current = '';
        setManualDestination('');
        setIsScanLoading(true);

        try {
            const res = await apiClient.post<any>('/barcode/scan', { scanData: raw.trim() }, true);
            if (res.status === 'success' && res.data) {
                const af = res.data.autoFill || {};
                const pricing = res.data.pricing || {};

                const nextScannedPrices: ScannedPrices = {
                    bestFullPrice: pricing.bestFullPrice ?? null,
                    bestPartialPrice: pricing.bestPartialPrice ?? null,
                };
                setScannedPrices(nextScannedPrices);

                const parsedStrength = parseStrength(af.strength || '');
                const bestPrice = pricing.bestFullPrice ?? pricing.bestPartialPrice;

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

                // Track which fields came from API/scan data to make them uneditable
                const fieldsFromApi = new Set<string>();
                if (af.ndc) fieldsFromApi.add('ndc');
                if (af.ndc10) fieldsFromApi.add('ndc10');
                if (af.gtin) fieldsFromApi.add('gtin');
                if (af.proprietaryName) fieldsFromApi.add('proprietaryName');
                if (af.genericName) fieldsFromApi.add('genericName');
                if (af.manufacturer) fieldsFromApi.add('manufacturer');
                if (af.packageDescription) fieldsFromApi.add('packageDescription');
                if (af.dosageForm) fieldsFromApi.add('dosageForm');
                if (af.strength) { fieldsFromApi.add('strengthValue'); fieldsFromApi.add('strengthUnit'); }
                if (af.route) fieldsFromApi.add('route');
                if (af.lotNumber) fieldsFromApi.add('lotNumber');
                if (af.serialNumber) fieldsFromApi.add('serialNumber');
                if (af.expirationDate) fieldsFromApi.add('expirationDate');
                if (af.fullPackageSize) fieldsFromApi.add('fullPackageSize');
                if (af.deaSchedule) fieldsFromApi.add('deaSchedule');
                if (af.productType) fieldsFromApi.add('productType');
                setScannedFields(fieldsFromApi);

                if (!res.data.product) {
                    setScanError('Barcode parsed but product not found in database. Fields partially filled — please complete manually.');
                }

                setScanInput('');
            } else {
                setScannedPrices(null);
                setScanError(res.message || 'Scan failed. Try manual entry.');
                setScanInput('');
            }
        } catch (err: any) {
            setScannedPrices(null);
            setScanError(err.message || 'Scan failed. Try manual entry.');
            setScanInput('');
        } finally {
            setIsScanLoading(false);
        }
    };

    const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScan(scanInput);
        }
    };

    const handleManualLookup = async () => {
        if (!manualNdc.trim()) return;
        handleScan(manualNdc.trim());
        setManualNdc('');
    };

    const handleCameraScan = (data: string) => {
        setCameraOpen(false);
        handleScan(data);
    };

    // ── Validation ──────────────────────────────────────────

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

    // ── Save item ──────────────────────────────────────────

    const handleSave = async (_skipWineCellarCheck = false) => {
        if (!validateForm()) return;

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
        if (form.returnReason) payload.returnReason = form.returnReason;
        if (form.deaSchedule) payload.deaSchedule = form.deaSchedule;
        if (form.productType) payload.productType = form.productType;
        if (form.memo) payload.memo = form.memo;
        payload.scanSource = form.scanSource;
        if (form.rawScanData) payload.rawScanData = form.rawScanData;

        setIsItemActionLoading(true);
        try {
            const res = await apiClient.post<any>(`/return-transactions/${transactionId}/items`, payload, true) as any;

            if (res.status === 'success' && res.data) {
                const name = form.proprietaryName || form.ndc || 'Item';
                const savedItem = res.data;
                if (savedItem) {
                    await fetchItems();
                    setActiveTab('list');
                }

                showToast(`${name} saved! Ready for next scan.`);

                if (res.warning) {
                    setLastWarning(res.warning);
                } else {
                    setLastWarning('');
                }

                // NOTE: Classification display removed - moved to warehouse verification
                // setLastClassification({
                //     item: name,
                //     status: savedItem?.returnStatus || form.returnStatus,
                //     policyCheck: undefined,
                //     wineCellarItem: undefined,
                // });

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
                showToast(friendlyError(res.message || ''), 'error');
            }
        } catch (err: any) {
            showToast(friendlyError(err.message || ''), 'error');
        } finally {
            setIsItemActionLoading(false);
        }
    };

    // ── Manual Wine Cellar move ───────────────────────────────

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
        // setLastClassification(null); // Classification display removed
        setPreCheckResult(null);
        setIsPreChecking(false);
        setPolicyAutoCheck(null);
        setIsPolicyChecking(false);
        setPolicyModalOpen(false);
        if (mode === 'usb') scanInputRef.current?.focus();
    };

    const handleRemoveRecentItem = async (itemId: string) => {
        setIsItemActionLoading(true);
        try {
            const res = await apiClient.delete(`/return-transactions/${transactionId}/items/${itemId}`, true);
            if (res.status === 'success') {
                await fetchItems();
                showToast('Item removed successfully', 'success');
            } else {
                showToast('Failed to remove item. Please try again.', 'error');
            }
        } catch {
            showToast('Failed to remove item. Please try again.', 'error');
        } finally {
            setIsItemActionLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────

    if (!tx) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-3">
                <ToastContainer toasts={toasts} onClose={removeToast} />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push(`/returns/${transactionId}`)}
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
                    <button onClick={() => router.push(`/returns/${transactionId}`)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                        Done Adding
                    </button>
                </div>

                {/* Tabs */}
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
                    <div className="bg-white rounded-lg shadow px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-gray-700">Products Added in This Session</h2>
                            <p className="text-[10px] text-gray-500">{recentlyAddedItems.length} item{recentlyAddedItems.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {recentlyAddedItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {item.proprietaryName || item.genericName || 'Unknown Product'}
                                            </p>
                                            <Badge variant={
                                                item.returnStatus === 'returnable' ? 'success' :
                                                item.returnStatus === 'non_returnable' ? 'error' :
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
                                            <div><span className="text-gray-500">Exp:</span> <span className="font-medium text-gray-800">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</span></div>
                                            {/* <div><span className="text-gray-500">Value:</span> <span className="font-bold text-green-600">${item.estimatedValue?.toFixed(2) || '0.00'}</span></div> */}
                                            {item.manufacturer && (
                                                <div className="col-span-1"><span className="text-gray-500">Manufacturer:</span> <span className="font-medium text-gray-800">{item.manufacturer}</span></div>
                                            )}
                                            {item.destination && (
                                                <div className="col-span-1"><span className="text-gray-500">Destination:</span> <span className="font-medium text-gray-800 capitalize">{item.destination}</span></div>
                                            )}
                                            {item.serialNumber && (
                                                <div className="col-span-1"><span className="text-gray-500">Serial Number:</span> <span className="font-medium text-gray-800 capitalize">{item.serialNumber}</span></div>
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
                    <div className="bg-white rounded-lg shadow px-4 py-3">
                        {/* Mode tabs */}
                        <div className="flex gap-1.5 mb-3">
                            {([
                                { key: 'camera', icon: Camera,   label: 'Camera QR' },
                                { key: 'usb',    icon: ScanLine,  label: 'USB Scanner' },
                                { key: 'manual', icon: Keyboard,  label: 'Manual NDC' },
                            ] as const).map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setMode(key)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                        mode === key
                                            ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </button>
                            ))}
                        </div>

                        {/* Camera mode */}
                        {mode === 'camera' && (
                            <div>
                                <button
                                    onClick={() => setCameraOpen(true)}
                                    disabled={isScanLoading}
                                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-dashed rounded transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-primary-300 bg-primary-50 hover:bg-primary-100 hover:border-primary-400"
                                >
                                    {isScanLoading ? (
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

                        {/* USB Scanner mode */}
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
                                        placeholder="Scan with USB/Bluetooth scanner — press Enter after scan"
                                        className="w-full pl-8 pr-8 py-2 text-xs border-2 border-primary-300 bg-primary-50 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        autoFocus
                                    />
                                    {isScanLoading && (
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Connect USB or Bluetooth barcode scanner — types code automatically and sends Enter.</p>
                            </div>
                        )}

                        {/* Manual NDC mode */}
                        {mode === 'manual' && (
                            <div>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={manualNdc}
                                        onChange={e => setManualNdc(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                                        placeholder="Enter NDC (e.g. 43547-3250-06) and press Enter or Lookup..."
                                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        autoFocus
                                    />
                                    <button onClick={handleManualLookup} disabled={isScanLoading || !manualNdc.trim()} className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                        {isScanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
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

                    {/* NOTE: Classification results (TBD, Returnable, Non-Returnable, Wine Cellar) moved to warehouse verification */}

                    {/* Product Form */}
                    <div className="bg-white rounded-lg shadow px-4 py-3">
                        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Product Information</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            <Field label="NDC" value={form.ndc} onChange={v => updateField('ndc', v)} placeholder="e.g. 43547-3250-06" required hasError={formErrors.has('ndc')} readOnly={scannedFields.has('ndc')} />
                            <Field label="Proprietary Name" value={form.proprietaryName} onChange={v => updateField('proprietaryName', v)} placeholder="Brand name" required hasError={formErrors.has('proprietaryName')} readOnly={scannedFields.has('proprietaryName')} />
                            <Field label="Generic Name" value={form.genericName} onChange={v => updateField('genericName', v)} placeholder="Generic name" hasError={formErrors.has('genericName')} readOnly={scannedFields.has('genericName')} />
                            <Field label="Manufacturer" value={form.manufacturer} onChange={v => updateField('manufacturer', v)} placeholder="Manufacturer" required hasError={formErrors.has('manufacturer')} readOnly={scannedFields.has('manufacturer')} />
                            <Field label="Package Description" value={form.packageDescription} onChange={v => updateField('packageDescription', v)} placeholder="e.g. 60 TABLET in BOTTLE" readOnly={scannedFields.has('packageDescription')} />
                            <Field label="Dosage Form" value={form.dosageForm} onChange={v => updateField('dosageForm', v)} placeholder="e.g. TABLET" readOnly={scannedFields.has('dosageForm')} />

                            {/* Strength */}
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    Strength
                                    {(scannedFields.has('strengthValue') || scannedFields.has('strengthUnit')) && <span className="text-gray-400 ml-1 text-[9px]">(from API)</span>}
                                </label>
                                <div className="flex gap-1">
                                    <input 
                                        type="text" 
                                        value={form.strengthValue} 
                                        onChange={e => !scannedFields.has('strengthValue') && updateField('strengthValue', e.target.value)} 
                                        placeholder="500" 
                                        readOnly={scannedFields.has('strengthValue')}
                                        className={`w-1/2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                            scannedFields.has('strengthValue') 
                                                ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                                                : 'border-gray-300 focus:ring-primary-500'
                                        }`} 
                                    />
                                    <input 
                                        type="text" 
                                        value={form.strengthUnit} 
                                        onChange={e => !scannedFields.has('strengthUnit') && updateField('strengthUnit', e.target.value)} 
                                        placeholder="mg" 
                                        readOnly={scannedFields.has('strengthUnit')}
                                        className={`w-1/2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                            scannedFields.has('strengthUnit') 
                                                ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                                                : 'border-gray-300 focus:ring-primary-500'
                                        }`} 
                                    />
                                </div>
                            </div>

                            <Field label="Route" value={form.route} onChange={v => updateField('route', v)} placeholder="e.g. ORAL" readOnly={scannedFields.has('route')} />
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    DEA Schedule
                                    {scannedFields.has('deaSchedule') && <span className="text-gray-400 ml-1 text-[9px]">(from API)</span>}
                                </label>
                                <select
                                    value={form.deaSchedule}
                                    onChange={e => !scannedFields.has('deaSchedule') && updateField('deaSchedule', e.target.value)}
                                    disabled={scannedFields.has('deaSchedule')}
                                    className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                        scannedFields.has('deaSchedule')
                                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-300 focus:ring-primary-500'
                                    }`}
                                >
                                    {DEA_SCHEDULE_OPTIONS.map(option => (
                                        <option key={option} value={option}>
                                            {option || '— Select DEA Schedule —'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Field label="Lot Number" value={form.lotNumber} onChange={v => updateField('lotNumber', v)} placeholder="Lot #" required hasError={formErrors.has('lotNumber')} readOnly={scannedFields.has('lotNumber')} />
                            <Field label="Serial Number" value={form.serialNumber} onChange={v => updateField('serialNumber', v)} placeholder="Serial #" readOnly={scannedFields.has('serialNumber')} />
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                    Expiration Date<span className="text-red-500 ml-0.5">*</span>
                                    {scannedFields.has('expirationDate') && <span className="text-gray-400 ml-1 text-[9px]">(from API)</span>}
                                </label>
                                <input
                                    type="date"
                                    value={form.expirationDate}
                                    onChange={e => { if (!scannedFields.has('expirationDate')) updateField('expirationDate', e.target.value); }}
                                    readOnly={scannedFields.has('expirationDate')}
                                    className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                        formErrors.has('expirationDate')
                                            ? 'border-red-400 bg-red-50 focus:ring-red-400'
                                            : scannedFields.has('expirationDate')
                                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                            : 'border-gray-300 focus:ring-primary-500'
                                    }`}
                                />
                                {formErrors.has('expirationDate') && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                            </div>
                        </div>

                        <hr className="my-3 border-gray-100" />
                        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity</h2>

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
                                        <input type="number" step="0.01" min="0" value={form.standardPrice} onChange={e => updateField('standardPrice', e.target.value)} placeholder="0.00" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                    </div> */}
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                                            Pkg Size
                                            {scannedFields.has('fullPackageSize') && <span className="text-gray-400 ml-1 text-[9px]">(from API)</span>}
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={form.fullPackageSize} 
                                            onChange={e => !scannedFields.has('fullPackageSize') && updateField('fullPackageSize', e.target.value)} 
                                            placeholder="e.g. 60" 
                                            readOnly={scannedFields.has('fullPackageSize')}
                                            className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                                scannedFields.has('fullPackageSize')
                                                    ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                                                    : 'border-gray-300 focus:ring-primary-500'
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
                                                    const value = e.target.value;
                                                    const numValue = parseFloat(value);
                                                    const maxAllowed = form.qtyMode === 'units' ? pkgSize : 100;
                                                    
                                                    // Allow empty value or values within limits
                                                    if (value === '' || (numValue >= 0 && numValue <= maxAllowed)) {
                                                        updateField('fullPackageQtyReturned', value);
                                                    }
                                                }}
                                                placeholder={form.qtyMode === 'units' ? '45' : '75'} 
                                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" 
                                            />
                                            <button type="button" onClick={() => updateField('qtyMode', form.qtyMode === 'units' ? 'percent' : 'units')} className="px-1.5 text-[10px] font-semibold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="Toggle units/percent">
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
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Item Status</h2>
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                Policy/Wine Cellar/Destruction handled in warehouse verification
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-2">
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="radio" name="returnStatus" value="tbd" checked={form.returnStatus === 'tbd'} onChange={() => updateField('returnStatus', 'tbd')} className="text-primary-600 focus:ring-primary-500" />
                                <span className="font-medium text-gray-700">Add Item (Status determined at warehouse)</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Return Reason</label>
                                <select value={form.returnReason} onChange={e => updateField('returnReason', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r || '— Select reason —'}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Memo</label>
                                <input type="text" value={form.memo} onChange={e => updateField('memo', e.target.value)} placeholder="Optional memo" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" />
                            </div>
                        </div>

                        {/* Destination and non-returnable routing are handled in warehouse verification. */}

                        {/* Action Buttons */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1.5">
                                <button onClick={() => handleSave()} disabled={isItemActionLoading || (!form.ndc && !form.proprietaryName)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                                    {isItemActionLoading
                                        ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>
                                        : <><CheckCircle className="w-3 h-3" />Save &amp; Scan Next</>}
                                </button>
                                <button onClick={handleClearForm} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                                    <RotateCcw className="w-3 h-3" /> Clear
                                </button>
                                <button onClick={() => router.push(`/returns/${transactionId}`)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-gray-500 hover:bg-gray-100 transition-colors">
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                    </>
                )}

                {/* Policy Modal */}
                {policyModalOpen && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setPolicyModalOpen(false)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Manufacturer Return Policy
                                </h2>
                                <button onClick={() => setPolicyModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="px-4 py-3">
                                {isPolicyChecking ? (
                                    <div className="flex flex-col items-center py-8 gap-2 text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                        <p className="text-xs">Checking manufacturer policy...</p>
                                    </div>
                                ) : !policyAutoCheck ? (
                                    <div className="text-center py-6 text-gray-500">
                                        <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm font-medium">No policy data available</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {form.ndc || form.manufacturer ? 'No matching policy found in the system.' : 'Scan or enter a product first.'}
                                        </p>
                                        {(form.ndc && form.expirationDate) && (
                                            <button onClick={async () => { await runPolicyCheck(form.ndc, form.expirationDate, form.dosageForm || undefined); }} className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1 mx-auto">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Check Now
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className={`flex items-center gap-2 rounded px-3 py-2 ${
                                            policyAutoCheck.status === 'returnable' ? 'bg-green-100 border border-green-300' :
                                            policyAutoCheck.status === 'non_returnable' ? 'bg-red-100 border border-red-300' :
                                            'bg-yellow-100 border border-yellow-300'
                                        }`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                policyAutoCheck.status === 'returnable' ? 'bg-green-200' :
                                                policyAutoCheck.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                                            }`}>
                                                {policyAutoCheck.status === 'returnable' ? <CheckCircle className="w-4 h-4 text-green-700" /> :
                                                 policyAutoCheck.status === 'non_returnable' ? <Ban className="w-4 h-4 text-red-700" /> :
                                                 <AlertTriangle className="w-4 h-4 text-yellow-700" />}
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${
                                                    policyAutoCheck.status === 'returnable' ? 'text-green-800' :
                                                    policyAutoCheck.status === 'non_returnable' ? 'text-red-800' : 'text-yellow-800'
                                                }`}>
                                                    {policyAutoCheck.status === 'returnable' ? 'RETURNABLE' : policyAutoCheck.status === 'non_returnable' ? 'NON-RETURNABLE' : 'TBD — No Policy Found'}
                                                </p>
                                                {policyAutoCheck.reason && <p className="text-[10px] text-gray-600 mt-0.5 capitalize">{policyAutoCheck.reason.replace(/_/g, ' ')}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {policyAutoCheck.manufacturerName && <PolicyDetail label="Manufacturer" value={policyAutoCheck.manufacturerName} />}
                                            {policyAutoCheck.destination && <PolicyDetail label="Destination" value={policyAutoCheck.destination} capitalize />}
                                            {policyAutoCheck.windowStart && <PolicyDetail label="Window Start" value={policyAutoCheck.windowStart} />}
                                            {policyAutoCheck.windowEnd && <PolicyDetail label="Window End" value={policyAutoCheck.windowEnd} />}
                                            {policyAutoCheck.expectedReturnableDate && <PolicyDetail label="Returnable From" value={policyAutoCheck.expectedReturnableDate} highlight="purple" />}
                                            {policyAutoCheck.discountRate != null && <PolicyDetail label="Discount Rate" value={`${policyAutoCheck.discountRate}%`} />}
                                            {policyAutoCheck.reimbursementType && <PolicyDetail label="Reimbursement" value={policyAutoCheck.reimbursementType} capitalize />}
                                            {policyAutoCheck.partialsAccepted != null && <PolicyDetail label="Partials" value={policyAutoCheck.partialsAccepted ? 'Yes' : 'No'} highlight={policyAutoCheck.partialsAccepted ? 'green' : 'red'} />}
                                            {policyAutoCheck.returnableWithinPolicyPeriod != null && (
                                                <PolicyDetail
                                                    label="Returnable in window"
                                                    value={policyAutoCheck.returnableWithinPolicyPeriod ? 'Yes' : 'No'}
                                                    highlight={policyAutoCheck.returnableWithinPolicyPeriod ? 'green' : 'red'}
                                                />
                                            )}
                                            {policyAutoCheck.policyNumber != null && <PolicyDetail label="Policy #" value={String(policyAutoCheck.policyNumber)} />}
                                            {policyAutoCheck.autoRaEmail && <PolicyDetail label="RA Email" value={policyAutoCheck.autoRaEmail} />}
                                        </div>

                                        {policyAutoCheck.policyDescription && (
                                            <div>
                                                <p className="text-[10px] font-medium text-gray-500 mb-1">Policy Notes</p>
                                                <p className="text-[11px] text-gray-700 bg-gray-50 rounded p-2 border leading-relaxed">{policyAutoCheck.policyDescription}</p>
                                            </div>
                                        )}

                                        {policyAutoCheck.status === 'tbd' && (
                                            <div className="flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 rounded p-2 text-[11px] text-yellow-800">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                No policy matched. Set the return status manually using the radio buttons.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end px-4 py-3 border-t bg-gray-50 rounded-b-lg">
                                <button onClick={() => setPolicyModalOpen(false)} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Camera Scanner Modal */}
                {cameraOpen && (
                    <QrScannerModal
                        onScan={handleCameraScan}
                        onClose={() => setCameraOpen(false)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

// ── Reusable field component ───────────────────────────────────

function Field({ label, value, onChange, placeholder, required, hasError, readOnly }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    hasError?: boolean;
    readOnly?: boolean;
}) {
    return (
        <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                {readOnly && <span className="text-gray-400 ml-1 text-[9px]">(from API)</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={e => !readOnly && onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                    hasError
                        ? 'border-red-400 bg-red-50 focus:ring-red-400'
                        : readOnly
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                        : 'border-gray-300 focus:ring-primary-500'
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
