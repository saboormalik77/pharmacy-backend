'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Search, DollarSign, Calculator, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle, Plus, FileText, CreditCard, ExternalLink, Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchPharmacyPayments,
  fetchOpenBatches,
  fetchBatchPharmacies,
  calculatePayout,
  createPharmacyPayment,
  updatePharmacyPayment,
  generateCheckNumber,
  issueCheck,
  clearCalculation,
  clearBatchPharmacies,
  clearGeneratedCheckNumber,
  setFilters,
  PharmacyPayment,
  BatchPharmacy,
} from '@/lib/store/pharmacyPaymentsSlice';
import { useDebounce } from '@/lib/hooks/useDebounce';

type PharmacyPaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'disputed';

interface CalculatePayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (pharmacyId: string, batchId: string) => void;
  onCreatePayment: () => void;
  onBatchSelect: (batchId: string) => void;
  calculation: any | null;
  isCalculating: boolean;
  isCreating: boolean;
  openBatches: { id: string; batchName: string }[];
  batchPharmacies: BatchPharmacy[];
  isLoadingOpenBatches: boolean;
  isLoadingBatchPharmacies: boolean;
}

function CalculatePayoutModal({
  isOpen,
  onClose,
  onCalculate,
  onCreatePayment,
  onBatchSelect,
  calculation,
  isCalculating,
  isCreating,
  openBatches,
  batchPharmacies,
  isLoadingOpenBatches,
  isLoadingBatchPharmacies,
}: CalculatePayoutModalProps) {
  const [pharmacyId, setPharmacyId] = useState('');
  const [batchId, setBatchId] = useState('');

  const pharmacyEligible = (p: BatchPharmacy) =>
    !p.payoutRecorded;
  const eligiblePharmacyCount = batchPharmacies.filter(pharmacyEligible).length;

  const handleBatchChange = (value: string) => {
    setBatchId(value);
    setPharmacyId('');
    if (value) onBatchSelect(value);
  };

  const handleCalculate = () => {
    if (!pharmacyId || !batchId) return;
    const picked = batchPharmacies.find((p) => p.id === pharmacyId);
    if (!picked || !pharmacyEligible(picked)) return;
    onCalculate(pharmacyId, batchId);
  };

  const handleClose = () => {
    setPharmacyId('');
    setBatchId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
    >
      <div className="rounded-[4px] max-w-lg w-full shadow-xl flex flex-col max-h-[90vh] border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Calculator className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Calculate Pharmacy Payout
          </h2>
          <button onClick={handleClose} className="p-0.5" style={{ color: 'var(--outline)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          {!calculation ? (
            <div className="space-y-3">
              {/* Batch dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Batch{' '}
                  <span className="text-gray-400 font-normal">
                    (closed, all memos shipped; at least one pharmacy fully RD-paid + payout remaining)
                  </span>
                </label>
                {isLoadingOpenBatches ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2" style={{ borderBottomColor: 'var(--primary)' }}></div>
                    Loading batches...
                  </div>
                ) : (
                  <select
                    value={batchId}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select a closed batch...</option>
                    {openBatches.map((b) => (
                      <option key={b.id} value={b.id}>{b.batchName}</option>
                    ))}
                  </select>
                )}
                {!isLoadingOpenBatches && openBatches.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    No batches match: closed, all memos shipped, at least one pharmacy with all of its debit
                    memos paid or partial on Unpaid, and that pharmacy still needs a payout record.
                  </p>
                )}
              </div>

              {/* Pharmacy dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Pharmacy</label>
                {isLoadingBatchPharmacies ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2" style={{ borderBottomColor: 'var(--primary)' }}></div>
                    Loading pharmacies...
                  </div>
                ) : (
                  <>
                    <select
                      value={pharmacyId}
                      onChange={(e) => setPharmacyId(e.target.value)}
                      disabled={!batchId}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!batchId
                          ? 'Select a batch first...'
                          : batchPharmacies.length === 0
                            ? 'No pharmacies with all debit memos paid/partial yet (Warehouse / Unpaid)'
                            : eligiblePharmacyCount === 0
                              ? 'All listed pharmacies already have a payout record'
                              : 'Select a pharmacy...'}
                      </option>
                      {batchPharmacies.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.payoutRecorded}>
                          {p.payoutRecorded ? `${p.name} — payout already recorded` : p.name}
                        </option>
                      ))}
                    </select>
                    {batchId &&
                      batchPharmacies.length > 0 &&
                      batchPharmacies.some((p) => p.payoutRecorded) &&
                      eligiblePharmacyCount > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          This batch stays listed until every pharmacy has a payout record. Entries with “payout already recorded” are read-only.
                        </p>
                      )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded p-3 space-y-2" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--on-secondary-container)' }}>Payout Calculated Successfully</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Pharmacy', value: calculation.pharmacyName || 'N/A' },
                  { label: 'Batch', value: calculation.batchName || 'N/A' },
                  { label: 'Total Credit', value: `$${calculation.totalCreditReceived?.toFixed(2) || '0.00'}` },
                  { label: 'Memo Count', value: calculation.memoCount || 0 },
                  { label: `Fee (${calculation.companyFeePercent || 0}%)`, value: `$${calculation.companyFee?.toFixed(2) || '0.00'}` },
                  { label: 'Pharmacy Payout', value: `$${calculation.pharmacyPayout?.toFixed(2) || '0.00'}`, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label}>
                    <span className="text-[10px]" style={{ color: 'var(--on-secondary-container)' }}>{label}</span>
                    <p className={`text-xs ${bold ? 'font-bold' : ''}`} style={{ color: 'var(--on-secondary-container)' }}>{value as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs border rounded transition-colors"
            style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            Cancel
          </button>
          {!calculation ? (
            <button
              onClick={handleCalculate}
              disabled={(() => {
                const picked = batchPharmacies.find((p) => p.id === pharmacyId);
                return (
                  isCalculating ||
                  !pharmacyId ||
                  !batchId ||
                  !picked ||
                  !pharmacyEligible(picked)
                );
              })()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Calculator className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
              {isCalculating ? 'Calculating...' : 'Calculate Payout'}
            </button>
          ) : (
            <button
              onClick={onCreatePayment}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
              {isCreating ? 'Creating...' : 'Create Payment Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Issue Check Modal
interface IssueCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PharmacyPayment | null;
  onIssueCheck: (checkData: { checkNumber: string; paymentType: 'ocs' | 'por' | 'direct'; returnReferenceNumber?: string; notes?: string }) => void;
  onGenerateCheckNumber: () => void;
  generatedCheckNumber: string | null;
  isGenerating: boolean;
  isIssuing: boolean;
}

function IssueCheckModal({
  isOpen,
  onClose,
  payment,
  onIssueCheck,
  onGenerateCheckNumber,
  generatedCheckNumber,
  isGenerating,
  isIssuing,
}: IssueCheckModalProps) {
  const [checkNumber, setCheckNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'ocs' | 'por' | 'direct'>('ocs');
  const [returnReferenceNumber, setReturnReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (generatedCheckNumber) {
      setCheckNumber(generatedCheckNumber);
    }
  }, [generatedCheckNumber]);

  const handleClose = () => {
    setCheckNumber('');
    setPaymentType('ocs');
    setReturnReferenceNumber('');
    setNotes('');
    onClose();
  };

  const handleSubmit = () => {
    if (!checkNumber.trim()) return;
    onIssueCheck({
      checkNumber: checkNumber.trim(),
      paymentType,
      returnReferenceNumber: returnReferenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}>
      <div className="rounded-[4px] max-w-lg w-full shadow-xl flex flex-col max-h-[90vh] border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Banknote className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
            Issue Check Payment
          </h2>
          <button onClick={handleClose} className="p-0.5" style={{ color: 'var(--outline)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4">
          {/* Payment Summary */}
          <div className="border rounded p-3" style={{ backgroundColor: 'var(--primary-container)', borderColor: 'var(--outline-variant)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--on-primary-container)' }}>Payment Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--on-primary-container)' }}>Pharmacy:</span>
                <p className="font-medium" style={{ color: 'var(--on-primary-container)' }}>{payment.pharmacyName}</p>
              </div>
              <div>
                <span style={{ color: 'var(--on-primary-container)' }}>Batch:</span>
                <p className="font-medium" style={{ color: 'var(--on-primary-container)' }}>{payment.batchName || 'N/A'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--on-primary-container)' }}>Total Credit:</span>
                <p className="font-medium" style={{ color: 'var(--on-primary-container)' }}>${payment.totalCreditReceived?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--on-primary-container)' }}>Payout Amount:</span>
                <p className="font-bold" style={{ color: 'var(--secondary)' }}>${payment.pharmacyPayout?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          {/* Check Number */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Check Number <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="e.g., 216461"
                className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={onGenerateCheckNumber}
                disabled={isGenerating}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {isGenerating ? 'Generating...' : 'Auto-Generate'}
              </button>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Payment Type <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="flex gap-3">
              {[
                { value: 'ocs', label: 'OCS', desc: 'On-Credit Settlement' },
                { value: 'por', label: 'POR', desc: 'Pay-On-Receipt' },
                { value: 'direct', label: 'Direct', desc: 'Direct Credit' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value={opt.value}
                    checked={paymentType === opt.value}
                    onChange={(e) => setPaymentType(e.target.value as 'ocs' | 'por' | 'direct')}
                    className="text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-700">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-gray-400 ml-1">({opt.desc})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Return Reference Number */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Return Reference Number
            </label>
            <input
              type="text"
              value={returnReferenceNumber}
              onChange={(e) => setReturnReferenceNumber(e.target.value)}
              placeholder="e.g., 3S15L"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs border rounded transition-colors"
            style={{ borderColor: 'var(--outline-variant)', color: 'var(--on-surface)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!checkNumber.trim() || isIssuing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--secondary)' }}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${isIssuing ? 'animate-spin' : ''}`} />
            {isIssuing ? 'Issuing Check...' : 'Issue Check & Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PharmacyPaymentsPageContent() {
  const dispatch = useAppDispatch();
  const { 
    payments, 
    pagination, 
    calculation,
    openBatches,
    batchPharmacies,
    isLoadingOpenBatches,
    isLoadingBatchPharmacies,
    isLoading, 
    isCalculating,
    isCreating,
    isIssuingCheck,
    generatedCheckNumber,
    isGeneratingCheckNumber,
    error 
  } = useAppSelector((state) => state.pharmacyPayments);

  const [searchTerm, setSearchTermLocal] = useState('');
  const [statusFilter, setStatusFilterLocal] = useState<PharmacyPaymentStatus | 'all'>('all');
  const [pharmacyFilter, setPharmacyFilterLocal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewModal, setViewModal] = useState<PharmacyPayment | null>(null);
  const [calculateModal, setCalculateModal] = useState(false);
  const [issueCheckModal, setIssueCheckModal] = useState<PharmacyPayment | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);
  const debouncedPharmacyFilter = useDebounce(pharmacyFilter, 500);

  useEffect(() => {
    dispatch(fetchPharmacyPayments({
      page: currentPage,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      pharmacy: debouncedPharmacyFilter || undefined,
    }));
  }, [dispatch, currentPage, debouncedSearch, statusFilter, debouncedPharmacyFilter]);

  const handleSearchChange = (value: string) => {
    setSearchTermLocal(value);
    dispatch(setFilters({ search: value }));
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: PharmacyPaymentStatus | 'all') => {
    setStatusFilterLocal(value);
    dispatch(setFilters({ status: value === 'all' ? '' : value }));
    setCurrentPage(1);
  };

  const handlePharmacyFilterChange = (value: string) => {
    setPharmacyFilterLocal(value);
    dispatch(setFilters({ pharmacy: value }));
    setCurrentPage(1);
  };

  const handleCalculatePayout = (pharmacyId: string, batchId: string) => {
    dispatch(calculatePayout({ pharmacyId, batchId }));
  };

  const handleCreatePayment = async () => {
    if (calculation) {
      const result = await dispatch(createPharmacyPayment({
        pharmacyId: calculation.pharmacyId,
        batchId: calculation.batchId,
        totalCreditReceived: calculation.totalCreditReceived,
        companyFeePercent: calculation.companyFeePercent,
        companyFee: calculation.companyFee,
        gpoShare: calculation.gpoShare,
        pharmacyPayout: calculation.pharmacyPayout
      }));
      if (createPharmacyPayment.fulfilled.match(result)) {
        setCalculateModal(false);
        dispatch(clearCalculation());
        dispatch(clearBatchPharmacies());
        dispatch(fetchPharmacyPayments({
          page: currentPage,
          limit: 20,
          search: debouncedSearch || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          pharmacy: debouncedPharmacyFilter || undefined,
        }));
      }
    }
  };

  const handleStatusUpdate = async (paymentId: string, newStatus: PharmacyPaymentStatus) => {
    await dispatch(updatePharmacyPayment({ id: paymentId, updates: { status: newStatus } }));
    dispatch(fetchPharmacyPayments({
      page: currentPage,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      pharmacy: debouncedPharmacyFilter || undefined,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCalculateModal = () => {
    dispatch(fetchOpenBatches());
    setCalculateModal(true);
  };

  const handleCloseCalculateModal = () => {
    setCalculateModal(false);
    dispatch(clearCalculation());
    dispatch(clearBatchPharmacies());
  };

  const handleBatchSelect = (batchId: string) => {
    dispatch(fetchBatchPharmacies(batchId));
  };

  // Issue Check handlers
  const handleOpenIssueCheckModal = (payment: PharmacyPayment) => {
    setIssueCheckModal(payment);
  };

  const handleCloseIssueCheckModal = () => {
    setIssueCheckModal(null);
    dispatch(clearGeneratedCheckNumber());
  };

  const handleGenerateCheckNumber = () => {
    dispatch(generateCheckNumber());
  };

  const handleIssueCheck = async (checkData: { checkNumber: string; paymentType: 'ocs' | 'por' | 'direct'; returnReferenceNumber?: string; notes?: string }) => {
    if (!issueCheckModal) return;
    const result = await dispatch(issueCheck({ id: issueCheckModal.id, checkData }));
    if (issueCheck.fulfilled.match(result)) {
      setIssueCheckModal(null);
      dispatch(clearGeneratedCheckNumber());
      dispatch(fetchPharmacyPayments({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        pharmacy: debouncedPharmacyFilter || undefined,
      }));
    }
  };

  // Open Check PDF in new tab
  const handleViewCheckPdf = (checkNumber: string) => {
    const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/pharmacy-payments/check-pdf/${checkNumber}`;
    window.open(pdfUrl, '_blank');
  };

  const getStatusVariant = (status: PharmacyPaymentStatus) => {
    switch (status) {
      case 'paid': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'default';
      case 'failed': return 'danger';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: PharmacyPaymentStatus) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />;
      case 'processing': return <Clock className="w-3 h-3" />;
      case 'pending': return <AlertTriangle className="w-3 h-3" />;
      case 'failed': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link href="/payout-hub" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
            <ChevronLeft className="w-3 h-3" /> Back to Payout Management
          </Link>
          <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Pharmacy Payments</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Manage pharmacy payouts and payments</p>
        </div>
        <button
          onClick={handleOpenCalculateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
        >
          <Calculator className="w-3.5 h-3.5" />
          Calculate Payout
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded text-xs border" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)', color: 'var(--on-error-container)' }}>
          {error}
        </div>
      )}

      <div className="rounded-[4px] shadow-sm border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            />
          </div>
          <input
            type="text"
            placeholder="Filter by pharmacy name..."
            value={pharmacyFilter}
            onChange={(e) => handlePharmacyFilterChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
            className="px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2" style={{ borderBottomColor: 'var(--primary)' }}></div>
            <p className="text-xs text-gray-400">Loading payments...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
                    {['Payment ID', 'Check #', 'Pharmacy', 'Batch', 'Total Credit', 'Payout Amount', 'Type', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-primary-50/40 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-mono text-gray-500">
                        #{payment.id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {payment.checkNumber ? (
                          <button
                            onClick={() => handleViewCheckPdf(payment.checkNumber!)}
                            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: 'var(--primary)' }}
                            title="View Check PDF"
                          >
                            <FileText className="w-3 h-3" />
                            {payment.checkNumber}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{payment.pharmacyName || 'N/A'}</div>
                        <div className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{payment.pharmacyId.slice(0, 8)}…</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm" style={{ color: 'var(--foreground)' }}>{payment.batchName || 'N/A'}</div>
                        <div className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{payment.batchId ? payment.batchId.slice(0, 8) + '…' : 'None'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        ${payment.totalCreditReceived?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold" style={{ color: 'var(--secondary)' }}>
                        ${payment.pharmacyPayout?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {payment.paymentType ? (
                          <Badge variant={payment.paymentType === 'ocs' ? 'default' : payment.paymentType === 'por' ? 'warning' : 'secondary'}>
                            {payment.paymentType.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(payment.status)}
                          <Badge variant={getStatusVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewModal(payment)}
                            className="px-2 py-1 text-[10px] font-medium border rounded transition-colors"
                            style={{ color: 'var(--on-primary-container)', backgroundColor: 'var(--primary-container)', borderColor: 'var(--outline-variant)' }}
                          >
                            View
                          </button>
                          {payment.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(payment.id, 'processing')}
                              className="px-2 py-1 text-[10px] font-medium border rounded transition-colors"
                              style={{ color: 'var(--on-tertiary-container)', backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}
                            >
                             Mark as Processing
                            </button>
                          )}
                          {payment.status === 'processing' && !payment.checkNumber && (
                            <button
                              type="button"
                              onClick={() => handleOpenIssueCheckModal(payment)}
                              className="px-2 py-1 text-[10px] font-medium border rounded transition-colors inline-flex items-center gap-1"
                              style={{ color: 'var(--on-secondary-container)', backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}
                            >
                              <Banknote className="w-3 h-3" />
                              Issue Check
                            </button>
                          )}
                          {payment.status === 'processing' && payment.checkNumber && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(payment.id, 'paid')}
                              className="px-2 py-1 text-[10px] font-medium border rounded transition-colors"
                              style={{ color: 'var(--on-secondary-container)', backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}
                            >
                              Mark Paid
                            </button>
                          )}
                          {payment.checkNumber && (
                            <button
                              type="button"
                              onClick={() => handleViewCheckPdf(payment.checkNumber!)}
                              className="px-2 py-1 text-[10px] font-medium border rounded transition-colors inline-flex items-center gap-1"
                              style={{ color: 'var(--on-tertiary-container)', backgroundColor: 'var(--tertiary-fixed)', borderColor: 'var(--outline-variant)' }}
                            >
                              <FileText className="w-3 h-3" />
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {payments.length === 0 && (
              <div className="text-center py-10">
                <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No payments found</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Create your first payment by calculating a payout</p>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                  {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-50 transition-colors"
                    style={{ borderColor: 'var(--outline-variant)' }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                    {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-50 transition-colors"
                    style={{ borderColor: 'var(--outline-variant)' }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Calculate Payout Modal */}
      <CalculatePayoutModal
        isOpen={calculateModal}
        onClose={handleCloseCalculateModal}
        onCalculate={handleCalculatePayout}
        onCreatePayment={handleCreatePayment}
        onBatchSelect={handleBatchSelect}
        calculation={calculation}
        isCalculating={isCalculating}
        isCreating={isCreating}
        openBatches={openBatches}
        batchPharmacies={batchPharmacies}
        isLoadingOpenBatches={isLoadingOpenBatches}
        isLoadingBatchPharmacies={isLoadingBatchPharmacies}
      />

      {/* Issue Check Modal */}
      <IssueCheckModal
        isOpen={!!issueCheckModal}
        onClose={handleCloseIssueCheckModal}
        payment={issueCheckModal}
        onIssueCheck={handleIssueCheck}
        onGenerateCheckNumber={handleGenerateCheckNumber}
        generatedCheckNumber={generatedCheckNumber}
        isGenerating={isGeneratingCheckNumber}
        isIssuing={isIssuingCheck}
      />

      {/* View Payment Details Modal */}
      {viewModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
          onClick={() => setViewModal(null)}
        >
          <div
            className="rounded-[4px] shadow-xl w-full max-w-lg my-auto flex flex-col border"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="rounded-t-xl px-5 py-3" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-[4px]">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-sm font-bold text-white">Payment Details</h2>
                </div>
                <button 
                  onClick={() => setViewModal(null)} 
                  className="text-white/80 hover:text-white p-0.5 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              {/* Primary Info Banner */}
              <div className="border rounded-[4px] p-3" style={{ background: 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--secondary-container) 100%)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Pharmacy</p>
                    <p className="text-base font-bold truncate" style={{ color: 'var(--foreground)' }}>{viewModal.pharmacyName || 'N/A'}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{viewModal.pharmacyId.slice(0, 8)}…</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Payout Amount</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--secondary)' }}>${viewModal.pharmacyPayout?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-surface-variant)' }}>Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(viewModal.status)}
                    <Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-2.5">
                <div className="bg-white border border-gray-200 rounded-[4px] px-3 py-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Payment ID</span>
                    <span className="text-xs font-mono text-gray-900">#{viewModal.id.slice(0, 12)}…</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-[4px] px-3 py-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Batch</span>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-900">{viewModal.batchName || 'N/A'}</p>
                      {viewModal.batchId && (
                        <p className="text-[10px] text-gray-400 font-mono">{viewModal.batchId.slice(0, 8)}…</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-[4px] px-3 py-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Total Credit Received</span>
                    <span className="text-xs font-bold text-gray-900">${viewModal.totalCreditReceived?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-[4px] px-3 py-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Created</span>
                    <span className="text-xs text-gray-900">
                      {viewModal.createdAt ? new Date(viewModal.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Check Information */}
              {(viewModal.checkNumber || viewModal.paymentType) && (
                <div className="border rounded-[4px] p-3" style={{ background: 'linear-gradient(135deg, var(--primary-container) 0%, var(--surface-container-low) 100%)', borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Banknote className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-primary-container)' }}>Check Information</h3>
                  </div>
                  <div className="space-y-2">
                    {viewModal.checkNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Check Number</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold" style={{ color: 'var(--on-primary-container)' }}>{viewModal.checkNumber}</span>
                          <button
                            onClick={() => handleViewCheckPdf(viewModal.checkNumber!)}
                            className="transition-colors cursor-pointer"
                            style={{ color: 'var(--primary)' }}
                            title="View Check PDF"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {viewModal.paymentType && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Payment Type</span>
                        <Badge variant={viewModal.paymentType === 'ocs' ? 'success' : viewModal.paymentType === 'por' ? 'warning' : 'default'}>
                          {viewModal.paymentType.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                    {viewModal.checkDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Check Date</span>
                        <span className="text-xs" style={{ color: 'var(--on-primary-container)' }}>{new Date(viewModal.checkDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {viewModal.returnReferenceNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Return Reference #</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--on-primary-container)' }}>{viewModal.returnReferenceNumber}</span>
                      </div>
                    )}
                    {viewModal.paidAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Paid At</span>
                        <span className="text-xs" style={{ color: 'var(--on-primary-container)' }}>{new Date(viewModal.paidAt).toLocaleString()}</span>
                      </div>
                    )}
                    {viewModal.pharmacyAccountNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-primary-container)' }}>Account Number</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--on-primary-container)' }}>{viewModal.pharmacyAccountNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Credit Breakdown */}
              {(viewModal.includedCreditAmount || viewModal.directCreditAmount || viewModal.porCreditAmount) && (
                <div className="border rounded-[4px] p-3" style={{ background: 'linear-gradient(135deg, var(--tertiary-fixed) 0%, var(--surface-container-low) 100%)', borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} />
                    <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-tertiary-container)' }}>Credit Breakdown</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-tertiary-container)' }}>Included Credit</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--on-tertiary-container)' }}>${viewModal.includedCreditAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-tertiary-container)' }}>Direct Credit</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--on-tertiary-container)' }}>${viewModal.directCreditAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-tertiary-container)' }}>POR Credit</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--on-tertiary-container)' }}>${viewModal.porCreditAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    {viewModal.grossCreditAmount && (
                      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-tertiary-container)' }}>Gross Credit</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--on-tertiary-container)' }}>${viewModal.grossCreditAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewModal.notes && (
                <div className="border rounded-[4px] p-3" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                  <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>Notes</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--on-surface)' }}>{viewModal.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-2 px-5 py-3 border-t rounded-b-xl" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
              <div>
                {viewModal.checkNumber && (
                  <button
                    onClick={() => handleViewCheckPdf(viewModal.checkNumber!)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-[4px] transition-colors font-medium cursor-pointer hover:bg-primary-50/40"
                    style={{ backgroundColor: 'var(--surface-container-lowest)', color: 'var(--primary)', borderColor: 'var(--outline-variant)' }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Check PDF
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 text-xs border border-gray-300 rounded-[4px] text-gray-700 hover:bg-gray-100 transition-colors font-medium cursor-pointer"
                >
                  Close
                </button>
                {viewModal.status === 'pending' && (
                  <button
                    onClick={() => { handleStatusUpdate(viewModal.id, 'processing'); setViewModal(null); }}
                    className="px-4 py-2 text-xs text-white rounded-[4px] transition-colors font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    Mark as Processing
                  </button>
                )}
                {viewModal.status === 'processing' && !viewModal.checkNumber && (
                  <button
                    onClick={() => { setViewModal(null); handleOpenIssueCheckModal(viewModal); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-white rounded-[4px] transition-colors font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--secondary)' }}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Issue Check
                  </button>
                )}
                {viewModal.status === 'processing' && viewModal.checkNumber && (
                  <button
                    onClick={() => { handleStatusUpdate(viewModal.id, 'paid'); setViewModal(null); }}
                    className="px-4 py-2 text-xs text-white rounded-[4px] transition-colors font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--secondary)' }}
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PharmacyPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderBottomColor: 'var(--primary)' }}></div>
      </div>
    }>
      <PharmacyPaymentsPageContent />
    </Suspense>
  );
}
