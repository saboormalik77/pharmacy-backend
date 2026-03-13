'use client';

import { useState, useEffect, Suspense } from 'react';
import { Search, Plus, Eye, Edit, DollarSign, Calculator, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchPharmacyPayments,
  calculatePayout,
  createPharmacyPayment,
  updatePharmacyPayment,
  clearCalculation,
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
  calculation: any | null;
  isCalculating: boolean;
  isCreating: boolean;
}

function CalculatePayoutModal({
  isOpen,
  onClose,
  onCalculate,
  onCreatePayment,
  calculation,
  isCalculating,
  isCreating
}: CalculatePayoutModalProps) {
  const [pharmacyId, setPharmacyId] = useState('');
  const [batchId, setBatchId] = useState('');

  const handleCalculate = () => {
    if (pharmacyId.trim() && batchId.trim()) {
      onCalculate(pharmacyId.trim(), batchId.trim());
    }
  };

  const handleClose = () => {
    setPharmacyId('');
    setBatchId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Calculate Pharmacy Payout</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {!calculation ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pharmacy ID</label>
                <input
                  type="text"
                  value={pharmacyId}
                  onChange={(e) => setPharmacyId(e.target.value)}
                  placeholder="Enter pharmacy ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch ID</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="Enter batch ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Payout Calculated Successfully</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-700">Pharmacy:</span>
                    <p className="text-green-600">{calculation.pharmacyName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Batch:</span>
                    <p className="text-green-600">{calculation.batchName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Total Amount:</span>
                    <p className="text-green-600 text-lg font-bold">${calculation.totalCreditReceived?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Memo Count:</span>
                    <p className="text-green-600">{calculation.memoCount || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Company Fee ({calculation.companyFeePercent || 0}%):</span>
                    <p className="text-green-600">${calculation.companyFee?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">Pharmacy Payout:</span>
                    <p className="text-green-600 text-lg font-bold">${calculation.pharmacyPayout?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {!calculation ? (
            <Button 
              variant="primary" 
              onClick={handleCalculate} 
              disabled={isCalculating || !pharmacyId.trim() || !batchId.trim()}
            >
              {isCalculating ? (
                <>
                  <Calculator className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Payout
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="success" 
              onClick={onCreatePayment} 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Plus className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Payment Record
                </>
              )}
            </Button>
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
    filters, 
    calculation,
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

  // Debounce search terms
  const debouncedSearch = useDebounce(searchTerm, 500);
  const debouncedPharmacyFilter = useDebounce(pharmacyFilter, 500);

  // Fetch payments when filters or page change
  useEffect(() => {
    dispatch(fetchPharmacyPayments({
      page: currentPage,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      pharmacyId: debouncedPharmacyFilter || undefined,
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
        // Refresh the payments list
        dispatch(fetchPharmacyPayments({
          page: currentPage,
          limit: 20,
          search: debouncedSearch || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          pharmacyId: debouncedPharmacyFilter || undefined,
        }));
      }
    }
  };

  const handleStatusUpdate = async (paymentId: string, newStatus: PharmacyPaymentStatus) => {
    await dispatch(updatePharmacyPayment({ id: paymentId, updates: { status: newStatus } }));
    // Refresh the payments list
    dispatch(fetchPharmacyPayments({
      page: currentPage,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      pharmacyId: debouncedPharmacyFilter || undefined,
    }));
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
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertTriangle className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseCalculateModal = () => {
    setCalculateModal(false);
    dispatch(clearCalculation());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Payments</h1>
          <p className="text-gray-600 mt-1">Manage pharmacy payouts and payments</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setCalculateModal(true)}
          className="flex items-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          Calculate Payout
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="Filter by Pharmacy ID..."
            value={pharmacyFilter}
            onChange={(e) => handlePharmacyFilterChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading payments...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{payment.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{payment.pharmacyName || 'N/A'}</div>
                          <div className="text-gray-500 text-xs">ID: {payment.pharmacyId}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{payment.batchName || 'N/A'}</div>
                          <div className="text-gray-500 text-xs">ID: {payment.batchId || 'None'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${payment.pharmacyPayout?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <Badge variant={getStatusVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewModal(payment)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(payment.id, 'processing')}
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Mark as Processing"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {payment.status === 'processing' && (
                            <button
                              onClick={() => handleStatusUpdate(payment.id, 'paid')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="w-4 h-4" />
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
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payments found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first payment by calculating a payout</p>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="w-5 h-5" />
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
        calculation={calculation}
        isCalculating={isCalculating}
        isCreating={isCreating}
      />

      {/* View Payment Details Modal */}
      {viewModal && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setViewModal(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
              <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment ID</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">#{viewModal.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusIcon(viewModal.status)}
                    <Badge variant={getStatusVariant(viewModal.status)}>
                      {viewModal.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Pharmacy</label>
                  <p className="text-sm text-gray-900 mt-1">{viewModal.pharmacyName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">ID: {viewModal.pharmacyId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Batch</label>
                  <p className="text-sm text-gray-900 mt-1">{viewModal.batchName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">ID: {viewModal.batchId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-2xl font-bold text-green-600 mt-1">${viewModal.pharmacyPayout?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-900 mt-1">{viewModal.createdAt ? new Date(viewModal.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
                {viewModal.updatedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-sm text-gray-900 mt-1">{new Date(viewModal.updatedAt).toLocaleString()}</p>
                  </div>
                )}
                {viewModal.notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg">{viewModal.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
              {viewModal.status === 'pending' && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    handleStatusUpdate(viewModal.id, 'processing');
                    setViewModal(null);
                  }}
                >
                  Mark as Processing
                </Button>
              )}
              {viewModal.status === 'processing' && (
                <Button 
                  variant="success" 
                  onClick={() => {
                    handleStatusUpdate(viewModal.id, 'paid');
                    setViewModal(null);
                  }}
                >
                  Mark as Paid
                </Button>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PharmacyPaymentsPageContent />
    </Suspense>
  );
}