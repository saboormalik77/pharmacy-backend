'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, ScanLine, Keyboard, CheckCircle,
    AlertTriangle, RotateCcw, X, Camera, Archive, ShieldCheck,
    FileText, Ban, Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchReturnTransactionById,
    scanBarcode,
    addTransactionItem,
} from '@/lib/store/returnTransactionsSlice';
import { checkReturnability } from '@/lib/store/policiesSlice';
import { BarcodeScanResponse, ReturnabilityCheckResult } from '@/lib/types';

// Dynamically imported so it only loads in the browser (uses WebRTC APIs)
const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

// ── Constants ──────────────────────────────────────────────────

const RETURN_REASONS = [
    '', 'Expired', 'Short-dated', 'Damaged', 'Recalled', 'Overstock',
    'Discontinued', 'Wrong product', 'Formulary change', 'Other',
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
    const { currentTransaction: tx, isScanLoading, isItemActionLoading } = useAppSelector(
        (state) => state.returnTransactions
    );

    const scanInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
    const [mode, setMode] = useState<'camera' | 'usb' | 'manual'>('camera');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [manualNdc, setManualNdc] = useState('');
    const [scanError, setScanError] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [itemCount, setItemCount] = useState(0);
    const [lastWarning, setLastWarning] = useState('');
    const [lastClassification, setLastClassification] = useState<{ item: string; status: string; policyCheck?: ReturnabilityCheckResult; wineCellarItem?: any } | null>(null);
    const [scannedPrices, setScannedPrices] = useState<ScannedPrices | null>(null);
    const [preCheckResult, setPreCheckResult] = useState<ReturnabilityCheckResult | null>(null);
    const [isPreChecking, setIsPreChecking] = useState(false);
    // Policy auto-detection state
    const [policyAutoCheck, setPolicyAutoCheck] = useState<ReturnabilityCheckResult | null>(null);
    const [isPolicyChecking, setIsPolicyChecking] = useState(false);
    const [policyModalOpen, setPolicyModalOpen] = useState(false);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (transactionId) dispatch(fetchReturnTransactionById(transactionId));
    }, [dispatch, transactionId]);

    useEffect(() => {
        if (mode === 'usb') scanInputRef.current?.focus();
    }, [mode]);

    const updateField = useCallback((field: keyof FormState, value: string | boolean | number) => {
        setForm(prev => ({ ...prev, [field]: value }));
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

    // ── Barcode scan handler ───────────────────────────────────

    const runPolicyCheck = async (ndc: string, expirationDate: string, dosageForm?: string) => {
        setIsPolicyChecking(true);
        setPolicyAutoCheck(null);
        setPreCheckResult(null);
        const checkResult = await dispatch(checkReturnability({ ndc, expirationDate, dosageForm }));
        setIsPolicyChecking(false);
        if (checkReturnability.fulfilled.match(checkResult) && checkResult.payload) {
            const policy = checkResult.payload;
            setPolicyAutoCheck(policy);
            // Auto-set return status from policy
            if (policy.status === 'returnable' || policy.status === 'non_returnable') {
                setForm(prev => ({ ...prev, returnStatus: policy.status as 'returnable' | 'non_returnable' }));
            }
            // Pre-set wine cellar flag if too early
            if (policy.expectedReturnableDate) {
                setPreCheckResult(policy);
            }
            return policy;
        }
        return null;
    };

    const handleScan = async (raw: string) => {
        if (!raw.trim()) return;
        setScanError('');
        setLastWarning('');
        setPreCheckResult(null);
        setIsPreChecking(false);
        setPolicyAutoCheck(null);

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
                deaSchedule: af.deaSchedule || '',
                productType: af.productType || '',
                returnReason: '',
                memo: '',
                scanSource: af.scanSource || 'gs1_qr',
                rawScanData: raw.trim(),
            };
            setForm(newForm);

            if (!data.product) {
                setScanError('Barcode parsed but product not found in database. Fields partially filled — please complete manually.');
            }

            setScanInput('');

            // Auto-run policy check if we have NDC + expiration
            if (af.ndc && af.expirationDate) {
                await runPolicyCheck(af.ndc, af.expirationDate, af.dosageForm || undefined);
            }
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
            handleScan(scanInput);
        }
    };

    const handleManualLookup = async () => {
        if (!manualNdc.trim()) return;
        handleScan(manualNdc.trim());
        setManualNdc('');
    };

    // ── Save item ──────────────────────────────────────────────

    const handleSave = async (skipWineCellarCheck = false) => {
        if (!form.ndc && !form.proprietaryName) {
            showToast('Please scan or enter a product first.', 'error');
            return;
        }

        // Before saving: check if the product is too early to return (wine cellar).
        // If so, intercept and show wine cellar confirmation buttons.
        if (!skipWineCellarCheck) {
            // If wine cellar was already detected at scan time, just show buttons
            if (preCheckResult?.expectedReturnableDate) {
                return;
            }
            // If policy check ran but didn't flag wine cellar, skip re-check
            // If not yet checked (manual entry without scan), run now
            if (!policyAutoCheck && form.ndc && form.expirationDate) {
                setIsPreChecking(true);
                const policy = await runPolicyCheck(form.ndc, form.expirationDate, form.dosageForm || undefined);
                setIsPreChecking(false);
                if (policy?.expectedReturnableDate) {
                    return; // runPolicyCheck already set preCheckResult
                }
            }
        }

        // ── Compute quantity / partial from the new Qty Returned field ──
        const pkgSize = parseFloat(form.fullPackageSize) || 0;
        const qtyInput = parseFloat(form.fullPackageQtyReturned) || 0;

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
        payload.isPartial = payloadIsPartial;
        if (payloadIsPartial && payloadPartialPercentage != null) payload.partialPercentage = payloadPartialPercentage;
        payload.returnStatus = form.returnStatus;
        if (form.returnReason) payload.returnReason = form.returnReason;
        if (form.deaSchedule) payload.deaSchedule = form.deaSchedule;
        if (form.productType) payload.productType = form.productType;
        if (form.memo) payload.memo = form.memo;
        payload.scanSource = form.scanSource;
        if (form.rawScanData) payload.rawScanData = form.rawScanData;
        if (policyAutoCheck?.destination) payload.destination = policyAutoCheck.destination;

        const result = await dispatch(addTransactionItem({ transactionId, payload }));

        if (addTransactionItem.fulfilled.match(result)) {
            setItemCount(prev => prev + 1);
            const name = form.proprietaryName || form.ndc || 'Item';
            const savedItem = result.payload.item;
            const pc = result.payload.policyCheck;
            const wcItem = result.payload.wineCellarItem;

            if (wcItem) {
                showToast(`${name} saved & moved to Wine Cellar! Will be returnable ${pc?.expectedReturnableDate || 'later'}.`);
            } else {
                showToast(`${name} saved! Ready for next scan.`);
            }

            if (result.payload.warning) {
                setLastWarning(result.payload.warning);
            } else {
                setLastWarning('');
            }

            setLastClassification({
                item: name,
                status: savedItem?.returnStatus || form.returnStatus,
                policyCheck: pc,
                wineCellarItem: wcItem,
            });

            setForm({ ...EMPTY_FORM });
            setScannedPrices(null);
            setScanError('');
            setScanInput('');
            setPreCheckResult(null);
            setPolicyAutoCheck(null);
            setIsPolicyChecking(false);
            setPolicyModalOpen(false);
            if (mode === 'usb') scanInputRef.current?.focus();
        } else {
            showToast(result.payload as string || 'Failed to save item', 'error');
        }
    };

    const handleClearForm = () => {
        setForm({ ...EMPTY_FORM });
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

    // ── Render ─────────────────────────────────────────────────

    if (!tx) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Camera QR Scanner Modal */}
            {cameraOpen && (
                <QrScannerModal
                    onScan={handleCameraScan}
                    onClose={() => setCameraOpen(false)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <button
                        onClick={() => router.push(`/warehouse/returns/${transactionId}`)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Return
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-primary-600" /> Adding Products
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="font-mono font-semibold">{tx.licensePlate}</span>
                        <span>|</span>
                        <span>{tx.pharmacyName}</span>
                        {itemCount > 0 && (
                            <>
                                <span>|</span>
                                <Badge variant="success">{itemCount} added this session</Badge>
                            </>
                        )}
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/warehouse/returns/${transactionId}`)}>
                    Done Adding
                </Button>
            </div>

            {/* Scan / Manual Toggle */}
            <div className="bg-white rounded-lg shadow-md p-4">

                {/* Mode tabs */}
                <div className="flex gap-2 mb-4">
                    {([ 
                        { key: 'camera', icon: Camera,   label: 'Camera QR' },
                        { key: 'usb',    icon: ScanLine,  label: 'USB Scanner' },
                        { key: 'manual', icon: Keyboard,  label: 'Manual NDC' },
                    ] as const).map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setMode(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                mode === key
                                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>

                {/* ── Camera mode ───────────────────────────── */}
                {mode === 'camera' && (
                    <div>
                        <button
                            onClick={() => setCameraOpen(true)}
                            disabled={isScanLoading}
                            className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-primary-300 rounded-xl bg-primary-50 hover:bg-primary-100 hover:border-primary-400 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                        >
                            {isScanLoading ? (
                                <>
                                    <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                                    <p className="text-sm font-medium text-primary-600">Looking up product...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-14 h-14 rounded-2xl bg-primary-200 group-hover:bg-primary-300 transition-colors flex items-center justify-center">
                                        <Camera className="w-7 h-7 text-primary-700" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-primary-700">Open Camera Scanner</p>
                                        <p className="text-xs text-primary-500 mt-0.5">Tap to open camera and scan QR / barcode</p>
                                    </div>
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Works with QR codes, GS1 barcodes, and standard barcodes on pharmacy bottles
                        </p>
                    </div>
                )}

                {/* ── USB Scanner mode ──────────────────────── */}
                {mode === 'usb' && (
                    <div>
                        <div className="relative">
                            <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScanKeyDown}
                                placeholder="Scan with USB/Bluetooth scanner — press Enter after scan"
                                className="w-full pl-10 pr-10 py-3 text-sm border-2 border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-primary-50"
                                autoFocus
                            />
                            {isScanLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                            Connect your USB or Bluetooth barcode scanner — it types the code automatically and sends Enter.
                        </p>
                    </div>
                )}

                {/* ── Manual NDC mode ───────────────────────── */}
                {mode === 'manual' && (
                    <div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={manualNdc}
                                onChange={e => setManualNdc(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                                placeholder="Enter NDC (e.g. 43547-3250-06) and press Enter or Lookup..."
                                className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                            />
                            <Button variant="primary" onClick={handleManualLookup} disabled={isScanLoading || !manualNdc.trim()}>
                                {isScanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup'}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                            Enter the full NDC from the bottle label (e.g. <span className="font-mono">43547-3250-06</span>).
                        </p>
                    </div>
                )}

                {/* Scan error */}
                {scanError && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}

                {/* Duplicate warning */}
                {lastWarning && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{lastWarning}</span>
                    </div>
                )}
            </div>

            {/* Classification Result */}
            {lastClassification && (
                <div className={`rounded-lg border-2 p-4 ${
                    lastClassification.wineCellarItem
                        ? 'bg-purple-50 border-purple-300'
                        : lastClassification.status === 'returnable'
                        ? 'bg-green-50 border-green-300'
                        : lastClassification.status === 'non_returnable'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                }`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                lastClassification.wineCellarItem ? 'bg-purple-200' :
                                lastClassification.status === 'returnable' ? 'bg-green-200' :
                                lastClassification.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                            }`}>
                                {lastClassification.wineCellarItem ? (
                                    <Archive className="w-5 h-5 text-purple-700" />
                                ) : lastClassification.status === 'returnable' ? (
                                    <CheckCircle className="w-5 h-5 text-green-700" />
                                ) : lastClassification.status === 'non_returnable' ? (
                                    <X className="w-5 h-5 text-red-700" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-yellow-700" />
                                )}
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${
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
                                    <div className="mt-1 text-xs space-y-0.5">
                                        <p className="text-purple-700 font-medium">
                                            ✓ Automatically shelved in Wine Cellar
                                        </p>
                                        {lastClassification.policyCheck?.expectedReturnableDate && (
                                            <p className="text-purple-700">
                                                Will become returnable: <span className="font-semibold">{lastClassification.policyCheck.expectedReturnableDate}</span>
                                            </p>
                                        )}
                                        <p className="text-purple-600">
                                            Item will be automatically surfaced when the return window opens.
                                        </p>
                                    </div>
                                )}
                                {!lastClassification.wineCellarItem && lastClassification.policyCheck && (
                                    <div className="mt-1 text-xs space-y-0.5">
                                        {lastClassification.policyCheck.destination && (
                                            <p className={lastClassification.status === 'returnable' ? 'text-green-700' : 'text-gray-600'}>
                                                Destination: <span className="font-semibold capitalize">{lastClassification.policyCheck.destination}</span>
                                            </p>
                                        )}
                                        {lastClassification.policyCheck.reason && lastClassification.status !== 'returnable' && (
                                            <p className={lastClassification.status === 'non_returnable' ? 'text-red-700' : 'text-yellow-700'}>
                                                Reason: {lastClassification.policyCheck.reason.replace(/_/g, ' ')}
                                            </p>
                                        )}
                                        {lastClassification.policyCheck.expectedReturnableDate && (
                                            <p className="text-blue-700 font-medium">
                                                Will become returnable: {lastClassification.policyCheck.expectedReturnableDate}
                                            </p>
                                        )}
                                        {lastClassification.policyCheck.windowStart && lastClassification.policyCheck.windowEnd && (
                                            <p className="text-gray-500">
                                                Return window: {lastClassification.policyCheck.windowStart} — {lastClassification.policyCheck.windowEnd}
                                            </p>
                                        )}
                                        {lastClassification.policyCheck.manufacturerName && (
                                            <p className="text-gray-500">
                                                Manufacturer policy: {lastClassification.policyCheck.manufacturerName}
                                            </p>
                                        )}
                                        {lastClassification.status === 'tbd' && !lastClassification.policyCheck.reason && (
                                            <p className="text-yellow-700">Policy not found. Needs manual research.</p>
                                        )}
                                    </div>
                                )}
                                {!lastClassification.policyCheck && lastClassification.status === 'tbd' && (
                                    <p className="text-xs text-yellow-700 mt-1">No policy data available. Needs manual research.</p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setLastClassification(null)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Product Form */}
            <div className="bg-white rounded-lg shadow-md p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Product Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Row 1: Identifiers */}
                    <Field label="NDC" value={form.ndc} onChange={v => updateField('ndc', v)} placeholder="e.g. 43547-3250-06" />
                    <Field label="Proprietary Name" value={form.proprietaryName} onChange={v => updateField('proprietaryName', v)} placeholder="Brand name" />
                    <Field label="Generic Name" value={form.genericName} onChange={v => updateField('genericName', v)} placeholder="Generic name" />

                    {/* Row 2: Manufacturer / Package */}
                    <Field label="Manufacturer" value={form.manufacturer} onChange={v => updateField('manufacturer', v)} placeholder="Manufacturer" />
                    <Field label="Package Description" value={form.packageDescription} onChange={v => updateField('packageDescription', v)} placeholder="e.g. 60 TABLET in BOTTLE" />
                    <Field label="Dosage Form" value={form.dosageForm} onChange={v => updateField('dosageForm', v)} placeholder="e.g. TABLET" />

                    {/* Row 3: Strength (value + unit) / Route / DEA */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Strength</label>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={form.strengthValue}
                                onChange={e => updateField('strengthValue', e.target.value)}
                                placeholder="e.g. 500"
                                className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <input
                                type="text"
                                value={form.strengthUnit}
                                onChange={e => updateField('strengthUnit', e.target.value)}
                                placeholder="e.g. mg"
                                className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <Field label="Route" value={form.route} onChange={v => updateField('route', v)} placeholder="e.g. ORAL" />
                    <Field label="DEA Schedule" value={form.deaSchedule} onChange={v => updateField('deaSchedule', v)} placeholder="e.g. CII, CIII" />

                    {/* Row 4: Lot / Serial / Expiration */}
                    <Field label="Lot Number" value={form.lotNumber} onChange={v => updateField('lotNumber', v)} placeholder="Lot #" />
                    <Field label="Serial Number" value={form.serialNumber} onChange={v => updateField('serialNumber', v)} placeholder="Serial #" />
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
                        <input
                            type="date"
                            value={form.expirationDate}
                            onChange={e => updateField('expirationDate', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                <hr className="my-4 border-gray-200" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quantity & Pricing</h2>

                {(() => {
                    const pkgSize = parseFloat(form.fullPackageSize) || 0;
                    const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
                    let isPartialDerived = false;
                    let pctDerived = 0;
                    let unitsDerived = 0;
                    if (form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0) {
                        if (form.qtyMode === 'units') {
                            unitsDerived = qtyNum;
                            pctDerived = (qtyNum / pkgSize) * 100;
                        } else {
                            pctDerived = qtyNum;
                            unitsDerived = (pctDerived / 100) * pkgSize;
                        }
                        isPartialDerived = unitsDerived < pkgSize && pctDerived < 100;
                    }
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Standard Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.standardPrice}
                                    onChange={e => updateField('standardPrice', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Full Package Size</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.fullPackageSize}
                                    onChange={e => updateField('fullPackageSize', e.target.value)}
                                    placeholder="e.g. 60"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Qty Returned
                                    <span className="ml-1 font-normal text-gray-400">
                                        ({form.qtyMode === 'units' ? 'units' : '%'})
                                    </span>
                                </label>
                                <div className="flex gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={form.fullPackageQtyReturned}
                                        onChange={e => updateField('fullPackageQtyReturned', e.target.value)}
                                        placeholder={form.qtyMode === 'units' ? 'e.g. 45' : 'e.g. 75'}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateField('qtyMode', form.qtyMode === 'units' ? 'percent' : 'units')}
                                        className="px-2 py-1 text-xs font-semibold rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                                        title="Toggle between unit count and percentage"
                                    >
                                        {form.qtyMode === 'units' ? '#' : '%'}
                                    </button>
                                </div>
                                {form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0 && (
                                    <p className={`text-xs mt-1 font-medium ${isPartialDerived ? 'text-green-600' : 'text-green-600'}`}>
                                        {isPartialDerived
                                            ? `Partial — ${pctDerived.toFixed(1)}% (${unitsDerived.toFixed(1)} units)`
                                            : 'Full bottle'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Value</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={`$${estimatedValue.toFixed(2)}`}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700 font-medium"
                                />
                            </div>
                        </div>
                    );
                })()}

                <hr className="my-4 border-gray-200" />
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Classification</h2>
                    <button
                        type="button"
                        onClick={async () => {
                            if (policyAutoCheck) {
                                setPolicyModalOpen(true);
                            } else if (form.ndc && form.expirationDate) {
                                await runPolicyCheck(form.ndc, form.expirationDate, form.dosageForm || undefined);
                                setPolicyModalOpen(true);
                            } else {
                                setPolicyModalOpen(true);
                            }
                        }}
                        disabled={isPolicyChecking || (!form.ndc && !form.manufacturer)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isPolicyChecking
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                            : <><ShieldCheck className="w-3.5 h-3.5" /> View Policy</>
                        }
                    </button>
                </div>

                {/* Policy auto-detection result banner */}
                {isPolicyChecking && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                        Running manufacturer policy check...
                    </div>
                )}
                {!isPolicyChecking && policyAutoCheck && (
                    <div className={`mb-3 flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
                        policyAutoCheck.status === 'returnable'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : policyAutoCheck.status === 'non_returnable'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                        {policyAutoCheck.status === 'returnable'
                            ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            : policyAutoCheck.status === 'non_returnable'
                            ? <Ban className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        }
                        <div>
                            <span className="font-semibold">
                                {policyAutoCheck.manufacturerName
                                    ? `${policyAutoCheck.manufacturerName} policy: `
                                    : 'Policy: '}
                            </span>
                            {policyAutoCheck.status === 'returnable' && 'Auto-classified as Returnable — status locked.'}
                            {policyAutoCheck.status === 'non_returnable' && `Auto-classified as Non-Returnable — status locked. ${policyAutoCheck.reason ? `(${policyAutoCheck.reason.replace(/_/g, ' ')})` : ''}`}
                            {policyAutoCheck.status === 'tbd' && 'No matching policy found — please select status manually.'}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-4 mb-3">
                    {(['tbd', 'returnable', 'non_returnable'] as const).map((status) => {
                        const lockedByPolicy = !isPolicyChecking && policyAutoCheck && policyAutoCheck.status !== 'tbd';
                        const isLocked = !!lockedByPolicy;
                        return (
                            <label key={status} className={`flex items-center gap-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="returnStatus"
                                    value={status}
                                    checked={form.returnStatus === status}
                                    onChange={() => { if (!isLocked) updateField('returnStatus', status); }}
                                    disabled={isLocked}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className={`font-medium ${
                                    status === 'returnable' ? 'text-green-700' :
                                    status === 'non_returnable' ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                    {status === 'tbd' ? 'TBD' : status === 'returnable' ? 'Returnable' : 'Non-Returnable'}
                                </span>
                                {isLocked && form.returnStatus === status && (
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                )}
                            </label>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Return Reason</label>
                        <select
                            value={form.returnReason}
                            onChange={e => updateField('returnReason', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {RETURN_REASONS.map(r => <option key={r} value={r}>{r || '— Select reason —'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Memo</label>
                        <input
                            type="text"
                            value={form.memo}
                            onChange={e => updateField('memo', e.target.value)}
                            placeholder="Optional memo"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-gray-200">
                    {isPreChecking ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                            <Loader2 className="w-4 h-4 animate-spin" /> Checking return policy...
                        </div>
                    ) : preCheckResult?.expectedReturnableDate ? (
                        <>
                            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                                <Archive className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-purple-800">This product is too early to return</p>
                                    <p className="text-xs text-purple-700 mt-0.5">
                                        It will be shelved in the Wine Cellar. Return window opens:{' '}
                                        <span className="font-semibold">{preCheckResult.expectedReturnableDate}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => handleSave(true)}
                                    disabled={isItemActionLoading}
                                >
                                    {isItemActionLoading
                                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Moving...</>
                                        : <><Archive className="w-4 h-4 mr-1" />Move to Wine Cellar</>
                                    }
                                </Button>
                                <Button variant="outline" onClick={handleClearForm}>
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="primary"
                                onClick={() => handleSave()}
                                disabled={isItemActionLoading || isPreChecking || (!form.ndc && !form.proprietaryName)}
                            >
                                {isItemActionLoading || isPreChecking ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-1" />{isPreChecking ? 'Checking...' : 'Saving...'}</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-1" />Save &amp; Scan Next</>
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleClearForm}>
                                <RotateCcw className="w-4 h-4 mr-1" /> Clear Form
                            </Button>
                            <Button variant="ghost" onClick={() => router.push(`/warehouse/returns/${transactionId}`)}>
                                <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {/* ── Policy Modal ─────────────────────────────── */}
            {policyModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPolicyModalOpen(false)}>
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b bg-gray-50 rounded-t-xl">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-600" />
                                Manufacturer Return Policy
                            </h2>
                            <button onClick={() => setPolicyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5">
                            {isPolicyChecking ? (
                                <div className="flex flex-col items-center py-10 gap-3 text-gray-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="text-sm">Checking manufacturer policy...</p>
                                </div>
                            ) : !policyAutoCheck ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Info className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-medium">No policy data available</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {form.ndc || form.manufacturer
                                            ? 'No matching manufacturer policy was found in the system.'
                                            : 'Scan or enter a product first to check its policy.'}
                                    </p>
                                    {(form.ndc && form.expirationDate) && (
                                        <button
                                            onClick={async () => { await runPolicyCheck(form.ndc, form.expirationDate, form.dosageForm || undefined); }}
                                            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                                        >
                                            <ShieldCheck className="w-4 h-4" /> Check Policy Now
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Status banner */}
                                    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                                        policyAutoCheck.status === 'returnable'
                                            ? 'bg-green-100 border border-green-300'
                                            : policyAutoCheck.status === 'non_returnable'
                                            ? 'bg-red-100 border border-red-300'
                                            : 'bg-yellow-100 border border-yellow-300'
                                    }`}>
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            policyAutoCheck.status === 'returnable' ? 'bg-green-200' :
                                            policyAutoCheck.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                                        }`}>
                                            {policyAutoCheck.status === 'returnable'
                                                ? <CheckCircle className="w-5 h-5 text-green-700" />
                                                : policyAutoCheck.status === 'non_returnable'
                                                ? <Ban className="w-5 h-5 text-red-700" />
                                                : <AlertTriangle className="w-5 h-5 text-yellow-700" />
                                            }
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${
                                                policyAutoCheck.status === 'returnable' ? 'text-green-800' :
                                                policyAutoCheck.status === 'non_returnable' ? 'text-red-800' : 'text-yellow-800'
                                            }`}>
                                                {policyAutoCheck.status === 'returnable' ? 'RETURNABLE'
                                                    : policyAutoCheck.status === 'non_returnable' ? 'NON-RETURNABLE'
                                                    : 'TBD — No Policy Found'}
                                            </p>
                                            {policyAutoCheck.reason && (
                                                <p className="text-xs text-gray-600 mt-0.5 capitalize">
                                                    {policyAutoCheck.reason.replace(/_/g, ' ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Policy details grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {policyAutoCheck.manufacturerName && (
                                            <PolicyDetail label="Manufacturer" value={policyAutoCheck.manufacturerName} />
                                        )}
                                        {policyAutoCheck.destination && (
                                            <PolicyDetail label="Destination" value={policyAutoCheck.destination} capitalize />
                                        )}
                                        {policyAutoCheck.windowStart && (
                                            <PolicyDetail label="Return Window Start" value={policyAutoCheck.windowStart} />
                                        )}
                                        {policyAutoCheck.windowEnd && (
                                            <PolicyDetail label="Return Window End" value={policyAutoCheck.windowEnd} />
                                        )}
                                        {policyAutoCheck.expectedReturnableDate && (
                                            <PolicyDetail
                                                label="Returnable From"
                                                value={policyAutoCheck.expectedReturnableDate}
                                                highlight="purple"
                                            />
                                        )}
                                        {policyAutoCheck.discountRate != null && (
                                            <PolicyDetail label="Discount Rate" value={`${policyAutoCheck.discountRate}%`} />
                                        )}
                                        {policyAutoCheck.reimbursementType && (
                                            <PolicyDetail label="Reimbursement Type" value={policyAutoCheck.reimbursementType} capitalize />
                                        )}
                                        {policyAutoCheck.partialsAccepted != null && (
                                            <PolicyDetail
                                                label="Partials Accepted"
                                                value={policyAutoCheck.partialsAccepted ? 'Yes' : 'No'}
                                                highlight={policyAutoCheck.partialsAccepted ? 'green' : 'red'}
                                            />
                                        )}
                                        {policyAutoCheck.policyNumber != null && (
                                            <PolicyDetail label="Policy #" value={String(policyAutoCheck.policyNumber)} />
                                        )}
                                        {policyAutoCheck.autoRaEmail && (
                                            <PolicyDetail label="RA Email" value={policyAutoCheck.autoRaEmail} />
                                        )}
                                    </div>

                                    {policyAutoCheck.policyDescription && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Policy Notes</p>
                                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border text-xs leading-relaxed">
                                                {policyAutoCheck.policyDescription}
                                            </p>
                                        </div>
                                    )}

                                    {policyAutoCheck.status === 'tbd' && (
                                        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            No manufacturer policy was matched for this product. You can manually set the return status using the radio buttons.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setPolicyModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Reusable field component ───────────────────────────────────

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-sm ${valueClass} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
        </div>
    );
}
