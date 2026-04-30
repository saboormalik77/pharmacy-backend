'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    PackageCheck, Loader2, Search, ScanLine, CheckCircle, XCircle, Package,
    Box, AlertTriangle,
    ArrowRight, RotateCcw, Truck, Clock, ChevronLeft, Camera, Copy, Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    scanBox,
    fetchPendingReturns,
    fetchReceivedReturns,
    clearCurrentReturn,
    ScanBoxResult,
    ScanProgress,
} from '@/lib/store/warehouseSlice';
import { ReturnTransaction } from '@/lib/types';

const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

type Tab = 'scan' | 'pending' | 'received';

interface ScanState {
    currentReturn: ReturnTransaction | null;
    scanProgress: ScanProgress | null;
    scannedNumbers: string[];
}

function isValidReceivingTab(v: string | null): v is Tab {
    return v === 'scan' || v === 'pending' || v === 'received';
}

export default function WarehouseReceivingPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        pendingReturns, receivedReturns,
        pendingPagination, receivedPagination,
        isLoading, isActionLoading,
    } = useAppSelector(s => s.warehouse);

    const [tab, setTab] = useState<Tab>('scan');
    const [trackingInput, setTrackingInput] = useState('');
    const [scanState, setScanState] = useState<ScanState>({
        currentReturn: null,
        scanProgress: null,
        scannedNumbers: [],
    });
    const [scanError, setScanError] = useState('');
    const [scanMessage, setScanMessage] = useState('');
    const [search, setSearch] = useState('');
    const [verificationFilter, setVerificationFilter] = useState<string>(''); // '', 'verified', 'unverified'
    const debouncedSearch = useDebounce(search, 400);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [receiveScanMode, setReceiveScanMode] = useState<'camera' | 'input'>('camera');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [copiedTrackingKey, setCopiedTrackingKey] = useState<string | null>(null);
    const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const copyTrackingNumber = (text: string, key: string) => {
        void navigator.clipboard.writeText(text);
        if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
        setCopiedTrackingKey(key);
        copyFeedbackTimeoutRef.current = setTimeout(() => {
            setCopiedTrackingKey(null);
            copyFeedbackTimeoutRef.current = null;
        }, 2000);
    };

    useEffect(() => () => {
        if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current);
    }, []);

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        const t = searchParams.get('tab');
        if (isValidReceivingTab(t)) {
            setTab(t);
        }
    }, [searchParams]);

    useEffect(() => {
        if (tab === 'pending') dispatch(fetchPendingReturns({ search: debouncedSearch }));
        if (tab === 'received') dispatch(fetchReceivedReturns({ 
            search: debouncedSearch, 
            verificationStatus: verificationFilter || undefined 
        }));
    }, [tab, debouncedSearch, verificationFilter, dispatch]);

    useEffect(() => {
        if (tab !== 'scan') setCameraOpen(false);
    }, [tab]);

    useEffect(() => {
        if (tab === 'scan' && receiveScanMode === 'input') {
            const t = window.setTimeout(() => inputRef.current?.focus(), 100);
            return () => window.clearTimeout(t);
        }
    }, [tab, receiveScanMode]);

    const handleScan = async (overrideTracking?: string) => {
        const tracking = (overrideTracking ?? trackingInput).trim();
        if (!tracking) return;

        setScanError('');
        setScanMessage('');

        const result = await dispatch(scanBox(tracking));

        if (scanBox.fulfilled.match(result)) {
            const { transaction, scanProgress, alreadyScanned, message } = result.payload;

            setScanState(prev => ({
                currentReturn: transaction,
                scanProgress,
                scannedNumbers: alreadyScanned
                    ? prev.scannedNumbers
                    : [...prev.scannedNumbers, tracking],
            }));

            if (alreadyScanned) {
                setScanMessage(message);
                showToast(message, 'warning');
            } else if (scanProgress.allScanned) {
                setScanMessage(message);
                showToast('All boxes scanned! Return is now received.', 'success');
            } else {
                setScanMessage(message);
                showToast(message, 'success');
            }

            setTrackingInput('');
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setScanError(result.payload as string || 'Failed to scan box');
        }
    };

    const handleScanKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleScan();
        }
    };

    const handleCameraScan = (raw: string) => {
        setCameraOpen(false);
        void handleScan(raw);
    };

    const handleReset = () => {
        setTrackingInput('');
        setScanState({ currentReturn: null, scanProgress: null, scannedNumbers: [] });
        setScanError('');
        setScanMessage('');
        dispatch(clearCurrentReturn());
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const { currentReturn: scannedReturn, scanProgress } = scanState;

    const allPackageTrackingNumbers: string[] = [];
    if (scannedReturn?.packageTracking && typeof scannedReturn.packageTracking === 'object') {
        Object.values(scannedReturn.packageTracking).forEach((v: any) => {
            if (v && !allPackageTrackingNumbers.includes(v)) allPackageTrackingNumbers.push(v);
        });
    }

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'scan', label: 'Scan & Receive', icon: ScanLine },
        { key: 'pending', label: 'Pending', icon: Clock },
        { key: 'received', label: 'Received', icon: CheckCircle },
    ];

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Back + Header */}
            <div>
                <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                </Link>
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-primary-600" /> Warehouse Receiving
                </h1>
                <p className="text-xs text-gray-500">Scan each box's tracking number. All boxes must be scanned before the return is marked as received.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Scan & Receive ─────────────────────── */}
            {tab === 'scan' && (
                <div className="space-y-3">
                    {/* Scanner: camera (same modal as return add-items) or USB / keyboard */}
                    <div className="bg-white rounded-lg shadow px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label className="block text-xs font-medium text-gray-700">
                                <Truck className="w-3.5 h-3.5 inline mr-1" />
                                {scanProgress && !scanProgress.allScanned
                                    ? `Next box (${scanProgress.scannedCount} of ${scanProgress.totalPackages} scanned)`
                                    : 'Box tracking number'
                                }
                            </label>
                            <div className="flex gap-1">
                                {([
                                    { key: 'camera' as const, icon: Camera, label: 'Camera' },
                                    { key: 'input' as const, icon: ScanLine, label: 'USB / keyboard' },
                                ]).map(({ key, icon: Icon, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setReceiveScanMode(key)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                            receiveScanMode === key
                                                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Icon className="w-3 h-3" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {receiveScanMode === 'camera' && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setCameraOpen(true)}
                                    disabled={isActionLoading || (scanProgress?.allScanned ?? false)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-primary-300 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isActionLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                            <span className="text-xs font-medium text-primary-700">Processing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-4 h-4 text-primary-600" />
                                            <span className="text-xs font-semibold text-primary-800">Open camera scanner</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Scan the FedEx/UPS barcode on the shipping label (same scanner as return add-items).
                                </p>
                            </div>
                        )}

                        {receiveScanMode === 'input' && (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={trackingInput}
                                        onChange={e => setTrackingInput(e.target.value)}
                                        onKeyDown={handleScanKeyDown}
                                        placeholder={scanProgress && !scanProgress.allScanned
                                            ? 'Scan next box tracking number…'
                                            : 'USB wedge: scan barcode — or type — then Enter'
                                        }
                                        className="w-full pl-9 pr-3 py-2 text-sm border-2 border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-primary-50 font-mono"
                                        autoFocus
                                        disabled={isActionLoading || (scanProgress?.allScanned ?? false)}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={() => void handleScan()}
                                    disabled={isActionLoading || !trackingInput.trim() || (scanProgress?.allScanned ?? false)}
                                    className="px-4"
                                >
                                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
                                </Button>
                                {scannedReturn && (
                                    <Button variant="outline" onClick={handleReset} className="px-3">
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )}

                        {receiveScanMode === 'camera' && scannedReturn && (
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={handleReset} className="px-3">
                                    <RotateCcw className="w-4 h-4" /> Reset session
                                </Button>
                            </div>
                        )}

                        {receiveScanMode === 'input' && (
                            <p className="text-[10px] text-gray-400">
                                USB or Bluetooth handheld scanner types into the field and sends Enter; or type the tracking number and press Enter / Scan.
                            </p>
                        )}
                    </div>

                    {cameraOpen && tab === 'scan' && (
                        <QrScannerModal onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
                    )}

                    {/* Error */}
                    {scanError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-start gap-2.5">
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium text-red-800">Could not scan box</p>
                                <p className="text-xs text-red-600">{scanError}</p>
                            </div>
                        </div>
                    )}

                    {/* Scan Progress Card */}
                    {scannedReturn && scanProgress && (
                        <div className={`border-2 rounded-lg overflow-hidden ${
                            scanProgress.allScanned
                                ? 'bg-green-50 border-green-300'
                                : 'bg-blue-50 border-blue-300'
                        }`}>
                            {/* Header */}
                            <div className={`px-4 py-2 flex items-center justify-between ${
                                scanProgress.allScanned ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {scanProgress.allScanned
                                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                                        : <Box className="w-4 h-4 text-blue-600" />
                                    }
                                    <h3 className={`text-sm font-semibold ${
                                        scanProgress.allScanned ? 'text-green-800' : 'text-blue-800'
                                    }`}>
                                        {scanProgress.allScanned
                                            ? 'All Boxes Scanned — Return Received!'
                                            : `Scanning in Progress — ${scanProgress.scannedCount} of ${scanProgress.totalPackages} boxes`
                                        }
                                    </h3>
                                </div>
                                {!scanProgress.allScanned && (
                                    <Badge variant="warning">
                                        <span className="text-[10px]">{scanProgress.totalPackages - scanProgress.scannedCount} remaining</span>
                                    </Badge>
                                )}
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Return info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'License Plate', value: <span className="font-mono font-bold">{scannedReturn.licensePlate}</span> },
                                        { label: 'Pharmacy', value: scannedReturn.pharmacyName },
                                        { label: 'Total Items', value: scannedReturn.totalItems },
                                        { label: 'Box Count', value: scannedReturn.boxCount ?? scanProgress.totalPackages },
                                        { label: 'Returnable Value', value: <span className="text-green-700">${Number(scannedReturn.totalReturnableValue || 0).toFixed(2)}</span> },
                                        { label: 'Status', value: (
                                            <Badge variant={scanProgress.allScanned ? 'success' : 'warning'}>
                                                <span className="text-[10px]">{scanProgress.allScanned ? 'Received' : 'Scanning'}</span>
                                            </Badge>
                                        )},
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-gray-500">{label}</p>
                                            <p className="text-xs font-medium text-gray-900 mt-0.5">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                                        <span>Scan progress</span>
                                        <span>{scanProgress.scannedCount} / {scanProgress.totalPackages}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-500 ${
                                                scanProgress.allScanned ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${(scanProgress.scannedCount / scanProgress.totalPackages) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Package list with scan status */}
                                {allPackageTrackingNumbers.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-600 uppercase mb-1.5">Package Tracking Numbers</p>
                                        <div className="space-y-1">
                                            {allPackageTrackingNumbers.map((num, idx) => {
                                                const isScanned = scanState.scannedNumbers.some(
                                                    s => s.toLowerCase() === num.toLowerCase()
                                                );
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${
                                                            isScanned
                                                                ? 'bg-green-50 border-green-200'
                                                                : 'bg-white border-gray-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-500 w-16">Box {idx + 1}</span>
                                                            <span className="font-mono text-xs font-medium text-gray-900">{num}</span>
                                                        </div>
                                                        {isScanned ? (
                                                            <div className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-medium">Scanned</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-gray-400">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-medium">Waiting</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Info message */}
                                {scanMessage && (
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${
                                        scanProgress.allScanned
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {scanProgress.allScanned
                                            ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                        }
                                        {scanMessage}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t border-gray-200">
                                    {scanProgress.allScanned && (
                                        <Button variant="primary" size="sm" onClick={() => router.push(`/warehouse/verification/${scannedReturn.id}`)}>
                                            <ArrowRight className="w-3.5 h-3.5 mr-1" />Start Verification
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={handleReset}>
                                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                        {scanProgress.allScanned ? 'Receive Another' : 'Reset'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Pending ────────────────────────────── */}
            {tab === 'pending' && (
                <div className="space-y-2">
                    <div className="bg-white rounded-lg shadow px-3 py-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                    ) : pendingReturns.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-10 text-center">
                            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">No finalized returns awaiting check-in</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">License Plate</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Pharmacy</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">FedEx Tracking</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Items</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Boxes</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Scan Status</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Finalized</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {pendingReturns.map(r => {
                                        const totalPkgs = r.packageTracking && typeof r.packageTracking === 'object'
                                            ? Object.keys(r.packageTracking).length
                                            : 1;
                                        const scannedPkgs = r.scannedPackages && typeof r.scannedPackages === 'object'
                                            ? Object.keys(r.scannedPackages).length
                                            : 0;
                                        const fedexCopyKey = `${r.id}:fedex`;
                                        const fedexJustCopied = copiedTrackingKey === fedexCopyKey;
                                        return (
                                            <tr key={r.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{r.licensePlate}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{r.pharmacyName}</td>
                                                <td className="px-4 py-3">
                                                    {r.packageTracking && Object.keys(r.packageTracking).length > 0 ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {Object.values(r.packageTracking).map((tn: any, i) => {
                                                                const ck = `${r.id}:pkg:${i}`;
                                                                const justCopied = copiedTrackingKey === ck;
                                                                return (
                                                                <div key={i} className="flex items-center gap-1 group/tn">
                                                                    <span className="text-[11px] font-mono text-gray-600 leading-tight">{tn}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyTrackingNumber(String(tn), ck)}
                                                                        className={`p-0.5 rounded transition-all ${
                                                                            justCopied
                                                                                ? 'opacity-100 text-green-600 bg-green-50'
                                                                                : 'opacity-0 group-hover/tn:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                                                        }`}
                                                                        title={justCopied ? 'Copied' : 'Copy tracking number'}
                                                                    >
                                                                        {justCopied ? (
                                                                            <Check className="w-3 h-3" strokeWidth={2.5} />
                                                                        ) : (
                                                                            <Copy className="w-3 h-3" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 group/tn">
                                                            <span className="text-[11px] font-mono text-gray-600">{r.fedexTracking || '—'}</span>
                                                            {r.fedexTracking && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyTrackingNumber(r.fedexTracking!, fedexCopyKey)}
                                                                    className={`p-0.5 rounded transition-all ${
                                                                        fedexJustCopied
                                                                            ? 'opacity-100 text-green-600 bg-green-50'
                                                                            : 'opacity-0 group-hover/tn:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                                                    }`}
                                                                    title={fedexJustCopied ? 'Copied' : 'Copy tracking number'}
                                                                >
                                                                    {fedexJustCopied ? (
                                                                        <Check className="w-3 h-3" strokeWidth={2.5} />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-900">{r.totalItems}</td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-900">{r.boxCount ?? '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {scannedPkgs > 0 ? (
                                                        <Badge variant="warning">
                                                            <span className="text-[10px]">{scannedPkgs}/{totalPkgs} scanned</span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="default">
                                                            <span className="text-[10px]">Not scanned</span>
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{r.finalizedAt ? formatDate(r.finalizedAt) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {pendingPagination && pendingPagination.totalPages > 1 && (
                                <div className="flex justify-between items-center px-3 py-2 border-t bg-gray-50 text-[10px] text-gray-500">
                                    <span>Page {pendingPagination.page} of {pendingPagination.totalPages} ({pendingPagination.total} total)</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Received ───────────────────────────── */}
            {tab === 'received' && (
                <div className="space-y-2">
                    <div className="bg-white rounded-lg shadow px-3 py-2 space-y-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                        
                        {/* Verification Status Filter */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-gray-500 mr-2">Filter:</span>
                            <button
                                onClick={() => setVerificationFilter('')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === '' 
                                        ? 'bg-primary-100 text-primary-800 border border-primary-300' 
                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                All Returns
                            </button>
                            <button
                                onClick={() => setVerificationFilter('unverified')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === 'unverified' 
                                        ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                Needs Verification
                            </button>
                            <button
                                onClick={() => setVerificationFilter('verified')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === 'verified' 
                                        ? 'bg-green-100 text-green-800 border border-green-300' 
                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                Verified
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                    ) : receivedReturns.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-10 text-center">
                            <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">
                                {verificationFilter === 'verified' ? 'No verified returns found' :
                                 verificationFilter === 'unverified' ? 'No returns awaiting verification' :
                                 'No received returns found'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">License Plate</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Pharmacy</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Items</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Received</th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Verified</th>
                                        <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {receivedReturns.map(r => (
                                        <tr key={r.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{r.licensePlate}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{r.pharmacyName}</td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-900">{r.totalItems}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{r.receivedInWarehouseDate ? formatDateTime(r.receivedInWarehouseDate) : '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {r.verifiedIntegrity ? (
                                                    <Badge variant="success"><span className="text-[10px]">Verified</span></Badge>
                                                ) : (
                                                    <Badge variant="warning"><span className="text-[10px]">Pending</span></Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {r.verifiedIntegrity ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/warehouse/returns/${r.id}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                                    >
                                                        View <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/warehouse/verification/${r.id}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap"
                                                    >
                                                        Verify <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {receivedPagination && receivedPagination.totalPages > 1 && (
                                <div className="flex justify-between items-center px-3 py-2 border-t bg-gray-50 text-[10px] text-gray-500">
                                    <span>Page {receivedPagination.page} of {receivedPagination.totalPages} ({receivedPagination.total} total)</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
