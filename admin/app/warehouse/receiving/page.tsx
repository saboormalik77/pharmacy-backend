'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    PackageCheck, Loader2, Search, ScanLine, CheckCircle, XCircle, Package,
    ArrowRight, RotateCcw, Truck, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    receiveReturn,
    fetchPendingReturns,
    fetchReceivedReturns,
    clearCurrentReturn,
} from '@/lib/store/warehouseSlice';
import { ReturnTransaction } from '@/lib/types';

type Tab = 'scan' | 'pending' | 'received';

export default function WarehouseReceivingPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {
        pendingReturns, receivedReturns,
        pendingPagination, receivedPagination,
        currentReturn, isLoading, isActionLoading, error,
    } = useAppSelector(s => s.warehouse);

    const [tab, setTab] = useState<Tab>('scan');
    const [trackingInput, setTrackingInput] = useState('');
    const [receivedReturn, setReceivedReturn] = useState<ReturnTransaction | null>(null);
    const [receiveError, setReceiveError] = useState('');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    useEffect(() => {
        if (tab === 'pending') dispatch(fetchPendingReturns({ search: debouncedSearch }));
        if (tab === 'received') dispatch(fetchReceivedReturns({ search: debouncedSearch }));
    }, [tab, debouncedSearch, dispatch]);

    useEffect(() => {
        if (tab === 'scan') inputRef.current?.focus();
    }, [tab]);

    const handleScan = async () => {
        const tracking = trackingInput.trim();
        if (!tracking) return;

        setReceiveError('');
        setReceivedReturn(null);

        const result = await dispatch(receiveReturn(tracking));

        if (receiveReturn.fulfilled.match(result)) {
            setReceivedReturn(result.payload);
            showToast('Return received in warehouse!');
        } else {
            setReceiveError(result.payload as string || 'Failed to receive return');
        }
    };

    const handleScanKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScan();
        }
    };

    const handleReceiveAnother = () => {
        setTrackingInput('');
        setReceivedReturn(null);
        setReceiveError('');
        dispatch(clearCurrentReturn());
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'scan', label: 'Scan & Receive', icon: ScanLine },
        { key: 'pending', label: 'Pending', icon: Clock },
        { key: 'received', label: 'Received', icon: CheckCircle },
    ];

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <PackageCheck className="w-6 h-6 text-primary-600" /> Warehouse Receiving
                </h1>
                <p className="text-sm text-gray-500 mt-1">Scan FedEx tracking to receive returns, then verify contents</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Scan & Receive ─────────────────────── */}
            {tab === 'scan' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Truck className="w-4 h-4 inline mr-1" />Scan FedEx Tracking Number
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <ScanLine className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={trackingInput}
                                    onChange={e => setTrackingInput(e.target.value)}
                                    onKeyDown={handleScanKeyDown}
                                    placeholder="Scan or type FedEx tracking number, then press Enter"
                                    className="w-full pl-10 pr-4 py-3 text-lg border-2 border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-primary-50 font-mono"
                                    autoFocus
                                    disabled={isActionLoading}
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleScan}
                                disabled={isActionLoading || !trackingInput.trim()}
                                className="px-6"
                            >
                                {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Receive'}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Use a barcode scanner pointed at the FedEx label, or type the tracking number manually.</p>
                    </div>

                    {/* Error */}
                    {receiveError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Could not receive return</p>
                                <p className="text-sm text-red-600 mt-0.5">{receiveError}</p>
                            </div>
                        </div>
                    )}

                    {/* Success — received return details */}
                    {receivedReturn && (
                        <div className="bg-green-50 border-2 border-green-300 rounded-lg overflow-hidden">
                            <div className="bg-green-100 px-5 py-3 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <h3 className="text-lg font-semibold text-green-800">Return Received Successfully</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">License Plate</p>
                                        <p className="text-sm font-mono font-bold text-gray-900">{receivedReturn.licensePlate}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Pharmacy</p>
                                        <p className="text-sm font-medium text-gray-900">{receivedReturn.pharmacyName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total Items</p>
                                        <p className="text-sm font-medium text-gray-900">{receivedReturn.totalItems}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">FedEx Tracking</p>
                                        <p className="text-sm font-mono text-gray-900">{receivedReturn.fedexTracking}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Returnable Value</p>
                                        <p className="text-sm font-medium text-green-700">${Number(receivedReturn.totalReturnableValue).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Box Count</p>
                                        <p className="text-sm text-gray-900">{receivedReturn.boxCount ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <Badge variant="success">Received</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Received At</p>
                                        <p className="text-sm text-gray-900">{receivedReturn.receivedInWarehouseDate ? formatDateTime(receivedReturn.receivedInWarehouseDate) : 'Just now'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2 border-t border-green-200">
                                    <Button
                                        variant="primary"
                                        onClick={() => router.push(`/warehouse/receiving/${receivedReturn.id}`)}
                                    >
                                        <ArrowRight className="w-4 h-4 mr-1" />Start Verification
                                    </Button>
                                    <Button variant="outline" onClick={handleReceiveAnother}>
                                        <RotateCcw className="w-4 h-4 mr-1" />Receive Another
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Pending ────────────────────────────── */}
            {tab === 'pending' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
                    ) : pendingReturns.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No finalized returns awaiting check-in</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">License Plate</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacy</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">FedEx Tracking</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Boxes</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Finalized</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingReturns.map(r => (
                                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono font-semibold text-gray-900">{r.licensePlate}</td>
                                            <td className="px-4 py-3 text-gray-700">{r.pharmacyName}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.fedexTracking || '—'}</td>
                                            <td className="px-4 py-3 text-center text-gray-900">{r.totalItems}</td>
                                            <td className="px-4 py-3 text-center text-gray-900">{r.boxCount ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{r.finalizedAt ? formatDate(r.finalizedAt) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pendingPagination && pendingPagination.totalPages > 1 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
                                    <span>Page {pendingPagination.page} of {pendingPagination.totalPages} ({pendingPagination.total} total)</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Received ───────────────────────────── */}
            {tab === 'received' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by license plate, tracking, or pharmacy..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
                    ) : receivedReturns.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No received returns awaiting verification</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">License Plate</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Pharmacy</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Verified</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receivedReturns.map(r => (
                                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono font-semibold text-gray-900">{r.licensePlate}</td>
                                            <td className="px-4 py-3 text-gray-700">{r.pharmacyName}</td>
                                            <td className="px-4 py-3 text-center text-gray-900">{r.totalItems}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{r.receivedInWarehouseDate ? formatDateTime(r.receivedInWarehouseDate) : '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {r.verifiedIntegrity ? (
                                                    <Badge variant="success">Verified</Badge>
                                                ) : (
                                                    <Badge variant="warning">Pending</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => router.push(`/warehouse/receiving/${r.id}`)}
                                                >
                                                    Verify <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {receivedPagination && receivedPagination.totalPages > 1 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
                                    <span>Page {receivedPagination.page} of {receivedPagination.totalPages} ({receivedPagination.total} total)</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
