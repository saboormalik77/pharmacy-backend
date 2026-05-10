'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, Archive, Loader2, ScanLine, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';

type Status = 'returnable' | 'non_returnable' | 'tbd';

export default function PharmacyScanItemsPage() {
  const { id } = useParams<{ id: string }>();
  const [scanData, setScanData] = useState('');
  const [loadingScan, setLoadingScan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('returnable');
  const [route, setRoute] = useState<'destruction' | 'wine_cellar'>('destruction');
  const [expectedDate, setExpectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({
    ndc: '',
    productName: '',
    manufacturer: '',
    lotNumber: '',
    expirationDate: '',
    quantity: 1,
    packageSize: 1,
    unitCost: '',
    destination: '',
  });

  const onScan = async () => {
    if (!scanData.trim()) return;
    setLoadingScan(true);
    setError(null);
    setMsg(null);
    try {
      const res = await apiClient.post<any>('/barcode/scan', { scanData }, true);
      const d = res?.data || {};
      const af = d.autoFill || {};
      const pricing = d.pricing || {};
      
      // Get best price from pricing data
      const bestPrice = pricing.bestFullPrice ?? pricing.bestPartialPrice ?? pricing.suggestedPrice;
      
      setForm((f) => ({
        ...f,
        ndc: af.ndc || d.ndc || d.ndc11 || f.ndc,
        productName: af.proprietaryName || af.genericName || d.productName || f.productName,
        manufacturer: af.manufacturer || d.manufacturer || f.manufacturer,
        lotNumber: af.lotNumber || d.lotNumber || f.lotNumber,
        expirationDate: af.expirationDate || d.expirationDate || f.expirationDate,
        packageSize: af.fullPackageSize || f.packageSize,
        unitCost: bestPrice != null ? String(bestPrice) : f.unitCost,
        destination: af.destination || pricing.closeOutDestination || f.destination,
      }));
      setMsg('Scan parsed and form autofilled' + (bestPrice ? ` (Price: $${bestPrice})` : ''));
    } catch (e: any) {
      setError(e?.message || 'Failed to parse barcode');
    } finally {
      setLoadingScan(false);
    }
  };

  const save = async () => {
    if (!id) return;
    if (!form.ndc || !form.productName || !form.quantity) {
      setError('NDC, product and quantity are required');
      return;
    }
    if (status === 'non_returnable' && route === 'wine_cellar' && !expectedDate) {
      setError('Expected returnable date is required for Wine Cellar');
      return;
    }
    if (status === 'non_returnable' && !reason) {
      setError('Please select non-returnable reason');
      return;
    }

    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      if (status === 'non_returnable' && route === 'wine_cellar') {
        await apiClient.post(
          '/wine-cellar',
          {
            sourceReturnTransactionId: id,
            ndc: form.ndc,
            productName: form.productName,
            manufacturer: form.manufacturer || undefined,
            lotNumber: form.lotNumber || undefined,
            expirationDate: form.expirationDate || undefined,
            quantity: Number(form.quantity),
            standardPrice: Number(form.unitCost || 0),
            expectedReturnableDate: expectedDate,
            notes: 'Created from pharmacy scan flow',
          },
          true
        );
        setMsg('Item moved to Wine Cellar');
      } else {
        await apiClient.post(
          `/return-transactions/${id}/items`,
          {
            ndc: form.ndc,
            proprietaryName: form.productName,
            manufacturer: form.manufacturer || undefined,
            lotNumber: form.lotNumber || undefined,
            expirationDate: form.expirationDate || undefined,
            quantity: Number(form.quantity),
            fullPackageSize: Number(form.packageSize || 1),
            standardPrice: Number(form.unitCost || 0),
            returnStatus: status,
            destination: status === 'non_returnable' && route === 'destruction' ? 'destruction' : status === 'returnable' ? form.destination || undefined : undefined,
            nonReturnableReason: status === 'non_returnable' ? reason : undefined,
          },
          true
        );
        setMsg('Item added successfully');
      }

      setScanData('');
      setStatus('returnable');
      setRoute('destruction');
      setExpectedDate('');
      setReason('');
      setForm({
        ndc: '',
        productName: '',
        manufacturer: '',
        lotNumber: '',
        expirationDate: '',
        quantity: 1,
        packageSize: 1,
        unitCost: '',
        destination: '',
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-3">
        <div>
          <h1 className="text-lg font-bold text-[#000000]">Scan Items</h1>
          <p className="text-xs text-[#6b7280]">Add scanned items and classify non-returnables into Wine Cellar or Destruction.</p>
        </div>
        <div className="bg-white rounded-[4px] border p-3 space-y-2">
          <label className="text-xs text-[#505454]">Barcode Scan Data</label>
          <div className="flex gap-2">
            <input className="flex-1 border border-[#e2e2e2] rounded-[4px] px-2 py-1.5 text-xs" value={scanData} onChange={(e) => setScanData(e.target.value)} />
            <Button variant="outline" onClick={onScan} disabled={loadingScan}>{loadingScan ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ScanLine className="w-4 h-4 mr-1" />Parse</>}</Button>
          </div>
        </div>

        <div className="bg-white rounded-[4px] border p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input label="NDC" value={form.ndc} onChange={(v) => setForm((f) => ({ ...f, ndc: v }))} />
            <Input label="Product Name" value={form.productName} onChange={(v) => setForm((f) => ({ ...f, productName: v }))} />
            <Input label="Manufacturer" value={form.manufacturer} onChange={(v) => setForm((f) => ({ ...f, manufacturer: v }))} />
            <Input label="Lot Number" value={form.lotNumber} onChange={(v) => setForm((f) => ({ ...f, lotNumber: v }))} />
            <Input type="date" label="Expiration Date" value={form.expirationDate} onChange={(v) => setForm((f) => ({ ...f, expirationDate: v }))} />
            <Input type="number" label="Quantity" value={String(form.quantity)} onChange={(v) => setForm((f) => ({ ...f, quantity: Number(v || 0) }))} />
            <Input type="number" label="Package Size" value={String(form.packageSize)} onChange={(v) => setForm((f) => ({ ...f, packageSize: Number(v || 1) }))} />
            <Input type="number" step="0.01" label="Unit Cost" value={form.unitCost} onChange={(v) => setForm((f) => ({ ...f, unitCost: v }))} />
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-[#505454]">Return Status</label>
            <div className="flex gap-3 text-xs">
              <label><input type="radio" checked={status === 'returnable'} onChange={() => setStatus('returnable')} /> Returnable</label>
              <label><input type="radio" checked={status === 'non_returnable'} onChange={() => setStatus('non_returnable')} /> Non-returnable</label>
              <label><input type="radio" checked={status === 'tbd'} onChange={() => setStatus('tbd')} /> TBD</label>
            </div>
          </div>

          {status === 'returnable' && (
            <Input label="Destination" value={form.destination} onChange={(v) => setForm((f) => ({ ...f, destination: v }))} placeholder="e.g. Inmar" />
          )}

          {status === 'non_returnable' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className={`border border-[#e2e2e2] rounded-[4px] px-2 py-2 text-xs flex items-center gap-1 cursor-pointer ${route === 'wine_cellar' ? 'bg-purple-50 border-purple-300' : 'bg-white'}`}>
                  <input type="radio" checked={route === 'wine_cellar'} onChange={() => setRoute('wine_cellar')} />
                  <Archive className="w-3.5 h-3.5 text-purple-600" /> Wine Cellar
                </label>
                <label className={`border border-[#e2e2e2] rounded-[4px] px-2 py-2 text-xs flex items-center gap-1 cursor-pointer ${route === 'destruction' ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
                  <input type="radio" checked={route === 'destruction'} onChange={() => setRoute('destruction')} />
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Destruction
                </label>
              </div>
              {route === 'wine_cellar' && (
                <Input type="date" label="Expected Returnable Date" value={expectedDate} onChange={setExpectedDate} />
              )}
              <div>
                <label className="block text-xs text-[#505454] mb-1">Reason</label>
                <select className="w-full border border-[#e2e2e2] rounded-[4px] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#516057]" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">— Select Reason —</option>
                  <option value="date">Date</option>
                  <option value="policy">Policy</option>
                  <option value="no_data">No Data</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </>
          )}

          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
          {msg && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{msg}</div>}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save Item</>}</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#505454] mb-1">{props.label}</label>
      <input
        className="w-full border border-[#e2e2e2] rounded-[4px] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#516057]"
        type={props.type || 'text'}
        step={props.step}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

