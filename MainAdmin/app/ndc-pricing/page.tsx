'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    DollarSign, Search, Plus, Loader2, AlertCircle, X, Trash2,
    ChevronLeft, ChevronRight, Pencil, Save, Info, Camera, ScanLine, Keyboard, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchNDCPricing,
    upsertNDCPricing,
    deleteNDCPricing,
} from '@/lib/store/ndcPricingSlice';
import { NDCPricingRecord, NDCPricingUpsertPayload, BarcodeScanResponse } from '@/lib/types';

const QrScannerModal = dynamic(() => import('@/components/scanner/QrScannerModal'), { ssr: false });

function productNameFromScan(data: BarcodeScanResponse): string {
    const af = data.autoFill;
    const p = data.product;
    const prop = af.proprietaryName || p?.proprietaryName || '';
    const gen = af.genericName || p?.genericName || '';
    if (prop && gen && prop.trim().toLowerCase() !== gen.trim().toLowerCase()) {
        return `${prop.trim()} (${gen.trim()})`;
    }
    return prop.trim() || gen.trim() || '';
}

function ndcFromScan(data: BarcodeScanResponse): string {
    const af = data.autoFill;
    const p = data.product;
    return (af.ndc || p?.ndc || data.scan.ndcCandidates?.[0] || '').trim();
}

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

const DESTINATIONS = [
    { value: 'inmar', label: 'Inmar' },
    { value: 'qualanex', label: 'Qualanex' },
    { value: 'pharmalink', label: 'PharmaLink' },
    { value: 'other', label: 'Other' },
];

const EMPTY_FORM: NDCPricingUpsertPayload = {
    ndc: '',
    productName: '',
    currentPrice: undefined,
    estimatedStorePrice: undefined,
    lastReimbursement: undefined,
    priceSource: '',
    closeOutDestination: '',
};

/** Est. store price = current list price minus 30% (70% of current), 2 decimals. */
function estimatedStoreFromCurrent(current: number | undefined): number | undefined {
    if (current == null || Number.isNaN(current) || current < 0) return undefined;
    return Math.round(current * 0.7 * 100) / 100;
}

export default function NDCPricingPage() {
    const dispatch = useAppDispatch();
    const { items, pagination, isLoading, isActionLoading, error } = useAppSelector(s => s.ndcPricing);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 400);

    const [formModal, setFormModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<NDCPricingRecord | null>(null);
    const [deleteModal, setDeleteModal] = useState<NDCPricingRecord | null>(null);
    const [formData, setFormData] = useState<NDCPricingUpsertPayload>({ ...EMPTY_FORM });
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [suggestedPrice, setSuggestedPrice] = useState<{
        price: number;
        source: string;
        loading: boolean;
    } | null>(null);

    const ndcScanInputRef = useRef<HTMLInputElement>(null);
    const [ndcScanMode, setNdcScanMode] = useState<'camera' | 'usb' | 'manual'>('camera');
    const [ndcCameraOpen, setNdcCameraOpen] = useState(false);
    const [ndcScanInput, setNdcScanInput] = useState('');
    const [ndcManualLookup, setNdcManualLookup] = useState('');
    const [ndcScanLoading, setNdcScanLoading] = useState(false);
    const [ndcScanError, setNdcScanError] = useState('');

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Debounced NDC lookup for suggested pricing
    const debouncedNdc = useDebounce(formData.ndc, 800);

    const lookupSuggestedPrice = useCallback(async (ndc: string) => {
        if (!ndc || ndc.length < 8) { setSuggestedPrice(null); return; }
        setSuggestedPrice(prev => ({ ...prev, loading: true } as any));
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            try {
                const response = await apiClient.get<{
                    status: string;
                    data: { found: boolean; currentPrice?: number; priceSource?: string };
                }>(`/admin/ndc-pricing/resolve/${encodeURIComponent(ndc)}`, true);
                if (response.data.found && response.data.currentPrice) {
                    setSuggestedPrice({ price: response.data.currentPrice, source: response.data.priceSource || 'NDC Pricing Book', loading: false });
                    return;
                }
            } catch { /* fallthrough */ }
            const scanResponse = await apiClient.post<{
                status: string;
                data: { pricing?: { suggestedPrice?: number; priceSource?: string } };
            }>('/barcode/scan', { scanData: ndc }, true);
            if (scanResponse.data.pricing?.suggestedPrice) {
                setSuggestedPrice({ price: scanResponse.data.pricing.suggestedPrice, source: scanResponse.data.pricing.priceSource || 'Return Reports', loading: false });
            } else {
                setSuggestedPrice(null);
            }
        } catch { setSuggestedPrice(null); }
    }, []);

    useEffect(() => {
        if (debouncedNdc && formModal) { lookupSuggestedPrice(debouncedNdc); }
        else { setSuggestedPrice(null); }
    }, [debouncedNdc, formModal, lookupSuggestedPrice]);

    const applySuggestedPrice = () => {
        if (suggestedPrice) {
            const cp = suggestedPrice.price;
            setFormData(d => ({
                ...d,
                currentPrice: cp,
                priceSource: suggestedPrice.source,
                estimatedStorePrice: estimatedStoreFromCurrent(cp),
            }));
            setSuggestedPrice(null);
            showToast(`Applied suggested price: $${suggestedPrice.price.toFixed(2)}`);
        }
    };

    const handleNdcBarcodeScan = async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        setNdcScanError('');
        setNdcScanLoading(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const { cookieUtils } = await import('@/lib/utils/cookies');
            if (!cookieUtils.getAuthToken()) {
                showToast('Authentication required.', 'error');
                return;
            }
            const res = await apiClient.post<{ status: string; data: BarcodeScanResponse }>(
                '/barcode/scan',
                { scanData: trimmed },
                true
            );
            const data = res.data;
            if (!data) {
                setNdcScanError('Unexpected scan response.');
                return;
            }
            const ndc = ndcFromScan(data);
            const name = productNameFromScan(data);
            setFormData((d) => ({
                ...d,
                ndc: ndc || d.ndc,
                productName: name || d.productName,
            }));
            setNdcScanInput('');
            setNdcManualLookup('');
            if (!ndc) {
                setNdcScanError('Could not resolve NDC from scan — enter or correct NDC below.');
            } else if (!name && !data.product) {
                setNdcScanError('NDC resolved but product name not found — enter a name manually if needed.');
            }
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Scan failed.';
            setNdcScanError(msg);
        } finally {
            setNdcScanLoading(false);
        }
    };

    const handleNdcCameraScan = (raw: string) => {
        setNdcCameraOpen(false);
        void handleNdcBarcodeScan(raw);
    };

    const onNdcUsbScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleNdcBarcodeScan(ndcScanInput);
        }
    };

    useEffect(() => {
        if (formModal && !editingRecord && ndcScanMode === 'usb') {
            const t = window.setTimeout(() => ndcScanInputRef.current?.focus(), 100);
            return () => window.clearTimeout(t);
        }
    }, [formModal, editingRecord, ndcScanMode]);

    const loadData = useCallback((p: number = page) => {
        dispatch(fetchNDCPricing({ search: debouncedSearch, page: p, limit: 25 }));
    }, [dispatch, debouncedSearch, page]);

    useEffect(() => { setPage(1); }, [debouncedSearch]);
    useEffect(() => { loadData(page); }, [page, debouncedSearch, loadData]);

    const openAdd = () => {
        setEditingRecord(null);
        setFormData({ ...EMPTY_FORM });
        setSuggestedPrice(null);
        setNdcScanMode('camera');
        setNdcScanInput('');
        setNdcManualLookup('');
        setNdcScanError('');
        setNdcCameraOpen(false);
        setFormModal(true);
    };

    const openEdit = (record: NDCPricingRecord) => {
        setNdcScanError('');
        setNdcCameraOpen(false);
        setEditingRecord(record);
        const cp = record.currentPrice ?? undefined;
        setFormData({
            ndc: record.ndc,
            productName: record.productName || '',
            currentPrice: cp,
            estimatedStorePrice: estimatedStoreFromCurrent(cp),
            lastReimbursement: record.lastReimbursement || undefined,
            priceSource: record.priceSource || '',
            closeOutDestination: record.closeOutDestination || '',
        });
        setSuggestedPrice(null);
        setFormModal(true);
    };

    const handleSave = async () => {
        if (!formData.ndc) { showToast('NDC code is required', 'error'); return; }
        try {
            await dispatch(upsertNDCPricing(formData)).unwrap();
            showToast(editingRecord ? 'NDC pricing updated' : 'NDC pricing created');
            setFormModal(false);
            loadData(page);
        } catch (err: any) {
            showToast(err || 'Failed to save', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            await dispatch(deleteNDCPricing(deleteModal.id)).unwrap();
            showToast('NDC pricing deleted');
            setDeleteModal(null);
            loadData(page);
        } catch (err: any) {
            showToast(err || 'Failed to delete', 'error');
        }
    };

    const fmt = (v: number | null | undefined) => v != null ? `$${v.toFixed(2)}` : '—';
    const fmtDate = (v: string | null | undefined) => {
        if (!v) return '—';
        try { return new Date(v).toLocaleDateString(); } catch { return v; }
    };

    return (
        <PermissionGate permission="ndc_pricing">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">NDC Pricing</h1>
                        <p className="text-xs text-gray-500">
                            {pagination ? `${pagination.total} entries` : 'Manage NDC price book'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Add NDC Price
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by NDC or product name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-gray-400"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-indigo-500 to-indigo-400">
                                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">NDC</th>
                                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Product Name</th>
                                <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Current Price</th>
                                <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Est. Store Price</th>
                                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Source</th>
                                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Destination</th>
                                <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Updated</th>
                                <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-xs text-gray-400">
                                        {debouncedSearch ? 'No results found' : 'No NDC pricing entries yet. Click "Add NDC Price" to get started.'}
                                    </td>
                                </tr>
                            ) : items.map(row => (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm font-semibold text-primary-600">{row.ndc}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-gray-900 truncate block max-w-[200px]">{row.productName || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-sm font-medium text-gray-900">{fmt(row.currentPrice)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-900">{fmt(row.estimatedStorePrice)}</td>
                                    <td className="px-4 py-3">
                                        {row.priceSource
                                            ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[130px]">{row.priceSource}</span>
                                            : <span className="text-gray-400 text-sm">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.closeOutDestination
                                            ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 capitalize">{row.closeOutDestination}</span>
                                            : <span className="text-gray-400 text-sm">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(row.updatedAt)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openEdit(row)}
                                                className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteModal(row)}
                                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <span className="text-[10px] text-gray-500">
                            Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} entries
                        </span>
                        <div className="flex gap-1">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add / Edit Modal ─────────────────────────── */}
            {formModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setFormModal(false)}>
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {editingRecord ? 'Edit NDC Pricing' : 'Add NDC Pricing'}
                            </h2>
                            <button onClick={() => setFormModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Barcode / NDC scan (add only — same flow as return scan screen) */}
                            {!editingRecord && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 space-y-2">
                                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Scan barcode or NDC</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {([
                                            { key: 'camera' as const, icon: Camera, label: 'Camera QR' },
                                            { key: 'usb' as const, icon: ScanLine, label: 'USB Scanner' },
                                            { key: 'manual' as const, icon: Keyboard, label: 'Manual NDC' },
                                        ]).map(({ key, icon: Icon, label }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNdcScanMode(key)}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                    ndcScanMode === key
                                                        ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" /> {label}
                                            </button>
                                        ))}
                                    </div>
                                    {ndcScanMode === 'camera' && (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setNdcCameraOpen(true)}
                                                disabled={ndcScanLoading}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-primary-300 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-60"
                                            >
                                                {ndcScanLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                                        <span className="text-xs font-medium text-primary-700">Looking up product…</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Camera className="w-4 h-4 text-primary-600" />
                                                        <span className="text-xs font-semibold text-primary-800">Open camera scanner</span>
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-[10px] text-gray-500 mt-1">QR, GS1, and standard barcodes — NDC and product name fill in below.</p>
                                        </div>
                                    )}
                                    {ndcScanMode === 'usb' && (
                                        <div>
                                            <div className="relative">
                                                <ScanLine className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    ref={ndcScanInputRef}
                                                    type="text"
                                                    value={ndcScanInput}
                                                    onChange={e => setNdcScanInput(e.target.value)}
                                                    onKeyDown={onNdcUsbScanKeyDown}
                                                    disabled={ndcScanLoading}
                                                    placeholder="Scan with USB/Bluetooth — press Enter after scan"
                                                    className="w-full pl-8 pr-9 py-2 text-xs border-2 border-primary-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                />
                                                {ndcScanLoading && (
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">Same as the return add-items scan field.</p>
                                        </div>
                                    )}
                                    {ndcScanMode === 'manual' && (
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={ndcManualLookup}
                                                onChange={e => setNdcManualLookup(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && void handleNdcBarcodeScan(ndcManualLookup)}
                                                disabled={ndcScanLoading}
                                                placeholder="Type NDC (e.g. 00093-4175-73) and Lookup"
                                                className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleNdcBarcodeScan(ndcManualLookup)}
                                                disabled={ndcScanLoading || !ndcManualLookup.trim()}
                                                className="px-3 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                                            >
                                                {ndcScanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
                                            </button>
                                        </div>
                                    )}
                                    {ndcScanError && (
                                        <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                            <span>{ndcScanError}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NDC Code */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">NDC Code <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. 00093-4175-73"
                                    value={formData.ndc}
                                    onChange={e => setFormData(d => ({ ...d, ndc: e.target.value }))}
                                    disabled={!!editingRecord}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Suggested Price banner */}
                            {!editingRecord && (suggestedPrice?.loading || suggestedPrice?.price) && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    {suggestedPrice.loading ? (
                                        <div className="flex items-center gap-2 text-blue-700 text-xs">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Looking up pricing...
                                        </div>
                                    ) : suggestedPrice.price ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-blue-700 text-xs">
                                                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                                <div>
                                                    <span className="font-medium">Suggested: <span className="font-mono text-blue-900">${suggestedPrice.price.toFixed(2)}</span></span>
                                                    <div className="text-[10px] text-blue-600 mt-0.5">Source: {suggestedPrice.source}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={applySuggestedPrice}
                                                className="px-2.5 py-1 text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                                            >
                                                Apply Price
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Product Name */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    Product Name <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.productName || ''}
                                    onChange={e => setFormData(d => ({ ...d, productName: e.target.value }))}
                                    placeholder="Filled automatically after scan / lookup — edit if needed"
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    Uses the same <span className="font-medium">/barcode/scan</span> lookup as the return scan screen (openFDA / product DB). Scan or use Manual NDC Lookup above.
                                </p>
                            </div>

                            <hr className="border-gray-100" />
                            <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">Pricing Information</p>

                            {/* Price fields */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Current Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.currentPrice ?? ''}
                                        placeholder="e.g. 16.80"
                                        onChange={e => {
                                            const v = e.target.value;
                                            const cp = v === '' ? undefined : parseFloat(v);
                                            const parsed = cp !== undefined && !Number.isNaN(cp) ? cp : undefined;
                                            setFormData(d => ({
                                                ...d,
                                                currentPrice: parsed,
                                                estimatedStorePrice: estimatedStoreFromCurrent(parsed),
                                            }));
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Est. Store Price ($)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={formData.estimatedStorePrice != null ? formData.estimatedStorePrice.toFixed(2) : ''}
                                        placeholder="—"
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">70% of current (30% less)</p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Last Reimbursement ($)</label>
                                    <input type="number" step="0.01" value={formData.lastReimbursement ?? ''} placeholder="e.g. 12.50"
                                        onChange={e => setFormData(d => ({ ...d, lastReimbursement: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" />
                                </div>
                            </div>

                            {/* Price Source + Destination */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Price Source</label>
                                    <select
                                        value={formData.priceSource || ''}
                                        onChange={e => setFormData(d => ({ ...d, priceSource: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="">— Select source —</option>
                                        {PRICE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Close-Out Destination</label>
                                    <select
                                        value={formData.closeOutDestination || ''}
                                        onChange={e => setFormData(d => ({ ...d, closeOutDestination: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="">— Select destination —</option>
                                        {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Previous price (edit mode only) */}
                            {editingRecord && editingRecord.lastPrice != null && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                                    Previous Price: <span className="font-mono font-semibold text-yellow-700">{fmt(editingRecord.lastPrice)}</span>
                                    <span className="ml-3">Last Updated: {fmtDate(editingRecord.lastPriceUpdate)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                            <button onClick={() => setFormModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                {editingRecord ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ndcCameraOpen && formModal && !editingRecord && (
                <QrScannerModal onScan={handleNdcCameraScan} onClose={() => setNdcCameraOpen(false)} />
            )}

            {/* ── Delete Confirmation Modal ─────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
                    <div className="bg-white rounded-lg max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                            <h3 className="text-sm font-semibold text-gray-900">Delete NDC Pricing</h3>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-600 mb-1">Are you sure you want to delete pricing for:</p>
                            <p className="text-xs font-mono font-semibold text-gray-900">
                                {deleteModal.ndc}{deleteModal.productName ? ` — ${deleteModal.productName}` : ''}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                            <button onClick={() => setDeleteModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors font-medium">
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
