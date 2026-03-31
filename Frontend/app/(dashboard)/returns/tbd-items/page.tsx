'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Archive, Ban, CheckCircle, ChevronDown, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';

type Tx = { id: string; licensePlate: string; pharmacyName: string; status: string };
type Item = { id: string; ndc?: string; proprietaryName?: string; genericName?: string; manufacturer?: string; lotNumber?: string };

export default function PharmacyTbdItemsPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [groups, setGroups] = useState<Record<string, Item[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modal, setModal] = useState<{ txId: string; item: Item } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    new_status: 'returnable' as 'returnable' | 'non_returnable',
    reason: '',
    destination: '',
    route: 'destruction' as 'destruction' | 'wine_cellar',
    expectedDate: '',
    memo: '',
  });

  const loadTx = useCallback(async () => {
    setLoadingTx(true);
    try {
      const res = await apiClient.get<any>('/return-transactions', { limit: 100 }, true);
      setTxs(res?.data?.transactions || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load return transactions');
    } finally {
      setLoadingTx(false);
    }
  }, []);

  const loadItems = useCallback(async (txId: string) => {
    setLoadingItems((p) => ({ ...p, [txId]: true }));
    try {
      const res = await apiClient.get<any>(`/return-transactions/${txId}/items`, { return_status: 'tbd', search: search || undefined }, true);
      setGroups((p) => ({ ...p, [txId]: res?.data?.items || [] }));
    } catch {
      setGroups((p) => ({ ...p, [txId]: [] }));
    } finally {
      setLoadingItems((p) => ({ ...p, [txId]: false }));
    }
  }, [search]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);

  useEffect(() => {
    expanded.forEach((id) => loadItems(id));
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (txId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else {
        next.add(txId);
        if (!groups[txId]) loadItems(txId);
      }
      return next;
    });
  };

  const resolve = async () => {
    if (!modal) return;
    if (form.new_status === 'non_returnable' && form.route === 'wine_cellar' && !form.expectedDate) {
      setError('Expected returnable date is required for wine cellar route');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.patch(
        `/return-transactions/${modal.txId}/items/${modal.item.id}/resolve`,
        {
          new_status: form.new_status,
          reason: form.reason || undefined,
          destination: form.new_status === 'returnable' ? form.destination || undefined : undefined,
          non_returnable_route: form.new_status === 'non_returnable' ? form.route : undefined,
          expected_returnable_date: form.new_status === 'non_returnable' && form.route === 'wine_cellar' ? form.expectedDate : undefined,
          memo: form.memo || undefined,
        },
        true
      );
      setSuccess('Item resolved');
      setModal(null);
      setForm({ new_status: 'returnable', reason: '', destination: '', route: 'destruction', expectedDate: '', memo: '' });
      await loadItems(modal.txId);
    } catch (e: any) {
      setError(e?.message || 'Failed to resolve item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-yellow-600" /> TBD Items
          </h1>
          <p className="text-xs text-gray-500">Resolve pharmacy TBD items with wine cellar/destruction routing.</p>
        </div>
        {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        {success && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</div>}

        <div className="bg-white border rounded px-3 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded pl-7 pr-2 py-1.5 text-xs" placeholder="Search items..." />
          </div>
        </div>

        {loadingTx ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => {
              const open = expanded.has(tx.id);
              const items = groups[tx.id] || [];
              return (
                <div key={tx.id} className="bg-white rounded-lg border overflow-hidden">
                  <button className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50" onClick={() => toggle(tx.id)}>
                    <div className="flex items-center gap-2 text-xs">
                      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <span className="font-mono font-semibold">{tx.licensePlate}</span>
                      <span className="text-gray-500">{tx.pharmacyName}</span>
                      <Badge variant="info">{tx.status}</Badge>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t">
                      {loadingItems[tx.id] ? (
                        <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div>
                      ) : items.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-500">No TBD items</div>
                      ) : (
                        <div className="divide-y">
                          {items.map((it) => (
                            <div key={it.id} className="px-3 py-2 flex items-center justify-between">
                              <div className="text-xs">
                                <p className="font-medium text-gray-900">{it.proprietaryName || it.genericName || it.ndc || 'Unknown'}</p>
                                <p className="text-gray-500">NDC: {it.ndc || '—'} | Lot: {it.lotNumber || '—'}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => setModal({ txId: tx.id, item: it })}>Resolve</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold">Resolve TBD Item</h2>
                <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex gap-3">
                  <label className="flex items-center gap-1"><input type="radio" checked={form.new_status === 'returnable'} onChange={() => setForm((f) => ({ ...f, new_status: 'returnable' }))} /> <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Returnable</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={form.new_status === 'non_returnable'} onChange={() => setForm((f) => ({ ...f, new_status: 'non_returnable' }))} /> <Ban className="w-3.5 h-3.5 text-red-600" /> Non-Returnable</label>
                </div>

                {form.new_status === 'returnable' && (
                  <input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Destination (e.g. inmar)" className="w-full border rounded px-2 py-1.5" />
                )}

                {form.new_status === 'non_returnable' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="border rounded px-2 py-1.5 flex items-center gap-2"><input type="radio" checked={form.route === 'wine_cellar'} onChange={() => setForm((f) => ({ ...f, route: 'wine_cellar' }))} /> <Archive className="w-3.5 h-3.5 text-purple-600" /> Wine Cellar</label>
                      <label className="border rounded px-2 py-1.5 flex items-center gap-2"><input type="radio" checked={form.route === 'destruction'} onChange={() => setForm((f) => ({ ...f, route: 'destruction' }))} /> <Ban className="w-3.5 h-3.5 text-red-600" /> Destruction</label>
                    </div>
                    {form.route === 'wine_cellar' && (
                      <input type="date" value={form.expectedDate} onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))} className="w-full border rounded px-2 py-1.5" />
                    )}
                    <select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="w-full border rounded px-2 py-1.5">
                      <option value="">Reason</option>
                      <option value="date">Date</option>
                      <option value="policy">Policy</option>
                      <option value="no_data">No Data</option>
                      <option value="manual">Manual</option>
                    </select>
                  </>
                )}

                <textarea rows={2} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="Memo" className="w-full border rounded px-2 py-1.5" />
              </div>
              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
                <Button onClick={resolve} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resolve'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

