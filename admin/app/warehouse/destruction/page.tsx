'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Search, Truck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast, ToastContainer } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { DestructionRecord, DestructionStats } from '@/lib/types';

type Status = 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';
const STATUS_OPTIONS: Status[] = ['pending', 'scheduled', 'picked_up', 'destroyed', 'cancelled'];

const statusBadge = (status: string): 'default' | 'warning' | 'info' | 'success' | 'danger' | 'secondary' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'scheduled':
      return 'info';
    case 'picked_up':
      return 'secondary';
    case 'destroyed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
};

export default function DestructionPage() {
  const [rows, setRows] = useState<DestructionRecord[]>([]);
  const [stats, setStats] = useState<DestructionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selected, setSelected] = useState<DestructionRecord | null>(null);
  const [form, setForm] = useState({
    status: 'pending' as Status,
    destructionCompany: '',
    scheduledDate: '',
    federalFormNumber: '',
    formUrl: '',
    weightLbs: '',
    notes: '',
  });

  const toast = useCallback((message: string, type: Toast['type']) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const q: Record<string, string> = {};
      if (statusFilter) q.status = statusFilter;
      if (debouncedSearch) q.search = debouncedSearch;

      const [listRes, statsRes] = await Promise.all([
        apiClient.get<{ status: string; data: DestructionRecord[] }>('/admin/destruction', true, q),
        apiClient.get<{ status: string; data: DestructionStats }>('/admin/destruction/stats', true),
      ]);
      setRows(listRes.data || []);
      setStats(statsRes.data || null);
    } catch (e: any) {
      toast(e?.message || 'Failed to load destruction records', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (r: DestructionRecord) => {
    setSelected(r);
    setForm({
      status: r.status,
      destructionCompany: r.destructionCompany || '',
      scheduledDate: r.scheduledDate || '',
      federalFormNumber: r.federalFormNumber || '',
      formUrl: r.formUrl || '',
      weightLbs: r.weightLbs != null ? String(r.weightLbs) : '',
      notes: r.notes || '',
    });
  };

  const save = async () => {
    if (!selected) return;
    
    // Validate required fields based on status
    const missingFields: string[] = [];
    
    if (form.status === 'scheduled') {
      if (!form.destructionCompany.trim()) missingFields.push('Company');
      if (!form.scheduledDate) missingFields.push('Scheduled Date');
    }
    
    if (missingFields.length > 0) {
      toast(`Please fill required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }
    
    setSaving(true);
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      await apiClient.patch(
        `/admin/destruction/${selected.id}`,
        {
          status: form.status,
          destructionCompany: form.destructionCompany || null,
          scheduledDate: form.scheduledDate || null,
          federalFormNumber: form.federalFormNumber || null,
          formUrl: form.formUrl || null,
          weightLbs: form.weightLbs ? Number(form.weightLbs) : null,
          notes: form.notes || null,
        },
        true
      );
      toast('Destruction record updated', 'success');
      setSelected(null);
      await load();
    } catch (e: any) {
      toast(e?.message || 'Failed to update record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const quickMove = async (r: DestructionRecord, next: Status) => {
    // Validate required fields for status transitions
    const missingFields: string[] = [];
    
    if (next === 'scheduled') {
      if (!r.destructionCompany) missingFields.push('Company');
      if (!r.scheduledDate) missingFields.push('Scheduled Date');
    }
    
    if (missingFields.length > 0) {
      toast(`Please fill required fields first: ${missingFields.join(', ')}`, 'error');
      openEdit(r); // Open edit modal to fill missing fields
      return;
    }
    
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      await apiClient.patch(`/admin/destruction/${r.id}`, { status: next }, true);
      toast(`Updated to ${next.replace('_', ' ')}`, 'success');
      await load();
    } catch (e: any) {
      toast(e?.message || 'Failed to update status', 'error');
    }
  };

  const summary = useMemo(
    () => [
      { label: 'Pending', value: stats?.pending ?? 0, icon: <Clock3 className="w-3.5 h-3.5 text-amber-600" /> },
      { label: 'Scheduled', value: stats?.scheduled ?? 0, icon: <Truck className="w-3.5 h-3.5 text-blue-600" /> },
      { label: 'Picked Up', value: stats?.pickedUp ?? 0, icon: <AlertTriangle className="w-3.5 h-3.5 text-violet-600" /> },
      { label: 'Destroyed', value: stats?.destroyed ?? 0, icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> },
      { label: 'Cancelled', value: stats?.cancelled ?? 0, icon: <XCircle className="w-3.5 h-3.5 text-red-600" /> },
    ],
    [stats]
  );

  return (
    <PermissionGate permission="destruction">
    <div className="space-y-3">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div>
        <h1 className="text-lg font-bold text-gray-900">Destruction Workflow</h1>
        <p className="text-xs text-gray-500">Manage non-returnable items routed to destruction.</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-[4px] border border-gray-200 px-3 py-2 flex items-center gap-2">
            {s.icon}
            <div>
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className="text-base font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[4px] border border-gray-200 px-3 py-2 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by NDC, product, manufacturer"
            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[4px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No destruction records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Item</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Pharmacy</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Status</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Company</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Scheduled</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500">Destroyed</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">
                      <p className="font-medium text-gray-900">{r.productName || 'Unknown item'}</p>
                      <p className="text-gray-500">NDC: {r.ndc || '—'} | Lot: {r.lotNumber || '—'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{r.pharmacyName || '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      <Badge variant={statusBadge(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{r.destructionCompany || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{r.destroyedAt ? formatDate(r.destroyedAt) : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {r.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => quickMove(r, 'scheduled')}>
                            Schedule
                          </Button>
                        )}
                        {r.status === 'scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => quickMove(r, 'picked_up')}>
                            Picked up
                          </Button>
                        )}
                        {r.status === 'picked_up' && (
                          <Button size="sm" variant="success" onClick={() => quickMove(r, 'destroyed')}>
                            Destroyed
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-[4px] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Update Destruction Record</h2>
              <button className="text-gray-500 text-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-700 col-span-1">
                Status
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Company {form.status === 'scheduled' && <span className="text-red-500">*</span>}
                <input
                  className={`mt-1 w-full border rounded px-2 py-1.5 ${
                    form.status === 'scheduled' && !form.destructionCompany.trim()
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  value={form.destructionCompany}
                  onChange={(e) => setForm((f) => ({ ...f, destructionCompany: e.target.value }))}
                  placeholder="Enter destruction company"
                />
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Scheduled date {form.status === 'scheduled' && <span className="text-red-500">*</span>}
                <input
                  type="date"
                  className={`mt-1 w-full border rounded px-2 py-1.5 ${
                    form.status === 'scheduled' && !form.scheduledDate
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  value={form.scheduledDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Federal form #
                <input
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  value={form.federalFormNumber}
                  onChange={(e) => setForm((f) => ({ ...f, federalFormNumber: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Form URL
                <input
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  value={form.formUrl}
                  onChange={(e) => setForm((f) => ({ ...f, formUrl: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Weight (lbs)
                <input
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  value={form.weightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-700 col-span-2">
                Notes
                <textarea
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
