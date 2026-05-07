'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import { Search, Eye, Download, Trash2, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatFileSize, formatCurrency } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDocuments, deleteDocument, setFilters } from '@/lib/store/documentsSlice';
import { fetchPharmacies } from '@/lib/store/pharmaciesSlice';
import { Document } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function DocumentsPage() {
    const dispatch = useAppDispatch();
    const { documents, stats, pagination, filters, isLoading, error } = useAppSelector((state) => state.documents);
    const { pharmacies } = useAppSelector((state) => state.pharmacies);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [pharmacyFilter, setPharmacyFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewModal, setViewModal] = useState<Document | null>(null);
    const [deleteModal, setDeleteModal] = useState<Document | null>(null);

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch pharmacies for filter dropdown
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchPharmacies({ limit: 100 }));
        }
    }, [dispatch, isAuthenticated]);

    // Fetch documents when filters or page change (only if authenticated)
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchDocuments({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                pharmacy_id: pharmacyFilter || undefined,
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

    const handleDownload = (doc: Document) => {
        if (doc.fileUrl) {
            window.open(doc.fileUrl, '_blank');
        } else {
            console.log('Downloading document:', doc.fileName);
            alert(`Downloading ${doc.fileName}...`);
        }
    };

    const handleDelete = (doc: Document) => {
        setDeleteModal(doc);
    };

    const confirmDelete = async () => {
        if (deleteModal) {
            const result = await dispatch(deleteDocument(deleteModal.id));
            if (deleteDocument.fulfilled.match(result)) {
                // Refresh the list after successful delete
                dispatch(fetchDocuments({
                    page: currentPage,
                    limit: 20,
                    search: debouncedSearch || undefined,
                    pharmacy_id: pharmacyFilter || undefined,
                }));
            }
        }
        setDeleteModal(null);
    };

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'approved': 
                return 'success';
            case 'processing':
            case 'pending': 
                return 'warning';
            case 'failed':
            case 'rejected': 
                return 'danger';
            default: 
                return 'default';
        }
    };

    return (
        <PermissionGate permission="documents">
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-bold text-gray-900">Documents</h1>
                <p className="text-gray-600 mt-1">Review and manage return receipts</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Documents</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.totalDocuments ?? 0}</p>
                    </div>
                </div>
                {/* Commented out pending stats as requested - using API stats instead */}
                {/* <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Pending Review</p>
                        <p className="text-sm font-bold text-yellow-600">{documents.filter(d => d.status === 'pending').length}</p>
                    </div>
                </div> */}
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Completed</p>
                        <p className="text-sm font-bold text-green-600">{stats?.byStatus?.completed ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Processing</p>
                        <p className="text-sm font-bold text-yellow-600">{stats?.byStatus?.processing ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Failed</p>
                        <p className="text-sm font-bold text-red-600">{stats?.byStatus?.failed ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Total File Size</p>
                            <p className="text-sm font-bold text-gray-900">{formatFileSize(stats.totalFileSize)}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Total Credit Amount</p>
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalCreditAmount)}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Recent Uploads</p>
                            <p className="text-sm font-bold text-gray-900">{stats.recentUploads}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by pharmacy name, owner name, file name, or document ID..."
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
                        <p className="text-gray-500">Loading documents...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {/* <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document ID</th> */}
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Size</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Amount</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                            {/* <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{doc.id}</td> */}
                                            <td className="px-2 py-1.5 text-xs text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                    <span className="truncate max-w-xs">{doc.fileName}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 truncate max-w-[200px]" title={doc.pharmacyName}>{doc.pharmacyName}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatDate(doc.uploadedAt)}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{formatFileSize(doc.fileSize)}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900">{formatCurrency(doc.totalCreditAmount)}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button
                                                        onClick={() => setViewModal(doc)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(doc)}
                                                        className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(doc)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {documents.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No documents found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-6 pt-6 border-t border-gray-200">
                                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                                    <span className="hidden sm:inline">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} documents</span>
                                    <span className="sm:hidden">{pagination.totalCount} documents</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={!pagination.hasPreviousPage || pagination.page <= 1}
                                        className="p-2 sm:p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <span className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={!pagination.hasNextPage || pagination.page >= pagination.totalPages}
                                        className="p-2 sm:p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View Modal */}
            {viewModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setViewModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {/* <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Document ID</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.id}</p>
                                </div> */}
                               
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">File Name</label>
                                    <p className="text-sm text-gray-900 font-medium break-all">{viewModal.fileName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">File Type</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.fileType}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                    <div className="mt-1">
                                        <Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">File Size</label>
                                    <p className="text-sm text-gray-900 font-medium">{formatFileSize(viewModal.fileSize)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.source}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Pharmacy</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.pharmacyName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Pharmacy Owner</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.pharmacyOwner}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Pharmacy Email</label>
                                    <p className="text-sm text-gray-900 font-medium break-all">{viewModal.pharmacyEmail}</p>
                                </div>
                                {viewModal.reverseDistributorName && (
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Reverse Distributor</label>
                                        <p className="text-sm text-gray-900 font-medium">{viewModal.reverseDistributorName} ({viewModal.reverseDistributorCode})</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Upload Date</label>
                                    <p className="text-sm text-gray-900 font-medium">{formatDate(viewModal.uploadedAt)}</p>
                                </div>
                                {viewModal.processedAt && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Processed Date</label>
                                        <p className="text-sm text-gray-900 font-medium">{formatDate(viewModal.processedAt)}</p>
                                    </div>
                                )}
                                {viewModal.reportDate && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Report Date</label>
                                        <p className="text-sm text-gray-900 font-medium">{formatDate(viewModal.reportDate)}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Extracted Items</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.extractedItems}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Credit Amount</label>
                                    <p className="text-sm text-green-600 font-semibold">{formatCurrency(viewModal.totalCreditAmount)}</p>
                                </div>
                            </div>

                            {/* Document Preview Placeholder */}
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <label className="block text-xs font-medium text-gray-500 mb-3">Document Preview</label>
                                <div className="bg-gray-100 rounded-lg p-8 text-center">
                                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 text-sm">PDF Preview</p>
                                    <p className="text-gray-500 text-xs mt-1 break-all">{viewModal.fileName}</p>
                                    {viewModal.fileUrl && (
                                        <Button 
                                            variant="outline" 
                                            className="mt-4"
                                            onClick={() => handleDownload(viewModal)}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Open Document
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" size="md" onClick={() => handleDownload(viewModal)} className="text-sm">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                            <Button variant="primary" size="md" onClick={() => setViewModal(null)} className="text-sm">Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setDeleteModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Document</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 mb-4">
                                Are you sure you want to permanently delete the document <span className="font-semibold">"{deleteModal.fileName}"</span>? This action cannot be undone.
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">
                                    <strong>Warning:</strong> This will remove all associated data and files.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" size="md" onClick={() => setDeleteModal(null)} className="text-sm" disabled={isLoading}>Cancel</Button>
                            <Button variant="danger" size="md" onClick={confirmDelete} disabled={isLoading} className="text-sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
