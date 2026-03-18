'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Search, DollarSign, Calculator, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle, Eye, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchPharmacyPayments,
  fetchOpenBatches,
  fetchBatchPharmacies,
  calculatePayout,
  createPharmacyPayment,
  updatePharmacyPayment,
  clearCalculation,
  clearBatchPharmacies,
  setFilters,
  PharmacyPayment
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
  batchPharmacies: { id: string; name: string }[];
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

  const handleBatchChange = (value: string) => {
    setBatchId(value);
    setPharmacyId('');
    if (value) onBatchSelect(value);
  };

  const handleCalculate = () => {
    if (pharmacyId && batchId) onCalculate(pharmacyId, batchId);
  };

  const handleClose = () => {
    setPharmacyId('');
    setBatchId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            Calculate Pharmacy Payout
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-0.5">
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
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Batch <span className="text-gray-400 font-normal">(open only)</span></label>
                {isLoadingOpenBatches ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500"></div>
                    Loading batches...
                  </div>
                ) : (
                  <select
                    value={batchId}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select an open batch...</option>
                    {openBatches.map((b) => (
                      <option key={b.id} value={b.id}>{b.batchName}</option>
                    ))}
                  </select>
                )}
                {!isLoadingOpenBatches && openBatches.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">No open batches found.</p>
                )}
              </div>

              {/* Pharmacy dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Pharmacy</label>
                {isLoadingBatchPharmacies ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500"></div>
                    Loading pharmacies...
                  </div>
                ) : (
                  <select
                    value={pharmacyId}
                    onChange={(e) => setPharmacyId(e.target.value)}
                    disabled={!batchId}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!batchId ? 'Select a batch first...' : batchPharmacies.length === 0 ? 'No pharmacies in this batch' : 'Select a pharmacy...'}
                    </option>
                    {batchPharmacies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
              <p className="text-xs font-semibold text-green-800">Payout Calculated Successfully</p>
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
                    <span className="text-[10px] text-green-700">{label}</span>
                    <p className={`text-xs text-green-600 ${bold ? 'font-bold' : ''}`}>{value as string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {!calculation ? (
            <button
              onClick={handleCalculate}
              disabled={isCalculating || !pharmacyId || !batchId}
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
    error 
  } = useAppSelector((state) => state.pharmacyPayments);

  const [searchTerm, setSearchTermLocal] = useState('');
  const [statusFilter, setStatusFilterLocal] = useState<PharmacyPaymentStatus | 'all'>('all');
  const [pharmacyFilter, setPharmacyFilterLocal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewModal, setViewModal] = useState<PharmacyPayment | null>(null);
  const [calculateModal, setCalculateModal] = useState(false);

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
          <h1 className="text-lg font-bold text-gray-900">Pharmacy Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage pharmacy payouts and payments</p>
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-2 px-3 py-2 border-b border-gray-100">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by pharmacy name..."
            value={pharmacyFilter}
            onChange={(e) => handlePharmacyFilterChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-xs text-gray-400">Loading payments...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Payment ID', 'Pharmacy', 'Batch', 'Payout Amount', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-1.5 whitespace-nowrap text-xs font-mono text-gray-500">
                        #{payment.id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900">{payment.pharmacyName || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400">{payment.pharmacyId.slice(0, 8)}…</div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="text-xs text-gray-900">{payment.batchName || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400">{payment.batchId ? payment.batchId.slice(0, 8) + '…' : 'None'}</div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-xs font-semibold text-green-600">
                        ${payment.pharmacyPayout?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(payment.status)}
                          <Badge variant={getStatusVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-500">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewModal(payment)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(payment.id, 'processing')}
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Mark as Processing"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {payment.status === 'processing' && (
                            <button
                              onClick={() => handleStatusUpdate(payment.id, 'paid')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
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
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-500">
                  {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[10px] text-gray-600">
                    {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-1 border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
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

      {/* View Payment Details Modal */}
      {viewModal && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewModal(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Payment Details</h2>
              <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600 p-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Payment ID', value: `#${viewModal.id}`, mono: true },
                  { label: 'Status', isStatus: true },
                  { label: 'Pharmacy', value: viewModal.pharmacyName || 'N/A', sub: viewModal.pharmacyId.slice(0,8) + '…' },
                  { label: 'Batch', value: viewModal.batchName || 'N/A', sub: viewModal.batchId ? viewModal.batchId.slice(0,8) + '…' : '—' },
                  { label: 'Payout Amount', value: `$${viewModal.pharmacyPayout?.toFixed(2) || '0.00'}`, bold: true, green: true },
                  { label: 'Created', value: viewModal.createdAt ? new Date(viewModal.createdAt).toLocaleString() : 'N/A' },
                ].map((row) => (
                  <div key={row.label}>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{row.label}</span>
                    {row.isStatus ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        {getStatusIcon(viewModal.status)}
                        <Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge>
                      </div>
                    ) : (
                      <>
                        <p className={`text-xs mt-0.5 ${row.green ? 'text-green-600 font-bold' : 'text-gray-900'} ${row.mono ? 'font-mono' : ''} ${row.bold ? 'font-semibold' : ''}`}>
                          {row.value}
                        </p>
                        {row.sub && <p className="text-[10px] text-gray-400">{row.sub}</p>}
                      </>
                    )}
                  </div>
                ))}
                {viewModal.notes && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">Notes</span>
                    <p className="text-xs text-gray-700 mt-0.5 px-2 py-1.5 bg-gray-50 rounded border border-gray-100">{viewModal.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setViewModal(null)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {viewModal.status === 'pending' && (
                <button
                  onClick={() => { handleStatusUpdate(viewModal.id, 'processing'); setViewModal(null); }}
                  className="px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                >
                  Mark as Processing
                </button>
              )}
              {viewModal.status === 'processing' && (
                <button
                  onClick={() => { handleStatusUpdate(viewModal.id, 'paid'); setViewModal(null); }}
                  className="px-3 py-1.5 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                >
                  Mark as Paid
                </button>
              )}
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    }>
      <PharmacyPaymentsPageContent />
    </Suspense>
  );
}
