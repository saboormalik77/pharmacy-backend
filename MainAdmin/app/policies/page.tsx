'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Search, Plus, Loader2, AlertCircle, X, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchPolicies,
    createPolicy,
    deletePolicy,
    addReturnPolicy,
    addNote,
    FetchPoliciesParams,
} from '@/lib/store/policiesSlice';
import { ManufacturerPolicyCreatePayload, ManufacturerPolicy, ReturnPolicyCreatePayload, PolicyNotePayload } from '@/lib/types';
import {
    LABELER_TYPES, LABELER_TYPE_LABELS,
    REIMBURSEMENT_TYPES, REIMBURSEMENT_TYPE_LABELS,
    RETURN_WINDOW_LABELS,
    validateLabelerForm,
    normaliseLabelerPayload,
    roundDiscountRate,
    validateMonthsExpiration,
    validateLabelerId,
    validateLabelerType,
    validateAveragePayPercent,
    validateAverageDaysToPay,
    validateLabelerName,
    validateAddressLine,
    validateCity,
    validateState,
    validateZip,
    validateContactName,
    validateUSPhone,
    validateEmail,
    validateNotes,
    validateDestination,
    validatePolicyNumber,
    validatePolicyDescription,
    validateDiscountRate,
    validateReimbursementType,
    validateReturnWindowMode,
    type LabelerFormErrors,
} from '@/lib/validation/labeler';

interface ReverseDistributorOption {
    id: string;
    name: string;
    email: string;
}

const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const INITIAL_RETURN_POLICY = {
    destination: '', autoRaEmail: '', policyNumber: 1 as number | undefined,
    policyDescription: '',
    monthsBeforeExpiration: undefined as number | undefined,
    monthsAfterExpiration: undefined as number | undefined,
    discountRate: undefined as number | undefined,
    partialsAccepted: false as boolean,
    reimbursementType: 'batch' as string,
    returnableWithinPolicyPeriod: 'standard' as string,
};

const INITIAL_PARTIAL_POLICY = {
    policyNumber: undefined as number | undefined,
    policyDescription: '',
    monthsBeforeExpiration: undefined as number | undefined,
    monthsAfterExpiration: undefined as number | undefined,
    returnableWithinPolicyPeriod: 'standard' as string,
};

function errClass(hasError: boolean): string {
    return hasError
        ? 'border-red-400 focus:ring-red-400'
        : 'border-[var(--outline-variant)] focus:ring-primary-500';
}

export default function PoliciesPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { policies, pagination, isLoading, isActionLoading, error } = useAppSelector(s => s.policies);

    const [search, setSearch] = useState('');
    const [labelerType, setLabelerType] = useState('all');
    const [destination, setDestination] = useState('all');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search, 400);

    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<ManufacturerPolicy | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [newPolicy, setNewPolicy] = useState<ManufacturerPolicyCreatePayload>({
        labelerId: '', manufacturerName: '', labelerType: 'generic',
    });
    const [newReturnPolicy, setNewReturnPolicy] = useState({ ...INITIAL_RETURN_POLICY });
    const [partialPolicy, setPartialPolicy] = useState({ ...INITIAL_PARTIAL_POLICY });
    const [newNote, setNewNote] = useState('');
    const [formErrors, setFormErrors] = useState<LabelerFormErrors>({});

    const [reverseDistributors, setReverseDistributors] = useState<ReverseDistributorOption[]>([]);
    const [loadingDistributors, setLoadingDistributors] = useState(false);

    const fetchReverseDistributors = useCallback(async () => {
        if (reverseDistributors.length > 0) return;
        setLoadingDistributors(true);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: ReverseDistributorOption[] }>(
                '/admin/reverse-distributors', true
            );
            setReverseDistributors(res.data || []);
        } catch {
        } finally {
            setLoadingDistributors(false);
        }
    }, [reverseDistributors.length]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message, type }]);
    };
    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    /** Validate a single field on change. Empty value clears the error without showing "required". */
    const validateOnChange = useCallback((
        key: keyof LabelerFormErrors,
        rawValue: string | number | undefined | null,
    ) => {
        if (rawValue == null || rawValue === '') {
            setFormErrors(prev => ({ ...prev, [key]: '' }));
            return;
        }
        const s = String(rawValue);
        const asFloat = typeof rawValue === 'number' ? rawValue : parseFloat(s);
        const asInt   = typeof rawValue === 'number' ? rawValue : parseInt(s, 10);
        let result: { valid: boolean; error: string | null } = { valid: true, error: null };
        switch (key) {
            case 'labelerId':                    result = validateLabelerId(s); break;
            case 'labelerType':                  result = validateLabelerType(s); break;
            case 'averagePayPercent':            result = validateAveragePayPercent(asFloat); break;
            case 'averageDaysToPay':             result = validateAverageDaysToPay(asInt); break;
            case 'manufacturerName':             result = validateLabelerName(s); break;
            case 'address1':                     result = validateAddressLine(s, 'Address 1'); break;
            case 'address2':                     result = validateAddressLine(s, 'Address 2'); break;
            case 'city':                         result = validateCity(s); break;
            case 'state':                        result = validateState(s); break;
            case 'zip':                          result = validateZip(s); break;
            case 'mainContact':                  result = validateContactName(s, 'Main Contact'); break;
            case 'mainPhone':                    result = validateUSPhone(s, 'Main Phone'); break;
            case 'fax':                          result = validateUSPhone(s, 'Fax'); break;
            case 'creditRequestEmail':           result = validateEmail(s, 'Credit Request Email'); break;
            case 'contact2Name':                 result = validateContactName(s, 'Contact 2'); break;
            case 'contact2Phone':                result = validateUSPhone(s, 'Phone 2'); break;
            case 'contact2Email':                result = validateEmail(s, 'Email 2'); break;
            case 'notes':                        result = validateNotes(s); break;
            case 'autoRaEmail':                  result = validateEmail(s, 'Auto RA Email'); break;
            case 'destination':                  result = validateDestination(s, reverseDistributors.map(d => d.name)); break;
            case 'policyNumber':                 result = validatePolicyNumber(s); break;
            case 'policyDescription':            result = validatePolicyDescription(s); break;
            case 'monthsBeforeExpiration':       result = validateMonthsExpiration(asInt, 'Months Before Expiration'); break;
            case 'monthsAfterExpiration':        result = validateMonthsExpiration(asInt, 'Months After Expiration'); break;
            case 'discountRate':                 result = validateDiscountRate(asFloat); break;
            case 'reimbursementType':            result = validateReimbursementType(s); break;
            case 'returnableWithinPolicyPeriod': result = validateReturnWindowMode(s); break;
            case 'partialPolicyNumber':               result = validatePolicyNumber(s, 'Partial Policy #'); break;
            case 'partialPolicyDescription':          result = validatePolicyDescription(s, 'Partial Policy Description'); break;
            case 'partialMonthsBeforeExpiration':     result = validateMonthsExpiration(asInt, 'Partial Months Before Expiration'); break;
            case 'partialMonthsAfterExpiration':      result = validateMonthsExpiration(asInt, 'Partial Months After Expiration'); break;
            case 'partialReturnWindowMode':           result = validateReturnWindowMode(s); break;
        }
        setFormErrors(prev => ({ ...prev, [key]: result.valid ? '' : result.error ?? '' }));
    }, [reverseDistributors]);

    const closeAddModal = () => {
        setAddModal(false);
        setNewPolicy({ labelerId: '', manufacturerName: '', labelerType: 'generic' });
        setNewReturnPolicy({ ...INITIAL_RETURN_POLICY });
        setPartialPolicy({ ...INITIAL_PARTIAL_POLICY });
        setNewNote('');
        setFormErrors({});
    };

    useEffect(() => {
        const params: FetchPoliciesParams = { page, limit: 10 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (labelerType !== 'all') params.labelerType = labelerType;
        if (destination !== 'all') params.destination = destination;
        dispatch(fetchPolicies(params));
    }, [dispatch, page, debouncedSearch, labelerType, destination]);

    useEffect(() => { setPage(1); }, [debouncedSearch, labelerType, destination]);

    // Auto-fill partialPolicyNumber = policyNumber + 1 when partials are enabled
    useEffect(() => {
        if (newReturnPolicy.partialsAccepted && partialPolicy.policyNumber == null) {
            setPartialPolicy(prev => ({ ...prev, policyNumber: (newReturnPolicy.policyNumber ?? 1) + 1 }));
        }
    }, [newReturnPolicy.partialsAccepted]);

    const handleAdd = async () => {
        const errors = validateLabelerForm(
            {
                labelerId:          newPolicy.labelerId,
                labelerType:        newPolicy.labelerType ?? 'generic',
                averagePayPercent:  newPolicy.averagePayPercent,
                averageDaysToPay:   newPolicy.averageDaysToPay,
                manufacturerName:   newPolicy.manufacturerName,
                address1:           newPolicy.address1,
                address2:           newPolicy.address2,
                city:               newPolicy.city,
                state:              newPolicy.state,
                zip:                newPolicy.zip,
                mainContact:        newPolicy.mainContact,
                mainPhone:          newPolicy.mainPhone,
                fax:                newPolicy.fax,
                creditRequestEmail: newPolicy.creditRequestEmail,
                contact2Name:       newPolicy.contact2Name,
                contact2Phone:      newPolicy.contact2Phone,
                contact2Email:      newPolicy.contact2Email,
                notes:              newNote,
            },
            {
                destination:                    newReturnPolicy.destination,
                autoRaEmail:                    newReturnPolicy.autoRaEmail,
                policyNumber:                   newReturnPolicy.policyNumber,
                policyDescription:              newReturnPolicy.policyDescription,
                monthsBeforeExpiration:         newReturnPolicy.monthsBeforeExpiration,
                monthsAfterExpiration:          newReturnPolicy.monthsAfterExpiration,
                discountRate:                   newReturnPolicy.discountRate,
                partialsAccepted:               newReturnPolicy.partialsAccepted,
                reimbursementType:              newReturnPolicy.reimbursementType,
                returnableWithinPolicyPeriod:   newReturnPolicy.returnableWithinPolicyPeriod,
            },
            {
                policyNumber:                   partialPolicy.policyNumber,
                policyDescription:              partialPolicy.policyDescription,
                monthsBeforeExpiration:         partialPolicy.monthsBeforeExpiration,
                monthsAfterExpiration:          partialPolicy.monthsAfterExpiration,
                returnableWithinPolicyPeriod:   partialPolicy.returnableWithinPolicyPeriod,
            },
            { validDestinations: reverseDistributors.map(d => d.name) },
        );

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            showToast(Object.values(errors)[0]!, 'error');
            return;
        }
        setFormErrors({});

        // Normalise before sending to API
        const normalised = normaliseLabelerPayload({
            labelerId:          newPolicy.labelerId,
            labelerType:        newPolicy.labelerType ?? 'generic',
            averagePayPercent:  newPolicy.averagePayPercent,
            averageDaysToPay:   newPolicy.averageDaysToPay,
            manufacturerName:   newPolicy.manufacturerName,
            address1:           newPolicy.address1,
            address2:           newPolicy.address2,
            city:               newPolicy.city,
            state:              newPolicy.state,
            zip:                newPolicy.zip,
            mainContact:        newPolicy.mainContact,
            mainPhone:          newPolicy.mainPhone,
            fax:                newPolicy.fax,
            creditRequestEmail: newPolicy.creditRequestEmail,
            contact2Name:       newPolicy.contact2Name,
            contact2Phone:      newPolicy.contact2Phone,
            contact2Email:      newPolicy.contact2Email,
            notes:              newNote,
        });

        const result = await dispatch(createPolicy(normalised as ManufacturerPolicyCreatePayload));
        if (createPolicy.fulfilled.match(result)) {
            const createdId = result.payload?.id;

            if (createdId && newReturnPolicy.destination) {
                const rpPayload: ReturnPolicyCreatePayload = {
                    destination:                  newReturnPolicy.destination,
                    autoRaEmail:                  newReturnPolicy.autoRaEmail || undefined,
                    policyNumber:                 newReturnPolicy.policyNumber,
                    policyDescription:            newReturnPolicy.policyDescription || undefined,
                    monthsBeforeExpiration:       newReturnPolicy.monthsBeforeExpiration,
                    monthsAfterExpiration:        newReturnPolicy.monthsAfterExpiration,
                    discountRate:                 newReturnPolicy.discountRate != null ? roundDiscountRate(newReturnPolicy.discountRate) : undefined,
                    partialsAccepted:             false,
                    reimbursementType:            newReturnPolicy.reimbursementType as ReturnPolicyCreatePayload['reimbursementType'],
                    returnableWithinPolicyPeriod: newReturnPolicy.returnableWithinPolicyPeriod === 'standard',
                };
                const rpResult = await dispatch(addReturnPolicy({ policyId: createdId, payload: rpPayload }));
                if (addReturnPolicy.rejected.match(rpResult)) {
                    showToast((rpResult.payload as string) || 'Policy created but failed to save return info.', 'error');
                }

                if (newReturnPolicy.partialsAccepted) {
                    const partialPayload: ReturnPolicyCreatePayload = {
                        destination:                  newReturnPolicy.destination,
                        autoRaEmail:                  newReturnPolicy.autoRaEmail || undefined,
                        policyNumber:                 partialPolicy.policyNumber,
                        policyDescription:            partialPolicy.policyDescription || undefined,
                        monthsBeforeExpiration:       partialPolicy.monthsBeforeExpiration,
                        monthsAfterExpiration:        partialPolicy.monthsAfterExpiration,
                        discountRate:                 newReturnPolicy.discountRate != null ? roundDiscountRate(newReturnPolicy.discountRate) : undefined,
                        partialsAccepted:             true,
                        reimbursementType:            newReturnPolicy.reimbursementType as ReturnPolicyCreatePayload['reimbursementType'],
                        returnableWithinPolicyPeriod: partialPolicy.returnableWithinPolicyPeriod === 'standard',
                    };
                    const partialResult = await dispatch(addReturnPolicy({ policyId: createdId, payload: partialPayload }));
                    if (addReturnPolicy.rejected.match(partialResult)) {
                        showToast((partialResult.payload as string) || 'Main policy saved but partial policy failed.', 'error');
                    }
                }
            }

            if (createdId && newNote.trim()) {
                const notePayload: PolicyNotePayload = { noteText: newNote.trim() };
                await dispatch(addNote({ policyId: createdId, payload: notePayload }));
            }

            showToast(`Policy for ${newPolicy.manufacturerName} created!`);
            closeAddModal();
            dispatch(fetchPolicies({ page, limit: 10 }));
        } else {
            showToast(result.payload as string || 'Failed to create policy', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        const result = await dispatch(deletePolicy(deleteModal.id));
        if (deletePolicy.fulfilled.match(result)) {
            showToast(`Policy for ${deleteModal.manufacturerName} deleted.`);
            setDeleteModal(null);
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(null);
        }
    };

    const getDestinations = (p: ManufacturerPolicy) => {
        const dests = p.destinations || (p.returnPolicies || []).map(rp => rp.destination);
        return [...new Set(dests)];
    };

    const getDestBadgeVariant = (d: string): 'success' | 'info' | 'warning' | 'default' => {
        if (d === 'inmar') return 'success';
        if (d === 'qualanex') return 'info';
        if (d === 'pharmalink') return 'warning';
        return 'default';
    };

    return (
        <PermissionGate permission="policies">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-headline flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                        <Shield className="w-4 h-4 text-primary-600" /> Labeler Info
                    </h1>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Manage return policies, exceptions, and timing rules</p>
                </div>
                <button
                    onClick={() => { setAddModal(true); fetchReverseDistributors(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Labeler
                </button>
            </div>

            <div
                className="rounded-[4px] shadow px-3 py-2 border"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--outline)]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search manufacturer, labeler ID, email..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        />
                    </div>
                    <select
                        value={labelerType}
                        onChange={e => setLabelerType(e.target.value)}
                        className="px-2 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                    >
                        <option value="all">All Types</option>
                        <option value="generic">Generic</option>
                        <option value="brand">Brand</option>
                    </select>
                    <select
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        className="px-2 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                    >
                        <option value="all">All Destinations</option>
                        <option value="inmar">Inmar</option>
                        <option value="qualanex">Qualanex</option>
                        <option value="pharmalink">PharmaLink</option>
                    </select>
                </div>
            </div>

            <div
                className="rounded-[4px] shadow overflow-hidden border"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-red-600 text-xs">{error}</p>
                    </div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                        <Shield className="w-10 h-10 text-[var(--outline-variant)] mx-auto mb-2" />
                        <p className="text-[var(--on-surface-variant)] text-sm font-medium">No policies found</p>
                        <p className="text-[var(--outline)] text-xs mt-1">Add your first manufacturer policy to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Labeler ID</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Manufacturer</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Type</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Destinations</th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Partials</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Avg Pay %</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Avg Days</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {policies.map(p => {
                                    const dests = getDestinations(p);
                                    const hasPartials = (p.returnPolicies || []).some(rp => rp.partialsAccepted);
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => router.push(`/policies/${p.id}`)}
                                            className="hover:bg-[var(--surface-container)] cursor-pointer transition-colors"
                                            style={{ borderColor: 'var(--outline-variant)' }}
                                        >
                                            <td className="px-3 py-3 text-sm font-mono font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{p.labelerId}</td>
                                            <td className="px-3 py-3 text-sm max-w-[180px] truncate" style={{ color: 'var(--foreground)' }} title={p.manufacturerName}>{p.manufacturerName}</td>
                                            <td className="px-3 py-3">
                                                <Badge variant={p.labelerType === 'brand' ? 'info' : 'default'}>
                                                    <span className="text-[10px]">{p.labelerType === 'brand' ? 'Brand' : 'Generic'}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {dests.length > 0 ? dests.map(d => (
                                                        <Badge key={d} variant={getDestBadgeVariant(d)}><span className="text-[10px]">{d}</span></Badge>
                                                    )) : <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>—</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {hasPartials
                                                    ? <Badge variant="success"><span className="text-[10px]">Yes</span></Badge>
                                                    : <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No</span>}
                                            </td>
                                            <td className="px-3 py-3 text-right text-sm whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                {p.averagePayPercent != null ? `${p.averagePayPercent}%` : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-sm whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                {p.averageDaysToPay != null ? p.averageDaysToPay : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteModal(p); }}
                                                    className="p-1 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                                                    style={{ color: 'var(--on-surface-variant)' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div
                        className="flex items-center justify-between px-3 py-2 border-t"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                    >
                        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                            {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                        <div className="flex items-center gap-1">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-low)] disabled:opacity-40">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs px-1" style={{ color: 'var(--on-surface-variant)' }}>Page {page} of {pagination.totalPages}</span>
                            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-low)] disabled:opacity-40">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Labeler Modal ─────────────────────────────────────── */}
            {addModal && (
                <div
                    className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                    onClick={closeAddModal}
                    role="presentation"
                >
                    <div
                        className="rounded-[4px] max-w-3xl w-full shadow-xl max-h-[92vh] flex flex-col border min-h-0 my-auto"
                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-labeler-modal-title"
                    >
                        {/* Header */}
                        <div
                            className="px-4 py-3 flex-shrink-0 border-b flex items-center justify-between gap-2"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: 'var(--surface-container-high)' }}
                                >
                                    <Shield className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="add-labeler-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                                        Add labeler
                                    </h2>
                                    <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                        Master contact info and optional return policy details
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="p-1 rounded-[4px] hover:bg-primary-50/40 cursor-pointer shrink-0"
                                style={{ color: 'var(--outline)' }}
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">

                            {/* Row 1: Labeler ID / Type / Avg Pay % / Avg Days */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* Labeler ID */}
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">
                                        Labeler ID <span className="text-red-500">*</span>
                                        <span className="ml-1 text-[10px] text-[var(--outline)] font-normal">max 10 chars</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPolicy.labelerId}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, labelerId: e.target.value });
                                            validateOnChange('labelerId', e.target.value);
                                        }}
                                        placeholder="e.g. 00032"
                                        maxLength={10}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.labelerId)}`}
                                    />
                                    {formErrors.labelerId
                                        ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.labelerId}</p>
                                        : newPolicy.labelerId.length > 0 && <p className="text-[10px] text-[var(--outline)] mt-0.5">{newPolicy.labelerId.length}/10</p>
                                    }
                                </div>

                                {/* Labeler Type */}
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">
                                        Labeler Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newPolicy.labelerType || 'generic'}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, labelerType: e.target.value as ManufacturerPolicyCreatePayload['labelerType'] });
                                            validateOnChange('labelerType', e.target.value);
                                        }}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.labelerType)}`}
                                    >
                                        {LABELER_TYPES.map(t => (
                                            <option key={t} value={t}>{LABELER_TYPE_LABELS[t]}</option>
                                        ))}
                                    </select>
                                    {formErrors.labelerType && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.labelerType}</p>}
                                </div>

                                {/* Average Pay Percent */}
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Average Pay Percent</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={newPolicy.averagePayPercent ?? ''}
                                            onChange={e => {
                                                const v = e.target.value ? parseFloat(e.target.value) : undefined;
                                                setNewPolicy({ ...newPolicy, averagePayPercent: v });
                                                validateOnChange('averagePayPercent', v ?? null);
                                            }}
                                            placeholder="0–100"
                                            className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.averagePayPercent)}`}
                                        />
                                        <span className="text-xs text-[var(--on-surface-variant)]">%</span>
                                    </div>
                                    {formErrors.averagePayPercent && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.averagePayPercent}</p>}
                                </div>

                                {/* Average Days to Pay */}
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Average Days to Pay</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="9999"
                                        value={newPolicy.averageDaysToPay ?? ''}
                                        onChange={e => {
                                            const v = e.target.value ? parseInt(e.target.value) : undefined;
                                            setNewPolicy({ ...newPolicy, averageDaysToPay: v });
                                            validateOnChange('averageDaysToPay', v ?? null);
                                        }}
                                        placeholder="e.g. 297"
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.averageDaysToPay)}`}
                                    />
                                    {formErrors.averageDaysToPay && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.averageDaysToPay}</p>}
                                </div>
                            </div>

                            {/* Labeler Name */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">
                                    Labeler Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newPolicy.manufacturerName}
                                    onChange={e => {
                                        setNewPolicy({ ...newPolicy, manufacturerName: e.target.value });
                                        validateOnChange('manufacturerName', e.target.value);
                                    }}
                                    placeholder="e.g. AbbVie Inc."
                                    className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.manufacturerName)}`}
                                />
                                {formErrors.manufacturerName && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.manufacturerName}</p>}
                            </div>

                            {/* Address 1 / Address 2 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Address 1</label>
                                    <input
                                        type="text"
                                        value={newPolicy.address1 || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, address1: e.target.value });
                                            validateOnChange('address1', e.target.value);
                                        }}
                                        maxLength={150}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.address1)}`}
                                    />
                                    {formErrors.address1 && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.address1}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Address 2</label>
                                    <input
                                        type="text"
                                        value={newPolicy.address2 || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, address2: e.target.value });
                                            validateOnChange('address2', e.target.value);
                                        }}
                                        maxLength={150}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.address2)}`}
                                    />
                                    {formErrors.address2 && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.address2}</p>}
                                </div>
                            </div>

                            {/* City / State / Zip */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">City</label>
                                    <input
                                        type="text"
                                        value={newPolicy.city || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, city: e.target.value });
                                            validateOnChange('city', e.target.value);
                                        }}
                                        maxLength={100}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.city)}`}
                                    />
                                    {formErrors.city && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.city}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">State</label>
                                    <select
                                        value={newPolicy.state || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, state: e.target.value });
                                            validateOnChange('state', e.target.value);
                                        }}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.state)}`}
                                    >
                                        <option value="">Select</option>
                                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {formErrors.state && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.state}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">ZIP</label>
                                    <input
                                        type="text"
                                        value={newPolicy.zip || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, zip: e.target.value });
                                            validateOnChange('zip', e.target.value);
                                        }}
                                        placeholder="e.g. 12345 or 12345-6789"
                                        maxLength={10}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.zip)}`}
                                    />
                                    {formErrors.zip && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.zip}</p>}
                                </div>
                            </div>

                            {/* Main Contact / Main Phone / Fax */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Main Contact</label>
                                    <input
                                        type="text"
                                        value={newPolicy.mainContact || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, mainContact: e.target.value });
                                            validateOnChange('mainContact', e.target.value);
                                        }}
                                        maxLength={100}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.mainContact)}`}
                                    />
                                    {formErrors.mainContact && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.mainContact}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Main Phone</label>
                                    <input
                                        type="text"
                                        value={newPolicy.mainPhone || ''}
                                        onChange={e => {
                                            const v = e.target.value.replace(/[a-zA-Z]/g, '');
                                            setNewPolicy({ ...newPolicy, mainPhone: v });
                                            validateOnChange('mainPhone', v);
                                        }}
                                        placeholder="e.g. (800) 255-5162"
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.mainPhone)}`}
                                    />
                                    {formErrors.mainPhone && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.mainPhone}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Fax</label>
                                    <input
                                        type="text"
                                        value={newPolicy.fax || ''}
                                        onChange={e => {
                                            const v = e.target.value.replace(/[a-zA-Z]/g, '');
                                            setNewPolicy({ ...newPolicy, fax: v });
                                            validateOnChange('fax', v);
                                        }}
                                        placeholder="e.g. (800) 255-5163"
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.fax)}`}
                                    />
                                    {formErrors.fax && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.fax}</p>}
                                </div>
                            </div>

                            {/* Credit Request Email */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Credit Request E-Mail</label>
                                <input
                                    type="email"
                                    value={newPolicy.creditRequestEmail || ''}
                                    onChange={e => {
                                        setNewPolicy({ ...newPolicy, creditRequestEmail: e.target.value });
                                        validateOnChange('creditRequestEmail', e.target.value);
                                    }}
                                    placeholder="e.g. holli.rein@abbvie.com"
                                    className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.creditRequestEmail)}`}
                                />
                                {formErrors.creditRequestEmail && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.creditRequestEmail}</p>}
                            </div>

                            {/* Contact 2 / Phone 2 / Email 2 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Contact 2</label>
                                    <input
                                        type="text"
                                        value={newPolicy.contact2Name || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, contact2Name: e.target.value });
                                            validateOnChange('contact2Name', e.target.value);
                                        }}
                                        maxLength={100}
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.contact2Name)}`}
                                    />
                                    {formErrors.contact2Name && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.contact2Name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Phone 2</label>
                                    <input
                                        type="text"
                                        value={newPolicy.contact2Phone || ''}
                                        onChange={e => {
                                            const v = e.target.value.replace(/[a-zA-Z]/g, '');
                                            setNewPolicy({ ...newPolicy, contact2Phone: v });
                                            validateOnChange('contact2Phone', v);
                                        }}
                                        placeholder="e.g. (800) 255-5162"
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.contact2Phone)}`}
                                    />
                                    {formErrors.contact2Phone && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.contact2Phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">E-Mail 2</label>
                                    <input
                                        type="email"
                                        value={newPolicy.contact2Email || ''}
                                        onChange={e => {
                                            setNewPolicy({ ...newPolicy, contact2Email: e.target.value });
                                            validateOnChange('contact2Email', e.target.value);
                                        }}
                                        placeholder="e.g. gpopharm@abbvie.com"
                                        className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.contact2Email)}`}
                                    />
                                    {formErrors.contact2Email && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.contact2Email}</p>}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--on-surface)] mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    value={newNote}
                                    onChange={e => {
                                        setNewNote(e.target.value);
                                        validateOnChange('notes', e.target.value);
                                    }}
                                    placeholder="e.g. 1/18/2022 - SB - norvir tricor humira creon depakote kaletra no credit per policy 1% synthroid credit if mfg s/dated"
                                    className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 resize-none ${errClass(!!formErrors.notes)}`}
                                />
                                {formErrors.notes && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.notes}</p>}
                            </div>

                            {/* ── Labeler Return Information ─────────────── */}
                            <div
                                className="rounded-[4px] p-4 space-y-3 border-l-4 border border-solid"
                                style={{
                                    backgroundColor: 'var(--surface-container-low)',
                                    borderColor: 'var(--outline-variant)',
                                    borderLeftColor: 'var(--secondary)',
                                }}
                            >
                                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                                    Labeler Return Information
                                </h3>

                                {/* Destination / Auto RA Email */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Destination</label>
                                        <div className="relative">
                                            <select
                                                value={newReturnPolicy.destination}
                                                onChange={e => {
                                                    setNewReturnPolicy({ ...newReturnPolicy, destination: e.target.value });
                                                    validateOnChange('destination', e.target.value);
                                                }}
                                                className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.destination)}`}
                                                style={{ backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' }}
                                            >
                                                <option value="">
                                                    {loadingDistributors ? 'Loading...' : 'Select'}
                                                </option>
                                                {reverseDistributors.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                            {loadingDistributors && (
                                                <Loader2 className="w-3 h-3 animate-spin absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--outline)' }} />
                                            )}
                                        </div>
                                        {formErrors.destination && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.destination}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                            Auto RA E-Mail
                                        </label>
                                        <input
                                            type="email"
                                            value={newReturnPolicy.autoRaEmail}
                                            onChange={e => {
                                                setNewReturnPolicy({ ...newReturnPolicy, autoRaEmail: e.target.value });
                                                validateOnChange('autoRaEmail', e.target.value);
                                            }}
                                            placeholder="e.g. returns@inmar.com"
                                            className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.autoRaEmail)}`}
                                            style={!formErrors.autoRaEmail ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        />
                                        {formErrors.autoRaEmail && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.autoRaEmail}</p>}
                                    </div>
                                </div>

                                {/* Policy # / Policy Description */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Policy #</label>
                                        <input
                                            type="number"
                                            readOnly
                                            value={1}
                                            className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border cursor-not-allowed"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Policy Description</label>
                                        <input
                                            type="text"
                                            value={newReturnPolicy.policyDescription}
                                            onChange={e => {
                                                setNewReturnPolicy({ ...newReturnPolicy, policyDescription: e.target.value });
                                                validateOnChange('policyDescription', e.target.value);
                                            }}
                                            placeholder="e.g. 6 Months Prior to 12 Months Post Drug Expiration"
                                            maxLength={500}
                                            className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.policyDescription)}`}
                                            style={!formErrors.policyDescription ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        />
                                        {formErrors.policyDescription && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.policyDescription}</p>}
                                    </div>
                                </div>

                                {/* Months Before / After Expiration */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                            Months Before Expiration <span className="text-red-500">*</span>
                                            <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>whole number</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="999"
                                            step="1"
                                            value={newReturnPolicy.monthsBeforeExpiration ?? ''}
                                            onChange={e => {
                                                const v = e.target.value ? parseInt(e.target.value) : undefined;
                                                setNewReturnPolicy({ ...newReturnPolicy, monthsBeforeExpiration: v });
                                                validateOnChange('monthsBeforeExpiration', v ?? null);
                                            }}
                                            placeholder="e.g. 6"
                                            className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.monthsBeforeExpiration)}`}
                                            style={!formErrors.monthsBeforeExpiration ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        />
                                        {formErrors.monthsBeforeExpiration
                                            ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.monthsBeforeExpiration}</p>
                                            : <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>How many months before expiry the item is returnable</p>
                                        }
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                            Months After Expiration <span className="text-red-500">*</span>
                                            <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>whole number</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="999"
                                            step="1"
                                            value={newReturnPolicy.monthsAfterExpiration ?? ''}
                                            onChange={e => {
                                                const v = e.target.value ? parseInt(e.target.value) : undefined;
                                                setNewReturnPolicy({ ...newReturnPolicy, monthsAfterExpiration: v });
                                                validateOnChange('monthsAfterExpiration', v ?? null);
                                            }}
                                            placeholder="e.g. 12"
                                            className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.monthsAfterExpiration)}`}
                                            style={!formErrors.monthsAfterExpiration ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        />
                                        {formErrors.monthsAfterExpiration
                                            ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.monthsAfterExpiration}</p>
                                            : <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>How many months after expiry the item is still returnable</p>
                                        }
                                    </div>
                                </div>

                                {/* Discount Rate / Partials / Reimbursement */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                            Discount Rate
                                            <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>0–1 fraction</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            min="0"
                                            max="1"
                                            value={newReturnPolicy.discountRate ?? ''}
                                            onChange={e => {
                                                const v = e.target.value ? parseFloat(e.target.value) : undefined;
                                                setNewReturnPolicy({ ...newReturnPolicy, discountRate: v });
                                                validateOnChange('discountRate', v ?? null);
                                            }}
                                            placeholder="e.g. 0.30"
                                            className={`w-full px-2.5 py-1.5 text-xs border rounded-[4px] focus:outline-none focus:ring-2 ${errClass(!!formErrors.discountRate)}`}
                                            style={!formErrors.discountRate ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        />
                                        {formErrors.discountRate
                                            ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.discountRate}</p>
                                            : newReturnPolicy.discountRate != null && newReturnPolicy.discountRate >= 0 && newReturnPolicy.discountRate <= 1
                                                ? <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>= {(newReturnPolicy.discountRate * 100).toFixed(0)}%</p>
                                                : <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>e.g. 0.30 = 30%</p>
                                        }
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Partials?</label>
                                        <select
                                            value={newReturnPolicy.partialsAccepted ? 'yes' : 'no'}
                                            onChange={e => setNewReturnPolicy({ ...newReturnPolicy, partialsAccepted: e.target.value === 'yes' })}
                                            className="w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border"
                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' }}
                                        >
                                            <option value="yes">YES</option>
                                            <option value="no">NO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                            Reimbursement <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={newReturnPolicy.reimbursementType}
                                            onChange={e => {
                                                setNewReturnPolicy({ ...newReturnPolicy, reimbursementType: e.target.value });
                                                validateOnChange('reimbursementType', e.target.value);
                                            }}
                                            className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.reimbursementType)}`}
                                            style={!formErrors.reimbursementType ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                        >
                                            {REIMBURSEMENT_TYPES.map(t => (
                                                <option key={t} value={t}>{REIMBURSEMENT_TYPE_LABELS[t]}</option>
                                            ))}
                                        </select>
                                        {formErrors.reimbursementType && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.reimbursementType}</p>}
                                    </div>
                                </div>

                                {/* Return window mode */}
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                        Return window mode <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-[10px] mb-1 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                        Standard: returnable inside the months-before/after window (too early → Wine Cellar). Inverted: returnable outside that window; inside → Wine Cellar until the day after the window ends.
                                    </p>
                                    <select
                                        value={newReturnPolicy.returnableWithinPolicyPeriod}
                                        onChange={e => {
                                            setNewReturnPolicy({ ...newReturnPolicy, returnableWithinPolicyPeriod: e.target.value });
                                            validateOnChange('returnableWithinPolicyPeriod', e.target.value);
                                        }}
                                        className={`w-full max-w-xs px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.returnableWithinPolicyPeriod)}`}
                                        style={!formErrors.returnableWithinPolicyPeriod ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                    >
                                        {Object.entries(RETURN_WINDOW_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                    {formErrors.returnableWithinPolicyPeriod && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.returnableWithinPolicyPeriod}</p>}
                                </div>

                                {/* Partial Return Policy (conditional) */}
                                {newReturnPolicy.partialsAccepted && (
                                    <div
                                        className="rounded-[4px] p-3 space-y-3 border"
                                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                                    >
                                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                                            Partial Return Policy
                                        </h4>
                                        <p className="text-[10px] leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                            Configure separate policy details for partial returns
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Policy #</label>
                                                <input
                                                    type="number"
                                                    readOnly
                                                    value={partialPolicy.policyNumber ?? ''}
                                                    className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border cursor-not-allowed"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Policy Description</label>
                                                <input
                                                    type="text"
                                                    value={partialPolicy.policyDescription}
                                                    onChange={e => {
                                                        setPartialPolicy({ ...partialPolicy, policyDescription: e.target.value });
                                                        validateOnChange('partialPolicyDescription', e.target.value);
                                                    }}
                                                    placeholder="e.g. Partial returns accepted for tablets only"
                                                    maxLength={500}
                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.partialPolicyDescription)}`}
                                                    style={!formErrors.partialPolicyDescription ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                                />
                                                {formErrors.partialPolicyDescription && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.partialPolicyDescription}</p>}
                                            </div>
                                        </div>
                                        {/* Partial Months Before / After Expiration */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                                    Months Before Expiration <span className="text-red-500">*</span>
                                                    <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>whole number</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="999"
                                                    step="1"
                                                    value={partialPolicy.monthsBeforeExpiration ?? ''}
                                                    onChange={e => {
                                                        const v = e.target.value ? parseInt(e.target.value) : undefined;
                                                        setPartialPolicy({ ...partialPolicy, monthsBeforeExpiration: v });
                                                        validateOnChange('partialMonthsBeforeExpiration', v ?? null);
                                                    }}
                                                    placeholder="e.g. 6"
                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.partialMonthsBeforeExpiration)}`}
                                                    style={!formErrors.partialMonthsBeforeExpiration ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                                />
                                                {formErrors.partialMonthsBeforeExpiration
                                                    ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.partialMonthsBeforeExpiration}</p>
                                                    : <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>How many months before expiry the item is returnable</p>
                                                }
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
                                                    Months After Expiration <span className="text-red-500">*</span>
                                                    <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>whole number</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="999"
                                                    step="1"
                                                    value={partialPolicy.monthsAfterExpiration ?? ''}
                                                    onChange={e => {
                                                        const v = e.target.value ? parseInt(e.target.value) : undefined;
                                                        setPartialPolicy({ ...partialPolicy, monthsAfterExpiration: v });
                                                        validateOnChange('partialMonthsAfterExpiration', v ?? null);
                                                    }}
                                                    placeholder="e.g. 12"
                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.partialMonthsAfterExpiration)}`}
                                                    style={!formErrors.partialMonthsAfterExpiration ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                                />
                                                {formErrors.partialMonthsAfterExpiration
                                                    ? <p className="text-[10px] text-red-500 mt-0.5">{formErrors.partialMonthsAfterExpiration}</p>
                                                    : <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>How many months after expiry the item is still returnable</p>
                                                }
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>Return window mode</label>
                                            <select
                                                value={partialPolicy.returnableWithinPolicyPeriod}
                                                onChange={e => {
                                                    setPartialPolicy({ ...partialPolicy, returnableWithinPolicyPeriod: e.target.value });
                                                    validateOnChange('partialReturnWindowMode', e.target.value);
                                                }}
                                                className={`w-full max-w-xs px-2.5 py-1.5 text-xs rounded-[4px] focus:outline-none focus:ring-2 border ${errClass(!!formErrors.partialReturnWindowMode)}`}
                                                style={!formErrors.partialReturnWindowMode ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--foreground)' } : undefined}
                                            >
                                                {Object.entries(RETURN_WINDOW_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val}>{label}</option>
                                                ))}
                                            </select>
                                            {formErrors.partialReturnWindowMode && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.partialReturnWindowMode}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="flex justify-end gap-2 px-4 py-3 border-t flex-shrink-0"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        >
                            <button
                                type="button"
                                onClick={closeAddModal}
                                className="px-3 py-1.5 text-xs font-medium bg-white border rounded-[4px] transition-colors hover:bg-primary-50/40 cursor-pointer"
                                style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={isActionLoading}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-[4px] disabled:opacity-50 transition-colors inline-flex items-center cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Creating...</> : 'Save labeler'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ──────────────────────────────────── */}
            {deleteModal && (
                <div
                    className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                    onClick={() => setDeleteModal(null)}
                >
                    <div
                        className="rounded-[4px] max-w-md w-full shadow-xl border"
                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <h2 className="font-heading text-body font-semibold" style={{ color: 'var(--foreground)' }}>Delete Policy</h2>
                            <button onClick={() => setDeleteModal(null)} style={{ color: 'var(--outline)' }}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p style={{ color: 'var(--on-surface-variant)' }}>
                                Delete policy for <strong>{deleteModal.manufacturerName}</strong> (Labeler: {deleteModal.labelerId})?
                                This will also remove all related return policies, exceptions, and notes.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={isActionLoading}>
                                {isActionLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </PermissionGate>
    );
}
