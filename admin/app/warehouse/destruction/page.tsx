'use client';

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
        apiClient.get<{ status: string; data: DestructionRecord[] }>(
          '/admin/destruction',
          true,
          q
        ),
        apiClient.get<{ status: string; data: DestructionStats }>(
          '/admin/destruction/stats',
          true
        ),
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
    <div className="space-y-3">
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div>
        <h1 className="text-lg font-bold text-gray-900">Destruction Workflow</h1>
        <p className="text-xs text-gray-500">
          Manage non-returnable items routed to destruction (processor/admin operations).
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {summary.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
            {s.icon}
            <div>
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <p className="text-base font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex gap-2 items-center">
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    <td className="px-3 py-2 text-xs text-gray-600">{r.pharmacyId}</td>
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
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
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
          <div className="bg-white rounded-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
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
                Company
                <input
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
                  value={form.destructionCompany}
                  onChange={(e) => setForm((f) => ({ ...f, destructionCompany: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-700 col-span-1">
                Scheduled date
                <input
                  type="date"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
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
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronLeft, Loader2, PackageCheck, Search, Trash2, Truck, XCircle } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { fetchDestructionRecords, fetchDestructionStats, updateDestructionRecord } from '@/lib/store/destructionSlice';
import { DestructionRecord } from '@/lib/types';

type Status = 'pending' | 'scheduled' | 'picked_up' | 'destroyed' | 'cancelled';

const statusBadge = (status: Status): { variant: 'default' | 'warning' | 'info' | 'secondary' | 'success' | 'danger'; label: string } => {
  switch (status) {
    case 'pending':
      return { variant: 'warning', label: 'Pending' };
    case 'scheduled':
      return { variant: 'info', label: 'Scheduled' };
    case 'picked_up':
      return { variant: 'secondary', label: 'Picked Up' };
    case 'destroyed':
      return { variant: 'success', label: 'Destroyed' };
    case 'cancelled':
      return { variant: 'danger', label: 'Cancelled' };
  }
};

export default function DestructionPage() {
  const dispatch = useAppDispatch();
  const { records, stats, isLoading, isActionLoading } = useAppSelector((s) => s.destruction);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [company, setCompany] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [federalFormNumber, setFederalFormNumber] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [activeRecord, setActiveRecord] = useState<DestructionRecord | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    dispatch(fetchDestructionStats());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchDestructionRecords({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page: 1,
        limit: 100,
      })
    );
  }, [dispatch, debouncedSearch, statusFilter]);

  const onSchedule = async (record: DestructionRecord) => {
    if (!company.trim() || !scheduledDate) return;
    const result = await dispatch(
      updateDestructionRecord({
        id: record.id,
        payload: {
          status: 'scheduled',
          destructionCompany: company.trim(),
          scheduledDate,
          notes: notes.trim() || undefined,
        },
      })
    );
    if (updateDestructionRecord.fulfilled.match(result)) {
      setActiveRecord(null);
      setCompany('');
      setScheduledDate('');
      setNotes('');
      dispatch(fetchDestructionStats());
    }
  };

  const onPickedUp = async (record: DestructionRecord) => {
    const result = await dispatch(
      updateDestructionRecord({
        id: record.id,
        payload: { status: 'picked_up' },
      })
    );
    if (updateDestructionRecord.fulfilled.match(result)) {
      dispatch(fetchDestructionStats());
    }
  };

  const onDestroyed = async (record: DestructionRecord) => {
    const result = await dispatch(
      updateDestructionRecord({
        id: record.id,
        payload: {
          status: 'destroyed',
          federalFormNumber: federalFormNumber.trim() || undefined,
          formUrl: formUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      })
    );
    if (updateDestructionRecord.fulfilled.match(result)) {
      setActiveRecord(null);
      setFederalFormNumber('');
      setFormUrl('');
      setNotes('');
      dispatch(fetchDestructionStats());
    }
  };

  const onCancel = async (record: DestructionRecord) => {
    const result = await dispatch(
      updateDestructionRecord({
        id: record.id,
        payload: { status: 'cancelled', notes: notes.trim() || undefined },
      })
    );
    if (updateDestructionRecord.fulfilled.match(result)) {
      setActiveRecord(null);
      setNotes('');
      dispatch(fetchDestructionStats());
    }
  };

  const modalMode = useMemo(() => {
    if (!activeRecord) return null;
    if (activeRecord.status === 'pending') return 'schedule';
    if (activeRecord.status === 'picked_up') return 'destroy';
    return null;
  }, [activeRecord]);

  return (
    <div className="space-y-3">
      <div>
        <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Back to Warehouse
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Destruction Workflow</h1>
        <p className="text-xs text-gray-500">Processor/Admin: schedule pharmacy pickup and complete destruction records.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, label: 'Pending', value: stats.pending, cls: 'bg-amber-50 text-amber-700' },
            { icon: <Truck className="w-3.5 h-3.5 text-blue-500" />, label: 'Scheduled', value: stats.scheduled, cls: 'bg-blue-50 text-blue-700' },
            { icon: <PackageCheck className="w-3.5 h-3.5 text-purple-500" />, label: 'Picked Up', value: stats.pickedUp, cls: 'bg-purple-50 text-purple-700' },
            { icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />, label: 'Destroyed', value: stats.destroyed, cls: 'bg-green-50 text-green-700' },
            { icon: <XCircle className="w-3.5 h-3.5 text-red-500" />, label: 'Cancelled', value: stats.cancelled, cls: 'bg-red-50 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border border-gray-100 px-3 py-2 flex items-center gap-2 ${s.cls}`}>
              {s.icon}
              <div>
                <p className="text-[10px] opacity-70 leading-none">{s.label}</p>
                <p className="text-base font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by NDC, product, manufacturer..."
            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="picked_up">Picked Up</option>
          <option value="destroyed">Destroyed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trash2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No destruction records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">NDC/Lot</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Company</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Scheduled</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => {
                  const badge = statusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-xs text-gray-700">
                        <p className="font-medium text-gray-900">{r.productName || 'Unknown product'}</p>
                        <p className="text-gray-500">{r.manufacturer || '—'}</p>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">
                        <p className="font-mono">{r.ndc || '—'}</p>
                        <p>{r.lotNumber || '—'}</p>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">{r.quantity}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">{r.destructionReason || 'manual'}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">{r.destructionCompany || '—'}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">{r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</td>
                      <td className="px-3 py-1.5 text-xs">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status === 'pending' && (
                            <Button size="sm" variant="primary" onClick={() => setActiveRecord(r)}>
                              Schedule
                            </Button>
                          )}
                          {r.status === 'scheduled' && (
                            <Button size="sm" variant="secondary" onClick={() => onPickedUp(r)} disabled={isActionLoading}>
                              Picked Up
                            </Button>
                          )}
                          {r.status === 'picked_up' && (
                            <Button size="sm" variant="success" onClick={() => setActiveRecord(r)}>
                              Complete
                            </Button>
                          )}
                          {['pending', 'scheduled', 'picked_up'].includes(r.status) && (
                            <Button size="sm" variant="outline" onClick={() => setActiveRecord(r)}>
                              Notes/Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeRecord && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveRecord(null)}>
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-900">
                {modalMode === 'schedule' ? 'Schedule Destruction Pickup' : modalMode === 'destroy' ? 'Complete Destruction' : 'Update Record'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{activeRecord.productName || activeRecord.ndc || activeRecord.id}</p>
            </div>
            <div className="p-4 space-y-3">
              {modalMode === 'schedule' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Destruction Company</label>
                    <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" placeholder="e.g. Stericycle" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Date</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
                  </div>
                </>
              )}

              {modalMode === 'destroy' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Federal Form Number</label>
                    <input value={federalFormNumber} onChange={(e) => setFederalFormNumber(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Certificate / Form URL</label>
                    <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" placeholder="https://..." />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <Button variant="outline" onClick={() => setActiveRecord(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                {['pending', 'scheduled', 'picked_up'].includes(activeRecord.status) && (
                  <Button variant="danger" onClick={() => onCancel(activeRecord)} disabled={isActionLoading}>
                    Cancel
                  </Button>
                )}
                {modalMode === 'schedule' && (
                  <Button variant="primary" onClick={() => onSchedule(activeRecord)} disabled={isActionLoading || !company.trim() || !scheduledDate}>
                    Save Schedule
                  </Button>
                )}
                {modalMode === 'destroy' && (
                  <Button variant="success" onClick={() => onDestroyed(activeRecord)} disabled={isActionLoading}>
                    Mark Destroyed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
