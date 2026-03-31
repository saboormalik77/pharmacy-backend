'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Loader2, Search, X, CheckCircle, Ban, Archive, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchReturnTransactions,
    resolveTransactionItem,
} from '@/lib/store/returnTransactionsSlice';
import { ReturnTransactionItem, ReturnTransaction } from '@/lib/types';

interface TbdGroup {
    transaction: ReturnTransaction;
    items: ReturnTransactionItem[];
    loading: boolean;
    loaded: boolean;
}

export default function TbdItemsPage() {
    const dispatch = useAppDispatch();
    const { transactions, isLoading } = useAppSelector(s => s.returnTransactions);

    const [groups, setGroups] = useState<TbdGroup[]>([]);
    const [expandedTx, setExpandedTx] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [resolveModal, setResolveModal] = useState<{ item: ReturnTransactionItem; txId: string } | null>(null);
    const [resolveForm, setResolveForm] = useState({ new_status: 'returnable', reason: '', destination: '', memo: '' });
    const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
    const [expectedReturnableDate, setExpectedReturnableDate] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Fetch active transactions
    useEffect(() => {
        dispatch(fetchReturnTransactions({ limit: 100 }));
    }, [dispatch]);

    // Build groups from transactions
    useEffect(() => {
        const active = transactions.filter(t =>
            ['in_progress', 'paused', 'completed'].includes(t.status)
        );
        setGroups(prev => {
            return active.map(tx => {
                const existing = prev.find(g => g.transaction.id === tx.id);
                return existing
                    ? { ...existing, transaction: tx }
                    : { transaction: tx, items: [], loading: false, loaded: false };
            });
        });
    }, [transactions]);

    // Fetch TBD items for a transaction when expanded
    const fetchTbdItems = useCallback(async (txId: string) => {
        setGroups(prev => prev.map(g =>
            g.transaction.id === txId ? { ...g, loading: true } : g
        ));

        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const query: Record<string, string> = { return_status: 'tbd' };
            if (debouncedSearch) query.search = debouncedSearch;

            const response = await apiClient.get<{ status: string; data: { items: ReturnTransactionItem[]; summary: any } }>(
                `/return-transactions/${txId}/items`, true, query
            );

            setGroups(prev => prev.map(g =>
                g.transaction.id === txId
                    ? { ...g, items: response.data.items || [], loading: false, loaded: true }
                    : g
            ));
        } catch {
            setGroups(prev => prev.map(g =>
                g.transaction.id === txId ? { ...g, loading: false, loaded: true, items: [] } : g
            ));
        }
    }, [debouncedSearch]);

    const toggleExpand = (txId: string) => {
        setExpandedTx(prev => {
            const next = new Set(prev);
            if (next.has(txId)) {
                next.delete(txId);
            } else {
                next.add(txId);
                const group = groups.find(g => g.transaction.id === txId);
                if (group && !group.loaded) fetchTbdItems(txId);
            }
            return next;
        });
    };

    // Re-fetch when search changes
    useEffect(() => {
        expandedTx.forEach(txId => fetchTbdItems(txId));
    }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resolve handler
    const handleResolve = async () => {
        if (!resolveModal) return;
        if (resolveForm.new_status === 'non_returnable' && !resolveForm.reason) {
            showToast('Please select a non-returnable reason', 'warning');
            return;
        }
        if (resolveForm.new_status === 'non_returnable' && nonReturnableRoute === 'wine_cellar' && !expectedReturnableDate) {
            showToast('Please select expected returnable date for Wine Cellar', 'warning');
            return;
        }
        setIsResolving(true);
        let success = false;
        let errorMessage = 'Failed to resolve';
        if (resolveForm.new_status === 'non_returnable' && nonReturnableRoute === 'wine_cellar') {
            try {
                const { apiClient } = await import('@/lib/api/apiClient');
                await apiClient.post(
                    `/return-transactions/${resolveModal.txId}/items/${resolveModal.item.id}/resolve`,
                    {
                        new_status: 'non_returnable',
                        non_returnable_route: 'wine_cellar',
                        expected_returnable_date: expectedReturnableDate,
                        reason: resolveForm.reason || 'date',
                        memo: resolveForm.memo || undefined,
                    },
                    true
                );
                success = true;
            } catch (e: any) {
                errorMessage = e?.message || errorMessage;
            }
        } else {
            const result = await dispatch(resolveTransactionItem({
                transactionId: resolveModal.txId,
                itemId: resolveModal.item.id,
                payload: {
                    new_status: resolveForm.new_status,
                    reason: resolveForm.reason || undefined,
                    destination: resolveForm.new_status === 'non_returnable' ? undefined : resolveForm.destination || undefined,
                    non_returnable_route: resolveForm.new_status === 'non_returnable' ? nonReturnableRoute : undefined,
                    memo: resolveForm.memo || undefined,
                },
            }));
            success = resolveTransactionItem.fulfilled.match(result);
            if (!success) errorMessage = (result.payload as string) || errorMessage;
        }

        setIsResolving(false);
        if (success) {
            const msg =
                resolveForm.new_status === 'non_returnable' && nonReturnableRoute === 'wine_cellar'
                    ? `Item moved to Wine Cellar (eligible ${expectedReturnableDate})`
                    : `Item resolved as ${resolveForm.new_status.replace('_', '-')}`;
            showToast(msg);
            setResolveModal(null);
            setResolveForm({ new_status: 'returnable', reason: '', destination: '', memo: '' });
            setNonReturnableRoute('destruction');
            setExpectedReturnableDate('');
            fetchTbdItems(resolveModal.txId);
        } else {
            showToast(errorMessage, 'error');
        }
    };

    return (
        <PermissionGate permission="tbd_items">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" /> TBD Items
                    </h1>
                    <p className="text-xs text-gray-500">Items requiring manual review — resolve as Returnable or Non-Returnable</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow px-3 py-2">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by NDC, product name, manufacturer, or lot..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Transaction Groups */}
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
            ) : groups.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-10 text-center">
                    <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm font-medium">No active returns found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map(({ transaction: tx, items, loading, loaded }) => {
                        const isExpanded = expandedTx.has(tx.id);
                        return (
                            <div key={tx.id} className={`bg-white rounded-lg shadow overflow-hidden ${isExpanded ? 'ring-1 ring-yellow-300' : ''}`}>
                                {/* Transaction header — clickable to expand */}
                                <button
                                    onClick={() => toggleExpand(tx.id)}
                                    className={`w-full flex items-center justify-between px-4 py-2 transition-colors text-left ${isExpanded ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-yellow-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                        <span className="font-mono font-semibold text-gray-900 text-xs">{tx.licensePlate}</span>
                                        <span className="text-xs text-gray-500 truncate max-w-[160px]">{tx.pharmacyName}</span>
                                        <Badge variant={tx.status === 'in_progress' ? 'info' : tx.status === 'paused' ? 'warning' : 'success'}>
                                            <span className="text-[10px]">{tx.status.replace(/_/g, ' ')}</span>
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {loaded && items.length > 0 && (
                                            <Badge variant="warning"><span className="text-[10px]">{items.length} TBD</span></Badge>
                                        )}
                                        {loaded && items.length === 0 && (
                                            <span className="text-[10px] text-green-500">✓ Clear</span>
                                        )}
                                        <span className="text-[10px] text-gray-400">{formatDate(tx.createdAt)}</span>
                                    </div>
                                </button>

                                {/* Expanded — TBD items table */}
                                {isExpanded && (
                                    <div className="border-t border-yellow-200 bg-yellow-50/30">
                                        {loading ? (
                                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary-600" /></div>
                                        ) : items.length === 0 ? (
                                            <div className="py-4 text-center">
                                                <CheckCircle className="w-5 h-5 text-green-300 mx-auto mb-1" />
                                                <p className="text-xs text-gray-400">No TBD items in this return</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-yellow-100 border-b border-yellow-200">
                                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">NDC</th>
                                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Product</th>
                                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Manufacturer</th>
                                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Lot</th>
                                                            <th className="text-left px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Expires</th>
                                                            <th className="text-center px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Qty</th>
                                                            <th className="text-right px-3 py-1.5 text-[10px] font-semibold text-yellow-800 uppercase">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-yellow-100">
                                                        {items.map(item => (
                                                            <tr key={item.id} className="hover:bg-yellow-50">
                                                                <td className="px-3 py-1.5 text-xs font-mono text-gray-900 whitespace-nowrap">{item.ndc || '—'}</td>
                                                                <td className="px-3 py-1.5 text-xs text-gray-900 max-w-[140px] truncate" title={item.proprietaryName || ''}>
                                                                    {item.proprietaryName || item.genericName || '—'}
                                                                </td>
                                                                <td className="px-3 py-1.5 text-xs text-gray-600 max-w-[100px] truncate">{item.manufacturer || '—'}</td>
                                                                <td className="px-3 py-1.5 text-xs text-gray-600 font-mono whitespace-nowrap">{item.lotNumber || '—'}</td>
                                                                <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</td>
                                                                <td className="px-3 py-1.5 text-xs text-center text-gray-900 font-semibold">{item.quantity}</td>
                                                                <td className="px-3 py-1.5 text-right">
                                                                    <button
                                                                        onClick={() => {
                                                                            setResolveModal({ item, txId: tx.id });
                                                                            setResolveForm({ new_status: 'returnable', reason: '', destination: '', memo: '' });
                                                                            setNonReturnableRoute('destruction');
                                                                            setExpectedReturnableDate('');
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300 transition-colors whitespace-nowrap"
                                                                    >
                                                                        Resolve
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Resolve Modal ─────────────────────────────── */}
            {resolveModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setResolveModal(null)}>
                    <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Resolve TBD Item</h2>
                            <button onClick={() => setResolveModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Item info */}
                            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                                <p className="font-medium text-gray-900">{resolveModal.item.proprietaryName || resolveModal.item.ndc || 'Unknown item'}</p>
                                <p className="text-gray-500">
                                    NDC: <span className="font-mono">{resolveModal.item.ndc || '—'}</span> | Lot: {resolveModal.item.lotNumber || '—'} | Exp: {resolveModal.item.expirationDate ? formatDate(resolveModal.item.expirationDate) : '—'}
                                </p>
                                <p className="text-gray-500">Manufacturer: {resolveModal.item.manufacturer || '—'}</p>
                            </div>

                            {/* Resolution status */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Resolve As <span className="text-red-500">*</span></label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                        resolveForm.new_status === 'returnable' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                        <input type="radio" name="resolve_status" value="returnable" checked={resolveForm.new_status === 'returnable'} onChange={() => setResolveForm({ ...resolveForm, new_status: 'returnable' })} className="text-green-600 focus:ring-green-500" />
                                        <div>
                                            <p className="text-sm font-medium text-green-700"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Returnable</p>
                                        </div>
                                    </label>
                                    <label className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                        resolveForm.new_status === 'non_returnable' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}>
                                        <input type="radio" name="resolve_status" value="non_returnable" checked={resolveForm.new_status === 'non_returnable'} onChange={() => setResolveForm({ ...resolveForm, new_status: 'non_returnable' })} className="text-red-600 focus:ring-red-500" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700"><Ban className="w-3.5 h-3.5 inline mr-1" />Non-Returnable</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Destination (returnable only) */}
                            {resolveForm.new_status === 'returnable' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Destination</label>
                                    <select value={resolveForm.destination} onChange={e => setResolveForm({ ...resolveForm, destination: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                        <option value="">— Select —</option>
                                        <option value="inmar">Inmar</option>
                                        <option value="qualanex">Qualanex</option>
                                        <option value="pharmalink">PharmaLink</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            )}

                            {/* Reason (shown for non-returnable) */}
                            {resolveForm.new_status === 'non_returnable' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Non-Returnable Route</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${nonReturnableRoute === 'wine_cellar' ? 'border-purple-400 bg-purple-50' : 'border-gray-300'}`}>
                                                <input type="radio" checked={nonReturnableRoute === 'wine_cellar'} onChange={() => setNonReturnableRoute('wine_cellar')} />
                                                <Archive className="w-3.5 h-3.5 text-purple-600" />
                                                <span className="text-xs font-medium text-purple-800">Wine Cellar</span>
                                            </label>
                                            <label className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${nonReturnableRoute === 'destruction' ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                                                <input type="radio" checked={nonReturnableRoute === 'destruction'} onChange={() => setNonReturnableRoute('destruction')} />
                                                <Ban className="w-3.5 h-3.5 text-red-600" />
                                                <span className="text-xs font-medium text-red-800">Destruction</span>
                                            </label>
                                        </div>
                                    </div>
                                    {nonReturnableRoute === 'wine_cellar' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Returnable Date <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                value={expectedReturnableDate}
                                                onChange={e => setExpectedReturnableDate(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                                        <select value={resolveForm.reason} onChange={e => setResolveForm({ ...resolveForm, reason: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                                            <option value="">— Select Reason —</option>
                                            <option value="date">Date (expired/outside return window)</option>
                                            <option value="policy">Policy (manufacturer restriction)</option>
                                            <option value="no_data">No Data (insufficient information)</option>
                                            <option value="manual">Manual (staff decision)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Memo */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Memo</label>
                                <textarea value={resolveForm.memo} onChange={e => setResolveForm({ ...resolveForm, memo: e.target.value })} rows={2} placeholder="Optional notes about this resolution" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" onClick={() => setResolveModal(null)}>Cancel</Button>
                            <Button
                                variant={resolveForm.new_status === 'returnable' ? 'success' : 'danger'}
                                onClick={handleResolve}
                                disabled={isResolving}
                            >
                                {isResolving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Resolving...</> : `Resolve as ${resolveForm.new_status === 'returnable' ? 'Returnable' : 'Non-Returnable'}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
