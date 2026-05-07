'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Eye, Edit, Ban, CheckCircle, X, ChevronLeft, ChevronRight, Plus, Loader2, Mail, Clock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  fetchPharmacies, 
  updatePharmacy, 
  updatePharmacyStatus,
  createPharmacy,
  fetchPendingInvites,
  cancelInvite,
  setFilters 
} from '@/lib/store/pharmaciesSlice';
import { Pharmacy, PharmacyUpdatePayload } from '@/lib/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const INITIAL_CREATE_FORM = {
  pharmacyName: '', email: '', contactName: '', phone: '', fax: '',
  street: '', city: '', state: '', zip: '',
  wholesaler: '', wholesalerAccount: '', secondaryWholesaler: '',
  deaNumber: '', deaExpiration: '',
  serviceType: 'full_service',
  daysBetweenVisits: '120',
  lastVisitDate: '', nextVisitDate: '',
  processorId: '', salesPersonId: '',
};

function PharmaciesPageContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { pharmacies, pagination, filters, isLoading, error, pendingInvites, invitesLoading, invitesError } = useAppSelector((state) => state.pharmacies);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended' | 'blacklisted'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewModal, setViewModal] = useState<Pharmacy | null>(null);
    const [editModal, setEditModal] = useState<Pharmacy | null>(null);
    const [editFormData, setEditFormData] = useState<PharmacyUpdatePayload>({});
    const [blacklistModal, setBlacklistModal] = useState<Pharmacy | null>(null);
    const [restoreModal, setRestoreModal] = useState<Pharmacy | null>(null);
    const [suspendModal, setSuspendModal] = useState<Pharmacy | null>(null);
    const [pharmacyIdFromQuery, setPharmacyIdFromQuery] = useState<string | null>(null);
    const [hasSearchedForPharmacy, setHasSearchedForPharmacy] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ ...INITIAL_CREATE_FORM });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);
    const [showInvites, setShowInvites] = useState(false);
    const [cancelInviteModal, setCancelInviteModal] = useState<any | null>(null);

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

    // Get pharmacyId from query params on mount
    useEffect(() => {
        const pharmacyId = searchParams.get('pharmacyId');
        if (pharmacyId) {
            setPharmacyIdFromQuery(pharmacyId);
            setHasSearchedForPharmacy(false); // Reset search flag when new pharmacyId is set
        }
    }, [searchParams]);

    // Open modal when pharmacy is found in the list
    useEffect(() => {
        if (pharmacyIdFromQuery && pharmacies.length > 0 && !isLoading) {
            const pharmacy = pharmacies.find(p => p.id === pharmacyIdFromQuery);
            if (pharmacy) {
                setViewModal(pharmacy);
                setPharmacyIdFromQuery(null); // Clear the query param after opening modal
                setHasSearchedForPharmacy(false); // Reset search flag
                // Remove query param from URL without reloading
                router.replace('/pharmacies', { scroll: false });
            } else if (!hasSearchedForPharmacy) {
                // Pharmacy not found in current page, try to search for it once
                setHasSearchedForPharmacy(true);
                // Try fetching with a larger limit to find the pharmacy
                dispatch(fetchPharmacies({
                    page: 1,
                    limit: 100, // Get more results to find the pharmacy
                    search: undefined,
                    status: 'all',
                })).then((result) => {
                    if (fetchPharmacies.fulfilled.match(result)) {
                        const foundPharmacy = result.payload.pharmacies.find(p => p.id === pharmacyIdFromQuery);
                        if (foundPharmacy) {
                            setViewModal(foundPharmacy);
                            setPharmacyIdFromQuery(null);
                            setHasSearchedForPharmacy(false);
                            router.replace('/pharmacies', { scroll: false });
                        } else {
                            // Pharmacy not found even after searching, clear the query param
                            setPharmacyIdFromQuery(null);
                            setHasSearchedForPharmacy(false);
                            router.replace('/pharmacies', { scroll: false });
                        }
                    }
                });
            }
        }
    }, [pharmacyIdFromQuery, pharmacies, isLoading, hasSearchedForPharmacy, dispatch, router]);

    // Initialize edit form when edit modal opens
    useEffect(() => {
        if (editModal) {
            setEditFormData({
                businessName: editModal.businessName,
                owner: editModal.owner,
                email: editModal.email,
                phone: editModal.phone,
                fax: editModal.fax,
                address: editModal.address,
                city: editModal.city,
                state: editModal.state,
                zipCode: editModal.zipCode,
                licenseNumber: editModal.licenseNumber,
                deaNumber: editModal.deaNumber,
                deaExpiration: editModal.deaExpiration,
                wholesaler: editModal.wholesaler,
                wholesalerAccount: editModal.wholesalerAccount,
                secondaryWholesaler: editModal.secondaryWholesaler,
                serviceType: editModal.serviceType,
                daysBetweenVisits: editModal.daysBetweenVisits,
                lastVisitDate: editModal.lastVisitDate,
                nextVisitDate: editModal.nextVisitDate,
                stateLicenseNumber: editModal.stateLicenseNumber,
                licenseExpiryDate: editModal.licenseExpiryDate,
                npiNumber: editModal.npiNumber,
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

    const handleCreatePharmacy = async () => {
        if (!createForm.pharmacyName.trim() || !createForm.email.trim()) {
            setCreateError('Pharmacy name and email are required');
            return;
        }
        setIsCreating(true);
        setCreateError(null);
        setCreateSuccess(null);
        const result = await dispatch(createPharmacy(createForm));
        setIsCreating(false);
        if (createPharmacy.fulfilled.match(result)) {
            setCreateSuccess(result.payload.message || 'Pharmacy created successfully!');
            setTimeout(() => {
                setCreateModal(false);
                setCreateForm({ ...INITIAL_CREATE_FORM });
                setCreateSuccess(null);
                dispatch(fetchPharmacies({ page: 1, limit: 20, status: statusFilter }));
                dispatch(fetchPendingInvites()); // Refresh invites list
            }, 2000);
        } else {
            setCreateError(result.payload as string || 'Failed to create pharmacy');
        }
    };

    const handleCancelInvite = async () => {
        if (cancelInviteModal) {
            const result = await dispatch(cancelInvite(cancelInviteModal.id));
            setCancelInviteModal(null);
            if (cancelInvite.fulfilled.match(result)) {
                // Refresh invites list
                dispatch(fetchPendingInvites());
            }
        }
    };

    // Fetch invites on mount so the badge count is correct immediately
    useEffect(() => {
        dispatch(fetchPendingInvites());
    }, [dispatch]);

    // Always re-fetch fresh data from the server when the panel is opened
    useEffect(() => {
        if (showInvites) {
            dispatch(fetchPendingInvites());
        }
    }, [showInvites, dispatch]);

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
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Pharmacies</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage registered pharmacies</p>
                </div>
                <button onClick={() => { setCreateModal(true); setCreateError(null); setCreateSuccess(null); setCreateForm({ ...INITIAL_CREATE_FORM }); }} className="inline-flex items-center gap-1 px-3 py-1 rounded-[4px] text-xs font-medium bg-[#516057] text-white hover:opacity-90 transition-all">
                    <Plus className="w-4 h-4" /> Add Pharmacy
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-[4px] text-xs font-medium">
                    {error}
                </div>
            )}

            {/* Pending Invites Section */}
            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-3">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xs font-medium text-gray-900">Pending Invitations</h2>
                        <Badge variant="secondary" className="ml-2 text-xs font-medium">{pendingInvites.length}</Badge>
                    </div>
                    <button
                        onClick={() => setShowInvites(!showInvites)}
                        className="px-3 py-1.5 text-xs border border-[#e2e2e2] rounded-[4px] hover:bg-gray-50 text-gray-500 transition-all"
                    >
                        {showInvites ? 'Hide' : 'Show'} Invites
                    </button>
                </div>

                {showInvites && (
                    <div className="space-y-3">
                        {invitesError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-1 rounded-[4px] text-xs">{invitesError}</div>
                        )}

                        {invitesLoading && (
                            <div className="text-center py-8 text-gray-500">
                                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-400" />
                                <p className="text-xs">Loading invitations...</p>
                            </div>
                        )}

                        {!invitesLoading && pendingInvites.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-xs font-medium">No pending invitations</p>
                                <p className="text-xs font-medium mt-1 text-gray-400">Invitations sent to pharmacies will appear here</p>
                            </div>
                        )}

                        {!invitesLoading && pendingInvites.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto">
                                    <thead>
                                        <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Sent</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                                            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingInvites.map((invite, index) => {
                                            const expiresAt = new Date(invite.expires_at);
                                            const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;
                                            return (
                                                <tr key={invite.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-colors border-b border-[#e2e2e2]`}>
                                                    <td className="px-3 py-2 text-xs font-medium text-gray-900">{invite.pharmacy_name}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{invite.email}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{invite.contact_name || '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{new Date(invite.created_at).toLocaleDateString()}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`text-xs flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                                                            <Clock className="w-3 h-3" />{expiresAt.toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button onClick={() => setCancelInviteModal(invite)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-all" title="Cancel Invite">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[4px] shadow border border-[#e2e2e2] p-3">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search pharmacies..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
                        className="px-3 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent"
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
                        <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-gray-400" />
                        <p className="text-xs text-gray-500">Loading pharmacies...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Returns</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pharmacies.map((pharmacy, index) => (
                                        <tr key={pharmacy.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all border-b border-[#e2e2e2]`}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{pharmacy.businessName}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{pharmacy.owner}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                <div className="leading-normal">{pharmacy.email}</div>
                                                <div className="text-gray-500 text-sm leading-normal">{pharmacy.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{pharmacy.city}, {pharmacy.state}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(pharmacy.status)}>{pharmacy.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{pharmacy.totalReturns}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setViewModal(pharmacy)}
                                                        className="p-2 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-all"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditModal(pharmacy)}
                                                        className="p-2 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {pharmacy.status === 'active' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSuspend(pharmacy)}
                                                                className="p-2 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded-[4px] transition-all"
                                                                title="Suspend"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setBlacklistModal(pharmacy)}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-all"
                                                                title="Blacklist"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {pharmacy.status === 'suspended' && (
                                                        <button
                                                            onClick={() => setRestoreModal(pharmacy)}
                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-[4px] transition-all"
                                                            title="Restore"
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

                        {pharmacies.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-xs text-gray-500">No pharmacies found</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-[#e2e2e2] bg-gray-50">
                                <div className="text-xs text-gray-500 font-medium">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} pharmacies
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 py-1 text-xs text-gray-500 font-medium">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="p-2 border border-[#e2e2e2] rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white">
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => setViewModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Pharmacy Details</h2>
                            <button onClick={() => setViewModal(null)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-4 py-3 space-y-4">
                            <div className="space-y-4">
                                {/* Store Info */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Store Information</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Business Name</p>
                                            <p className="text-xs font-medium text-gray-900 break-words">{viewModal.businessName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Status</p>
                                            <div className="mt-1"><Badge variant={getStatusVariant(viewModal.status)}>{viewModal.status}</Badge></div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Contact Name</p>
                                            <p className="text-xs text-gray-900">{viewModal.owner || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-xs text-gray-900 break-all">{viewModal.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-xs text-gray-900">{viewModal.phone || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Fax</p>
                                            <p className="text-xs text-gray-900">{viewModal.fax || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-[#e2e2e2] pt-5">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Address</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Street</p>
                                            <p className="text-xs text-gray-900 break-words">{viewModal.address || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">City</p>
                                            <p className="text-xs text-gray-900">{viewModal.city || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">State</p>
                                            <p className="text-xs text-gray-900">{viewModal.state || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">ZIP Code</p>
                                            <p className="text-xs text-gray-900">{viewModal.zipCode || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-[#e2e2e2] pt-5">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Wholesaler &amp; Compliance</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Primary Wholesaler</p>
                                            <p className="text-xs text-gray-900">{viewModal.wholesaler || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Wholesaler Account</p>
                                            <p className="text-xs text-gray-900">{viewModal.wholesalerAccount || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Secondary Wholesaler</p>
                                            <p className="text-xs text-gray-900">{viewModal.secondaryWholesaler || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">DEA Number</p>
                                            <p className="text-xs text-gray-900">{viewModal.deaNumber || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">DEA Expiration</p>
                                            <p className="text-xs text-gray-900">{viewModal.deaExpiration ? new Date(viewModal.deaExpiration).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-[#e2e2e2] pt-5">
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Service &amp; Schedule</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Service Type</p>
                                            <p className="text-xs text-gray-900 capitalize">{viewModal.serviceType?.replace('_', ' ') || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Days Between Visits</p>
                                            <p className="text-xs text-gray-900">{viewModal.daysBetweenVisits ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Last Visit Date</p>
                                            <p className="text-xs text-gray-900">{viewModal.lastVisitDate ? new Date(viewModal.lastVisitDate).toLocaleDateString() : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Next Visit Date</p>
                                            <p className="text-xs text-gray-900">{viewModal.nextVisitDate ? new Date(viewModal.nextVisitDate).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-[#e2e2e2] pt-5 grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Total Returns</p>
                                        <p className="text-xs text-gray-900">{viewModal.totalReturns}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Created At</p>
                                        <p className="text-xs text-gray-900">{new Date(viewModal.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setViewModal(null)} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => { setEditModal(null); setEditFormData({}); }}>
                    <div className="bg-white rounded-[4px] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Edit Pharmacy</h2>
                            <button onClick={() => { setEditModal(null); setEditFormData({}); }} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            {/* Store Information */}
                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Store Information</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Business Name</label>
                                        <input type="text" value={editFormData.businessName || ''} onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Contact Name</label>
                                        <input type="text" value={editFormData.owner || ''} onChange={(e) => setEditFormData({ ...editFormData, owner: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Email</label>
                                        <input type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Phone</label>
                                        <input type="tel" value={editFormData.phone || ''} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Fax</label>
                                        <input type="text" value={editFormData.fax || ''} onChange={(e) => setEditFormData({ ...editFormData, fax: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Optional" />
                                    </div>
                                </div>
                            </div>
                            {/* Address */}
                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Address</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Street</label>
                                        <input type="text" value={editFormData.address || ''} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">City</label>
                                        <input type="text" value={editFormData.city || ''} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">State</label>
                                            <select value={editFormData.state || ''} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent">
                                                <option value="">Select</option>
                                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">ZIP</label>
                                            <input type="text" value={editFormData.zipCode || ''} onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" maxLength={10} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Wholesaler & Compliance */}
                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Wholesaler &amp; Compliance</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Primary Wholesaler</label>
                                        <input type="text" value={editFormData.wholesaler || ''} onChange={(e) => setEditFormData({ ...editFormData, wholesaler: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Cardinal Health" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Wholesaler Account</label>
                                        <input type="text" value={editFormData.wholesalerAccount || ''} onChange={(e) => setEditFormData({ ...editFormData, wholesalerAccount: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Account #" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Secondary Wholesaler</label>
                                        <input type="text" value={editFormData.secondaryWholesaler || ''} onChange={(e) => setEditFormData({ ...editFormData, secondaryWholesaler: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Optional" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">DEA Number</label>
                                        <input type="text" value={editFormData.deaNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, deaNumber: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="AB1234567" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">DEA Expiration</label>
                                        <input type="date" value={editFormData.deaExpiration || ''} onChange={(e) => setEditFormData({ ...editFormData, deaExpiration: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                </div>
                            </div>
                            {/* Service & Schedule */}
                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Service &amp; Schedule</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Service Type</label>
                                        <select value={editFormData.serviceType || ''} onChange={(e) => setEditFormData({ ...editFormData, serviceType: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent">
                                            <option value="full_service">Full Service</option>
                                            <option value="self_service">Self Service</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Days Between Visits</label>
                                        <input type="number" min="1" max="365" value={editFormData.daysBetweenVisits ?? ''} onChange={(e) => setEditFormData({ ...editFormData, daysBetweenVisits: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Last Visit Date</label>
                                        <input type="date" value={editFormData.lastVisitDate || ''} onChange={(e) => setEditFormData({ ...editFormData, lastVisitDate: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Next Visit Date</label>
                                        <input type="date" value={editFormData.nextVisitDate || ''} onChange={(e) => setEditFormData({ ...editFormData, nextVisitDate: e.target.value })} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => { setEditModal(null); setEditFormData({}); }} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Cancel</button>
                            <button onClick={handleEdit} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-[#516057] text-white hover:opacity-90 disabled:opacity-50 transition-all">
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blacklist Confirmation Modal */}
            {blacklistModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => setBlacklistModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Blacklist Pharmacy</h2>
                            <button onClick={() => setBlacklistModal(null)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-xs text-gray-500">Are you sure you want to blacklist <strong className="text-gray-900">{blacklistModal.businessName}</strong>? This will prevent them from accessing the platform.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setBlacklistModal(null)} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Cancel</button>
                            <button onClick={handleBlacklist} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all">{isLoading ? 'Processing...' : 'Blacklist'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {restoreModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => setRestoreModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Restore Pharmacy</h2>
                            <button onClick={() => setRestoreModal(null)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-xs text-gray-500">Are you sure you want to restore <strong className="text-gray-900">{restoreModal.businessName}</strong>? This will reactivate their access to the platform.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setRestoreModal(null)} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Cancel</button>
                            <button onClick={handleRestore} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-[#516057] text-white hover:opacity-90 disabled:opacity-50 transition-all">{isLoading ? 'Processing...' : 'Restore'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Confirmation Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => setSuspendModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Suspend Pharmacy</h2>
                            <button onClick={() => setSuspendModal(null)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-xs text-gray-500">Are you sure you want to suspend <strong className="text-gray-900">{suspendModal.businessName}</strong>? This will temporarily restrict their access to the platform.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setSuspendModal(null)} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Cancel</button>
                            <button onClick={confirmSuspend} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-[#516057] text-white hover:opacity-90 disabled:opacity-50 transition-all">{isLoading ? 'Processing...' : 'Suspend'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Pharmacy Modal */}
            {createModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3" onClick={() => !isCreating && setCreateModal(false)}>
                    <div className="bg-white rounded-[4px] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <h2 className="text-xs font-medium text-gray-900" style={{ fontFamily: 'var(--font-newsreader), serif' }}>Add New Pharmacy</h2>
                            <button onClick={() => !isCreating && setCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-[4px] transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {createError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-1 rounded-[4px] text-xs">{createError}</div>}
                            {createSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-1 rounded-[4px] text-xs">{createSuccess}</div>}

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Store Information</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Store Name <span className="text-red-500">*</span></label>
                                        <input type="text" value={createForm.pharmacyName} onChange={e => setCreateForm({...createForm, pharmacyName: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Store / Pharmacy Name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                                        <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="pharmacy@email.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Contact Name</label>
                                        <input type="text" value={createForm.contactName} onChange={e => setCreateForm({...createForm, contactName: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Contact Person" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Phone</label>
                                        <input type="text" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="(555) 123-4567" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Fax</label>
                                        <input type="text" value={createForm.fax} onChange={e => setCreateForm({...createForm, fax: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="(555) 123-4568" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Address</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Street</label>
                                        <input type="text" value={createForm.street} onChange={e => setCreateForm({...createForm, street: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="123 Main St" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">City</label>
                                        <input type="text" value={createForm.city} onChange={e => setCreateForm({...createForm, city: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="City" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">State</label>
                                            <select value={createForm.state} onChange={e => setCreateForm({...createForm, state: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent">
                                                <option value="">Select</option>
                                                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">ZIP</label>
                                            <input type="text" value={createForm.zip} onChange={e => setCreateForm({...createForm, zip: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="10001" maxLength={10} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Wholesaler &amp; Compliance</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Primary Wholesaler</label>
                                        <input type="text" value={createForm.wholesaler} onChange={e => setCreateForm({...createForm, wholesaler: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Cardinal Health" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Wholesaler Account</label>
                                        <input type="text" value={createForm.wholesalerAccount} onChange={e => setCreateForm({...createForm, wholesalerAccount: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Account #" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Secondary Wholesaler</label>
                                        <input type="text" value={createForm.secondaryWholesaler} onChange={e => setCreateForm({...createForm, secondaryWholesaler: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="Optional" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">DEA Number</label>
                                        <input type="text" value={createForm.deaNumber} onChange={e => setCreateForm({...createForm, deaNumber: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" placeholder="AB1234567" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">DEA Expiration</label>
                                        <input type="date" value={createForm.deaExpiration} onChange={e => setCreateForm({...createForm, deaExpiration: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Service &amp; Schedule</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Service Type</label>
                                        <select value={createForm.serviceType} onChange={e => setCreateForm({...createForm, serviceType: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent">
                                            <option value="full_service">Full Service</option>
                                            <option value="self_service">Self Service</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Days Between Visits</label>
                                        <input type="number" min="1" max="365" value={createForm.daysBetweenVisits} onChange={e => setCreateForm({...createForm, daysBetweenVisits: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Last Visit Date</label>
                                        <input type="date" value={createForm.lastVisitDate} onChange={e => setCreateForm({...createForm, lastVisitDate: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-2">Next Visit Date</label>
                                        <input type="date" value={createForm.nextVisitDate} onChange={e => setCreateForm({...createForm, nextVisitDate: e.target.value})} className="w-full px-4 py-1 text-xs border border-[#e2e2e2] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#516057] focus:border-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setCreateModal(false)} disabled={isCreating} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Cancel</button>
                            <button onClick={handleCreatePharmacy} disabled={isCreating || !createForm.pharmacyName.trim() || !createForm.email.trim()} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-[#516057] text-white hover:opacity-90 disabled:opacity-50 transition-all">
                                {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create & Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Invite Confirmation Modal */}
            {cancelInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-[4px] max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e2e2] bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-[4px]-full flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-medium text-gray-900">Cancel Invitation</h3>
                                    <p className="text-xs text-gray-500">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-xs text-gray-500 mb-2">Are you sure you want to cancel the invitation for:</p>
                            <div className="bg-gray-50 px-4 py-1 rounded-[4px] border">
                                <div className="text-xs font-medium text-gray-900">{cancelInviteModal.pharmacy_name}</div>
                                <div className="text-xs text-gray-500">{cancelInviteModal.email}</div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-5 border-t border-[#e2e2e2] bg-gray-50">
                            <button onClick={() => setCancelInviteModal(null)} disabled={invitesLoading} className="px-4 py-1 text-xs rounded-[4px] border border-[#e2e2e2] text-gray-700 hover:bg-white transition-all">Keep Invite</button>
                            <button onClick={handleCancelInvite} disabled={invitesLoading} className="inline-flex items-center gap-2 px-4 py-1 text-xs rounded-[4px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all">
                                {invitesLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Cancelling...</> : 'Cancel Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PharmaciesPage() {
    return (
        <PermissionGate permission="pharmacies">
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-[4px]-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-#5f5f5f">Loading...</p>
                </div>
            </div>
        }>
            <PharmaciesPageContent />
        </Suspense>
        </PermissionGate>
    );
}
