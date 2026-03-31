'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, ScanLine, Keyboard, CheckCircle,
  AlertTriangle, RotateCcw, X, Camera, Archive,
  Ban, Trash2, FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';

interface Transaction {
  id: string;
  licensePlate: string;
  pharmacyName?: string;
  status: string;
  totalItems: number;
}

interface ScannedItem {
  id: string;
  ndc?: string;
  proprietaryName?: string;
  genericName?: string;
  manufacturer?: string;
  lotNumber?: string;
  expirationDate?: string;
  estimatedValue?: number;
  returnStatus?: string;
  isPartial?: boolean;
  partialPercentage?: number;
  destination?: string;
}

interface PolicyResult {
  status: string;
  destination?: string;
  reason?: string;
  manufacturerName?: string;
  expectedReturnableDate?: string;
  windowStart?: string;
  windowEnd?: string;
  discountRate?: number;
  reimbursementType?: string;
  partialsAccepted?: boolean;
  returnableWithinPolicyPeriod?: boolean;
  policyNumber?: number;
  policyDescription?: string;
  autoRaEmail?: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

const RETURN_REASONS = [
  '', 'Expired', 'Short-dated', 'Damaged', 'Recalled', 'Overstock',
  'Discontinued', 'Wrong product', 'Formulary change', 'Other',
];

const EMPTY_FORM = {
  ndc: '', ndc10: '', gtin: '', proprietaryName: '', genericName: '',
  manufacturer: '', packageDescription: '', dosageForm: '',
  strengthValue: '', strengthUnit: '',
  route: '', lotNumber: '', serialNumber: '', expirationDate: '',
  standardPrice: '', fullPackageSize: '',
  fullPackageQtyReturned: '', qtyMode: 'units' as 'units' | 'percent',
  returnStatus: 'tbd' as 'returnable' | 'non_returnable' | 'tbd',
  deaSchedule: '', productType: '',
  returnReason: '', memo: '',
  scanSource: 'manual' as string,
  rawScanData: '',
};

type FormState = typeof EMPTY_FORM;

function parseStrength(strength: string): { value: string; unit: string } {
  if (!strength) return { value: '', unit: '' };
  const match = strength.trim().match(/^([\d.,/]+)\s*(.*)$/);
  if (match) return { value: match[1].trim(), unit: match[2].trim() };
  return { value: strength, unit: '' };
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[60] space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
          t.type === 'success' ? 'bg-green-600 text-white' :
          t.type === 'error' ? 'bg-red-600 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          <span>{t.message}</span>
          <button onClick={() => onClose(t.id)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, hasError, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hasError?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
          hasError ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 focus:ring-teal-500'
        }`}
      />
      {hasError && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
    </div>
  );
}

export default function PharmacyScanPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxId, setSelectedTxId] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [isItemActionLoading, setIsItemActionLoading] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [mode, setMode] = useState<'usb' | 'manual'>('usb');
  const [scanInput, setScanInput] = useState('');
  const [manualNdc, setManualNdc] = useState('');
  const [scanError, setScanError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recentlyAddedItems, setRecentlyAddedItems] = useState<ScannedItem[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('form');
  const [lastWarning, setLastWarning] = useState('');
  const [lastClassification, setLastClassification] = useState<{ item: string; status: string; policyCheck?: PolicyResult; wineCellarItem?: any } | null>(null);
  const [formErrors, setFormErrors] = useState<Set<string>>(new Set());
  const [nonReturnableRoute, setNonReturnableRoute] = useState<'wine_cellar' | 'destruction'>('destruction');
  const [wineCellarDate, setWineCellarDate] = useState('');
  const [manualDestination, setManualDestination] = useState('');

  const [policyAutoCheck, setPolicyAutoCheck] = useState<PolicyResult | null>(null);
  const [isPolicyChecking, setIsPolicyChecking] = useState(false);
  const [preCheckResult, setPreCheckResult] = useState<PolicyResult | null>(null);
  const [isPreChecking, setIsPreChecking] = useState(false);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<any>('/return-transactions', { status: 'in_progress', limit: 50 }, true);
        const rows: Transaction[] = res?.data?.transactions || [];
        setTransactions(rows);
        if (rows.length > 0) {
          setSelectedTxId(rows[0].id);
          setSelectedTx(rows[0]);
        }
      } catch {
        showToast('Failed to load transactions', 'error');
      }
    })();
  }, []);

  useEffect(() => {
    const tx = transactions.find(t => t.id === selectedTxId) || null;
    setSelectedTx(tx);
    if (tx) {
      (async () => {
        try {
          const res = await apiClient.get<any>(`/return-transactions/${tx.id}/items`, {}, true);
          setRecentlyAddedItems(res?.data?.items || []);
        } catch { /* ignore */ }
      })();
    }
  }, [selectedTxId, transactions]);

  useEffect(() => {
    if (mode === 'usb') scanInputRef.current?.focus();
  }, [mode]);

  const updateField = useCallback((field: keyof FormState, value: string | boolean | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => { const next = new Set(prev); next.delete(field as string); return next; });
  }, []);

  const estimatedValue = (() => {
    const price = parseFloat(form.standardPrice) || 0;
    if (price <= 0) return 0;
    const pkgSize = parseFloat(form.fullPackageSize) || 0;
    const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
    if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) return price;
    const pct = form.qtyMode === 'units' ? Math.min(100, (qtyNum / pkgSize) * 100) : Math.min(100, qtyNum);
    return price * (pct / 100);
  })();

  const estimatedStoreValue = (() => {
    const price = parseFloat(form.standardPrice) || 0;
    if (price <= 0) return 0;
    const storeBase = price * 0.70;
    const pkgSize = parseFloat(form.fullPackageSize) || 0;
    const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
    if (!form.fullPackageQtyReturned.trim() || qtyNum <= 0 || pkgSize <= 0) {
      return Math.round(storeBase * 100) / 100;
    }
    const pct = form.qtyMode === 'units' ? Math.min(100, (qtyNum / pkgSize) * 100) : Math.min(100, qtyNum);
    return Math.round(storeBase * (pct / 100) * 100) / 100;
  })();

  const performPolicyCheck = useCallback(async (ndc: string, expirationDate: string, dosageForm?: string) => {
    try {
      const res = await apiClient.post<any>('/policies/check', { ndc, expirationDate, dosageForm }, true);
      const policy = res?.data;
      if (policy) {
        setPolicyAutoCheck(policy);
        if (policy.status === 'returnable' || policy.status === 'non_returnable') {
          setForm(prev => ({ ...prev, returnStatus: policy.status }));
        }
        if (policy.expectedReturnableDate) {
          setPreCheckResult(policy);
        } else {
          setPreCheckResult(null);
        }
        return policy;
      }
    } catch { /* ignore */ }
    setPreCheckResult(null);
    return null;
  }, []);

  useEffect(() => {
    const ndc = form.ndc.trim();
    const exp = form.expirationDate.trim();
    if (!ndc || !exp) {
      setPolicyAutoCheck(null);
      setPreCheckResult(null);
      return;
    }
    setIsPolicyChecking(true);
    setPolicyAutoCheck(null);
    setPreCheckResult(null);
    (async () => {
      await performPolicyCheck(ndc, exp, form.dosageForm || undefined);
      setIsPolicyChecking(false);
    })();
  }, [form.ndc, form.expirationDate, form.dosageForm, performPolicyCheck]);

  const ensureTransaction = async (): Promise<string> => {
    if (selectedTxId) return selectedTxId;
    const res = await apiClient.post<any>('/return-transactions', {}, true);
    const id = res?.data?.id;
    if (!id) throw new Error('Failed to create transaction');
    setSelectedTxId(id);
    return id;
  };

  const handleScan = async (raw: string) => {
    if (!raw.trim()) return;
    setScanError('');
    setLastWarning('');
    setPreCheckResult(null);
    setIsPreChecking(false);
    setPolicyAutoCheck(null);
    setManualDestination('');
    setIsScanLoading(true);

    try {
      const res = await apiClient.post<any>('/barcode/scan', { scanData: raw.trim() }, true);
      const data = res?.data;
      if (!data) { setScanError('No data returned from scan'); return; }
      const af = data.autoFill || {};
      const parsedStrength = parseStrength(af.strength || '');
      const bestPrice = data.pricing?.bestFullPrice ?? data.pricing?.bestPartialPrice;

      setForm({
        ndc: af.ndc || '',
        ndc10: af.ndc10 || '',
        gtin: af.gtin || '',
        proprietaryName: af.proprietaryName || '',
        genericName: af.genericName || '',
        manufacturer: af.manufacturer || '',
        packageDescription: af.packageDescription || '',
        dosageForm: af.dosageForm || '',
        strengthValue: parsedStrength.value,
        strengthUnit: parsedStrength.unit,
        route: af.route || '',
        lotNumber: af.lotNumber || '',
        serialNumber: af.serialNumber || '',
        expirationDate: af.expirationDate || '',
        standardPrice: bestPrice != null ? String(bestPrice) : '',
        fullPackageSize: af.fullPackageSize ? String(af.fullPackageSize) : '',
        fullPackageQtyReturned: '',
        qtyMode: 'units',
        returnStatus: 'tbd',
        deaSchedule: af.deaSchedule || '',
        productType: af.productType || '',
        returnReason: '',
        memo: '',
        scanSource: af.scanSource || 'gs1_qr',
        rawScanData: raw.trim(),
      });

      if (!data.product) {
        setScanError('Barcode parsed but product not found in database. Fields partially filled — please complete manually.');
      }
      setScanInput('');
    } catch (e: any) {
      setScanError(e?.message || 'Scan failed. Try manual entry.');
      setScanInput('');
    } finally {
      setIsScanLoading(false);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleScan(scanInput); }
  };

  const handleManualLookup = async () => {
    if (!manualNdc.trim()) return;
    handleScan(manualNdc.trim());
    setManualNdc('');
  };

  const validateForm = (): boolean => {
    const errors = new Set<string>();
    if (!form.ndc.trim()) errors.add('ndc');
    if (!form.proprietaryName.trim() && !form.genericName.trim()) {
      errors.add('proprietaryName');
      errors.add('genericName');
    }
    if (!form.manufacturer.trim()) errors.add('manufacturer');
    if (!form.lotNumber.trim()) errors.add('lotNumber');
    if (!form.expirationDate.trim()) errors.add('expirationDate');
    setFormErrors(errors);
    if (errors.size > 0) {
      const missing: string[] = [];
      if (errors.has('ndc')) missing.push('NDC');
      if (errors.has('proprietaryName')) missing.push('Drug Name');
      if (errors.has('manufacturer')) missing.push('Manufacturer');
      if (errors.has('lotNumber')) missing.push('Lot Number');
      if (errors.has('expirationDate')) missing.push('Expiration Date');
      showToast(`Please fill in required fields: ${missing.join(', ')}.`, 'error');
      return false;
    }
    return true;
  };

  const handleSave = async (skipWineCellarCheck = false) => {
    if (!validateForm()) return;

    if (!skipWineCellarCheck && preCheckResult?.expectedReturnableDate) return;
    if (!skipWineCellarCheck && !policyAutoCheck && form.ndc && form.expirationDate) {
      setIsPreChecking(true);
      const policy = await performPolicyCheck(form.ndc, form.expirationDate, form.dosageForm || undefined);
      setIsPreChecking(false);
      if (policy?.expectedReturnableDate) return;
    }

    const pkgSize = parseFloat(form.fullPackageSize) || 0;
    const qtyInput = parseFloat(form.fullPackageQtyReturned) || 0;
    let payloadQuantity = 1;
    let payloadIsPartial = false;
    let payloadPartialPercentage: number | null = null;

    if (form.fullPackageQtyReturned.trim() && qtyInput > 0) {
      if (pkgSize > 0) {
        let unitsReturned: number, pctReturned: number;
        if (form.qtyMode === 'units') { unitsReturned = qtyInput; pctReturned = (unitsReturned / pkgSize) * 100; }
        else { pctReturned = qtyInput; unitsReturned = (pctReturned / 100) * pkgSize; }
        if (unitsReturned >= pkgSize || pctReturned >= 100) { payloadQuantity = 1; payloadIsPartial = false; }
        else { payloadQuantity = 1; payloadIsPartial = true; payloadPartialPercentage = Math.min(100, Math.max(1, pctReturned)); }
      } else {
        payloadQuantity = Math.round(qtyInput) || 1;
        payloadIsPartial = false;
      }
    }

    const payload: Record<string, any> = {};
    if (form.ndc) payload.ndc = form.ndc;
    if (form.ndc10) payload.ndc10 = form.ndc10;
    if (form.gtin) payload.gtin = form.gtin;
    if (form.proprietaryName) payload.proprietaryName = form.proprietaryName;
    if (form.genericName) payload.genericName = form.genericName;
    if (form.manufacturer) payload.manufacturer = form.manufacturer;
    if (form.packageDescription) payload.packageDescription = form.packageDescription;
    if (form.dosageForm) payload.dosageForm = form.dosageForm;
    const strengthCombined = [form.strengthValue, form.strengthUnit].filter(Boolean).join(' ');
    if (strengthCombined) payload.strength = strengthCombined;
    if (form.route) payload.route = form.route;
    if (form.lotNumber) payload.lotNumber = form.lotNumber;
    if (form.serialNumber) payload.serialNumber = form.serialNumber;
    if (form.expirationDate) payload.expirationDate = form.expirationDate;
    if (form.standardPrice) payload.standardPrice = parseFloat(form.standardPrice);
    payload.quantity = payloadQuantity;
    if (form.fullPackageSize) payload.fullPackageSize = parseInt(form.fullPackageSize);
    payload.isPartial = payloadIsPartial;
    if (payloadIsPartial && payloadPartialPercentage != null) payload.partialPercentage = payloadPartialPercentage;
    payload.returnStatus = form.returnStatus;
    if (form.returnReason) payload.returnReason = form.returnReason;
    if (form.deaSchedule) payload.deaSchedule = form.deaSchedule;
    if (form.productType) payload.productType = form.productType;
    if (form.memo) payload.memo = form.memo;
    payload.scanSource = form.scanSource;
    if (form.rawScanData) payload.rawScanData = form.rawScanData;
    const destinationToUse = policyAutoCheck?.destination || manualDestination;
    if (form.returnStatus === 'returnable' && destinationToUse) payload.destination = destinationToUse;
    if (form.returnStatus === 'non_returnable' && nonReturnableRoute === 'destruction') payload.destination = 'destruction';

    setIsItemActionLoading(true);
    try {
      const txId = await ensureTransaction();
      const res = await apiClient.post<any>(`/return-transactions/${txId}/items`, payload, true);
      const name = form.proprietaryName || form.ndc || 'Item';
      const savedItem = res?.data?.item;
      const pc = res?.data?.policyCheck;
      const wcItem = res?.data?.wineCellarItem;
      const wcOnly = res?.data?.wineCellarOnly === true;

      if (savedItem) {
        setRecentlyAddedItems(prev => [savedItem, ...prev]);
        setActiveTab('list');
      }

      if (wcOnly && wcItem) {
        showToast(`${name} shelved in Wine Cellar only. Eligible ${pc?.expectedReturnableDate || 'later'}.`);
      } else if (wcItem) {
        showToast(`${name} saved & moved to Wine Cellar! Will be returnable ${pc?.expectedReturnableDate || 'later'}.`);
      } else {
        showToast(`${name} saved! Ready for next scan.`);
      }

      if (res?.data?.warning) setLastWarning(res.data.warning);
      else setLastWarning('');

      setLastClassification({
        item: name,
        status: savedItem?.returnStatus || form.returnStatus,
        policyCheck: pc,
        wineCellarItem: wcItem ?? undefined,
      });

      resetForm();
    } catch (e: any) {
      showToast(e?.message || 'Failed to save item. Please try again.', 'error');
    } finally {
      setIsItemActionLoading(false);
    }
  };

  const handleMoveToWineCellarManual = async () => {
    if (!validateForm()) return;
    if (!wineCellarDate) {
      showToast('Please enter the Expected Returnable Date before moving to Wine Cellar.', 'error');
      return;
    }

    const payload: Record<string, any> = {
      expectedReturnableDate: wineCellarDate,
      notes: form.memo || 'Manually moved — no return policy found',
      quantity: 1,
      isPartial: false,
    };
    if (form.ndc) payload.ndc = form.ndc;
    if (form.proprietaryName || form.genericName) payload.productName = form.proprietaryName || form.genericName;
    if (form.manufacturer) payload.manufacturer = form.manufacturer;
    if (form.lotNumber) payload.lotNumber = form.lotNumber;
    if (form.expirationDate) payload.expirationDate = form.expirationDate;
    if (form.standardPrice) payload.standardPrice = parseFloat(form.standardPrice);

    setIsItemActionLoading(true);
    try {
      await apiClient.post('/wine-cellar', payload, true);
      const name = form.proprietaryName || form.ndc || 'Item';
      showToast(`${name} moved to Wine Cellar. Expected return: ${wineCellarDate}.`);
      setLastClassification({ item: name, status: 'non_returnable' });
      resetForm();
    } catch (e: any) {
      showToast(e?.message || 'Failed to move to Wine Cellar', 'error');
    } finally {
      setIsItemActionLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setFormErrors(new Set());
    setWineCellarDate('');
    setManualDestination('');
    setNonReturnableRoute('destruction');
    setScanError('');
    setScanInput('');
    setPreCheckResult(null);
    setPolicyAutoCheck(null);
    setIsPolicyChecking(false);
    setIsPreChecking(false);
    if (mode === 'usb') scanInputRef.current?.focus();
  };

  const handleRemoveRecentItem = async (itemId: string) => {
    if (!selectedTxId) return;
    setIsItemActionLoading(true);
    try {
      await apiClient.delete(`/return-transactions/${selectedTxId}/items/${itemId}`, true);
      setRecentlyAddedItems(prev => prev.filter(item => item.id !== itemId));
      showToast('Item removed successfully');
    } catch {
      showToast('Failed to remove item.', 'error');
    } finally {
      setIsItemActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/returns')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Returns
            </button>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <ScanLine className="w-4 h-4 text-teal-600" /> Scan & Add Products
            </h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              {selectedTx ? (
                <>
                  <span className="font-mono font-semibold text-gray-800">{selectedTx.licensePlate}</span>
                  <span>·</span>
                  <span>{selectedTx.pharmacyName}</span>
                </>
              ) : (
                <span>Select or create a transaction</span>
              )}
              {recentlyAddedItems.length > 0 && (
                <>
                  <span>·</span>
                  <Badge variant="success"><span className="text-[10px]">{recentlyAddedItems.length} added</span></Badge>
                </>
              )}
            </div>
          </div>
          <button onClick={() => router.push('/returns')} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Done
          </button>
        </div>

        {/* Transaction selector */}
        <div className="bg-white rounded-lg shadow px-4 py-2">
          <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Active Transaction</label>
          <select
            value={selectedTxId}
            onChange={e => setSelectedTxId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">— Create new on save —</option>
            {transactions.map(t => (
              <option key={t.id} value={t.id}>{t.licensePlate} ({t.status})</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        {recentlyAddedItems.length > 0 && (
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === 'list' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Products ({recentlyAddedItems.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === 'form' ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5" />
                Scan &amp; Add
              </div>
            </button>
          </div>
        )}

        {/* Product List Tab */}
        {activeTab === 'list' && recentlyAddedItems.length > 0 && (
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-700">Products Added</h2>
              <p className="text-[10px] text-gray-500">{recentlyAddedItems.length} item{recentlyAddedItems.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentlyAddedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {item.proprietaryName || item.genericName || 'Unknown Product'}
                      </p>
                      <Badge variant={
                        item.returnStatus === 'returnable' ? 'success' :
                        item.returnStatus === 'non_returnable' ? 'error' :
                        'warning'
                      }>
                        <span className="text-[10px]">
                          {item.returnStatus === 'tbd' ? 'TBD' :
                           item.returnStatus === 'returnable' ? 'Returnable' :
                           'Non-Returnable'}
                        </span>
                      </Badge>
                      {item.isPartial && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-semibold">
                          Partial {item.partialPercentage}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                      <div><span className="text-gray-500">NDC:</span> <span className="font-semibold text-gray-900 font-mono">{item.ndc || '—'}</span></div>
                      <div><span className="text-gray-500">Lot:</span> <span className="font-medium text-gray-800">{item.lotNumber || '—'}</span></div>
                      <div><span className="text-gray-500">Exp:</span> <span className="font-medium text-gray-800">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</span></div>
                      <div><span className="text-gray-500">Value:</span> <span className="font-bold text-green-600">${item.estimatedValue?.toFixed(2) || '0.00'}</span></div>
                      {item.manufacturer && (
                        <div className="col-span-2"><span className="text-gray-500">Manufacturer:</span> <span className="font-medium text-gray-800">{item.manufacturer}</span></div>
                      )}
                      {item.destination && (
                        <div className="col-span-2"><span className="text-gray-500">Destination:</span> <span className="font-medium text-gray-800 capitalize">{item.destination}</span></div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRecentItem(item.id)}
                    disabled={isItemActionLoading}
                    className="flex-shrink-0 p-2 rounded border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove this item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan & Add Form Tab */}
        {(activeTab === 'form' || recentlyAddedItems.length === 0) && (
          <>
            {/* Scan Input */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <div className="flex gap-1.5 mb-3">
                {([
                  { key: 'usb', icon: ScanLine, label: 'USB Scanner' },
                  { key: 'manual', icon: Keyboard, label: 'Manual NDC' },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      mode === key ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {mode === 'usb' && (
                <div>
                  <div className="relative">
                    <ScanLine className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={handleScanKeyDown}
                      placeholder="Scan with USB/Bluetooth scanner — press Enter after scan"
                      className="w-full pl-8 pr-8 py-2 text-xs border-2 border-teal-300 bg-teal-50 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      autoFocus
                    />
                    {isScanLoading && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Connect USB or Bluetooth barcode scanner — types code automatically and sends Enter.</p>
                </div>
              )}

              {mode === 'manual' && (
                <div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={manualNdc}
                      onChange={e => setManualNdc(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                      placeholder="Enter NDC (e.g. 43547-3250-06) and press Enter or Lookup..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      autoFocus
                    />
                    <button onClick={handleManualLookup} disabled={isScanLoading || !manualNdc.trim()} className="px-3 py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                      {isScanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Enter the full NDC from the bottle label.</p>
                </div>
              )}

              {scanError && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
              {lastWarning && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{lastWarning}</span>
                </div>
              )}
            </div>

            {/* Classification Result */}
            {lastClassification && (
              <div className={`rounded-lg border px-3 py-2 ${
                lastClassification.wineCellarItem ? 'bg-purple-50 border-purple-300' :
                lastClassification.status === 'returnable' ? 'bg-green-50 border-green-300' :
                lastClassification.status === 'non_returnable' ? 'bg-red-50 border-red-300' :
                'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lastClassification.wineCellarItem ? 'bg-purple-200' :
                      lastClassification.status === 'returnable' ? 'bg-green-200' :
                      lastClassification.status === 'non_returnable' ? 'bg-red-200' : 'bg-yellow-200'
                    }`}>
                      {lastClassification.wineCellarItem ? <Archive className="w-3.5 h-3.5 text-purple-700" /> :
                       lastClassification.status === 'returnable' ? <CheckCircle className="w-3.5 h-3.5 text-green-700" /> :
                       lastClassification.status === 'non_returnable' ? <X className="w-3.5 h-3.5 text-red-700" /> :
                       <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${
                        lastClassification.wineCellarItem ? 'text-purple-800' :
                        lastClassification.status === 'returnable' ? 'text-green-800' :
                        lastClassification.status === 'non_returnable' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {lastClassification.item} — {
                          lastClassification.wineCellarItem ? 'MOVED TO WINE CELLAR' :
                          lastClassification.status === 'returnable' ? 'RETURNABLE' :
                          lastClassification.status === 'non_returnable' ? 'NON-RETURNABLE' : 'TBD (Needs Research)'
                        }
                      </p>
                      {lastClassification.policyCheck?.destination && (
                        <p className="text-[10px] text-gray-600 mt-0.5">Destination: <span className="font-semibold capitalize">{lastClassification.policyCheck.destination}</span></p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setLastClassification(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Product Form */}
            <div className="bg-white rounded-lg shadow px-4 py-3">
              <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Product Information</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Field label="NDC" value={form.ndc} onChange={v => updateField('ndc', v)} placeholder="e.g. 43547-3250-06" required hasError={formErrors.has('ndc')} />
                <Field label="Proprietary Name" value={form.proprietaryName} onChange={v => updateField('proprietaryName', v)} placeholder="Brand name" required hasError={formErrors.has('proprietaryName')} />
                <Field label="Generic Name" value={form.genericName} onChange={v => updateField('genericName', v)} placeholder="Generic name" hasError={formErrors.has('genericName')} />
                <Field label="Manufacturer" value={form.manufacturer} onChange={v => updateField('manufacturer', v)} placeholder="Manufacturer" required hasError={formErrors.has('manufacturer')} />
                <Field label="Package Description" value={form.packageDescription} onChange={v => updateField('packageDescription', v)} placeholder="e.g. 60 TABLET in BOTTLE" />
                <Field label="Dosage Form" value={form.dosageForm} onChange={v => updateField('dosageForm', v)} placeholder="e.g. TABLET" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Strength</label>
                  <div className="flex gap-1">
                    <input type="text" value={form.strengthValue} onChange={e => updateField('strengthValue', e.target.value)} placeholder="500" className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    <input type="text" value={form.strengthUnit} onChange={e => updateField('strengthUnit', e.target.value)} placeholder="mg" className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                </div>
                <Field label="Route" value={form.route} onChange={v => updateField('route', v)} placeholder="e.g. ORAL" />
                <Field label="DEA Schedule" value={form.deaSchedule} onChange={v => updateField('deaSchedule', v)} placeholder="e.g. CII" />
                <Field label="Lot Number" value={form.lotNumber} onChange={v => updateField('lotNumber', v)} placeholder="Lot #" required hasError={formErrors.has('lotNumber')} />
                <Field label="Serial Number" value={form.serialNumber} onChange={v => updateField('serialNumber', v)} placeholder="Serial #" />
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                    Expiration Date<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.expirationDate}
                    onChange={e => updateField('expirationDate', e.target.value)}
                    className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                      formErrors.has('expirationDate') ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 focus:ring-teal-500'
                    }`}
                  />
                  {formErrors.has('expirationDate') && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                </div>
              </div>

              <hr className="my-3 border-gray-100" />
              <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quantity &amp; Pricing</h2>

              {(() => {
                const pkgSize = parseFloat(form.fullPackageSize) || 0;
                const qtyNum = parseFloat(form.fullPackageQtyReturned) || 0;
                let isPartialDerived = false;
                let pctDerived = 0;
                let unitsDerived = 0;
                if (form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0) {
                  if (form.qtyMode === 'units') { unitsDerived = qtyNum; pctDerived = (qtyNum / pkgSize) * 100; }
                  else { pctDerived = qtyNum; unitsDerived = (pctDerived / 100) * pkgSize; }
                  isPartialDerived = unitsDerived < pkgSize && pctDerived < 100;
                }
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Price ($)</label>
                        <input type="number" step="0.01" min="0" value={form.standardPrice} onChange={e => updateField('standardPrice', e.target.value)} placeholder="0.00" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Pkg Size</label>
                        <input type="number" min="1" value={form.fullPackageSize} onChange={e => updateField('fullPackageSize', e.target.value)} placeholder="e.g. 60" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                          Qty Returned <span className="text-gray-400">({form.qtyMode === 'units' ? 'units' : '%'})</span>
                        </label>
                        <div className="flex gap-1">
                          <input type="number" min="0" step="any" value={form.fullPackageQtyReturned} onChange={e => updateField('fullPackageQtyReturned', e.target.value)} placeholder={form.qtyMode === 'units' ? '45' : '75'} className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                          <button type="button" onClick={() => updateField('qtyMode', form.qtyMode === 'units' ? 'percent' : 'units')} className="px-1.5 text-[10px] font-semibold rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                            {form.qtyMode === 'units' ? '#' : '%'}
                          </button>
                        </div>
                        {form.fullPackageQtyReturned.trim() && qtyNum > 0 && pkgSize > 0 && (
                          <p className="text-[10px] mt-0.5 font-medium text-green-600">
                            {isPartialDerived ? `Partial — ${pctDerived.toFixed(1)}% (${unitsDerived.toFixed(1)} units)` : 'Full bottle'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Est. Value</label>
                        <input type="text" readOnly value={`$${estimatedValue.toFixed(2)}`} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Est. Store Value <span className="text-gray-400 font-normal">(-30%)</span></label>
                        <input type="text" readOnly value={`$${estimatedStoreValue.toFixed(2)}`} className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 font-medium" />
                      </div>
                    </div>
                  </>
                );
              })()}

              <hr className="my-3 border-gray-100" />
              <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Classification</h2>

              {isPolicyChecking && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> Running policy check...
                </div>
              )}
              {!isPolicyChecking && policyAutoCheck && (
                <div className={`mb-2 flex items-start gap-1.5 text-xs rounded px-2.5 py-1.5 border ${
                  policyAutoCheck.status === 'returnable' ? 'bg-green-50 border-green-200 text-green-800' :
                  policyAutoCheck.status === 'non_returnable' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  {policyAutoCheck.status === 'returnable' ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                   policyAutoCheck.status === 'non_returnable' ? <Ban className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                   <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                  <div>
                    <span className="font-semibold">{policyAutoCheck.manufacturerName ? `${policyAutoCheck.manufacturerName}: ` : 'Policy: '}</span>
                    {policyAutoCheck.status === 'returnable' && 'Auto-classified as Returnable — locked.'}
                    {policyAutoCheck.status === 'non_returnable' && `Non-Returnable — locked. ${policyAutoCheck.reason ? `(${policyAutoCheck.reason.replace(/_/g, ' ')})` : ''}`}
                    {policyAutoCheck.status === 'tbd' && 'No policy found — select status manually.'}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 mb-2">
                {(['tbd', 'returnable', 'non_returnable'] as const).map((status) => {
                  const isLocked = !isPolicyChecking && !!policyAutoCheck && policyAutoCheck.status !== 'tbd';
                  return (
                    <label key={status} className={`flex items-center gap-1.5 text-xs ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                      <input type="radio" name="returnStatus" value={status} checked={form.returnStatus === status} onChange={() => { if (!isLocked) updateField('returnStatus', status); }} disabled={isLocked} className="text-teal-600 focus:ring-teal-500" />
                      <span className={`font-medium ${status === 'returnable' ? 'text-green-700' : status === 'non_returnable' ? 'text-red-700' : 'text-yellow-700'}`}>
                        {status === 'tbd' ? 'TBD' : status === 'returnable' ? 'Returnable' : 'Non-Returnable'}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Return Reason</label>
                  <select value={form.returnReason} onChange={e => updateField('returnReason', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500">
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r || '— Select reason —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Memo</label>
                  <input type="text" value={form.memo} onChange={e => updateField('memo', e.target.value)} placeholder="Optional memo" className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                </div>
              </div>

              {/* Manual Destination (returnable + no policy) */}
              {(!policyAutoCheck || policyAutoCheck.status === 'tbd') && form.returnStatus === 'returnable' && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="text-[10px] font-semibold text-amber-800">No return policy found — select return destination manually</p>
                  </div>
                  <select
                    value={manualDestination}
                    onChange={e => setManualDestination(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                  >
                    <option value="">— Select destination —</option>
                    <option value="inmar">Inmar</option>
                    <option value="qualanex">Qualanex</option>
                    <option value="pharmalink">PharmaLink</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Non-returnable route selector */}
              {form.returnStatus === 'non_returnable' && (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-[10px] font-semibold text-red-800 mb-1.5">Non-Returnable Route</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 px-2 py-1.5 border rounded cursor-pointer ${nonReturnableRoute === 'wine_cellar' ? 'border-purple-400 bg-purple-50' : 'border-gray-300 bg-white'}`}>
                      <input type="radio" checked={nonReturnableRoute === 'wine_cellar'} onChange={() => setNonReturnableRoute('wine_cellar')} />
                      <Archive className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-800">Wine Cellar</span>
                    </label>
                    <label className={`flex items-center gap-2 px-2 py-1.5 border rounded cursor-pointer ${nonReturnableRoute === 'destruction' ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}>
                      <input type="radio" checked={nonReturnableRoute === 'destruction'} onChange={() => setNonReturnableRoute('destruction')} />
                      <Ban className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-xs font-medium text-red-800">Destruction</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                {isPreChecking ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking return policy...
                  </div>
                ) : preCheckResult?.expectedReturnableDate ? (
                  <>
                    <div className="mb-2 bg-purple-50 border border-purple-200 rounded px-3 py-2 flex items-start gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-800">This product is too early to return</p>
                        <p className="text-[10px] text-purple-700 mt-0.5">
                          Shelve in Wine Cellar. Eligible from: <span className="font-semibold">{preCheckResult.expectedReturnableDate}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSave(true)} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {isItemActionLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Moving...</> : <><Archive className="w-3 h-3" />Move to Wine Cellar</>}
                      </button>
                      <button onClick={resetForm} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </>
                ) : (() => {
                  const noPolicy = !policyAutoCheck || policyAutoCheck.status === 'tbd';
                  const isManualNonReturnable = noPolicy && form.returnStatus === 'non_returnable';
                  return isManualNonReturnable ? (
                    <>
                      {nonReturnableRoute === 'wine_cellar' && (
                        <div className="mb-2 bg-purple-50 border border-purple-200 rounded px-3 py-2 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <Archive className="w-3.5 h-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-purple-800">Wine Cellar route selected</p>
                              <p className="text-[10px] text-purple-700 mt-0.5">Enter expected returnable date, then move item to Wine Cellar.</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-purple-700 mb-0.5">
                              Expected Returnable Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={wineCellarDate}
                              onChange={e => setWineCellarDate(e.target.value)}
                              className={`w-44 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-purple-400 ${!wineCellarDate ? 'border-red-300 bg-red-50' : 'border-purple-300 bg-white'}`}
                            />
                          </div>
                        </div>
                      )}
                      {nonReturnableRoute === 'destruction' && (
                        <div className="mb-2 bg-red-50 border border-red-200 rounded px-3 py-2">
                          <div className="flex items-start gap-1.5">
                            <Ban className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-red-800">Destruction route selected</p>
                              <p className="text-[10px] text-red-700 mt-0.5">Item will be saved as non-returnable and routed to destruction workflow.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {nonReturnableRoute === 'wine_cellar' ? (
                          <button onClick={handleMoveToWineCellarManual} disabled={isItemActionLoading || !wineCellarDate} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
                            {isItemActionLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Moving...</> : <><Archive className="w-3 h-3" />Move to Wine Cellar</>}
                          </button>
                        ) : (
                          <button onClick={() => handleSave()} disabled={isItemActionLoading || isPreChecking} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {isItemActionLoading || isPreChecking ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</> : <><Ban className="w-3 h-3" />Save to Destruction</>}
                          </button>
                        )}
                        <button onClick={resetForm} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                          <X className="w-3 h-3" /> Clear
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => handleSave()} disabled={isItemActionLoading || isPreChecking || (!form.ndc && !form.proprietaryName)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {isItemActionLoading || isPreChecking
                          ? <><Loader2 className="w-3 h-3 animate-spin" />{isPreChecking ? 'Checking...' : 'Saving...'}</>
                          : <><CheckCircle className="w-3 h-3" />Save &amp; Scan Next</>}
                      </button>
                      <button onClick={resetForm} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                        <RotateCcw className="w-3 h-3" /> Clear
                      </button>
                      <button onClick={() => router.push('/returns')} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded text-gray-500 hover:bg-gray-100 transition-colors">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
