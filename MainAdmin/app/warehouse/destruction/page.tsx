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

  const openEdit = (r: DestructionRecord, presetStatus?: Status) => {
    setSelected(r);
    setForm({
      status: presetStatus || r.status,
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
    // For transitions to 'scheduled' that require additional data, open the modal
    // Validation will occur when user clicks "Save Changes" in the modal
    if (next === 'scheduled' && (!r.destructionCompany || !r.scheduledDate)) {
      openEdit(r, next); // Open edit modal pre-filled with the target status
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
      { label: 'Pending', value: stats?.pending ?? 0, icon: <Clock3 className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} /> },
      { label: 'Scheduled', value: stats?.scheduled ?? 0, icon: <Truck className="w-3.5 h-3.5" style={{ color: 'var(--secondary)' }} /> },
      { label: 'Picked Up', value: stats?.pickedUp ?? 0, icon: <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} /> },
      { label: 'Destroyed', value: stats?.destroyed ?? 0, icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--secondary)' }} /> },
      { label: 'Cancelled', value: stats?.cancelled ?? 0, icon: <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} /> },
    ],
    [stats]
  );

  return (
    <PermissionGate permission="destruction">
    <div className="space-y-3">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Destruction Workflow</h1>
        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Manage non-returnable items routed to destruction.</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border px-3 py-2 flex items-center gap-2"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
          >
            {s.icon}
            <div>
              <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{s.label}</p>
              <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg border px-3 py-2 flex gap-2 items-center"
        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
      >
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by NDC, product, manufacturer"
            className="w-full pl-7 pr-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>No destruction records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Item</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Pharmacy</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Company</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Scheduled</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Destroyed</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-primary-50/40 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{r.productName || 'Unknown item'}</p>
                      <p style={{ color: 'var(--on-surface-variant)' }}>NDC: {r.ndc || '—'} | Lot: {r.lotNumber || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.pharmacyId}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={statusBadge(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.destructionCompany || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{r.destroyedAt ? formatDate(r.destroyedAt) : '—'}</td>
                    <td className="px-4 py-3">
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
        <div
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 45%, transparent)' }}
          onClick={() => setSelected(null)}
        >
          <div className="rounded-xl w-full max-w-lg shadow-2xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={(e) => e.stopPropagation()}>
            <div className="rounded-t-xl px-4 py-3" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-sm font-bold text-white">Update Destruction Record</h2>
                </div>
                <button 
                  className="text-white/80 hover:text-white transition-colors cursor-pointer" 
                  onClick={() => setSelected(null)}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Status
                <select
                  className="mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
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
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Company {form.status === 'scheduled' && <span className="text-red-500">*</span>}
                <input
                  className={`mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    form.status === 'scheduled' && !form.destructionCompany.trim()
                      ? 'border-red-300 bg-red-50'
                      : ''
                  }`}
                  style={
                    form.status === 'scheduled' && !form.destructionCompany.trim()
                      ? undefined
                      : { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }
                  }
                  value={form.destructionCompany}
                  onChange={(e) => setForm((f) => ({ ...f, destructionCompany: e.target.value }))}
                  placeholder="Enter destruction company"
                />
              </label>
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Scheduled date {form.status === 'scheduled' && <span className="text-red-500">*</span>}
                <input
                  type="date"
                  className={`mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    form.status === 'scheduled' && !form.scheduledDate
                      ? 'border-red-300 bg-red-50'
                      : ''
                  }`}
                  style={
                    form.status === 'scheduled' && !form.scheduledDate
                      ? undefined
                      : { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }
                  }
                  value={form.scheduledDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Federal form #
                <input
                  className="mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                  value={form.federalFormNumber}
                  onChange={(e) => setForm((f) => ({ ...f, federalFormNumber: e.target.value }))}
                  placeholder="e.g., 222-XXXXX"
                />
              </label>
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Form URL
                <input
                  className="mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                  value={form.formUrl}
                  onChange={(e) => setForm((f) => ({ ...f, formUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="text-xs font-medium col-span-1" style={{ color: 'var(--on-surface-variant)' }}>
                Weight (lbs)
                <input
                  type="number"
                  step="0.01"
                  className="mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                  value={form.weightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))}
                  placeholder="0.00"
                />
              </label>
              <label className="text-xs font-medium col-span-2" style={{ color: 'var(--on-surface-variant)' }}>
                Notes
                <textarea
                  className="mt-1.5 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </label>
            </div>
            <div className="px-4 py-3 border-t rounded-b-xl flex justify-end gap-2" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
