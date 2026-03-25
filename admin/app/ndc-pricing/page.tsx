'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    DollarSign, Search, Plus, Loader2, AlertCircle, X, Trash2,
    ChevronLeft, ChevronRight, Download, Pencil, Save, RotateCcw, Info,
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
    importFromReports,
    clearCurrent,
    FetchNDCPricingParams,
} from '@/lib/store/ndcPricingSlice';
import { NDCPricingRecord, NDCPricingUpsertPayload } from '@/lib/types';

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

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Debounced NDC lookup for suggested pricing
    const debouncedNdc = useDebounce(formData.ndc, 800);
    
    const lookupSuggestedPrice = useCallback(async (ndc: string) => {
        if (!ndc || ndc.length < 8) {
            setSuggestedPrice(null);
            return;
        }

        setSuggestedPrice(prev => ({ ...prev, loading: true } as any));

        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            
            // First try NDC pricing book
            try {
                const response = await apiClient.get<{
                    status: string;
                    data: { found: boolean; currentPrice?: number; priceSource?: string };
                }>(`/admin/ndc-pricing/resolve/${encodeURIComponent(ndc)}`, true);
                
                if (response.data.found && response.data.currentPrice) {
                    setSuggestedPrice({
                        price: response.data.currentPrice,
                        source: response.data.priceSource || 'NDC Pricing Book',
                        loading: false,
                    });
                    return;
                }
            } catch (err) {
                console.log('NDC pricing book lookup failed, trying return reports...');
            }

            // Fallback to barcode scan API (which checks return_reports)
            const scanResponse = await apiClient.post<{
                status: string;
                data: { pricing?: { suggestedPrice?: number; priceSource?: string } };
            }>('/barcode/scan', { scanData: ndc }, true);

            if (scanResponse.data.pricing?.suggestedPrice) {
                setSuggestedPrice({
                    price: scanResponse.data.pricing.suggestedPrice,
                    source: scanResponse.data.pricing.priceSource || 'Return Reports',
                    loading: false,
                });
            } else {
                setSuggestedPrice(null);
            }
        } catch (err: any) {
            console.error('Price lookup failed:', err);
            setSuggestedPrice(null);
        }
    }, []);

    useEffect(() => {
        if (debouncedNdc && formModal) {
            lookupSuggestedPrice(debouncedNdc);
        } else {
            setSuggestedPrice(null);
        }
    }, [debouncedNdc, formModal, lookupSuggestedPrice]);

    const applySuggestedPrice = () => {
        if (suggestedPrice) {
            setFormData(d => ({
                ...d,
                currentPrice: suggestedPrice.price,
                priceSource: suggestedPrice.source,
            }));
            setSuggestedPrice(null);
            showToast(`Applied suggested price: $${suggestedPrice.price.toFixed(2)}`);
        }
    };

    const loadData = useCallback((p: number = page) => {
        dispatch(fetchNDCPricing({ search: debouncedSearch, page: p, limit: 25 }));
    }, [dispatch, debouncedSearch, page]);

    useEffect(() => { setPage(1); }, [debouncedSearch]);
    useEffect(() => { loadData(page); }, [page, debouncedSearch, loadData]);

    const openAdd = () => {
        setEditingRecord(null);
        setFormData({ ...EMPTY_FORM });
        setSuggestedPrice(null);
        setFormModal(true);
    };

    const openEdit = (record: NDCPricingRecord) => {
        setEditingRecord(record);
        setFormData({
            ndc: record.ndc,
            productName: record.productName || '',
            currentPrice: record.currentPrice || undefined,
            estimatedStorePrice: record.estimatedStorePrice || undefined,
            lastReimbursement: record.lastReimbursement || undefined,
            priceSource: record.priceSource || '',
            closeOutDestination: record.closeOutDestination || '',
        });
        setSuggestedPrice(null); // Don't show suggested price when editing existing record
        setFormModal(true);
    };

    const handleSave = async () => {
        if (!formData.ndc) {
            showToast('NDC code is required', 'error');
            return;
        }
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

    const handleImport = async () => {
        try {
            const result = await dispatch(importFromReports()).unwrap();
            showToast(`Imported ${result.imported} NDC pricing entries from return reports`);
            loadData(1);
            setPage(1);
        } catch (err: any) {
            showToast(err || 'Import failed', 'error');
        }
    };

    const fmt = (v: number | null | undefined) => v != null ? `$${v.toFixed(2)}` : '—';
    const fmtDate = (v: string | null | undefined) => {
        if (!v) return '—';
        try { return new Date(v).toLocaleDateString(); } catch { return v; }
    };

    return (
        <div className="p-6 space-y-6">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">NDC Pricing</h1>
                        <p className="text-sm text-gray-400">
                            {pagination ? `${pagination.total} entries` : 'Manage NDC price book'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleImport} disabled={isActionLoading}>
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                        Import from Reports
                    </Button>
                    <Button size="sm" onClick={openAdd}>
                        <Plus className="w-4 h-4 mr-1" /> Add NDC Price
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by NDC or product name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1e293b] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-[#1e293b] border border-gray-700/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700/50 text-gray-400 text-xs uppercase">
                                <th className="text-left px-4 py-3 font-medium">NDC</th>
                                <th className="text-left px-4 py-3 font-medium">Product Name</th>
                                <th className="text-right px-4 py-3 font-medium">Current Price</th>
                                <th className="text-right px-4 py-3 font-medium">Est. Store Price</th>
                                <th className="text-left px-4 py-3 font-medium">Source</th>
                                <th className="text-left px-4 py-3 font-medium">Destination</th>
                                <th className="text-left px-4 py-3 font-medium">Updated</th>
                                <th className="text-center px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-gray-500">
                                        {debouncedSearch ? 'No results found' : 'No NDC pricing entries yet. Add one or import from return reports.'}
                                    </td>
                                </tr>
                            ) : items.map(row => (
                                <tr key={row.id} className="border-b border-gray-700/30 hover:bg-[#334155]/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-emerald-400 text-xs">{row.ndc}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-white text-xs font-medium truncate max-w-[200px]">{row.productName || '—'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-white text-xs">{fmt(row.currentPrice)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-yellow-400 text-xs">{fmt(row.estimatedStorePrice)}</td>
                                    <td className="px-4 py-3">
                                        {row.priceSource ? (
                                            <Badge variant="default" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">{row.priceSource}</Badge>
                                        ) : <span className="text-gray-500">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.closeOutDestination ? (
                                            <Badge variant="default" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30 capitalize">{row.closeOutDestination}</Badge>
                                        ) : <span className="text-gray-500">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(row.updatedAt)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setDeleteModal(row)} className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors text-gray-400 hover:text-red-400">
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                        <span className="text-xs text-gray-500">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
                        </span>
                        <div className="flex gap-1">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add / Edit Modal ───────────────────────── */}
            {formModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e293b] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white">
                                {editingRecord ? 'Edit NDC Pricing' : 'Add NDC Pricing'}
                            </h2>
                            <button onClick={() => setFormModal(false)} className="p-1 hover:bg-gray-700 rounded-md text-gray-400"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* NDC Code */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">NDC Code *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 00093-4175-73"
                                    value={formData.ndc}
                                    onChange={e => setFormData(d => ({ ...d, ndc: e.target.value }))}
                                    disabled={!!editingRecord}
                                    className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                                />
                            </div>

                            {/* Suggested Price (only show when adding new record and price found) */}
                            {!editingRecord && (suggestedPrice?.loading || suggestedPrice?.price) && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                    {suggestedPrice.loading ? (
                                        <div className="flex items-center gap-2 text-blue-300">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Looking up pricing...</span>
                                        </div>
                                    ) : suggestedPrice.price ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-300">
                                                <Info className="w-4 h-4" />
                                                <div>
                                                    <span className="text-sm font-medium">
                                                        Suggested Price: <span className="text-white font-mono">${suggestedPrice.price.toFixed(2)}</span>
                                                    </span>
                                                    <div className="text-xs text-blue-400">
                                                        Source: {suggestedPrice.source}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={applySuggestedPrice}
                                                className="text-xs bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30"
                                            >
                                                Apply Price
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Product Name (Optional) */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Product Name <span className="text-gray-500">(optional - for display only)</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.productName || ''} 
                                    onChange={e => setFormData(d => ({ ...d, productName: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    placeholder="e.g. Cephalexin - auto-filled from openFDA when scanned" 
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Product details are automatically fetched from openFDA API during barcode scanning.
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-700/50 pt-4">
                                <h3 className="text-sm font-medium text-emerald-400 mb-3">Pricing Information</h3>
                            </div>

                            {/* Current Price + Estimated Store Price + Last Reimbursement */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Current Price ($)</label>
                                    <input type="number" step="0.01" value={formData.currentPrice ?? ''} onChange={e => setFormData(d => ({ ...d, currentPrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                        className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="e.g. 16.80" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Est. Store Price ($)</label>
                                    <input type="number" step="0.01" value={formData.estimatedStorePrice ?? ''} onChange={e => setFormData(d => ({ ...d, estimatedStorePrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                        className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="e.g. 8.40" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Last Reimbursement ($)</label>
                                    <input type="number" step="0.01" value={formData.lastReimbursement ?? ''} onChange={e => setFormData(d => ({ ...d, lastReimbursement: e.target.value ? parseFloat(e.target.value) : undefined }))}
                                        className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="e.g. 12.50" />
                                </div>
                            </div>

                            {/* Price Source + Close-out Destination */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Price Source</label>
                                    <select
                                        value={formData.priceSource || ''}
                                        onChange={e => setFormData(d => ({ ...d, priceSource: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        <option value="">Select source...</option>
                                        {PRICE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Close-Out Destination</label>
                                    <select
                                        value={formData.closeOutDestination || ''}
                                        onChange={e => setFormData(d => ({ ...d, closeOutDestination: e.target.value }))}
                                        className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        <option value="">Select destination...</option>
                                        {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Last Price (read-only in edit mode) */}
                            {editingRecord && editingRecord.lastPrice != null && (
                                <div className="bg-[#0f172a] border border-gray-700/50 rounded-lg p-3">
                                    <span className="text-xs text-gray-500">Previous Price: </span>
                                    <span className="text-sm font-mono text-yellow-400">{fmt(editingRecord.lastPrice)}</span>
                                    <span className="text-xs text-gray-500 ml-3">Last Updated: </span>
                                    <span className="text-sm text-gray-300">{fmtDate(editingRecord.lastPriceUpdate)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-700/50">
                            <Button variant="outline" size="sm" onClick={() => setFormModal(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                {editingRecord ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ──────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e293b] border border-gray-700 rounded-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete NDC Pricing</h3>
                        <p className="text-sm text-gray-400 mb-1">
                            Are you sure you want to delete pricing for:
                        </p>
                        <p className="text-sm text-white font-mono mb-4">
                            {deleteModal.ndc} — {deleteModal.productName || 'Unknown product'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
