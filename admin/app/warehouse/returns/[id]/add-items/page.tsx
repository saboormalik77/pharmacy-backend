'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, ScanLine, Keyboard, CheckCircle,
    AlertTriangle, RotateCcw, X, Camera,
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
import { BarcodeScanResponse } from '@/lib/types';

// Dynamically imported so it only loads in the browser (uses WebRTC APIs)
const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

// ── Constants ──────────────────────────────────────────────────

const RETURN_REASONS = [
    '', 'Expired', 'Short-dated', 'Damaged', 'Recalled', 'Overstock',
    'Discontinued', 'Wrong product', 'Formulary change', 'Other',
];

const EMPTY_FORM = {
    ndc: '', ndc10: '', gtin: '', proprietaryName: '', genericName: '',
    manufacturer: '', packageDescription: '', dosageForm: '', strength: '',
    route: '', lotNumber: '', serialNumber: '', expirationDate: '',
    standardPrice: '', quantity: '1', fullPackageSize: '',
    isPartial: false, partialPercentage: '',
    returnStatus: 'tbd' as 'returnable' | 'non_returnable' | 'tbd',
    deaSchedule: '', productType: '',
    returnReason: '', memo: '',
    scanSource: 'manual' as string,
    rawScanData: '',
};

type FormState = typeof EMPTY_FORM;

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
        const qty = parseInt(form.quantity) || 0;
        if (form.isPartial && form.partialPercentage) {
            return price * qty * (parseFloat(form.partialPercentage) / 100);
        }
        return price * qty;
    })();

    // ── Barcode scan handler ───────────────────────────────────

    const handleScan = async (raw: string) => {
        if (!raw.trim()) return;
        setScanError('');
        setLastWarning('');

        const result = await dispatch(scanBarcode(raw.trim()));

        if (scanBarcode.fulfilled.match(result)) {
            const data = result.payload as BarcodeScanResponse;
            const af = data.autoFill;

            setForm({
                ndc: af.ndc || '',
                ndc10: af.ndc10 || '',
                gtin: af.gtin || '',
                proprietaryName: af.proprietaryName || '',
                genericName: af.genericName || '',
                manufacturer: af.manufacturer || '',
                packageDescription: af.packageDescription || '',
                dosageForm: af.dosageForm || '',
                strength: af.strength || '',
                route: af.route || '',
                lotNumber: af.lotNumber || '',
                serialNumber: af.serialNumber || '',
                expirationDate: af.expirationDate || '',
                standardPrice: '',
                quantity: '1',
                fullPackageSize: '',
                isPartial: false,
                partialPercentage: '',
                returnStatus: 'tbd',
                deaSchedule: af.deaSchedule || '',
                productType: af.productType || '',
                returnReason: '',
                memo: '',
                scanSource: af.scanSource || 'gs1_qr',
                rawScanData: raw.trim(),
            });

            if (!data.product) {
                setScanError('Barcode parsed but product not found in database. Fields partially filled — please complete manually.');
            }

            setScanInput('');
        } else {
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

    const handleSave = async () => {
        if (!form.ndc && !form.proprietaryName) {
            showToast('Please scan or enter a product first.', 'error');
            return;
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
        if (form.strength) payload.strength = form.strength;
        if (form.route) payload.route = form.route;
        if (form.lotNumber) payload.lotNumber = form.lotNumber;
        if (form.serialNumber) payload.serialNumber = form.serialNumber;
        if (form.expirationDate) payload.expirationDate = form.expirationDate;
        if (form.standardPrice) payload.standardPrice = parseFloat(form.standardPrice);
        payload.quantity = parseInt(form.quantity) || 1;
        if (form.fullPackageSize) payload.fullPackageSize = parseInt(form.fullPackageSize);
        payload.isPartial = form.isPartial;
        if (form.isPartial && form.partialPercentage) payload.partialPercentage = parseFloat(form.partialPercentage);
        payload.returnStatus = form.returnStatus;
        if (form.returnReason) payload.returnReason = form.returnReason;
        if (form.deaSchedule) payload.deaSchedule = form.deaSchedule;
        if (form.productType) payload.productType = form.productType;
        if (form.memo) payload.memo = form.memo;
        payload.scanSource = form.scanSource;
        if (form.rawScanData) payload.rawScanData = form.rawScanData;

        const result = await dispatch(addTransactionItem({ transactionId, payload }));

        if (addTransactionItem.fulfilled.match(result)) {
            setItemCount(prev => prev + 1);
            const name = form.proprietaryName || form.ndc || 'Item';
            showToast(`${name} saved! Ready for next scan.`);

            if (result.payload.warning) {
                setLastWarning(result.payload.warning);
            } else {
                setLastWarning('');
            }

            setForm({ ...EMPTY_FORM });
            setScanError('');
            setScanInput('');
            if (mode === 'usb') scanInputRef.current?.focus();
        } else {
            showToast(result.payload as string || 'Failed to save item', 'error');
        }
    };

    const handleClearForm = () => {
        setForm({ ...EMPTY_FORM });
        setScanError('');
        setLastWarning('');
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
            <ToastContainer toasts={toasts} removeToast={removeToast} />

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

                    {/* Row 3: Strength / Route / DEA */}
                    <Field label="Strength" value={form.strength} onChange={v => updateField('strength', v)} placeholder="e.g. 200 mg" />
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            value={form.quantity}
                            onChange={e => updateField('quantity', e.target.value)}
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Value</label>
                        <input
                            type="text"
                            readOnly
                            value={`$${estimatedValue.toFixed(2)}`}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700 font-medium"
                        />
                    </div>
                </div>

                {/* Partial toggle */}
                <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isPartial}
                            onChange={e => updateField('isPartial', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">Partial bottle</span>
                    </label>
                    {form.isPartial && (
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={form.partialPercentage}
                                onChange={e => updateField('partialPercentage', e.target.value)}
                                placeholder="%"
                                className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-500">% remaining</span>
                        </div>
                    )}
                </div>

                <hr className="my-4 border-gray-200" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Classification</h2>

                <div className="flex flex-wrap gap-4 mb-3">
                    {(['tbd', 'returnable', 'non_returnable'] as const).map((status) => (
                        <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="radio"
                                name="returnStatus"
                                value={status}
                                checked={form.returnStatus === status}
                                onChange={() => updateField('returnStatus', status)}
                                className="text-primary-600 focus:ring-primary-500"
                            />
                            <span className={`font-medium ${
                                status === 'returnable' ? 'text-green-700' :
                                status === 'non_returnable' ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                                {status === 'tbd' ? 'TBD' : status === 'returnable' ? 'Returnable' : 'Non-Returnable'}
                            </span>
                        </label>
                    ))}
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
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-200">
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isItemActionLoading || (!form.ndc && !form.proprietaryName)}
                    >
                        {isItemActionLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</>
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
            </div>
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
