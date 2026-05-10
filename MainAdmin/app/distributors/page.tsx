'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Eye, Edit, Ban, CheckCircle, X,
    ChevronLeft, ChevronRight, Plus, Loader2,
    Building2, AlertTriangle, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchDistributors,
    updateDistributor,
    updateDistributorStatus,
    createDistributor,
    setFilters,
} from '@/lib/store/distributorsSlice';
import { Distributor, DistributorUpdatePayload, DistributorCreatePayload } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

const inputCls =
    'w-full px-3 py-2.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors';
const labelCls = 'block text-xs font-semibold mb-1.5 uppercase tracking-wide';

export default function DistributorsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { distributors, stats, pagination, filters, isLoading, error } = useAppSelector((state) => state.distributors);

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
        specializations: [],
    });

    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        const searchParam = debouncedSearch || '';
        const statusParam = statusFilter;
        const hasMatchingData =
            distributors.length > 0 &&
            pagination?.page === currentPage &&
            (filters?.search || '') === searchParam &&
            (filters?.status || 'all') === statusParam;
        if (!hasMatchingData) {
            dispatch(fetchDistributors({ page: currentPage, limit: 10, search: debouncedSearch || undefined, status: statusFilter }));
        }
    }, [dispatch, currentPage, debouncedSearch, statusFilter]);

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

    const refetch = () => dispatch(fetchDistributors({ page: currentPage, limit: 10, search: debouncedSearch || undefined, status: statusFilter }));

    const handleDeactivate = async () => {
        if (deactivateModal) {
            await dispatch(updateDistributorStatus({ id: deactivateModal.id, status: 'inactive' }));
            setDeactivateModal(null);
            refetch();
        }
    };

    const handleActivate = async () => {
        if (activateModal) {
            await dispatch(updateDistributorStatus({ id: activateModal.id, status: 'active' }));
            setActivateModal(null);
            refetch();
        }
    };

    const handleEdit = async () => {
        if (editModal) {
            await dispatch(updateDistributor({ id: editModal.id, payload: editFormData }));
            setEditModal(null);
            setEditFormData({});
            refetch();
        }
    };

    const handleAddDistributor = async () => {
        await dispatch(createDistributor(newDistributor));
        setAddModal(false);
        setNewDistributor({ companyName: '', contactPerson: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', licenseNumber: '', specializations: [] });
        refetch();
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const statusPill = (status: string) => {
        const normalized = (status || 'active').toLowerCase();
        return (
            <span className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                normalized === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-[var(--surface-container)] text-[var(--on-primary-container)] border-[var(--outline-variant)]'
            )}>
                {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
            </span>
        );
    };

    const ModalHeader = ({ title, subtitle, onClose, id }: { title: string; subtitle?: string; onClose: () => void; id?: string }) => (
        <div
            className="px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--surface-container-high)' }}
                >
                    <Building2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="min-w-0">
                    <h3 id={id} className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>{title}</h3>
                    {subtitle && (
                        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>{subtitle}</p>
                    )}
                </div>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-[4px] hover:bg-primary-50/40 cursor-pointer shrink-0"
                style={{ color: 'var(--outline)' }}
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    const SectionDivider = ({ label }: { label: string }) => (
        <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--outline-variant)' }} />
            <span
                className="text-xs font-semibold uppercase tracking-wider px-2 rounded-full py-0.5 border"
                style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-50)', borderColor: 'var(--outline-variant)' }}
            >
                {label}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--outline-variant)' }} />
        </div>
    );

    const InfoField = ({ label, value, full }: { label: string; value?: string | number | null; full?: boolean }) => (
        <div
            className={cn('rounded-[4px] border px-3 py-2', full ? 'col-span-2' : '')}
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
        >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>{label}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{value || '—'}</p>
        </div>
    );

    const addDisabled = isLoading || !newDistributor.companyName || !newDistributor.contactPerson ||
        !newDistributor.email || !newDistributor.phone || !newDistributor.address ||
        !newDistributor.city || !newDistributor.state || !newDistributor.zipCode || !newDistributor.licenseNumber;

    return (
        <PermissionGate permission="distributors">
            <div className="space-y-5">

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Distributors</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>Manage reverse distributors and their deals</p>
                    </div>
                    <Button variant="primary" onClick={() => setAddModal(true)} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Distributor
                    </Button>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Total Distributors', value: stats?.totalDistributors ?? 0, icon: Building2, color: 'text-primary-700 bg-primary-100' },
                        { label: 'Active', value: stats?.activeDistributors ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
                        { label: 'Inactive', value: stats?.inactiveDistributors ?? 0, icon: Ban, color: 'text-gray-600 bg-[var(--surface-container)]' },
                    ].map((s) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={s.label}
                                className="rounded-[4px] border p-3 flex items-center gap-3"
                                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            >
                                <div className={cn('w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0', s.color)}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{s.label}</p>
                                    <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{isLoading ? '...' : s.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Filters + Table */}
                <div className="rounded-[4px] border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <div className="flex flex-col sm:flex-row gap-3 p-4 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" />
                            <input
                                type="text"
                                placeholder="Search distributors..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-9 pr-4 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
                            className="px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            <span className="ml-2 text-sm text-[var(--on-surface-variant)]">Loading...</span>
                        </div>
                    ) : distributors.length === 0 ? (
                        <div className="text-center py-16">
                            <Building2 className="w-12 h-12 text-[var(--outline-variant)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--on-surface-variant)]">No distributors found</p>
                            <Button variant="primary" size="sm" className="mt-4" onClick={() => setAddModal(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Add First Distributor
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border" style={{ borderColor: 'var(--outline)' }}>
                                    <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Company Name</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Contact</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Contact Info</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Location</th>
                                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Products</th>
                                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Deals</th>
                                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                                            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {distributors.map((d) => (
                                            <tr key={d.id} className="transition-colors hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                <td className="px-3 py-3 text-sm font-medium max-w-[180px] truncate" style={{ color: 'var(--foreground)' }} title={d.companyName}>{d.companyName}</td>
                                                <td className="px-3 py-3 text-sm hidden md:table-cell max-w-[140px] truncate" style={{ color: 'var(--on-surface-variant)' }} title={d.contactPerson}>{d.contactPerson}</td>
                                                <td className="px-3 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--on-surface-variant)' }}>
                                                    <div className="truncate max-w-[180px] text-xs" title={d.email}>{d.email}</div>
                                                    <div className="text-xs truncate max-w-[180px]" style={{ color: 'var(--on-surface-variant)' }}>{d.phone}</div>
                                                </td>
                                                <td className="px-3 py-3 text-sm hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>{d.city}, {d.state}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => router.push(`/distributors/${d.id}/products`)}
                                                        className="hover:underline cursor-pointer text-sm font-semibold"
                                                        style={{ color: 'var(--primary)' }}
                                                    >
                                                        {d?.uniqueProductsCount ?? 0}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-center hidden sm:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{d.totalDeals ?? 0}</td>
                                                <td className="px-3 py-3 text-center">{statusPill(d.status)}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setViewModal(d)} className="p-1.5 rounded-[4px] hover:bg-primary-50 cursor-pointer transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="View">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => setEditModal(d)} className="p-1.5 rounded-[4px] hover:bg-yellow-50 text-[var(--on-surface-variant)] hover:text-yellow-600 cursor-pointer transition-colors" title="Edit">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        {d.status === 'active' ? (
                                                            <button onClick={() => setDeactivateModal(d)} className="p-1.5 rounded-[4px] hover:bg-red-50 text-[var(--on-surface-variant)] hover:text-red-600 cursor-pointer transition-colors" title="Deactivate">
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => setActivateModal(d)} className="p-1.5 rounded-[4px] hover:bg-green-50 text-[var(--on-surface-variant)] hover:text-green-600 cursor-pointer transition-colors" title="Activate">
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

                            {/* Pagination */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-high)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>Page {pagination.page} of {pagination.totalPages}</span>
                                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-high)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                            <ChevronRight className="w-4 h-4" />
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
                        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                        onClick={() => setViewModal(null)}
                        role="presentation"
                    >
                        <div
                            className="rounded-[4px] shadow-xl w-full max-w-lg max-h-[92vh] my-auto flex flex-col border min-h-0"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="distributor-view-title"
                        >
                            <ModalHeader id="distributor-view-title" title="Distributor Details" subtitle="View distributor information" onClose={() => setViewModal(null)} />
                            <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">
                                <div
                                    className="rounded-[4px] border p-3 flex items-center justify-between gap-3"
                                    style={{ background: 'linear-gradient(90deg, var(--surface-container-low) 0%, var(--secondary-container) 100%)', borderColor: 'var(--outline-variant)' }}
                                >
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Distributor</p>
                                        <p className="text-base font-bold leading-tight truncate" style={{ color: 'var(--foreground)' }}>{viewModal.companyName}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{viewModal.contactPerson}</p>
                                    </div>
                                    {statusPill(viewModal.status)}
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <InfoField label="Email" value={viewModal.email} full />
                                    <InfoField label="Phone" value={viewModal.phone} />
                                    <InfoField label="License Number" value={viewModal.licenseNumber} />
                                    <InfoField label="Address" value={viewModal.address} full />
                                    <InfoField label="City" value={viewModal.city} />
                                    <InfoField label="State" value={viewModal.state} />
                                    <InfoField label="ZIP Code" value={viewModal.zipCode} />
                                    <InfoField label="Total Deals" value={viewModal.totalDeals ?? 0} />
                                    {viewModal.createdAt && (
                                        <InfoField label="Created" value={new Date(viewModal.createdAt).toLocaleDateString()} />
                                    )}
                                </div>
                            </div>
                            <div
                                className="flex justify-end px-4 py-3 border-t shrink-0"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                            >
                                <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Modal */}
                {addModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                        onClick={() => setAddModal(false)}
                        role="presentation"
                    >
                        <div
                            className="rounded-[4px] shadow-xl w-full max-w-xl max-h-[92vh] my-auto flex flex-col border min-h-0"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="distributor-add-title"
                        >
                            <ModalHeader id="distributor-add-title" title="Add New Distributor" subtitle="Fill in the details to register a distributor" onClose={() => setAddModal(false)} />
                            <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5">
                                <div className="space-y-4">
                                    <SectionDivider label="Company Information" />
                                    <div>
                                        <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Company Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={newDistributor.companyName}
                                            onChange={(e) => setNewDistributor({ ...newDistributor, companyName: e.target.value })}
                                            className={inputCls}
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                                            placeholder="e.g. Cardinal Health Distribution"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Contact Person <span className="text-red-500">*</span></label>
                                            <input type="text" value={newDistributor.contactPerson} onChange={(e) => setNewDistributor({ ...newDistributor, contactPerson: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="Full name" />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>License Number <span className="text-red-500">*</span></label>
                                            <input type="text" value={newDistributor.licenseNumber} onChange={(e) => setNewDistributor({ ...newDistributor, licenseNumber: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="e.g. MA-DIST-001" />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Email <span className="text-red-500">*</span></label>
                                            <input type="email" value={newDistributor.email} onChange={(e) => setNewDistributor({ ...newDistributor, email: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="email@example.com" />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Phone <span className="text-red-500">*</span></label>
                                            <input type="tel" value={newDistributor.phone} onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="(555) 123-4567" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SectionDivider label="Address" />
                                    <div>
                                        <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Street Address <span className="text-red-500">*</span></label>
                                        <input type="text" value={newDistributor.address} onChange={(e) => setNewDistributor({ ...newDistributor, address: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="Enter street address" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                                        <div className="sm:col-span-3">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>City <span className="text-red-500">*</span></label>
                                            <input type="text" value={newDistributor.city} onChange={(e) => setNewDistributor({ ...newDistributor, city: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="City" />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>State <span className="text-red-500">*</span></label>
                                            <input type="text" value={newDistributor.state} onChange={(e) => setNewDistributor({ ...newDistributor, state: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="CA" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>ZIP Code <span className="text-red-500">*</span></label>
                                            <input type="text" value={newDistributor.zipCode} onChange={(e) => setNewDistributor({ ...newDistributor, zipCode: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} placeholder="ZIP" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleAddDistributor} disabled={addDisabled} className="min-w-[140px]">
                                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Adding...</> : <><Plus className="w-4 h-4 mr-1.5" /> Add Distributor</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                        onClick={() => { setEditModal(null); setEditFormData({}); }}
                        role="presentation"
                    >
                        <div
                            className="rounded-[4px] shadow-xl w-full max-w-xl max-h-[92vh] my-auto flex flex-col border min-h-0"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="distributor-edit-title"
                        >
                            <ModalHeader id="distributor-edit-title" title="Edit Distributor" subtitle={`Updating: ${editModal.companyName}`} onClose={() => { setEditModal(null); setEditFormData({}); }} />
                            <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5">
                                <div className="space-y-4">
                                    <SectionDivider label="Company Information" />
                                    <div>
                                        <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Company Name</label>
                                        <input type="text" value={editFormData.companyName || ''} onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Contact Person</label>
                                            <input type="text" value={editFormData.contactPerson || ''} onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>License Number</label>
                                            <input type="text" value={editFormData.licenseNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, licenseNumber: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Email</label>
                                            <input type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                        <div>
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Phone</label>
                                            <input type="tel" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SectionDivider label="Address" />
                                    <div>
                                        <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>Street Address</label>
                                        <input type="text" value={editFormData.address || ''} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                                        <div className="sm:col-span-3">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>City</label>
                                            <input type="text" value={editFormData.city || ''} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>State</label>
                                            <input type="text" value={editFormData.state || ''} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className={labelCls} style={{ color: 'var(--on-surface-variant)' }}>ZIP Code</label>
                                            <input type="text" value={editFormData.zipCode || ''} onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })} className={inputCls} style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <Button variant="outline" onClick={() => { setEditModal(null); setEditFormData({}); }}>Cancel</Button>
                                <Button variant="primary" onClick={handleEdit} disabled={isLoading} className="min-w-[130px]">
                                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving...</> : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Deactivate Confirm */}
                {deactivateModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm px-4"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                        onClick={() => setDeactivateModal(null)}
                    >
                        <div
                            className="rounded-[4px] shadow-xl max-w-sm w-full border"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 pt-6 pb-4">
                                <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--error-container)' }}>
                                    <Ban className="w-5 h-5" style={{ color: 'var(--error)' }} />
                                </div>
                                <h3 className="font-heading text-body font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Deactivate Distributor</h3>
                                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                    Are you sure you want to deactivate <strong>{deactivateModal.companyName}</strong>? This will temporarily suspend their access and deals.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <Button variant="outline" onClick={() => setDeactivateModal(null)}>Cancel</Button>
                                <Button variant="danger" onClick={handleDeactivate} disabled={isLoading}>
                                    {isLoading ? 'Processing...' : 'Deactivate'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activate Confirm */}
                {activateModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm px-4"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                        onClick={() => setActivateModal(null)}
                    >
                        <div
                            className="rounded-[4px] shadow-xl max-w-sm w-full border"
                            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 pt-6 pb-4">
                                <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--secondary-container)' }}>
                                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                </div>
                                <h3 className="font-heading text-body font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Activate Distributor</h3>
                                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                    Are you sure you want to activate <strong>{activateModal.companyName}</strong>? This will restore their access and allow them to create deals.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <Button variant="outline" onClick={() => setActivateModal(null)}>Cancel</Button>
                                <Button variant="success" onClick={handleActivate} disabled={isLoading}>
                                    {isLoading ? 'Processing...' : 'Activate'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </PermissionGate>
    );
}