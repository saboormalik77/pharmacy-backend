'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Edit, Ban, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchPharmacies, 
  updatePharmacy, 
  updatePharmacyStatus,
  setFilters 
} from '@/lib/store/pharmaciesSlice';
import { Pharmacy, PharmacyUpdatePayload } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function PharmaciesPage() {
    const dispatch = useAppDispatch();
    const { pharmacies, pagination, filters, isLoading, error } = useAppSelector((state) => state.pharmacies);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended' | 'blacklisted'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewModal, setViewModal] = useState<Pharmacy | null>(null);
    const [editModal, setEditModal] = useState<Pharmacy | null>(null);
    const [editFormData, setEditFormData] = useState<PharmacyUpdatePayload>({});
    const [blacklistModal, setBlacklistModal] = useState<Pharmacy | null>(null);
    const [restoreModal, setRestoreModal] = useState<Pharmacy | null>(null);
    const [suspendModal, setSuspendModal] = useState<Pharmacy | null>(null);

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch pharmacies when filters or page change
    useEffect(() => {
        dispatch(fetchPharmacies({
            page: currentPage,
            limit: 20,
            search: debouncedSearch || undefined,
            status: statusFilter,
        }));
    }, [dispatch, currentPage, debouncedSearch, statusFilter]);

    // Initialize edit form when edit modal opens
    useEffect(() => {
        if (editModal) {
            setEditFormData({
                businessName: editModal.businessName,
                owner: editModal.owner,
                email: editModal.email,
                phone: editModal.phone,
                address: editModal.address,
                city: editModal.city,
                state: editModal.state,
                zipCode: editModal.zipCode,
                licenseNumber: editModal.licenseNumber,
                stateLicenseNumber: editModal.stateLicenseNumber,
                licenseExpiryDate: editModal.licenseExpiryDate,
                npiNumber: editModal.npiNumber,
                deaNumber: editModal.deaNumber,
                physicalAddress: editModal.physicalAddress,
                billingAddress: editModal.billingAddress,
                subscriptionTier: editModal.subscriptionTier,
                subscriptionStatus: editModal.subscriptionStatus,
            });
        }
    }, [editModal]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleStatusFilterChange = (value: 'all' | 'pending' | 'active' | 'suspended' | 'blacklisted') => {
        setStatusFilter(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleBlacklist = async () => {
        if (blacklistModal) {
            await dispatch(updatePharmacyStatus({ 
                id: blacklistModal.id, 
                status: 'blacklisted' 
            }));
            setBlacklistModal(null);
            // Refresh the list
            dispatch(fetchPharmacies({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleRestore = async () => {
        if (restoreModal) {
            await dispatch(updatePharmacyStatus({ 
                id: restoreModal.id, 
                status: 'active' 
            }));
            setRestoreModal(null);
            // Refresh the list
            dispatch(fetchPharmacies({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleSuspend = (pharmacy: Pharmacy) => {
        setSuspendModal(pharmacy);
    };

    const confirmSuspend = async () => {
        if (suspendModal) {
            await dispatch(updatePharmacyStatus({ 
                id: suspendModal.id, 
                status: 'suspended' 
            }));
            setSuspendModal(null);
            // Refresh the list
            dispatch(fetchPharmacies({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleEdit = async () => {
        if (editModal) {
            await dispatch(updatePharmacy({ 
                id: editModal.id, 
                payload: editFormData 
            }));
            setEditModal(null);
            setEditFormData({});
            // Refresh the list
            dispatch(fetchPharmacies({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'suspended': return 'warning';
            case 'blacklisted': return 'danger';
            case 'pending': return 'default';
            default: return 'default';
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
                <p className="text-gray-600 mt-1">Manage registered pharmacies</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search pharmacies..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="blacklisted">Blacklisted</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading pharmacies...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {/* <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th> */}
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Returns</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {pharmacies.map((pharmacy) => (
                                        <tr key={pharmacy.id} className="hover:bg-gray-50 transition-colors">
                                            {/* <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{pharmacy.id}</td> */}
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">{pharmacy.businessName}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{pharmacy.owner}</td>
                                            <td className="px-2 py-1.5 text-xs text-gray-600">
                                                <div className="leading-tight">{pharmacy.email}</div>
                                                <div className="text-gray-500 text-xs leading-tight">{pharmacy.phone}</div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{pharmacy.city}, {pharmacy.state}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(pharmacy.status)}>{pharmacy.status}</Badge>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">{pharmacy.totalReturns}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setViewModal(pharmacy)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditModal(pharmacy)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    {pharmacy.status === 'active' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSuspend(pharmacy)}
                                                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                                                title="Suspend"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setBlacklistModal(pharmacy)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Blacklist"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {pharmacy.status === 'suspended' && (
                                                        <button
                                                            onClick={() => setRestoreModal(pharmacy)}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Restore"
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

                        {pharmacies.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No pharmacies found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} pharmacies
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

            {/* View Modal */}
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
                            <h2 className="text-lg font-semibold text-gray-900">Pharmacy Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Pharmacy ID</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.id}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Status</label>
                                    <div className="mt-0.5">
                                        <Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Business Name</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.businessName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Owner Name</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.owner}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">License Number</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.licenseNumber}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Email</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.email}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Phone</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.phone}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Address</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.address}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">City</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.city}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">State</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.state}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">ZIP Code</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.zipCode}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Total Returns</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.totalReturns}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Created At</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => { setEditModal(null); setEditFormData({}); }}
                >
                    <div 
                        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Pharmacy</h2>
                            <button onClick={() => { setEditModal(null); setEditFormData({}); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Business Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.businessName || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Owner Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.owner || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, owner: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">License Number</label>
                                    <input
                                        type="text"
                                        value={editFormData.licenseNumber || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, licenseNumber: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editFormData.phone || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={editFormData.address || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        value={editFormData.city || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        value={editFormData.state || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={editFormData.zipCode || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            <Button variant="outline" onClick={() => { setEditModal(null); setEditFormData({}); }}>Cancel</Button>
                            <Button variant="primary" onClick={handleEdit} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blacklist Confirmation Modal */}
            {blacklistModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setBlacklistModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Blacklist Pharmacy</h2>
                            <button onClick={() => setBlacklistModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to blacklist <strong>{blacklistModal.businessName}</strong>?
                                This will prevent them from accessing the platform.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setBlacklistModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleBlacklist} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Blacklist'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {restoreModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setRestoreModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Restore Pharmacy</h2>
                            <button onClick={() => setRestoreModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to restore <strong>{restoreModal.businessName}</strong>?
                                This will reactivate their access to the platform.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setRestoreModal(null)}>Cancel</Button>
                            <Button variant="success" onClick={handleRestore} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Restore'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Confirmation Modal */}
            {suspendModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setSuspendModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Suspend Pharmacy</h2>
                            <button onClick={() => setSuspendModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to suspend <strong>{suspendModal.businessName}</strong>?
                                This will temporarily restrict their access to the platform.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setSuspendModal(null)}>Cancel</Button>
                            <Button variant="warning" onClick={confirmSuspend} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Suspend'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
