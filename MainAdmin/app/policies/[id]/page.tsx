'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Edit, Trash2, Plus, Shield,
    MapPin, Phone, Mail, CalendarDays, Clock, FileText,
    CheckCircle, Ban,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    fetchPolicyById,
    updatePolicy,
    deletePolicy,
    clearCurrentPolicy,
    addReturnPolicy,
    updateReturnPolicy,
    deleteReturnPolicy,
    addException,
    deleteException,
    addNote,
    deleteNote,
} from '@/lib/store/policiesSlice';
import {
    ReturnPolicyCreatePayload,
    ReturnPolicyRecord,
    NonReturnableProduct,
    PolicyNote,
    ManufacturerPolicyCreatePayload,
} from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────

function destBadge(d: string): 'success' | 'info' | 'warning' | 'default' {
    if (d === 'inmar') return 'success';
    if (d === 'qualanex') return 'info';
    if (d === 'pharmalink') return 'warning';
    return 'default';
}

// ── Page ───────────────────────────────────────────────────────

export default function PolicyDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const dispatch = useAppDispatch();
    const { currentPolicy: policy, isLoading, isActionLoading } = useAppSelector(s => s.policies);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = (msg: string, type: Toast['type'] = 'success') => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    // Modals
    const [editInfoModal, setEditInfoModal] = useState(false);
    const [editInfoForm, setEditInfoForm] = useState<Partial<ManufacturerPolicyCreatePayload>>({});

    const [addRPModal, setAddRPModal] = useState(false);
    const [editRPModal, setEditRPModal] = useState<ReturnPolicyRecord | null>(null);
    const [rpForm, setRpForm] = useState<ReturnPolicyCreatePayload>({
        destination: 'inmar',
        returnableWithinPolicyPeriod: true,
        partialsAccepted: false,
        reimbursementType: 'batch',
    });
    const [deleteRPModal, setDeleteRPModal] = useState<ReturnPolicyRecord | null>(null);

    const [addExcModal, setAddExcModal] = useState(false);
    const [excForm, setExcForm] = useState({ ndc: '', productName: '', reason: '' });
    const [deleteExcModal, setDeleteExcModal] = useState<NonReturnableProduct | null>(null);

    const [addNoteModal, setAddNoteModal] = useState(false);
    const [noteForm, setNoteForm] = useState({ noteText: '', authorInitials: '' });
    const [deleteNoteModal, setDeleteNoteModal] = useState<PolicyNote | null>(null);

    const [deleteModal, setDeleteModal] = useState(false);

    useEffect(() => {
        if (id) dispatch(fetchPolicyById(id));
        return () => { dispatch(clearCurrentPolicy()); };
    }, [dispatch, id]);

    const refresh = () => dispatch(fetchPolicyById(id));

    // ── Edit Info ──────────────────────────────────────────────

    useEffect(() => {
        if (editInfoModal && policy) {
            setEditInfoForm({
                labelerId: policy.labelerId,
                manufacturerName: policy.manufacturerName,
                labelerType: policy.labelerType,
                mainContact: policy.mainContact || '',
                mainPhone: policy.mainPhone || '',
                creditRequestEmail: policy.creditRequestEmail || '',
                address1: policy.address1 || '',
                city: policy.city || '',
                state: policy.state || '',
                zip: policy.zip || '',
                averagePayPercent: policy.averagePayPercent ?? undefined,
                averageDaysToPay: policy.averageDaysToPay ?? undefined,
            });
        }
    }, [editInfoModal, policy]);

    const handleSaveInfo = async () => {
        const result = await dispatch(updatePolicy({ id, payload: editInfoForm }));
        if (updatePolicy.fulfilled.match(result)) {
            showToast('Policy updated!');
            setEditInfoModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    // ── Return Policies ────────────────────────────────────────

    useEffect(() => {
        if (editRPModal) {
            setRpForm({
                destination: editRPModal.destination,
                policyDescription: editRPModal.policyDescription || '',
                monthsBeforeExpiration: editRPModal.monthsBeforeExpiration ?? undefined,
                monthsAfterExpiration: editRPModal.monthsAfterExpiration ?? undefined,
                discountRate: editRPModal.discountRate ?? undefined,
                partialsAccepted: editRPModal.partialsAccepted,
                reimbursementType: (editRPModal.reimbursementType as 'batch' | 'per_item') || undefined,
                autoRaEmail: editRPModal.autoRaEmail || '',
                policyNumber: editRPModal.policyNumber ?? undefined,
                returnableWithinPolicyPeriod: editRPModal.returnableWithinPolicyPeriod !== false,
            });
        }
    }, [editRPModal]);

    const handleSaveRP = async () => {
        if (editRPModal) {
            const result = await dispatch(updateReturnPolicy({ policyId: id, returnPolicyId: editRPModal.id, payload: rpForm }));
            if (updateReturnPolicy.fulfilled.match(result)) {
                showToast('Return policy updated!');
                setEditRPModal(null);
                refresh();
            } else showToast(result.payload as string || 'Failed', 'error');
        } else {
            const result = await dispatch(addReturnPolicy({ policyId: id, payload: rpForm }));
            if (addReturnPolicy.fulfilled.match(result)) {
                showToast('Return policy added!');
                setAddRPModal(false);
                setRpForm({
                    destination: 'inmar',
                    returnableWithinPolicyPeriod: true,
                    partialsAccepted: false,
                    reimbursementType: 'batch',
                });
                refresh();
            } else showToast(result.payload as string || 'Failed', 'error');
        }
    };

    const handleDeleteRP = async () => {
        if (!deleteRPModal) return;
        const result = await dispatch(deleteReturnPolicy({ policyId: id, returnPolicyId: deleteRPModal.id }));
        if (deleteReturnPolicy.fulfilled.match(result)) { showToast('Return policy deleted'); setDeleteRPModal(null); refresh(); }
        else { showToast(result.payload as string || 'Failed', 'error'); setDeleteRPModal(null); }
    };

    // ── Exceptions ─────────────────────────────────────────────

    const handleAddExc = async () => {
        if (!excForm.ndc.trim()) { showToast('NDC is required.', 'error'); return; }
        const result = await dispatch(addException({ policyId: id, payload: excForm }));
        if (addException.fulfilled.match(result)) {
            showToast('Exception added!');
            setAddExcModal(false);
            setExcForm({ ndc: '', productName: '', reason: '' });
            refresh();
        } else showToast(result.payload as string || 'Failed', 'error');
    };

    const handleDeleteExc = async () => {
        if (!deleteExcModal) return;
        const result = await dispatch(deleteException({ policyId: id, exceptionId: deleteExcModal.id }));
        if (deleteException.fulfilled.match(result)) { showToast('Exception deleted'); setDeleteExcModal(null); refresh(); }
        else { showToast(result.payload as string || 'Failed', 'error'); setDeleteExcModal(null); }
    };

    // ── Notes ──────────────────────────────────────────────────

    const handleAddNote = async () => {
        if (!noteForm.noteText.trim()) { showToast('Note text is required.', 'error'); return; }
        const result = await dispatch(addNote({ policyId: id, payload: noteForm }));
        if (addNote.fulfilled.match(result)) {
            showToast('Note added!');
            setAddNoteModal(false);
            setNoteForm({ noteText: '', authorInitials: '' });
            refresh();
        } else showToast(result.payload as string || 'Failed', 'error');
    };

    const handleDeleteNote = async () => {
        if (!deleteNoteModal) return;
        const result = await dispatch(deleteNote({ policyId: id, noteId: deleteNoteModal.id }));
        if (deleteNote.fulfilled.match(result)) { showToast('Note deleted'); setDeleteNoteModal(null); refresh(); }
        else { showToast(result.payload as string || 'Failed', 'error'); setDeleteNoteModal(null); }
    };

    // ── Delete Policy ──────────────────────────────────────────

    const handleDeletePolicy = async () => {
        const result = await dispatch(deletePolicy(id));
        if (deletePolicy.fulfilled.match(result)) {
            showToast('Policy deleted!');
            setTimeout(() => router.push('/policies'), 800);
        } else showToast(result.payload as string || 'Failed', 'error');
    };

    // ── Render ─────────────────────────────────────────────────

    if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary-600" /></div>;
    if (!policy) return (
        <div className="space-y-4">
            <button onClick={() => router.push('/policies')} className="flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--outline)' }}><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="border rounded-[4px] p-6 text-center" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--outline-variant)' }}>
                <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--error)' }} />
                <p className="font-medium" style={{ color: 'var(--on-error-container)' }}>Policy not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/policies')}>Go Back</Button>
            </div>
        </div>
    );

    const rps = policy.returnPolicies || [];
    const excs = policy.exceptions || [];
    const notes = policy.notes || [];

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Header */}
            <div>
                <button onClick={() => router.push('/policies')} className="flex items-center gap-1.5 text-xs mb-2 hover:underline" style={{ color: 'var(--outline)' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Policies
                </button>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="font-heading text-headline truncate" style={{ color: 'var(--foreground)' }}>{policy.manufacturerName}</h1>
                        <Badge variant={policy.labelerType === 'brand' ? 'info' : 'default'}>
                            <span className="text-[10px]">{policy.labelerType === 'brand' ? 'Brand' : 'Generic'}</span>
                        </Badge>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setEditInfoModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                            <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setDeleteModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', color: 'var(--error)' }}>
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Basic Info + Metrics ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-[4px] shadow p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}><Shield className="w-3.5 h-3.5" /> Policy Info</h2>
                    <dl className="space-y-1.5 text-xs">
                        <Row label="Labeler ID" value={<span className="font-mono font-semibold">{policy.labelerId}</span>} />
                        <Row label="Type" value={policy.labelerType === 'brand' ? 'Brand' : 'Generic'} />
                        {policy.mainContact && <Row label="Contact" value={<><Phone className="w-3 h-3 inline mr-1" />{policy.mainContact}{policy.mainPhone ? ` — ${policy.mainPhone}` : ''}</>} />}
                        {policy.creditRequestEmail && <Row label="Email" value={<><Mail className="w-3 h-3 inline mr-1" />{policy.creditRequestEmail}</>} />}
                        {(policy.address1 || policy.city) && <Row label="Address" value={<><MapPin className="w-3 h-3 inline mr-1" />{[policy.address1, policy.city, policy.state, policy.zip].filter(Boolean).join(', ')}</>} />}
                        {policy.verifiedDate && <Row label="Verified" value={formatDate(policy.verifiedDate)} />}
                    </dl>
                </div>

                <div className="rounded-[4px] shadow p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}><Clock className="w-3.5 h-3.5" /> Metrics</h2>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-[4px] px-3 py-2 text-center border" style={{ backgroundColor: 'var(--primary-fixed)', borderColor: 'var(--outline-variant)' }}>
                            <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Avg Pay %</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{policy.averagePayPercent != null ? `${policy.averagePayPercent}%` : '—'}</p>
                        </div>
                        <div className="rounded-[4px] px-3 py-2 text-center border" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                            <p className="text-xs font-medium" style={{ color: 'var(--on-secondary-container)' }}>Avg Days to Pay</p>
                            <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{policy.averageDaysToPay ?? '—'}</p>
                        </div>
                    </div>
                    <dl className="space-y-1.5 text-xs">
                        <Row label="Created" value={formatDate(policy.createdAt)} />
                        <Row label="Updated" value={formatDate(policy.updatedAt)} />
                    </dl>
                </div>
            </div>

            {/* ── Return Policies ───────────────────────────── */}
            <div className="rounded-[4px] shadow p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}><CheckCircle className="w-3.5 h-3.5" /> Return Policies ({rps.length})</h2>
                    <button onClick={() => { setRpForm({ destination: 'inmar', returnableWithinPolicyPeriod: true, partialsAccepted: false, reimbursementType: 'batch' }); setAddRPModal(true); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>
                {rps.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--on-surface-variant)' }}>No return policies defined yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Destination</th>
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Window</th>
                                <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Win. mode</th>
                                <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Partials</th>
                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Discount</th>
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Description</th>
                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                {rps.map(rp => (
                                    <tr key={rp.id} className="transition-colors hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                        <td className="px-3 py-3"><Badge variant={destBadge(rp.destination)}><span className="text-[10px]">{rp.destination}</span></Badge></td>
                                        <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface)' }}>{rp.monthsBeforeExpiration ?? '?'}mo before – {rp.monthsAfterExpiration ?? '?'}mo after</td>
                                        <td className="px-3 py-3 text-center">
                                            {rp.returnableWithinPolicyPeriod !== false ? (
                                                <Badge variant="success"><span className="text-[10px]">Standard</span></Badge>
                                            ) : (
                                                <Badge variant="warning"><span className="text-[10px]">Inverted</span></Badge>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">{rp.partialsAccepted ? <Badge variant="success"><span className="text-[10px]">Yes</span></Badge> : <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No</span>}</td>
                                        <td className="px-3 py-3 text-right text-sm" style={{ color: 'var(--on-surface)' }}>{rp.discountRate != null ? `${(rp.discountRate * 100).toFixed(0)}%` : '—'}</td>
                                        <td className="px-3 py-3 text-sm max-w-[160px] truncate" style={{ color: 'var(--on-surface-variant)' }} title={rp.policyDescription || ''}>{rp.policyDescription || '—'}</td>
                                        <td className="px-3 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button type="button" onClick={() => setEditRPModal(rp)} className="p-1 rounded transition-colors hover:bg-primary-50/40" style={{ color: 'var(--on-surface-variant)' }} title="Edit"><Edit className="w-3 h-3" /></button>
                                                <button type="button" onClick={() => setDeleteRPModal(rp)} className="p-1 rounded transition-colors hover:bg-primary-50/40" style={{ color: 'var(--on-surface-variant)' }} title="Delete"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Exceptions (Non-Returnable Products) ──────── */}
            <div className="rounded-[4px] shadow p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}><Ban className="w-3.5 h-3.5" /> Non-Returnable Exceptions ({excs.length})</h2>
                    <button onClick={() => setAddExcModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>
                {excs.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--on-surface-variant)' }}>No exceptions defined.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border" style={{ borderColor: 'var(--outline)' }}>
                            <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[var(--surface-container-low)]">
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">NDC</th>
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Product Name</th>
                                <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Reason</th>
                                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-[var(--on-surface-variant)]">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--outline)' }}>
                                {excs.map(e => (
                                    <tr key={e.id} className="transition-colors hover:bg-[var(--surface-container-low)]" style={{ borderColor: 'var(--outline)' }}>
                                        <td className="px-3 py-3 text-sm font-mono whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{e.ndc}</td>
                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{e.productName || '—'}</td>
                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{e.reason || '—'}</td>
                                        <td className="px-3 py-3 text-right">
                                            <button type="button" onClick={() => setDeleteExcModal(e)} className="p-1 rounded transition-colors hover:bg-primary-50/40 flex-shrink-0 inline-flex" style={{ color: 'var(--on-surface-variant)' }} title="Delete"><Trash2 className="w-3 h-3" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Notes ─────────────────────────────────────── */}
            <div className="rounded-[4px] shadow p-4 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)' }}><FileText className="w-3.5 h-3.5" /> Notes ({notes.length})</h2>
                    <button onClick={() => setAddNoteModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs transition-colors hover:bg-primary-50/40" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>
                {notes.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--on-surface-variant)' }}>No notes yet.</p>
                ) : (
                    <div className="space-y-2">
                        {notes.map(n => (
                            <div key={n.id} className="flex items-start gap-2 rounded-[4px] px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[10px] mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                                        <CalendarDays className="w-3 h-3" />
                                        {n.noteDate ? formatDate(n.noteDate) : formatDate(n.createdAt)}
                                        {n.authorInitials && <Badge variant="default"><span className="text-[10px]">{n.authorInitials}</span></Badge>}
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--on-surface)' }}>{n.noteText}</p>
                                </div>
                                <button type="button" onClick={() => setDeleteNoteModal(n)} className="p-1 rounded transition-colors hover:bg-primary-50/40 flex-shrink-0" style={{ color: 'var(--on-surface-variant)' }} title="Delete"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════ MODALS ════════════════════════════════════════════════════ */}

            {/* ── Edit Info Modal ──────────────────────────── */}
            {editInfoModal && <Modal title="Edit Policy" onClose={() => setEditInfoModal(false)}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <ModalField label="Labeler ID" value={editInfoForm.labelerId || ''} onChange={v => setEditInfoForm({ ...editInfoForm, labelerId: v })} />
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Type</label>
                            <select value={editInfoForm.labelerType || 'generic'} onChange={e => setEditInfoForm({ ...editInfoForm, labelerType: e.target.value as 'generic' | 'brand' })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                                <option value="generic">Generic</option><option value="brand">Brand</option>
                            </select>
                        </div>
                    </div>
                    <ModalField label="Manufacturer Name" value={editInfoForm.manufacturerName || ''} onChange={v => setEditInfoForm({ ...editInfoForm, manufacturerName: v })} />
                    <div className="grid grid-cols-2 gap-3">
                        <ModalField label="Contact" value={editInfoForm.mainContact || ''} onChange={v => setEditInfoForm({ ...editInfoForm, mainContact: v })} />
                        <ModalField label="Phone" value={editInfoForm.mainPhone || ''} onChange={v => setEditInfoForm({ ...editInfoForm, mainPhone: v })} />
                    </div>
                    <ModalField label="Email" value={editInfoForm.creditRequestEmail || ''} onChange={v => setEditInfoForm({ ...editInfoForm, creditRequestEmail: v })} />
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Avg Pay %</label>
                            <input type="number" step="0.1" value={editInfoForm.averagePayPercent ?? ''} onChange={e => setEditInfoForm({ ...editInfoForm, averagePayPercent: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
                        </div>
                        <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Avg Days</label>
                            <input type="number" value={editInfoForm.averageDaysToPay ?? ''} onChange={e => setEditInfoForm({ ...editInfoForm, averageDaysToPay: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
                        </div>
                    </div>
                </div>
                <ModalFooter onCancel={() => setEditInfoModal(false)} onConfirm={handleSaveInfo} loading={isActionLoading} label="Save" />
            </Modal>}

            {/* ── Add/Edit Return Policy Modal ──────────────── */}
            {(addRPModal || editRPModal) && <Modal title={editRPModal ? 'Edit Return Policy' : 'Add Return Policy'} onClose={() => { setAddRPModal(false); setEditRPModal(null); }}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Destination <span style={{ color: 'var(--error)' }}>*</span></label>
                            <select value={rpForm.destination} onChange={e => setRpForm({ ...rpForm, destination: e.target.value })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                                <option value="inmar">Inmar</option><option value="qualanex">Qualanex</option><option value="pharmalink">PharmaLink</option><option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Reimbursement Type</label>
                            <select value={rpForm.reimbursementType || ''} onChange={e => setRpForm({ ...rpForm, reimbursementType: (e.target.value || undefined) as any })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}>
                                <option value="">—</option><option value="batch">Batch</option><option value="per_item">Per Item</option>
                            </select>
                        </div>
                    </div>
                    <ModalField label="Description" value={rpForm.policyDescription || ''} onChange={v => setRpForm({ ...rpForm, policyDescription: v })} placeholder="e.g. 6 Months Prior to 12 Months Post" />
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Months Before Exp.</label>
                            <input type="number" min="0" value={rpForm.monthsBeforeExpiration ?? ''} onChange={e => setRpForm({ ...rpForm, monthsBeforeExpiration: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
                        </div>
                        <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Months After Exp.</label>
                            <input type="number" min="0" value={rpForm.monthsAfterExpiration ?? ''} onChange={e => setRpForm({ ...rpForm, monthsAfterExpiration: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>
                                Discount Rate
                                <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--on-surface-variant)' }}>0–1 fraction</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={rpForm.discountRate ?? ''}
                                onChange={e => setRpForm({ ...rpForm, discountRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder="e.g. 0.30"
                                className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 border focus:ring-primary-500"
                                style={{
                                    borderColor: rpForm.discountRate != null && (rpForm.discountRate < 0 || rpForm.discountRate > 1) ? 'var(--error)' : 'var(--outline-variant)',
                                    backgroundColor: 'var(--surface-container-lowest)',
                                    color: 'var(--on-surface)',
                                }}
                            />
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                                {rpForm.discountRate != null && rpForm.discountRate >= 0 && rpForm.discountRate <= 1
                                    ? `= ${(rpForm.discountRate * 100).toFixed(0)}%`
                                    : rpForm.discountRate != null
                                        ? '⚠ Must be 0–1 (e.g. 0.30 for 30%)'
                                        : 'e.g. 0.30 = 30%'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Return window mode</label>
                        <p className="text-[10px] mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>Standard: returnable inside the window. Inverted: returnable outside the window; dates inside the window go to Wine Cellar until the day after the window ends.</p>
                        <select
                            value={rpForm.returnableWithinPolicyPeriod !== false ? 'yes' : 'no'}
                            onChange={e => setRpForm({ ...rpForm, returnableWithinPolicyPeriod: e.target.value === 'yes' })}
                            className="w-full max-w-md px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                        >
                            <option value="yes">Standard — returnable in window</option>
                            <option value="no">Inverted — Wine Cellar in window</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--on-surface)' }}>
                            <input type="checkbox" checked={rpForm.partialsAccepted ?? false} onChange={e => setRpForm({ ...rpForm, partialsAccepted: e.target.checked })} className="rounded border text-primary-600 focus:ring-primary-500" style={{ borderColor: 'var(--outline-variant)' }} />
                            <span>Partials Accepted</span>
                        </label>
                    </div>
                    <ModalField label="Auto RA Email" value={rpForm.autoRaEmail || ''} onChange={v => setRpForm({ ...rpForm, autoRaEmail: v })} placeholder="ra-returns@manufacturer.com" />
                </div>
                <ModalFooter onCancel={() => { setAddRPModal(false); setEditRPModal(null); }} onConfirm={handleSaveRP} loading={isActionLoading} label={editRPModal ? 'Save' : 'Add'} />
            </Modal>}

            {/* ── Delete Return Policy Modal ────────────────── */}
            {deleteRPModal && <ConfirmModal title="Delete Return Policy" message={`Delete the ${deleteRPModal.destination} return policy?`} onCancel={() => setDeleteRPModal(null)} onConfirm={handleDeleteRP} loading={isActionLoading} />}

            {/* ── Add Exception Modal ──────────────────────── */}
            {addExcModal && <Modal title="Add Non-Returnable Exception" onClose={() => setAddExcModal(false)}>
                <div className="space-y-3">
                    <ModalField label="NDC" value={excForm.ndc} onChange={v => setExcForm({ ...excForm, ndc: v })} placeholder="e.g. 43547-3250-06" required />
                    <ModalField label="Product Name" value={excForm.productName} onChange={v => setExcForm({ ...excForm, productName: v })} placeholder="Optional product name" />
                    <ModalField label="Reason" value={excForm.reason} onChange={v => setExcForm({ ...excForm, reason: v })} placeholder="Why is this non-returnable?" />
                </div>
                <ModalFooter onCancel={() => setAddExcModal(false)} onConfirm={handleAddExc} loading={isActionLoading} label="Add Exception" />
            </Modal>}

            {/* ── Delete Exception Modal ────────────────────── */}
            {deleteExcModal && <ConfirmModal title="Delete Exception" message={`Remove exception for NDC ${deleteExcModal.ndc}?`} onCancel={() => setDeleteExcModal(null)} onConfirm={handleDeleteExc} loading={isActionLoading} />}

            {/* ── Add Note Modal ───────────────────────────── */}
            {addNoteModal && <Modal title="Add Note" onClose={() => setAddNoteModal(false)}>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Note <span style={{ color: 'var(--error)' }}>*</span></label>
                        <textarea value={noteForm.noteText} onChange={e => setNoteForm({ ...noteForm, noteText: e.target.value })} rows={3} placeholder="Enter note..." className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
                    </div>
                    <ModalField label="Author Initials" value={noteForm.authorInitials} onChange={v => setNoteForm({ ...noteForm, authorInitials: v })} placeholder="e.g. JD" />
                </div>
                <ModalFooter onCancel={() => setAddNoteModal(false)} onConfirm={handleAddNote} loading={isActionLoading} label="Add Note" />
            </Modal>}

            {/* ── Delete Note Modal ─────────────────────────── */}
            {deleteNoteModal && <ConfirmModal title="Delete Note" message="Delete this note?" onCancel={() => setDeleteNoteModal(null)} onConfirm={handleDeleteNote} loading={isActionLoading} />}

            {/* ── Delete Policy Modal ──────────────────────── */}
            {deleteModal && <ConfirmModal title="Delete Policy" message={`Delete the entire policy for ${policy.manufacturerName}? This will remove all return policies, exceptions, and notes.`} onCancel={() => setDeleteModal(false)} onConfirm={handleDeletePolicy} loading={isActionLoading} />}
        </div>
    );
}

// ── Reusable mini-components ───────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="flex-shrink-0 text-xs" style={{ color: 'var(--on-surface-variant)' }}>{label}</dt>
            <dd className="text-right text-xs" style={{ color: 'var(--foreground)' }}>{value}</dd>
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 50%, transparent)' }} onClick={onClose}>
            <div className="rounded-[4px] max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                    <h2 className="font-heading text-body font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h2>
                    <button type="button" onClick={onClose} className="rounded p-0.5 transition-colors hover:bg-primary-50/40" style={{ color: 'var(--on-surface-variant)' }} aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function ModalField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>{label} {required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 text-sm rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }} />
        </div>
    );
}

function ModalFooter({ onCancel, onConfirm, loading, label }: { onCancel: () => void; onConfirm: () => void; loading: boolean; label: string }) {
    return (
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={onConfirm} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Processing...</> : label}
            </Button>
        </div>
    );
}

function ConfirmModal({ title, message, onCancel, onConfirm, loading }: { title: string; message: string; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
    return (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 50%, transparent)' }} onClick={onCancel}>
            <div className="rounded-[4px] max-w-md w-full shadow-xl border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                    <h2 className="font-heading text-body font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h2>
                    <button type="button" onClick={onCancel} className="rounded p-0.5 transition-colors hover:bg-primary-50/40" style={{ color: 'var(--on-surface-variant)' }} aria-label="Close"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6"><p style={{ color: 'var(--on-surface)' }}>{message}</p></div>
                <div className="flex justify-end gap-2 p-5 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Deleting...</> : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
