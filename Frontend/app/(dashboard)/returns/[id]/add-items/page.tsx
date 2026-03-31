"use client";

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { returnTransactionsService } from '@/lib/api/services/returnTransactionsService';

const EMPTY = {
  ndc: '',
  lotNumber: '',
  expirationDate: '',
  proprietaryName: '',
  genericName: '',
  manufacturer: '',
  quantity: '1',
  standardPrice: '',
  returnStatus: 'tbd',
  returnReason: '',
  nonReturnableReason: 'date',
  nonReturnableRoute: 'destruction',
  expectedReturnableDate: '',
  memo: '',
};

export default function PharmacyAddItemsPage() {
  const params = useParams();
  const transactionId = params.id as string;
  const [form, setForm] = useState({ ...EMPTY });
  const [scanValue, setScanValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const estimatedValue = useMemo(() => {
    const price = Number(form.standardPrice || 0);
    const qty = Number(form.quantity || 0);
    return price > 0 && qty > 0 ? price * qty : 0;
  }, [form.standardPrice, form.quantity]);

  const onScan = async () => {
    if (!scanValue.trim()) return;
    setError(null);
    try {
      const data = await returnTransactionsService.scanBarcode(scanValue.trim());
      const auto = data?.autoFill || {};
      setForm((prev) => ({
        ...prev,
        ndc: auto.ndc || prev.ndc,
        lotNumber: auto.lotNumber || prev.lotNumber,
        expirationDate: auto.expirationDate || prev.expirationDate,
        proprietaryName: auto.proprietaryName || prev.proprietaryName,
        genericName: auto.genericName || prev.genericName,
        manufacturer: auto.manufacturer || prev.manufacturer,
      }));
      setSuccess('Barcode parsed and fields auto-filled.');
    } catch (e: any) {
      setError(e?.message || 'Failed to scan barcode');
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await returnTransactionsService.addItem(transactionId, {
        ndc: form.ndc,
        lotNumber: form.lotNumber,
        expirationDate: form.expirationDate,
        proprietaryName: form.proprietaryName || undefined,
        genericName: form.genericName || undefined,
        manufacturer: form.manufacturer || undefined,
        quantity: Number(form.quantity || 1),
        standardPrice: form.standardPrice ? Number(form.standardPrice) : undefined,
        estimatedValue: estimatedValue || undefined,
        returnStatus: form.returnStatus,
        returnReason: form.returnReason || undefined,
        nonReturnableReason: form.returnStatus === 'non_returnable' ? form.nonReturnableReason : undefined,
        destination:
          form.returnStatus === 'returnable'
            ? undefined
            : form.returnStatus === 'non_returnable' && form.nonReturnableRoute === 'destruction'
            ? 'destruction'
            : undefined,
        non_returnable_route: form.returnStatus === 'non_returnable' ? form.nonReturnableRoute : undefined,
        expected_returnable_date:
          form.returnStatus === 'non_returnable' && form.nonReturnableRoute === 'wine_cellar'
            ? form.expectedReturnableDate
            : undefined,
        memo: form.memo || undefined,
      });
      setSuccess('Item added successfully.');
      setForm({ ...EMPTY });
      setScanValue('');
    } catch (e: any) {
      setError(e?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Scan/Add Return Item</h1>
            <p className="text-sm text-muted-foreground">Transaction: <span className="font-mono">{transactionId}</span></p>
          </div>
          <Link href={`/returns/${transactionId}`}>
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{success}</div>}

        <div className="border rounded-lg p-3 bg-white space-y-3">
          <div className="flex gap-2">
            <Input value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Paste or scan GS1/barcode raw value" />
            <Button onClick={onScan} variant="outline"><ScanLine className="w-4 h-4 mr-1" /> Scan</Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">NDC<Input value={form.ndc} onChange={(e) => setForm((p) => ({ ...p, ndc: e.target.value }))} /></label>
            <label className="text-sm">Lot Number<Input value={form.lotNumber} onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))} /></label>
            <label className="text-sm">Expiration Date<Input type="date" value={form.expirationDate} onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))} /></label>
            <label className="text-sm">Manufacturer<Input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} /></label>
            <label className="text-sm">Product Name<Input value={form.proprietaryName} onChange={(e) => setForm((p) => ({ ...p, proprietaryName: e.target.value }))} /></label>
            <label className="text-sm">Generic Name<Input value={form.genericName} onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))} /></label>
            <label className="text-sm">Quantity<Input type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></label>
            <label className="text-sm">List Price<Input type="number" step="0.01" value={form.standardPrice} onChange={(e) => setForm((p) => ({ ...p, standardPrice: e.target.value }))} /></label>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">Estimated Value</Badge>
            <span className="text-sm font-semibold">${estimatedValue.toFixed(2)}</span>
          </div>

          <label className="text-sm block">
            Classification
            <select
              className="w-full mt-1 border rounded px-2 py-2"
              value={form.returnStatus}
              onChange={(e) => setForm((p) => ({ ...p, returnStatus: e.target.value }))}
            >
              <option value="tbd">TBD</option>
              <option value="returnable">Returnable</option>
              <option value="non_returnable">Non-Returnable</option>
            </select>
          </label>

          {form.returnStatus === 'non_returnable' && (
            <div className="space-y-2 border rounded p-3">
              <label className="text-sm block">
                Non-Returnable Reason
                <select
                  className="w-full mt-1 border rounded px-2 py-2"
                  value={form.nonReturnableReason}
                  onChange={(e) => setForm((p) => ({ ...p, nonReturnableReason: e.target.value }))}
                >
                  <option value="date">Date</option>
                  <option value="policy">Policy</option>
                  <option value="no_data">No Data</option>
                  <option value="manual">Manual</option>
                </select>
              </label>

              <p className="text-sm font-medium">Non-Returnable Route</p>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.nonReturnableRoute === 'wine_cellar'}
                    onChange={() => setForm((p) => ({ ...p, nonReturnableRoute: 'wine_cellar' }))}
                  />
                  Wine Cellar
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.nonReturnableRoute === 'destruction'}
                    onChange={() => setForm((p) => ({ ...p, nonReturnableRoute: 'destruction' }))}
                  />
                  Destruction
                </label>
              </div>

              {form.nonReturnableRoute === 'wine_cellar' && (
                <label className="text-sm block">
                  Expected Returnable Date
                  <Input
                    type="date"
                    value={form.expectedReturnableDate}
                    onChange={(e) => setForm((p) => ({ ...p, expectedReturnableDate: e.target.value }))}
                  />
                </label>
              )}
            </div>
          )}

          <label className="text-sm block">
            Memo
            <textarea
              rows={3}
              className="w-full mt-1 border rounded px-2 py-2 text-sm"
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
            />
          </label>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
