'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Edit, Ban, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchDistributors, 
  updateDistributor, 
  updateDistributorStatus,
  createDistributor,
  setFilters 
} from '@/lib/store/distributorsSlice';
import { Distributor, DistributorUpdatePayload, DistributorCreatePayload } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function DistributorsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { distributors, stats, pagination, filters, isLoading, error } = useAppSelector((state) => state.distributors);
    
    // Initialize local state from Redux store if available
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(filters?.status || 'all');
    const [currentPage, setCurrentPage] = useState(pagination?.page || 1);
    const [viewModal, setViewModal] = useState<Distributor | null>(null);
    const [editModal, setEditModal] = useState<Distributor | null>(null);
    const [editFormData, setEditFormData] = useState<DistributorUpdatePayload>({});
    const [deactivateModal, setDeactivateModal] = useState<Distributor | null>(null);
    const [activateModal, setActivateModal] = useState<Distributor | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [newDistributor, setNewDistributor] = useState<DistributorCreatePayload>({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        licenseNumber: '',
        specializations: []
    });

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch distributors when filters or page change (includes stats in response)
    // Only fetch if we don't have data or if the current parameters don't match what's in Redux store
    useEffect(() => {
        const searchParam = debouncedSearch || '';
        const statusParam = statusFilter;
        
        // Check if Redux store already has data that matches current parameters
        const hasMatchingData = distributors.length > 0 &&
            pagination?.page === currentPage &&
            (filters?.search || '') === searchParam &&
            (filters?.status || 'all') === statusParam;
        
        // Only fetch if we don't have matching data
        if (!hasMatchingData) {
            dispatch(fetchDistributors({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, currentPage, debouncedSearch, statusFilter]);

    // Initialize edit form when edit modal opens
    useEffect(() => {
        if (editModal) {
            setEditFormData({
                companyName: editModal.companyName,
                contactPerson: editModal.contactPerson,
                email: editModal.email,
                phone: editModal.phone,
                address: editModal.address,
                city: editModal.city,
                state: editModal.state,
                zipCode: editModal.zipCode,
                licenseNumber: editModal.licenseNumber,
                specializations: editModal.specializations || [],
            });
        }
    }, [editModal]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleStatusFilterChange = (value: 'all' | 'active' | 'inactive') => {
        setStatusFilter(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleDeactivate = async () => {
        if (deactivateModal) {
            await dispatch(updateDistributorStatus({ 
                id: deactivateModal.id, 
                status: 'inactive' 
            }));
            setDeactivateModal(null);
            // Refresh the list (includes stats)
            dispatch(fetchDistributors({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleActivate = async () => {
        if (activateModal) {
            await dispatch(updateDistributorStatus({ 
                id: activateModal.id, 
                status: 'active' 
            }));
            setActivateModal(null);
            // Refresh the list (includes stats)
            dispatch(fetchDistributors({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleEdit = async () => {
        if (editModal) {
            await dispatch(updateDistributor({ 
                id: editModal.id, 
                payload: editFormData 
            }));
            setEditModal(null);
            setEditFormData({});
            // Refresh the list
            dispatch(fetchDistributors({
                page: currentPage,
                limit: 20,
                search: debouncedSearch || undefined,
                status: statusFilter,
            }));
        }
    };

    const handleAddDistributor = async () => {
        await dispatch(createDistributor(newDistributor));
        setAddModal(false);
        // Reset form
        setNewDistributor({
            companyName: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            licenseNumber: '',
            specializations: []
        });
        // Refresh the list (includes stats)
        dispatch(fetchDistributors({
            page: currentPage,
            limit: 20,
            search: debouncedSearch || undefined,
            status: statusFilter,
        }));
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'default';
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
                <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
                <p className="text-gray-600 mt-1">Manage reverse distributors and their deals</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Distributors</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.totalDistributors ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Active</p>
                        <p className="text-sm font-bold text-green-600">{stats?.activeDistributors ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Inactive</p>
                        <p className="text-sm font-bold text-gray-600">{stats?.inactiveDistributors ?? 0}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search distributors..."
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
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <Button variant="primary" size="md" onClick={() => setAddModal(true)}>Add Distributor</Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading distributors...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {/* <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th> */}
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Company Name</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Contact Person</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Contact Info</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Location</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Products</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Total Deals</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {distributors.map((distributor) => (
                                        <tr key={distributor.id} className="hover:bg-gray-50 transition-colors">
                                            {/* <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">{distributor.id}</td> */}
                                            <td className="px-2 py-1.5 text-xs text-gray-900 truncate max-w-[200px]" title={distributor.companyName}>{distributor.companyName}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 truncate max-w-[150px]" title={distributor.contactPerson}>{distributor.contactPerson}</td>
                                            <td className="px-2 py-1.5 text-xs text-gray-600">
                                                <div className="leading-tight truncate max-w-[200px]" title={distributor.email}>{distributor.email}</div>
                                                <div className="text-gray-500 text-xs leading-tight truncate max-w-[200px]" title={distributor.phone}>{distributor.phone}</div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{distributor.city}, {distributor.state}</td>
                                            <td className="px-2 py-1.5 text-xs text-gray-600">
                                                <button
                                                    onClick={() => router.push(`/distributors/${distributor.id}/products`)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                                                >
                                                    {distributor?.uniqueProductsCount ?? 0}
                                                </button>
                                            </td> 
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 text-center">{distributor.totalDeals ?? 0}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(distributor.status)}>{distributor.status}</Badge>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button
                                                        onClick={() => setViewModal(distributor)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditModal(distributor)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    {distributor.status === 'active' ? (
                                                        <button
                                                            onClick={() => setDeactivateModal(distributor)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Deactivate"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setActivateModal(distributor)}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Activate"
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

                        {distributors.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No distributors found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} distributors
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
                            <h2 className="text-lg font-semibold text-gray-900">Distributor Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                {/* <div>
                                    <label className="text-xs font-medium text-gray-500">Distributor ID</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.id}</p>
                                </div> */}
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Status</label>
                                    <div className="mt-0.5">
                                        <Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Company Name</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.companyName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Contact Person</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.contactPerson}</p>
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
                                    <label className="text-xs font-medium text-gray-500">Total Deals</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.totalDeals ?? 0}</p>
                                </div>
                                {viewModal.createdAt && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Created At</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{new Date(viewModal.createdAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {/* {(viewModal.specializations && viewModal.specializations.length > 0) && (
                                    <div className="col-span-2">
                                        <label className="text-xs font-medium text-gray-500">Specializations</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {viewModal.specializations.map((spec, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">{spec}</span>
                                            ))}
                                        </div>
                                    </div>
                                )} */}
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
                            <h2 className="text-lg font-semibold text-gray-900">Edit Distributor</h2>
                            <button onClick={() => { setEditModal(null); setEditFormData({}); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.companyName || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        value={editFormData.contactPerson || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
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
                                {/* <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Specializations (comma separated)</label>
                                    <input
                                        type="text"
                                        value={(editFormData.specializations || []).join(', ')}
                                        onChange={(e) => setEditFormData({
                                            ...editFormData,
                                            specializations: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                        })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Antibiotics, Pain Relief, Cardiovascular"
                                    />
                                </div> */}
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

            {/* Deactivate Confirmation Modal */}
            {deactivateModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setDeactivateModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Deactivate Distributor</h2>
                            <button onClick={() => setDeactivateModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to deactivate <strong>{deactivateModal.companyName}</strong>?
                                This will temporarily suspend their access and deals.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setDeactivateModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDeactivate} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Deactivate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activate Confirmation Modal */}
            {activateModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setActivateModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Activate Distributor</h2>
                            <button onClick={() => setActivateModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to activate <strong>{activateModal.companyName}</strong>?
                                This will restore their access and allow them to create deals.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setActivateModal(null)}>Cancel</Button>
                            <Button variant="success" onClick={handleActivate} disabled={isLoading}>
                                {isLoading ? 'Processing...' : 'Activate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Distributor Modal */}
            {addModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setAddModal(false)}
                >
                    <div 
                        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Add New Distributor</h2>
                            <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.companyName}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, companyName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter company name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.contactPerson}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, contactPerson: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter contact person name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">License Number *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.licenseNumber}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, licenseNumber: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., MA-DIST-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={newDistributor.email}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, email: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                                    <input
                                        type="tel"
                                        value={newDistributor.phone}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.address}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, address: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter street address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.city}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, city: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter city"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">State *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.state}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, state: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., CA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">ZIP Code *</label>
                                    <input
                                        type="text"
                                        value={newDistributor.zipCode}
                                        onChange={(e) => setNewDistributor({ ...newDistributor, zipCode: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter ZIP code"
                                    />
                                </div>
                                {/* <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Specializations (comma separated)</label>
                                    <input
                                        type="text"
                                        value={(newDistributor.specializations || []).join(', ')}
                                        onChange={(e) => setNewDistributor({
                                            ...newDistributor,
                                            specializations: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                        })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Antibiotics, Pain Relief, Cardiovascular"
                                    />
                                </div> */}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleAddDistributor}
                                disabled={isLoading || !newDistributor.companyName || !newDistributor.contactPerson || !newDistributor.email || !newDistributor.phone || !newDistributor.address || !newDistributor.city || !newDistributor.state || !newDistributor.zipCode || !newDistributor.licenseNumber}
                            >
                                {isLoading ? 'Adding...' : 'Add Distributor'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
