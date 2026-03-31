'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Ban, Loader2, Save, ScanLine } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';

type Transaction = { id: string; licensePlate: string; status: string };

export default function PharmacyScanPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState('');
  const [barcode, setBarcode] = useState('');
  const [item, setItem] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [returnStatus, setReturnStatus] = useState<'tbd' | 'returnable' | 'non_returnable'>('tbd');
  const [destination, setDestination] = useState('');
  const [nonRoute, setNonRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
  const [expectedDate, setExpectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [memo, setMemo] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const res = await apiClient.get<any>('/return-transactions', { status: 'in_progress', limit: 50 }, true);
      const rows: Transaction[] = res?.data?.transactions || [];
      setTransactions(rows);
      if (!selectedTx && rows.length > 0) setSelectedTx(rows[0].id);
    } catch (e: any) {
      setError(e?.message || 'Failed to load transactions');
    }
  }, [selectedTx]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const ensureTransaction = async () => {
    if (selectedTx) return selectedTx;
    const res = await apiClient.post<any>('/return-transactions', {}, true);
    const id = res?.data?.id;
    if (!id) throw new Error('Failed to create transaction');
    setSelectedTx(id);
    await loadTransactions();
    return id;
  };

  const scan = async () => {
    if (!barcode.trim()) return;
    setScanLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post<any>('/barcode/scan', { scanData: barcode.trim() }, true);
      setItem(res?.data || null);
      setSuccess('Product scanned');
    } catch (e: any) {
      setError(e?.message || 'Scan failed');
    } finally {
      setScanLoading(false);
    }
  };

  const resetForm = () => {
    setBarcode('');
    setItem(null);
    setQuantity(1);
    setLotNumber('');
    setExpirationDate('');
    setReturnStatus('tbd');
    setDestination('');
    setNonRoute('destruction');
    setExpectedDate('');
    setReason('');
    setMemo('');
  };

  const save = async () => {
    if (!item) return;
    if (returnStatus === 'non_returnable' && nonRoute === 'wine_cellar' && !expectedDate) {
      setError('Expected returnable date is required for wine cellar');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const txId = await ensureTransaction();
      await apiClient.post(
        `/return-transactions/${txId}/items`,
        {
          ndc: item.ndc,
          barcode: item.barcode || barcode,
          proprietary_name: item.proprietaryName || item.proprietary_name || '',
          generic_name: item.genericName || item.generic_name || '',
          manufacturer: item.manufacturer || '',
          quantity,
          lot_number: lotNumber || undefined,
          expiration_date: expirationDate || undefined,
          return_status: returnStatus,
          destination:
            returnStatus === 'returnable'
              ? destination || undefined
              : returnStatus === 'non_returnable' && nonRoute === 'destruction'
              ? 'destruction'
              : undefined,
          reason: reason || undefined,
          memo: memo || undefined,
          non_returnable_route: returnStatus === 'non_returnable' ? nonRoute : undefined,
          expected_returnable_date: returnStatus === 'non_returnable' && nonRoute === 'wine_cellar' ? expectedDate : undefined,
        },
        true
      );
      setSuccess('Item saved');
      resetForm();
    } catch (e: any) {
      setError(e?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = useMemo(() => {
    if (returnStatus !== 'non_returnable') return 'Save & Scan Next';
    return nonRoute === 'wine_cellar' ? 'Move to Wine Cellar' : 'Save to Destruction';
  }, [returnStatus, nonRoute]);

  return (
    <DashboardLayout>
      <div className="space-y-3 max-w-3xl">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Scan Returns</h1>
          <p className="text-xs text-gray-500">Pharmacy scan flow with non-returnable routing.</p>
        </div>
        {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        {success && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</div>}

        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-700">Active Transaction</label>
            <select value={selectedTx} onChange={(e) => setSelectedTx(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
              <option value="">Create/use in-progress transaction</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.licensePlate} ({t.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-700">Barcode</label>
            <div className="flex gap-2">
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="flex-1 px-2 py-1.5 text-xs border rounded" />
              <Button onClick={scan} disabled={scanLoading}>
                {scanLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ScanLine className="w-4 h-4 mr-1" />}
                Scan
              </Button>
            </div>
          </div>

          {item && (
            <>
              <div className="text-xs bg-gray-50 border rounded p-2">
                <p>NDC: <span className="font-mono">{item.ndc || '—'}</span></p>
                <p>Product: {item.proprietaryName || item.proprietary_name || item.genericName || '—'}</p>
                <p>Manufacturer: {item.manufacturer || '—'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="px-2 py-1.5 text-xs border rounded" />
                <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Lot number" className="px-2 py-1.5 text-xs border rounded" />
                <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="px-2 py-1.5 text-xs border rounded" />
              </div>

              <div className="flex gap-3 text-xs">
                <label><input type="radio" checked={returnStatus === 'tbd'} onChange={() => setReturnStatus('tbd')} /> TBD</label>
                <label><input type="radio" checked={returnStatus === 'returnable'} onChange={() => setReturnStatus('returnable')} /> Returnable</label>
                <label><input type="radio" checked={returnStatus === 'non_returnable'} onChange={() => setReturnStatus('non_returnable')} /> Non-returnable</label>
              </div>

              {returnStatus === 'returnable' && (
                <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination (e.g. inmar)" className="w-full px-2 py-1.5 text-xs border rounded" />
              )}

              {returnStatus === 'non_returnable' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="border rounded px-2 py-1.5 text-xs flex items-center gap-2">
                      <input type="radio" checked={nonRoute === 'wine_cellar'} onChange={() => setNonRoute('wine_cellar')} />
                      <Archive className="w-3.5 h-3.5 text-purple-600" /> Wine Cellar
                    </label>
                    <label className="border rounded px-2 py-1.5 text-xs flex items-center gap-2">
                      <input type="radio" checked={nonRoute === 'destruction'} onChange={() => setNonRoute('destruction')} />
                      <Ban className="w-3.5 h-3.5 text-red-600" /> Destruction
                    </label>
                  </div>
                  {nonRoute === 'wine_cellar' && (
                    <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded" />
                  )}
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded">
                    <option value="">Reason</option>
                    <option value="date">Date</option>
                    <option value="policy">Policy</option>
                    <option value="no_data">No Data</option>
                    <option value="manual">Manual</option>
                  </select>
                </>
              )}

              <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Memo" className="w-full px-2 py-1.5 text-xs border rounded" />
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {saveLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

