'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import {
    Search, UserPlus, X, Edit, Loader2, Users,
    ChevronLeft, ChevronRight, Eye, EyeOff, Trash2,
    CheckCircle, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppSelector } from '@/lib/store/hooks';
import { apiClient } from '@/lib/api/apiClient';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ── Available permissions a sub-admin can be assigned ──────────

const ASSIGNABLE_PERMISSIONS = [
    { key: 'dashboard',       label: 'Dashboard',        description: 'View the main dashboard' },
    { key: 'pharmacies',      label: 'Pharmacies',       description: 'View and manage pharmacies' },
    { key: 'analytics',       label: 'Analytics',        description: 'View analytics and reports' },
    { key: 'settings',        label: 'Settings',         description: 'View and update settings' },
    { key: 'processors',      label: 'Processors',       description: 'Manage field processors' },
    { key: 'service_requests',label: 'Service Requests', description: 'View and manage service requests' },
    { key: 'sub_admins',      label: 'Sub-Admins',       description: 'Manage sub-admins' },
] as const;

const ROLES = [
    { value: 'manager',  label: 'Manager',  color: 'warning' as const,  description: 'Manage pharmacies, approve documents, process payments, view analytics' },
    { value: 'reviewer', label: 'Reviewer', color: 'info' as const,     description: 'Review documents, approve/reject returns, view shipments' },
    { value: 'support',  label: 'Support',  color: 'default' as const,  description: 'View-only access, customer support, generate reports' },
];

// ── Types ──────────────────────────────────────────────────────

interface SubAdmin {
    id: string;
    email: string;
    name: string;
    role: string;
    roleDisplay: string;
    isActive: boolean;
    status: string;
    permissions: string[];
    lastLoginAt: string | null;
    createdAt: string;
}

interface Stats {
    total: number;
    active: number;
    inactive: number;
    managers: number;
    reviewers: number;
    support: number;
}

interface FormState {
    name: string;
    email: string;
    password: string;
    role: string;
    permissions: string[];
}

const emptyForm = (): FormState => ({
    name: '', email: '', password: '', role: 'support', permissions: [],
});

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function roleColor(role: string): 'warning' | 'info' | 'default' | 'success' | 'danger' {
    if (role === 'manager') return 'warning';
    if (role === 'reviewer') return 'info';
    return 'default';
}

// ── Page ───────────────────────────────────────────────────────

export default function SubAdminsPage() {
    const { user } = useAppSelector((state) => state.auth);
    const isBuyingGroupAdmin = user?.buying_group_id !== null && user?.role === 'super_admin';

    const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<SubAdmin | null>(null);
    const [deleteModal, setDeleteModal] = useState<SubAdmin | null>(null);

    // Forms
    const [addForm, setAddForm] = useState<FormState>(emptyForm());
    const [editForm, setEditForm] = useState<Partial<FormState> & { isActive?: boolean }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formError, setFormError] = useState('');

    const debouncedSearch = useDebounce(searchTerm, 400);

    const showToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const fetchSubAdmins = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(currentPage),
                limit: '15',
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;

            const res: any = await apiClient.get('/admin/sub-admins', true, params);
            if (res.status === 'success') {
                setSubAdmins(res.data.subAdmins || []);
                setStats(res.data.stats || null);
                setTotalPages(res.data.pagination?.totalPages || 1);
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to load sub-admins', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

    useEffect(() => { fetchSubAdmins(); }, [fetchSubAdmins]);
    useEffect(() => { setCurrentPage(1); }, [debouncedSearch, roleFilter, statusFilter]);

    // ── Create ─────────────────────────────────────────────────

    const handleCreate = async () => {
        setFormError('');
        if (!addForm.name.trim()) return setFormError('Name is required');
        const emailErr = validateEmail(addForm.email);
        if (!emailErr.valid) return setFormError(emailErr.error || 'Invalid email');
        const passErr = validatePassword(addForm.password);
        if (!passErr.valid) return setFormError(passErr.error || 'Password too weak');

        setIsSaving(true);
        try {
            await apiClient.post('/admin/sub-admins', {
                name: addForm.name.trim(),
                email: addForm.email.trim(),
                password: addForm.password,
                role: addForm.role,
                permissions: addForm.permissions,
            });
            showToast('Sub-admin created successfully', 'success');
            setAddModal(false);
            setAddForm(emptyForm());
            fetchSubAdmins();
        } catch (err: any) {
            setFormError(err.message || 'Failed to create sub-admin');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Update ─────────────────────────────────────────────────

    const openEdit = (sa: SubAdmin) => {
        setEditModal(sa);
        setEditForm({
            name: sa.name,
            email: sa.email,
            role: sa.role,
            permissions: [...sa.permissions],
            isActive: sa.isActive,
        });
        setFormError('');
    };

    const handleUpdate = async () => {
        if (!editModal) return;
        setFormError('');
        if (!editForm.name?.trim()) return setFormError('Name is required');
        if (editForm.email) {
            const emailErr = validateEmail(editForm.email);
            if (!emailErr.valid) return setFormError(emailErr.error || 'Invalid email');
        }

        setIsSaving(true);
        try {
            await apiClient.patch(`/admin/sub-admins/${editModal.id}`, {
                name: editForm.name?.trim(),
                email: editForm.email?.trim(),
                role: editForm.role,
                isActive: editForm.isActive,
                permissions: editForm.permissions,
            });
            showToast('Sub-admin updated successfully', 'success');
            setEditModal(null);
            fetchSubAdmins();
        } catch (err: any) {
            setFormError(err.message || 'Failed to update sub-admin');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteModal) return;
        setIsDeleting(true);
        try {
            await apiClient.delete(`/admin/sub-admins/${deleteModal.id}`);
            showToast('Sub-admin removed successfully', 'success');
            setDeleteModal(null);
            fetchSubAdmins();
        } catch (err: any) {
            showToast(err.message || 'Failed to remove sub-admin', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Permission toggle helper ───────────────────────────────

    const togglePermission = (key: string, perms: string[], setPerms: (p: string[]) => void) => {
        setPerms(perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]);
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <PermissionGate permission="sub_admins">
            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>
                            Team Members
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage sub-admins for your buying group. Each member has their own login and permissions.
                        </p>
                    </div>
                    {isBuyingGroupAdmin && (
                        <Button onClick={() => { setAddModal(true); setAddForm(emptyForm()); setFormError(''); }}
                            className="flex items-center gap-2 text-xs">
                            <UserPlus className="w-4 h-4" /> Add Member
                        </Button>
                    )}
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-gray-700' },
                            { label: 'Active', value: stats.active, color: 'text-green-600' },
                            { label: 'Managers', value: stats.managers, color: 'text-yellow-600' },
                            { label: 'Reviewers', value: stats.reviewers, color: 'text-blue-600' },
                        ].map(s => (
                            <div key={s.label} className="bg-white border border-gray-200 rounded p-3">
                                <p className="text-xs text-gray-500">{s.label}</p>
                                <p className={`text-xl font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                        />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#516057]">
                        <option value="all">All Roles</option>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#516057]">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-5 h-5 animate-spin text-[#516057]" />
                        </div>
                    ) : subAdmins.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No team members found</p>
                            {isBuyingGroupAdmin && (
                                <button onClick={() => setAddModal(true)}
                                    className="mt-2 text-xs text-[#516057] hover:underline">
                                    Add your first team member
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Member</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Permissions</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Last Login</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {subAdmins.map(sa => (
                                    <tr key={sa.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-[#516057] flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                                                    {getInitials(sa.name)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{sa.name}</p>
                                                    <p className="text-gray-400">{sa.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={roleColor(sa.role)}>{sa.roleDisplay}</Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {sa.permissions.length === 0 ? (
                                                    <span className="text-gray-400">None</span>
                                                ) : sa.permissions.slice(0, 3).map(p => (
                                                    <span key={p} className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[10px]">
                                                        {ASSIGNABLE_PERMISSIONS.find(ap => ap.key === p)?.label || p}
                                                    </span>
                                                ))}
                                                {sa.permissions.length > 3 && (
                                                    <span className="text-gray-400">+{sa.permissions.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={sa.isActive ? 'success' : 'default'}>
                                                {sa.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {sa.lastLoginAt ? formatDate(sa.lastLoginAt) : 'Never'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => openEdit(sa)}
                                                    className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-gray-100 rounded transition-colors"
                                                    title="Edit">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setDeleteModal(sa)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Remove">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-1">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                                className="p-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                                className="p-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Add Modal ─────────────────────────────────────── */}
                {addModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                            <div className="flex items-center justify-between px-5 py-4 border-b">
                                <h2 className="text-sm font-semibold text-gray-800">Add Team Member</h2>
                                <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#516057]"
                                        placeholder="Jane Doe" />
                                </div>
                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                                    <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#516057]"
                                        placeholder="jane@example.com" />
                                </div>
                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={addForm.password}
                                            onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                                            className="w-full text-xs border border-gray-200 rounded px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#516057]"
                                            placeholder="Min 8 characters" />
                                        <button type="button" onClick={() => setShowPassword(s => !s)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                {/* Role */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                                    <div className="space-y-1.5">
                                        {ROLES.map(r => (
                                            <label key={r.value}
                                                className={`flex items-start gap-2.5 p-2.5 border rounded cursor-pointer transition-colors ${addForm.role === r.value ? 'border-[#516057] bg-[#f5f2f1]' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <input type="radio" name="add-role" value={r.value} checked={addForm.role === r.value}
                                                    onChange={() => setAddForm(f => ({ ...f, role: r.value }))}
                                                    className="mt-0.5 accent-[#516057]" />
                                                <div>
                                                    <p className="text-xs font-medium text-gray-700">{r.label}</p>
                                                    <p className="text-[10px] text-gray-400">{r.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {/* Permissions */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        <ShieldCheck className="inline w-3.5 h-3.5 mr-1" />Permissions
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {ASSIGNABLE_PERMISSIONS.map(p => (
                                            <label key={p.key}
                                                className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs transition-colors ${addForm.permissions.includes(p.key) ? 'border-[#516057] bg-[#f5f2f1] text-[#516057]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                <input type="checkbox" checked={addForm.permissions.includes(p.key)}
                                                    onChange={() => togglePermission(p.key, addForm.permissions, (perms) => setAddForm(f => ({ ...f, permissions: perms })))}
                                                    className="accent-[#516057]" />
                                                {p.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {formError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 px-5 py-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => setAddModal(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleCreate} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                                    {isSaving ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Modal ────────────────────────────────────── */}
                {editModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                            <div className="flex items-center justify-between px-5 py-4 border-b">
                                <h2 className="text-sm font-semibold text-gray-800">Edit — {editModal.name}</h2>
                                <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#516057]" />
                                </div>
                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#516057]" />
                                </div>
                                {/* Role */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                    <div className="space-y-1.5">
                                        {ROLES.map(r => (
                                            <label key={r.value}
                                                className={`flex items-start gap-2.5 p-2.5 border rounded cursor-pointer transition-colors ${editForm.role === r.value ? 'border-[#516057] bg-[#f5f2f1]' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <input type="radio" name="edit-role" value={r.value} checked={editForm.role === r.value}
                                                    onChange={() => setEditForm(f => ({ ...f, role: r.value }))}
                                                    className="mt-0.5 accent-[#516057]" />
                                                <div>
                                                    <p className="text-xs font-medium text-gray-700">{r.label}</p>
                                                    <p className="text-[10px] text-gray-400">{r.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {/* Permissions */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        <ShieldCheck className="inline w-3.5 h-3.5 mr-1" />Permissions
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {ASSIGNABLE_PERMISSIONS.map(p => (
                                            <label key={p.key}
                                                className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs transition-colors ${(editForm.permissions || []).includes(p.key) ? 'border-[#516057] bg-[#f5f2f1] text-[#516057]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                <input type="checkbox"
                                                    checked={(editForm.permissions || []).includes(p.key)}
                                                    onChange={() => togglePermission(p.key, editForm.permissions || [], (perms) => setEditForm(f => ({ ...f, permissions: perms })))}
                                                    className="accent-[#516057]" />
                                                {p.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {/* Active toggle */}
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <p className="text-xs font-medium text-gray-700">Account Status</p>
                                        <p className="text-[10px] text-gray-400">Inactive members cannot log in</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editForm.isActive ? 'bg-[#516057]' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                {formError && (
                                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 px-5 py-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
                                <Button size="sm" onClick={handleUpdate} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Confirm ────────────────────────────────── */}
                {deleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-lg w-full max-w-sm shadow-xl">
                            <div className="px-5 py-5 text-center">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <h2 className="text-sm font-semibold text-gray-800 mb-1">Remove Team Member</h2>
                                <p className="text-xs text-gray-500">
                                    Remove <span className="font-medium text-gray-700">{deleteModal.name}</span> from your team?
                                    Their account will be permanently deleted.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-5 pb-4">
                                <Button variant="outline" size="sm" onClick={() => setDeleteModal(null)}>Cancel</Button>
                                <Button size="sm" variant="danger" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                    {isDeleting ? 'Removing...' : 'Remove'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <ToastContainer toasts={toasts} onClose={(id: string) => setToasts(prev => prev.filter(t => t.id !== id))} />
            </div>
        </PermissionGate>
    );
}
