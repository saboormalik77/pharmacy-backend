'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import { Search, Eye, UserPlus, Shield, X, ChevronLeft, ChevronRight, Trash2, Edit, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchAdmins, createAdmin, updateAdmin, deleteAdmin, setFilters } from '@/lib/store/adminsSlice';
import { Admin, AdminCreatePayload, AdminUpdatePayload } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { validateEmail, validatePassword } from '@/lib/validation';

const ASSIGNABLE_PERMISSIONS = [
    { key: 'pharmacies', label: 'Pharmacies' },
    { key: 'distributors', label: 'Distributors' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'documents', label: 'Documents' },
    { key: 'payments', label: 'Payments' },
    { key: 'payout_hub', label: 'Payout Mgmt' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
    { key: 'processors', label: 'Processors' },
    { key: 'service_requests', label: 'Service Requests' },
    { key: 'policies', label: 'Labeler Info' },
    { key: 'ndc_pricing', label: 'NDC Pricing' },
    { key: 'tbd_items', label: 'TBD Items' },
    { key: 'destruction', label: 'Destruction' },
    { key: 'warehouse', label: 'Warehouse' },
] as const;

const roleLabels: Record<string, string> = {
    'super_admin': 'Super Admin',
    'manager': 'Manager',
    'reviewer': 'Reviewer',
    'support': 'Support',
};

const roleColors: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    'super_admin': 'danger',
    'manager': 'warning',
    'reviewer': 'info',
    'support': 'default',
};

export default function AdminsPage() {
    const dispatch = useAppDispatch();
    const { admins, stats, pagination, filters, isLoading, error } = useAppSelector((state) => state.admins);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'manager' | 'reviewer' | 'support'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'created_at' | 'last_login_at'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewModal, setViewModal] = useState<Admin | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<Admin | null>(null);
    const [editFormData, setEditFormData] = useState<AdminUpdatePayload>({});
    const [deleteModal, setDeleteModal] = useState<Admin | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [addErrors, setAddErrors] = useState<Record<string, string>>({});
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };
    const [newAdmin, setNewAdmin] = useState<AdminCreatePayload>({
        email: '',
        password: '',
        name: '',
        role: 'manager',
        permissions: [],
    });

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch admins when filters or page change (only if authenticated)
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchAdmins({
                page: currentPage,
                limit: 10,
                search: debouncedSearch || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                sortBy,
                sortOrder,
            }));
        }
    }, [dispatch, currentPage, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder, isAuthenticated]);

    // Initialize edit form when edit modal opens
    useEffect(() => {
        if (editModal) {
            setEditFormData({
                name: editModal.name || '',
                email: editModal.email || '',
                role: editModal.role || 'manager',
                isActive: editModal.isActive ?? true,
                permissions: editModal.permissions || [],
            });
        }
    }, [editModal]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleRoleFilterChange = (value: 'all' | 'super_admin' | 'manager' | 'reviewer' | 'support') => {
        setRoleFilter(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleStatusFilterChange = (value: 'all' | 'active' | 'inactive') => {
        setStatusFilter(value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleSortChange = (field: 'name' | 'email' | 'role' | 'created_at' | 'last_login_at') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddAdmin = async () => {
        const newErrors: Record<string, string> = {};
        if (!newAdmin.name?.trim()) newErrors.name = 'Name is required.';
        const emailResult = validateEmail(newAdmin.email || '');
        if (!emailResult.valid) newErrors.email = emailResult.error!;
        const pwResult = validatePassword(newAdmin.password || '');
        if (!pwResult.valid) newErrors.password = pwResult.error!;
        setAddErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        const result = await dispatch(createAdmin(newAdmin));
        if (createAdmin.fulfilled.match(result)) {
            showToast('Admin created successfully!', 'success');
            setAddModal(false);
            setAddErrors({});
            setNewAdmin({
                email: '',
                password: '',
                name: '',
                role: 'manager',
                permissions: [],
            });
            // Refresh the list
            await dispatch(fetchAdmins({
                page: currentPage,
                limit: 10,
                search: debouncedSearch || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                sortBy,
                sortOrder,
            }));
        } else if (createAdmin.rejected.match(result)) {
            showToast(result.payload as string || 'Failed to create admin', 'error');
        }
    };

    const handleEdit = async (admin: Admin) => {
        setEditLoading(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response: any = await apiClient.get(`/admin/users/${admin.id}`, true);
            const fullAdmin: Admin = response?.data?.admin || admin;
            setEditModal(fullAdmin);
        } catch {
            // Fallback to list row data if detail fetch fails
            setEditModal(admin);
        } finally {
            setEditLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (editModal) {
            const newErrors: Record<string, string> = {};
            if (!editFormData.name?.trim()) newErrors.name = 'Name is required.';
            if (editFormData.email !== undefined) {
                const r = validateEmail(editFormData.email || '');
                if (!r.valid) newErrors.email = r.error!;
            }
            setEditFormErrors(newErrors);
            if (Object.keys(newErrors).length > 0) return;
            const result = await dispatch(updateAdmin({ id: editModal.id, payload: editFormData }));
            if (updateAdmin.fulfilled.match(result)) {
                showToast('Admin updated successfully!', 'success');
                setEditModal(null);
                setEditFormErrors({});
                setEditFormData({});
                // Refresh the list
                dispatch(fetchAdmins({
                    page: currentPage,
                    limit: 10,
                    search: debouncedSearch || undefined,
                    role: roleFilter !== 'all' ? roleFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else if (updateAdmin.rejected.match(result)) {
                showToast(result.payload as string || 'Failed to update admin', 'error');
            }
        }
    };

    const handleDelete = (admin: Admin) => {
        setDeleteModal(admin);
    };

    const confirmDelete = async () => {
        if (deleteModal) {
            const result = await dispatch(deleteAdmin(deleteModal.id));
            if (deleteAdmin.fulfilled.match(result)) {
                showToast('Admin deleted successfully!', 'success');
                setDeleteModal(null);
                // Refresh the list
                dispatch(fetchAdmins({
                    page: currentPage,
                    limit: 10,
                    search: debouncedSearch || undefined,
                    role: roleFilter !== 'all' ? roleFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else if (deleteAdmin.rejected.match(result)) {
                showToast(result.payload as string || 'Failed to delete admin', 'error');
            }
        }
    };

    // Check if admin can be deleted
    const canDeleteAdmin = (admin: Admin) => {
        // Cannot delete your own account
        if (user && user.id === admin.id) {
            return false;
        }
        // Cannot delete the last Super Admin
        if (admin.role === 'super_admin' && stats?.superAdmins === 1) {
            return false;
        }
        return true;
    };

    const togglePermission = (
        current: string[] | undefined,
        key: string,
        setter: (perms: string[]) => void,
    ) => {
        const list = current || [];
        setter(list.includes(key) ? list.filter(p => p !== key) : [...list, key]);
    };

    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'success';
            case 'inactive': return 'default';
            default: return 'default';
        }
    };

    return (
        <PermissionGate permission="admins">
        <div className="space-y-6">
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Admin Users</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">Manage admin users and their permissions</p>
                </div>
                <Button variant="primary" size="md" onClick={() => setAddModal(true)} className="w-full sm:w-auto whitespace-nowrap">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Admins</p>
                        <p className="text-sm font-bold text-gray-900">{stats?.totalAdmins ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Active</p>
                        <p className="text-sm font-bold text-green-600">{stats?.activeAdmins ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Inactive</p>
                        <p className="text-sm font-bold text-gray-600">{stats?.inactiveAdmins ?? 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[4px] shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Super Admins</p>
                        <p className="text-sm font-bold text-red-600">{stats?.superAdmins ?? stats?.byRole?.super_admin ?? 0}</p>
                    </div>
                </div>
            </div>

            {/* Additional Role Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[4px] shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Managers</p>
                            <p className="text-sm font-bold text-yellow-600">{stats.managers ?? stats.byRole?.manager ?? 0}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-[4px] shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Reviewers</p>
                            <p className="text-sm font-bold text-blue-600">{stats.reviewers ?? stats.byRole?.reviewer ?? 0}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-[4px] shadow-md p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-600">Support</p>
                            <p className="text-sm font-bold text-gray-600">{stats.support ?? stats.byRole?.support ?? 0}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[4px] shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email"
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => handleRoleFilterChange(e.target.value as typeof roleFilter)}
                        className="px-4 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="manager">Manager</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="support">Support</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
                        className="px-4 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading admins...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSortChange('email')}
                                                className="flex items-center gap-1 hover:text-gray-700"
                                            >
                                                Email
                                                {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSortChange('role')}
                                                className="flex items-center gap-1 hover:text-gray-700"
                                            >
                                                Role
                                                {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSortChange('last_login_at')}
                                                className="flex items-center gap-1 hover:text-gray-700"
                                            >
                                                Last Login
                                                {sortBy === 'last_login_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                        </th>
                                        <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <button
                                                onClick={() => handleSortChange('created_at')}
                                                className="flex items-center gap-1 hover:text-gray-700"
                                            >
                                                Created Date
                                                {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[130px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(admins || []).map((admin) => (
                                        <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                        {admin.name ? admin.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'AD'}
                                                    </div>
                                                    <span className="truncate max-w-[150px]" title={admin.name || ''}>{admin.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 truncate max-w-[200px]" title={admin.email || ''}>{admin.email || 'N/A'}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <Badge variant={admin.role ? roleColors[admin.role] || 'default' : 'default'}>
                                                    <Shield className="w-3 h-3 mr-1 inline" />
                                                    {admin.roleDisplay || (admin.role ? (roleLabels[admin.role] || admin.role) : 'N/A')}
                                                </Badge>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(admin.status || 'inactive')}>{admin.status || 'inactive'}</Badge>
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                                                {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Never'}
                                            </td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">{admin.createdAt ? formatDate(admin.createdAt) : 'N/A'}</td>
                                            <td className="px-2 py-1.5 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1 justify-center min-w-[90px]">
                                                    <button
                                                        onClick={() => setViewModal(admin)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                                                        title="View"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(admin)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors flex-shrink-0"
                                                        title="Edit"
                                                        disabled={editLoading}
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDeleteAdmin(admin) ? (
                                                        <button
                                                            onClick={() => handleDelete(admin)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <div className="w-[28px]"></div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(!admins || admins.length === 0) && !isLoading && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No admins found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-6 pt-6 border-t border-gray-200">
                                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                                    <span className="hidden sm:inline">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} admins</span>
                                    <span className="sm:hidden">{pagination.totalCount} admins</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={!pagination.hasPreviousPage || pagination.page <= 1}
                                        className="p-2 sm:p-2 border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <span className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={!pagination.hasNextPage || pagination.page >= pagination.totalPages}
                                        className="p-2 sm:p-2 border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
                        className="bg-white rounded-[4px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Admin Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Name</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-words">{viewModal.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Status</label>
                                    <div className="mt-0.5">
                                        <Badge variant={getStatusVariant(viewModal.status || 'inactive')}>{viewModal.status || 'inactive'}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Email</label>
                                    <p className="text-sm text-gray-900 mt-0.5 break-all">{viewModal.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Role</label>
                                    <div className="mt-0.5">
                                        <Badge variant={viewModal.role ? (roleColors[viewModal.role] || 'default') : 'default'}>
                                            <Shield className="w-3 h-3 mr-1 inline" />
                                            {viewModal.roleDisplay || (viewModal.role ? (roleLabels[viewModal.role] || viewModal.role) : 'N/A')}
                                        </Badge>
                                    </div>
                                </div>
                                {viewModal.lastLoginAt && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Last Login</label>
                                        <p className="text-sm text-gray-900 mt-0.5">{formatDate(viewModal.lastLoginAt)}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Created At</label>
                                    <p className="text-sm text-gray-900 mt-0.5">{viewModal.createdAt ? formatDate(viewModal.createdAt) : 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Permissions</label>
                                    {viewModal.role === 'super_admin' ? (
                                        <p className="text-xs text-green-600 font-medium mt-0.5">Full Access (all permissions)</p>
                                    ) : (viewModal.permissions && viewModal.permissions.length > 0) ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {viewModal.permissions.map((p) => (
                                                <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{p}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-0.5">No permissions assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Admin Modal */}
            {addModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setAddModal(false)}
                >
                    <div 
                        className="bg-white rounded-[4px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Add New Admin</h2>
                            <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={newAdmin.name}
                                        onChange={(e) => { setNewAdmin({ ...newAdmin, name: e.target.value }); setAddErrors(prev => ({ ...prev, name: '' })); }}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter full name"
                                    />
                                    {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={(e) => { setNewAdmin({ ...newAdmin, email: e.target.value }); setAddErrors(prev => ({ ...prev, email: '' })); }}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="email@example.com"
                                    />
                                    {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        value={newAdmin.password}
                                        onChange={(e) => { setNewAdmin({ ...newAdmin, password: e.target.value }); setAddErrors(prev => ({ ...prev, password: '' })); }}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter secure password"
                                    />
                                    {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                                    <select
                                        value={newAdmin.role}
                                        onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as AdminCreatePayload['role'] })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="super_admin">Super Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="reviewer">Reviewer</option>
                                        <option value="support">Support</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Permissions</label>
                                    {newAdmin.role === 'super_admin' ? (
                                        <p className="text-xs text-green-600 font-medium py-1">Full Access (all permissions)</p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1 p-2 border border-gray-200 rounded-[4px] max-h-48 overflow-y-auto">
                                            {ASSIGNABLE_PERMISSIONS.map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={(newAdmin.permissions || []).includes(key)}
                                                        onChange={() => togglePermission(newAdmin.permissions, key, (perms) => setNewAdmin({ ...newAdmin, permissions: perms }))}
                                                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <Button variant="outline" size="md" onClick={() => setAddModal(false)} className="text-sm w-full sm:w-auto">Cancel</Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleAddAdmin}
                                disabled={isLoading || !newAdmin.name || !newAdmin.email || !newAdmin.password}
                                className="text-sm w-full sm:w-auto"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Adding...
                                    </span>
                                ) : (
                                    'Add Admin'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => { setEditModal(null); setEditFormData({}); setEditFormErrors({}); }}
                >
                    <div
                        className="bg-white rounded-[4px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Admin</h2>
                            <button onClick={() => { setEditModal(null); setEditFormData({}); setEditFormErrors({}); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={editFormData.name || ''}
                                        onChange={(e) => { setEditFormData({ ...editFormData, name: e.target.value }); setEditFormErrors(prev => ({ ...prev, name: '' })); }}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter full name"
                                    />
                                    {editFormErrors.name && <p className="text-xs text-red-500 mt-1">{editFormErrors.name}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => { setEditFormData({ ...editFormData, email: e.target.value }); setEditFormErrors(prev => ({ ...prev, email: '' })); }}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="email@example.com"
                                    />
                                    {editFormErrors.email && <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                                    <select
                                        value={editFormData.role || 'manager'}
                                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as AdminUpdatePayload['role'] })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="super_admin">Super Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="reviewer">Reviewer</option>
                                        <option value="support">Support</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Permissions</label>
                                    {editFormData.role === 'super_admin' ? (
                                        <p className="text-xs text-green-600 font-medium py-1">Full Access (all permissions)</p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1 p-2 border border-gray-200 rounded-[4px] max-h-48 overflow-y-auto">
                                            {ASSIGNABLE_PERMISSIONS.map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={(editFormData.permissions || []).includes(key)}
                                                        onChange={() => togglePermission(editFormData.permissions, key, (perms) => setEditFormData({ ...editFormData, permissions: perms }))}
                                                        className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={editFormData.isActive ?? true}
                                            onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-xs font-medium text-gray-700">Active Status</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <Button variant="outline" size="md" onClick={() => { setEditModal(null); setEditFormData({}); setEditFormErrors({}); }} className="text-sm w-full sm:w-auto">Cancel</Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleUpdate}
                                disabled={isLoading || !editFormData.name || !editFormData.email}
                                className="text-sm w-full sm:w-auto"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </span>
                                ) : (
                                    'Update Admin'
                                )}
                            </Button>
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
                        className="bg-white rounded-[4px] max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Delete Admin</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                Are you sure you want to permanently delete admin <strong>{deleteModal.name}</strong> ({deleteModal.email})?
                                This action cannot be undone.
                            </p>
                            {!canDeleteAdmin(deleteModal) && (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-[4px] p-3">
                                    <p className="text-sm text-red-700">
                                        <strong>Warning:</strong> {
                                            user && user.id === deleteModal.id 
                                                ? 'You cannot delete your own account.'
                                                : 'You cannot delete the last Super Admin.'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button 
                                variant="danger" 
                                onClick={confirmDelete} 
                                disabled={isLoading || !canDeleteAdmin(deleteModal)}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </span>
                                ) : (
                                    'Delete Admin'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role permissions info card intentionally hidden */}
        </div>
        </PermissionGate>
    );
}
