'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, Search, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils/format';

type RecordRow = {
  id: string;
  ndc: string;
  productName: string;
  manufacturer: string;
  quantity: number;
  estimatedValue: number;
  status: 'pending' | 'scheduled' | 'picked_up' | 'destroyed';
  scheduledDate?: string;
  pickedUpAt?: string;
  destroyedAt?: string;
};

export default function PharmacyDestructionPage() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>('/destruction', { status: status === 'all' ? undefined : status, search: search || undefined, limit: 200 }, true);
      setRows(res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load destruction records');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending').length;
    const scheduled = rows.filter((r) => r.status === 'scheduled').length;
    const picked = rows.filter((r) => r.status === 'picked_up').length;
    const done = rows.filter((r) => r.status === 'destroyed').length;
    const value = rows.reduce((acc, r) => acc + Number(r.estimatedValue || 0), 0);
    return { pending, scheduled, picked, done, value };
  }, [rows]);

  const updateStatus = async (id: string, next: RecordRow['status']) => {
    try {
      await apiClient.patch(`/destruction/${id}`, { status: next }, true);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Destruction</h1>
          <p className="text-xs text-gray-500">Track non-returnable items routed to destruction.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Scheduled" value={stats.scheduled} />
          <Stat label="Picked Up" value={stats.picked} />
          <Stat label="Destroyed" value={stats.done} />
          <Stat label="Total Value" value={formatCurrency(stats.value)} />
        </div>

        <div className="bg-white rounded-lg border p-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full border rounded pl-7 pr-2 py-1.5 text-xs" placeholder="Search by product, NDC, manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border rounded px-2 py-1.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="picked_up">Picked Up</option>
            <option value="destroyed">Destroyed</option>
          </select>
        </div>

        {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

        <div className="bg-white rounded-lg border overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">NDC</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Dates</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No destruction records</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">
                    <p className="font-medium text-gray-900">{r.productName || 'Unknown'}</p>
                    <p className="text-gray-500">{r.manufacturer || '—'}</p>
                  </td>
                  <td className="p-2 font-mono">{r.ndc || '—'}</td>
                  <td className="p-2">{r.quantity}</td>
                  <td className="p-2">{formatCurrency(Number(r.estimatedValue || 0))}</td>
                  <td className="p-2"><Badge variant={r.status === 'destroyed' ? 'success' : r.status === 'pending' ? 'warning' : 'info'}>{r.status}</Badge></td>
                  <td className="p-2 text-gray-600">
                    <div className="space-y-1">
                      {r.scheduledDate && <p><Calendar className="w-3 h-3 inline mr-1" />{formatDate(r.scheduledDate)}</p>}
                      {r.pickedUpAt && <p>Picked: {formatDate(r.pickedUpAt)}</p>}
                      {r.destroyedAt && <p>Done: {formatDate(r.destroyedAt)}</p>}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'scheduled')}>Schedule</Button>}
                      {r.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'picked_up')}>Picked</Button>}
                      {r.status === 'picked_up' && <Button size="sm" onClick={() => updateStatus(r.id, 'destroyed')}>Destroyed</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-gray-500 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          Update statuses as physical destruction workflow progresses at pharmacy.
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border rounded px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

