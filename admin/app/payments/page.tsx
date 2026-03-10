'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchPayments, setFilters } from '@/lib/store/paymentsSlice';
import { fetchPharmacies } from '@/lib/store/pharmaciesSlice';
import { Payment } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function PaymentsPage() {
    const dispatch = useAppDispatch();
    const { payments, stats, pagination, filters, isLoading, error } = useAppSelector((state) => state.payments);
    const { pharmacies } = useAppSelector((state) => state.pharmacies);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [pharmacyFilter, setPharmacyFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewModal, setViewModal] = useState<Payment | null>(null);

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch pharmacies for filter dropdown
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchPharmacies({ limit: 100 }));
        }
    }, [dispatch, isAuthenticated]);

    // Fetch payments when filters or page change (only if authenticated)
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchPayments({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                pharmacyId: pharmacyFilter || undefined,
            }));
        }
    }, [dispatch, currentPage, debouncedSearch, pharmacyFilter, isAuthenticated]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handlePharmacyFilterChange = (value: string) => {
        setPharmacyFilter(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDownload = (payment: Payment) => {
        if (payment.fileUrl) {
            window.open(payment.fileUrl, '_blank');
        } else {
            console.log('Downloading receipt for:', payment.paymentId);
            alert(`Download receipt for ${payment.paymentId}...`);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                <p className="text-gray-600 mt-1">Manage pharmacy payments and transactions</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p className="font-medium">Error loading payments:</p>
                    <p className="text-sm mt-1">{error}</p>
                    <p className="text-xs text-red-600 mt-2">Please check your connection and try again.</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Payments</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.totalPayments ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Amount</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(stats?.totalAmount ?? 0)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={pharmacyFilter}
                        onChange={(e) => handlePharmacyFilterChange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Pharmacies</option>
                        {pharmacies.map((pharmacy) => (
                            <option key={pharmacy.id} value={pharmacy.id}>
                                {pharmacy.businessName}
                            </option>
                        ))}
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading payments...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {/* <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th> */}
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distributor</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                            {/* <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{payment.paymentId}</td> */}
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">{payment.pharmacyName}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{payment.distributorName || '-'}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{new Date(payment.date).toLocaleDateString()}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{payment.method}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 font-mono">{payment.transactionId}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button
                                                        onClick={() => setViewModal(payment)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {payment.fileUrl && (
                                                        <button
                                                            onClick={() => handleDownload(payment)}
                                                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                            title="Download Receipt"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
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
                                <p className="text-gray-500">No payments found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} payments
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={!pagination.hasPreviousPage || pagination.page <= 1}
                                        className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 py-2 text-sm text-gray-700">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={!pagination.hasNextPage || pagination.page >= pagination.totalPages}
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

            {/* View Details Modal */}
            {viewModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setViewModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Payment ID</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.paymentId}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Transaction ID</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all font-mono">{viewModal.transactionId}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Pharmacy</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.pharmacyName}</p>
                                </div>
                                {viewModal.pharmacyEmail && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-medium text-gray-500">Pharmacy Email</label>
                                        <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.pharmacyEmail}</p>
                                    </div>
                                )}
                                {viewModal.distributorName && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-medium text-gray-500">Distributor</label>
                                        <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.distributorName}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Amount</label>
                                    <p className="text-sm text-gray-900 font-semibold mt-0.5">{formatCurrency(viewModal.amount)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Payment Date</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.date).toLocaleDateString()}</p>
                                </div>
                                {viewModal.reportDate && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Report Date</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.reportDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Payment Method</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.method}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Source</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.source}</p>
                                </div>
                                {viewModal.uploadedAt && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Uploaded At</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.uploadedAt).toLocaleString()}</p>
                                    </div>
                                )}
                                {viewModal.processedAt && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Processed At</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.processedAt).toLocaleString()}</p>
                                    </div>
                                )}
                                {viewModal.fileName && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">File Name</label>
                                        <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.fileName}</p>
                                    </div>
                                )}
                                {viewModal.extractedItems !== undefined && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Extracted Items</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{viewModal.extractedItems}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            {viewModal.fileUrl && (
                                <Button variant="outline" onClick={() => handleDownload(viewModal)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Receipt
                                </Button>
                            )}
                            <Button variant="primary" onClick={() => setViewModal(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
