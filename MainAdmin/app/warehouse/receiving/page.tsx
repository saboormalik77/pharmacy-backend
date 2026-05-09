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
                <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-[var(--outline)] hover:text-primary-600 mb-1.5 transition-colors">
                    <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                </Link>
                <h1 className="font-heading text-headline flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                    <PackageCheck className="w-4 h-4 text-primary-600" /> Warehouse Receiving
                </h1>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Scan each box's tracking number. All boxes must be scanned before the return is marked as received.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-[4px] p-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                            tab === t.key ? 'shadow-sm' : ''
                        }`}
                        style={tab === t.key ? { backgroundColor: 'var(--surface-container-lowest)', color: 'var(--primary)' } : { color: 'var(--on-surface-variant)' }}
                    >
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Scan & Receive ─────────────────────── */}
            {tab === 'scan' && (
                <div className="space-y-3">
                    {/* Scanner: camera (same modal as return add-items) or USB / keyboard */}
                    <div className="rounded-[4px] shadow px-4 py-3 space-y-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label className="block text-xs font-medium" style={{ color: 'var(--on-surface)' }}>
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
                                                ? ''
                                                : ''
                                        }`}
                                        style={receiveScanMode === key ? { backgroundColor: 'var(--surface-container-lowest)', color: 'var(--primary)', border: '1px solid var(--primary)' } : { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
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
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
                                >
                                    {isActionLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary)' }} />
                                            <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Processing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                            <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Open camera scanner</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                                    Scan the FedEx/UPS barcode on the shipping label (same scanner as return add-items).
                                </p>
                            </div>
                        )}

                        {receiveScanMode === 'input' && (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                    <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
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
                                className="w-full pl-9 pr-3 py-2 text-sm border-2 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)' }}
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
                            <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                                USB or Bluetooth handheld scanner types into the field and sends Enter; or type the tracking number and press Enter / Scan.
                            </p>
                        )}
                    </div>

                    {cameraOpen && tab === 'scan' && (
                        <QrScannerModal onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
                    )}

                    {/* Error */}
                    {scanError && (
                        <div className="border rounded-[4px] px-4 py-2.5 flex items-start gap-2.5" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                            <div>
                                <p className="text-xs font-medium" style={{ color: 'var(--on-error-container)' }}>Could not scan box</p>
                                <p className="text-xs" style={{ color: 'var(--on-error-container)' }}>{scanError}</p>
                            </div>
                        </div>
                    )}

                    {/* Scan Progress Card */}
                    {scannedReturn && scanProgress && (
                        <div
                            className="border-2 rounded-[4px] overflow-hidden"
                            style={{
                                backgroundColor: scanProgress.allScanned ? 'var(--secondary-fixed)' : 'var(--primary-container)',
                                borderColor: scanProgress.allScanned ? 'var(--secondary)' : 'var(--outline-variant)',
                                boxShadow: scanProgress.allScanned ? '0 0 0 2px var(--secondary-container), 0 4px 12px rgba(61, 67, 67, 0.15)' : undefined,
                            }}
                        >
                            {/* Header */}
                            <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: scanProgress.allScanned ? 'var(--secondary-container)' : 'var(--surface-container-low)' }}>
                                <div className="flex items-center gap-2">
                                    {scanProgress.allScanned
                                        ? <CheckCircle className="w-4.5 h-4.5" style={{ color: 'var(--secondary)' }} />
                                        : <Box className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                    }
                                    <h3 className="font-heading text-sm font-semibold" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>
                                        {scanProgress.allScanned
                                            ? 'All Boxes Scanned — Return Received!'
                                            : `Scanning in Progress — ${scanProgress.scannedCount} of ${scanProgress.totalPackages} boxes`
                                        }
                                    </h3>
                                </div>
                                {!scanProgress.allScanned ? (
                                    <Badge variant="warning">
                                        <span className="text-[10px]">{scanProgress.totalPackages - scanProgress.scannedCount} remaining</span>
                                    </Badge>
                                ) : (
                                    <Badge variant="success">
                                        <span className="text-[10px]">Complete</span>
                                    </Badge>
                                )}
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Return info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'License Plate', value: <span className="font-mono font-bold text-sm" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>{scannedReturn.licensePlate}</span> },
                                        { label: 'Pharmacy', value: <span className="text-xs font-medium" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>{scannedReturn.pharmacyName}</span> },
                                        { label: 'Total Items', value: <span className="text-xs font-medium" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>{scannedReturn.totalItems}</span> },
                                        { label: 'Box Count', value: <span className="text-xs font-medium" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>{scannedReturn.boxCount ?? scanProgress.totalPackages}</span> },
                                        { label: 'Returnable Value', value: <span className="text-xs font-bold" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--secondary)' }}>${Number(scannedReturn.totalReturnableValue || 0).toFixed(2)}</span> },
                                        { label: 'Status', value: (
                                            <Badge variant={scanProgress.allScanned ? 'success' : 'warning'}>
                                                <span className="text-[10px]">{scanProgress.allScanned ? 'Received' : 'Scanning'}</span>
                                            </Badge>
                                        )},
                                    ].map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-[10px]" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--on-surface-variant)' }}>{label}</p>
                                            <p className="mt-0.5">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--on-surface-variant)' }}>
                                        <span>Scan progress</span>
                                        <span>{scanProgress.scannedCount} / {scanProgress.totalPackages}</span>
                                    </div>
                                    <div className="w-full rounded-full h-2.5" style={{ backgroundColor: 'var(--surface-container-low)' }}>
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-500"
                                            style={{
                                                backgroundColor: scanProgress.allScanned ? 'var(--secondary)' : 'var(--primary)',
                                                width: `${(scanProgress.scannedCount / scanProgress.totalPackages) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Package list with scan status */}
                                {allPackageTrackingNumbers.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--on-surface-variant)' }}>Package Tracking Numbers</p>
                                        <div className="space-y-1">
                                            {allPackageTrackingNumbers.map((num, idx) => {
                                                const isScanned = scanState.scannedNumbers.some(
                                                    s => s.toLowerCase() === num.toLowerCase()
                                                );
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between px-3 py-1.5 rounded-[4px] border"
                                                        style={{
                                                            backgroundColor: isScanned ? 'var(--secondary-container)' : 'var(--surface-container-low)',
                                                            borderColor: scanProgress.allScanned ? 'var(--secondary)' : 'var(--outline-variant)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] w-16" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--on-surface-variant)' }}>Box {idx + 1}</span>
                                                            <span className="font-mono text-xs font-medium" style={{ color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--foreground)' }}>{num}</span>
                                                        </div>
                                                        {isScanned ? (
                                                            <div className="flex items-center gap-1" style={{ color: 'var(--secondary)' }}>
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-medium">Scanned</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1" style={{ color: 'var(--outline)' }}>
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
                                    <div className="flex items-center gap-2 px-3 py-2 rounded text-xs border" style={{ backgroundColor: scanProgress.allScanned ? 'var(--secondary-container)' : 'var(--surface-container-low)', borderColor: scanProgress.allScanned ? 'var(--secondary)' : 'var(--outline-variant)', color: scanProgress.allScanned ? 'var(--on-secondary-fixed)' : 'var(--on-surface)' }}>
                                        {scanProgress.allScanned
                                            ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                        }
                                        {scanMessage}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: scanProgress.allScanned ? 'var(--secondary)' : 'var(--outline-variant)' }}>
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
                    <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500"
                                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                    ) : pendingReturns.length === 0 ? (
                        <div className="rounded-[4px] shadow p-10 text-center border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <Package className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>No finalized returns awaiting check-in</p>
                        </div>
                    ) : (
                        <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                    <tr className="bg-[var(--surface-container-low)]">
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">License Plate</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">FedEx Tracking</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Items</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Boxes</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Scan Status</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Finalized</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
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
                                            <tr key={r.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-mono font-semibold" style={{ color: 'var(--foreground)' }}>{r.licensePlate}</td>
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{r.pharmacyName}</td>
                                                <td className="px-3 py-3">
                                                    {r.packageTracking && Object.keys(r.packageTracking).length > 0 ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            {Object.values(r.packageTracking).map((tn: any, i) => {
                                                                const ck = `${r.id}:pkg:${i}`;
                                                                const justCopied = copiedTrackingKey === ck;
                                                                return (
                                                                <div key={i} className="flex items-center gap-1 group/tn">
                                                                    <span className="text-[11px] font-mono leading-tight" style={{ color: 'var(--on-surface-variant)' }}>{tn}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyTrackingNumber(String(tn), ck)}
                                                                        className={`p-0.5 rounded transition-all ${
                                                                            justCopied
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0 group-hover/tn:opacity-100'
                                                                        }`}
                                                                        style={justCopied ? { color: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' } : { color: 'var(--outline)' }}
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
                                                            <span className="text-[11px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>{r.fedexTracking || '—'}</span>
                                                            {r.fedexTracking && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyTrackingNumber(r.fedexTracking!, fedexCopyKey)}
                                                                    className={`p-0.5 rounded transition-all ${
                                                                        fedexJustCopied
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0 group-hover/tn:opacity-100'
                                                                    }`}
                                                                    style={fedexJustCopied ? { color: 'var(--secondary)', backgroundColor: 'var(--secondary-container)' } : { color: 'var(--outline)' }}
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
                                                <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--foreground)' }}>{r.totalItems}</td>
                                                <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--foreground)' }}>{r.boxCount ?? '—'}</td>
                                                <td className="px-3 py-3 text-center">
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
                                                <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.finalizedAt ? formatDate(r.finalizedAt) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {pendingPagination && pendingPagination.totalPages > 1 && (
                                <div className="flex justify-between items-center px-3 py-2 border-t text-[10px]" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
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
                    <div className="rounded-[4px] shadow px-3 py-2 space-y-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500"
                                style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}
                            />
                        </div>
                        
                        {/* Verification Status Filter */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium mr-2" style={{ color: 'var(--on-surface-variant)' }}>Filter:</span>
                            <button
                                onClick={() => setVerificationFilter('')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === '' 
                                        ? '' 
                                        : ''
                                }`}
                                style={verificationFilter === '' ? { backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', borderColor: 'var(--outline-variant)' } : { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}
                            >
                                All Returns
                            </button>
                            <button
                                onClick={() => setVerificationFilter('unverified')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === 'unverified' 
                                        ? '' 
                                        : ''
                                }`}
                                style={verificationFilter === 'unverified' ? { backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-container)', borderColor: 'var(--outline-variant)' } : { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}
                            >
                                Needs Verification
                            </button>
                            <button
                                onClick={() => setVerificationFilter('verified')}
                                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                                    verificationFilter === 'verified' 
                                        ? '' 
                                        : ''
                                }`}
                                style={verificationFilter === 'verified' ? { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' } : { backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderColor: 'var(--outline-variant)' }}
                            >
                                Verified
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                    ) : receivedReturns.length === 0 ? (
                        <div className="rounded-[4px] shadow p-10 text-center border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <CheckCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                {verificationFilter === 'verified' ? 'No verified returns found' :
                                 verificationFilter === 'unverified' ? 'No returns awaiting verification' :
                                 'No received returns found'}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                            <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                                <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                    <tr className="bg-[var(--surface-container-low)]">
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">License Plate</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Items</th>
                                        <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Received</th>
                                        <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Verified</th>
                                        <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                    {receivedReturns.map(r => (
                                        <tr key={r.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                            <td className="px-3 py-3 text-sm font-mono font-semibold" style={{ color: 'var(--foreground)' }}>{r.licensePlate}</td>
                                            <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{r.pharmacyName}</td>
                                            <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--foreground)' }}>{r.totalItems}</td>
                                            <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.receivedInWarehouseDate ? formatDateTime(r.receivedInWarehouseDate) : '—'}</td>
                                            <td className="px-3 py-3 text-center">
                                                {r.verifiedIntegrity ? (
                                                    <Badge variant="success"><span className="text-[10px]">Verified</span></Badge>
                                                ) : (
                                                    <Badge variant="warning"><span className="text-[10px]">Pending</span></Badge>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {r.verifiedIntegrity ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push(`/warehouse/returns/${r.id}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:bg-primary-50/40"
                                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
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
                                <div className="flex justify-between items-center px-3 py-2 border-t text-[10px]" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
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
