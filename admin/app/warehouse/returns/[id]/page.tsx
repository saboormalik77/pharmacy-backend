'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, UserCog, Package, Truck, Clock,
    Plus, Search, ScanLine, Archive, FileText, Download, AlertTriangle, Printer, QrCode,
    ChevronLeft, ChevronRight, DollarSign,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useReturnEditProtection } from '@/hooks/useReturnLockStatus';
import {
    fetchReturnTransactionById,
    updateReturnTransaction,
    pauseReturnTransaction,
    resumeReturnTransaction,
    completeReturnTransaction,
    deleteReturnTransaction,
    clearCurrentTransaction,
    fetchTransactionItems,
    deleteTransactionItem,
    updateTransactionItem,
    moveItemToWineCellar,
    clearItems,
} from '@/lib/store/returnTransactionsSlice';
import { unassignSingleReturn } from '@/lib/store/batchSlice';
import { ReturnTransaction, ReturnTransactionItem, WineCellarItem } from '@/lib/types';
import { apiClient } from '@/lib/api/apiClient';
import {
    formatPartialReturnDetail,
    formatUnitsReturnedForForm,
    getPackageKindFromUnits,
    getReturnItemPackageKind,
    getReturnItemUnitsReturned,
} from '@/lib/utils/returnItemQuantity';
import {
    NON_RETURNABLE_REASONS,
    formatNonReturnableReason,
    isValidNonReturnableReason,
} from '@/lib/constants/nonReturnableReasons';

/** Products table on return detail — rows per page */
const RETURN_DETAIL_ITEMS_PAGE_SIZE = 10;

// ── Helpers ────────────────────────────────────────────────────

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'in_progress': return { variant: 'info', label: 'In Progress' };
        case 'paused': return { variant: 'warning', label: 'Paused' };
        case 'completed': return { variant: 'success', label: 'Completed' };
        case 'finalized': return { variant: 'default', label: 'Finalized' };
        case 'received': return { variant: 'success', label: 'Received' };
        case 'closed_out': return { variant: 'default', label: 'Closed Out' };
        default: return { variant: 'default', label: status };
    }
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Label left / value right — matches General Information and other detail cards */
function ReturnTransactionStoreAndProcessorDl({
    tx,
    variant,
    onPrintAllShippingLabels,
    onPrintShippingLabel,
}: {
    tx: ReturnTransaction;
    variant: 'plain' | 'emerald';
    onPrintAllShippingLabels?: () => void;
    onPrintShippingLabel?: (packageNumber: number) => void;
}) {
    const emerald = variant === 'emerald';
    const dlCls = emerald ? 'space-y-2.5' : 'space-y-1.5';
    const labelCls = emerald ? 'text-xs text-emerald-700 font-medium' : 'text-[11px] text-gray-500';
    const valueCls = emerald ? 'text-xs font-bold text-gray-800' : 'text-[11px] font-medium text-gray-900';
    const rowCls = emerald ? 'flex justify-between items-center gap-2' : 'flex justify-between gap-2';
    const valueWrap = `${valueCls} text-right min-w-0 break-words max-w-[65%]`;

    const cityState = [tx.pharmacyCity, tx.pharmacyState].filter(Boolean).join(', ');
    const serviceLabel = tx.serviceType
        ? tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '—';

    return (
        <dl className={dlCls}>
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Store Name</dt>
                <dd className={valueWrap}>{tx.pharmacyName || '—'}</dd>
            </div>
            {tx.storeNumber ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`}>Store #</dt>
                    <dd className={`${valueCls} text-right`}>{tx.storeNumber}</dd>
                </div>
            ) : null}
            {tx.pharmacyStreetAddress ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`}>Address</dt>
                    <dd className={valueWrap}>{tx.pharmacyStreetAddress}</dd>
                </div>
            ) : null}
            {cityState ? (
                <div className={emerald ? 'flex justify-between items-start gap-2' : 'flex justify-between gap-2 items-start'}>
                    <dt className={`${labelCls} shrink-0`}>City / State</dt>
                    <dd className={valueWrap}>{cityState}</dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Service Type</dt>
                <dd className={`${valueCls} text-right min-w-0`}>{serviceLabel}</dd>
            </div>
            {tx.pharmacyLastVisitDate ? (
                <div className={rowCls}>
                    <dt className={`${labelCls} shrink-0`}>Last Visit</dt>
                    <dd className={`${valueCls} text-right`}>
                        {new Date(tx.pharmacyLastVisitDate).toLocaleDateString()}
                    </dd>
                </div>
            ) : null}
            <div className={rowCls}>
                <dt className={`${labelCls} shrink-0`}>Processor</dt>
                <dd className={`${valueCls} flex items-center gap-1 justify-end ${emerald ? 'font-semibold' : ''}`}>
                    <UserCog className={emerald ? 'w-3.5 h-3.5 text-emerald-500 flex-shrink-0' : 'w-3 h-3 text-gray-400 flex-shrink-0'} />
                    {tx.processorName || '—'}
                </dd>
            </div>
            
            {/* Shipping Details */}
            {(tx.fedexTracking || tx.fedexPickupConfirmation || tx.fedexShipmentId) && (
                <>
                    <div className={`pt-2 border-t ${emerald ? 'border-emerald-200' : 'border-gray-100'}`} />
                    {/* {tx.fedexTracking && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>FedEx Tracking</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexTracking}</dd>
                        </div>
                    )} */}
                    {tx.fedexPickupConfirmation && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>Pickup Confirmation</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexPickupConfirmation}</dd>
                        </div>
                    )}
                    {/* {tx.fedexShipmentId && (
                        <div className={rowCls}>
                            <dt className={`${labelCls} shrink-0`}>Shipment ID</dt>
                            <dd className={`${valueCls} text-right font-mono`}>{tx.fedexShipmentId}</dd>
                        </div>
                    )} */}
                </>
            )}
            
            {/* Package Tracking with Print Labels */}
            {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                    <dt className={`${labelCls} mb-1 flex items-center justify-between`}>
                        <span>Package Tracking</span>
                        {onPrintAllShippingLabels ? (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onPrintAllShippingLabels()}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors"
                                    title="Print all shipping labels"
                                >
                                    <Printer className="w-3 h-3" />
                                    Print All Labels
                                </button>
                            </div>
                        ) : null}
                    </dt>
                    <dd className="space-y-1.5 mt-1">
                        {Object.entries(tx.packageTracking)
                            .filter(([, v]) => v)
                            .map(([key, val], idx) => {
                                const displayKey = key.startsWith('package')
                                    ? key.replace(/([0-9]+)/, ' $1')
                                    : `Package ${key}`;
                                return (
                                    <div key={key} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 capitalize">{displayKey}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-gray-900">{val}</span>
                                            {onPrintShippingLabel ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onPrintShippingLabel(idx + 1)}
                                                    className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors"
                                                    title={`Print shipping label for ${val}`}
                                                >
                                                    <Printer className="w-3 h-3" />
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </dd>
                </div>
            )}

            {/* FedEx Labels */}
            {tx.fedexLabels && Object.keys(tx.fedexLabels).length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                    <dt className={`${labelCls} mb-1 flex items-center gap-1`}><Printer className="w-3.5 h-3.5" /> Shipping Labels</dt>
                    <dd className="flex flex-wrap gap-2">
                        {Object.keys(tx.fedexLabels).map((key) => {
                            const num = key.replace('package', '');
                            return (
                                <a
                                    key={key}
                                    href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${num}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded border border-gray-200 transition-colors"
                                >
                                    <Download className="w-3 h-3" /> Label {num}
                                </a>
                            );
                        })}
                    </dd>
                </div>
            )}
        </dl>
    );
}

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return true; // Notes always editable; field-level control in the modal
        case 'delete': return !['finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out'].includes(tx.status);
        default: return false;
    }
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const dispatch = useAppDispatch();
    const { currentTransaction: tx, isLoading, isActionLoading, error } = useAppSelector(
        (state) => state.returnTransactions
    );

    const { items, itemsPagination, itemsSummary, isItemsLoading, isItemActionLoading } = useAppSelector(
        (state) => state.returnTransactions
    );

    const currentUser = useAppSelector((state) => state.auth.user);
    const isProcessor = currentUser?.role === 'processor';

    // Always navigate to returns list page
    const handleBackNavigation = () => {
        router.push('/warehouse/returns');
    };

    // Return lock status protection (granular)
    const {
        isLocked: hookIsLocked,
        canEditCoreData: hookCanEditCoreData,
        canEditClassification: hookCanEditClassification,
        canEditNotes: hookCanEditNotes,
        canAddDeleteItems: hookCanAddDeleteItems,
        checkActionAllowed,
        getDisabledState,
        lockReason,
        error: lockError,
    } = useReturnEditProtection(id);
    
    // Fallback lock check based on status (in case API fails)
    const statusBasedLocked = tx ? ['finalized', 'scanning', 'received', 'verified', 'closed', 'closed_out'].includes(tx.status) : false;
    
    const isLocked = hookIsLocked || statusBasedLocked;
    const canEditCoreData = hookCanEditCoreData && !statusBasedLocked;
    const canEditClassification = hookCanEditClassification;
    const canEditNotes = hookCanEditNotes;
    const canAddDeleteItems = hookCanAddDeleteItems && !statusBasedLocked;
    // canEdit = can edit everything (unlocked state)
    const canEdit = canEditCoreData;
    
    // Helper to check action and show toast if blocked
    const checkActionWithToast = (actionName: string, action: () => void) => {
        if (canEdit && (checkActionAllowed(actionName) || !isLocked)) {
            action();
        } else {
            showToast(`Cannot ${actionName}. Return is locked after finalization.`, 'error');
        }
    };

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });
    const [actionModal, setActionModal] = useState<'pause' | 'resume' | 'complete' | null>(null);
    const [deleteModal, setDeleteModal] = useState(false);

    // Items state
    const [itemSearch, setItemSearch] = useState('');
    const [itemStatusFilter, setItemStatusFilter] = useState('');
    const [itemsTablePage, setItemsTablePage] = useState(1);
    const [deleteItemModal, setDeleteItemModal] = useState<ReturnTransactionItem | null>(null);
    const [editItemModal, setEditItemModal] = useState<ReturnTransactionItem | null>(null);
    const [editItemForm, setEditItemForm] = useState({ fullPackageSize: '', fullPackageQtyReturned: '', standardPrice: '', returnStatus: 'tbd', destination: '', memo: '', nonReturnableReason: '' });
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // Reverse distributors for Destination select in edit item modal
    const [reverseDistributors, setReverseDistributors] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient.get<{ status: string; data: { id: string; name: string; email: string }[] }>(
                    '/admin/reverse-distributors', true
                );
                setReverseDistributors(res.data || []);
            } catch {
                // non-critical — dropdown stays empty
            }
        })();
    }, []);

    // Handle browser back button - always redirect to returns list
    useEffect(() => {
        // Push a dummy state to intercept back button
        window.history.pushState(null, '', window.location.href);
        
        const handlePopState = () => {
            // Push state again to prevent going further back
            window.history.pushState(null, '', window.location.href);
            // Use window.location for reliable navigation
            window.location.href = '/warehouse/returns';
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Wine Cellar integration state
    const [wcModal, setWcModal] = useState(false);
    const [wcItems, setWcItems] = useState<WineCellarItem[]>([]);
    const [wcLoading, setWcLoading] = useState(false);
    const [wcSelected, setWcSelected] = useState<Set<string>>(new Set());
    const [wcAdding, setWcAdding] = useState(false);

    // PDF loading state for print functions
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const tid = Date.now().toString();
        setToasts(prev => [...prev, { id: tid, message, type }]);
    };
    const removeToast = (tid: string) => setToasts(prev => prev.filter(t => t.id !== tid));

    useEffect(() => {
        if (id) dispatch(fetchReturnTransactionById(id));
        return () => { dispatch(clearCurrentTransaction()); dispatch(clearItems()); };
    }, [dispatch, id]);

    useEffect(() => {
        if (id) {
            dispatch(fetchTransactionItems({
                transactionId: id,
                returnStatus: itemStatusFilter || undefined,
                search: debouncedItemSearch || undefined,
                page: itemsTablePage,
                limit: RETURN_DETAIL_ITEMS_PAGE_SIZE,
            }));
        }
    }, [dispatch, id, itemStatusFilter, debouncedItemSearch, itemsTablePage]);

    useEffect(() => {
        setItemsTablePage(1);
    }, [debouncedItemSearch, itemStatusFilter]);

    useEffect(() => {
        if (editModal && tx) {
            setEditForm({
                fedexTracking: tx.fedexTracking || '',
                fedexPickupConfirmation: tx.fedexPickupConfirmation || '',
                notes: tx.notes || '',
            });
        }
    }, [editModal, tx]);

    const refresh = () => dispatch(fetchReturnTransactionById(id));

    const handleStatusAction = async () => {
        if (!actionModal || !tx) return;
        const thunkMap: Record<string, any> = { pause: pauseReturnTransaction, resume: resumeReturnTransaction, complete: completeReturnTransaction };
        const thunk = thunkMap[actionModal];
        const wasComplete = actionModal === 'complete';
        const result = await dispatch(thunk(tx.id));
        if (thunk.fulfilled.match(result)) {
            const labels: Record<string, string> = { pause: 'paused', resume: 'resumed', complete: 'completed' };
            showToast(`Return ${tx.licensePlate} ${labels[actionModal]} successfully!`);
            setActionModal(null);
            refresh();
            if (wasComplete) {
                router.push(`/warehouse/returns/${id}/finalize`);
            }
        } else {
            showToast(result.payload as string || `Failed to ${actionModal}`, 'error');
            setActionModal(null);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        // When locked, only send notes to avoid backend rejection
        const payload = isLocked 
            ? { notes: editForm.notes } 
            : editForm;
        const result = await dispatch(updateReturnTransaction({ id: tx.id, payload }));
        if (updateReturnTransaction.fulfilled.match(result)) {
            showToast('Return updated successfully!');
            setEditModal(false);
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update', 'error');
        }
    };

    const handleUnassignFromBatch = async () => {
        if (!tx?.batchId) return;
        const result = await dispatch(unassignSingleReturn(tx.id));
        if (unassignSingleReturn.fulfilled.match(result)) {
            showToast(result.payload.message);
            refresh(); // Refresh to show updated batch status
        } else {
            showToast(result.payload as string || 'Failed to unassign from batch', 'error');
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        const result = await dispatch(deleteReturnTransaction(tx.id));
        if (deleteReturnTransaction.fulfilled.match(result)) {
            showToast(`Return ${tx.licensePlate} deleted!`);
            setDeleteModal(false);
            setTimeout(() => handleBackNavigation(), 1000);
        } else {
            showToast(result.payload as string || 'Failed to delete', 'error');
            setDeleteModal(false);
        }
    };

    // ── Item handlers ───────────────────────────────────────────

    const refreshItems = () => dispatch(fetchTransactionItems({
        transactionId: id,
        returnStatus: itemStatusFilter || undefined,
        search: debouncedItemSearch || undefined,
        page: itemsTablePage,
        limit: RETURN_DETAIL_ITEMS_PAGE_SIZE,
    }));

    useEffect(() => {
        if (editItemModal) {
            setEditItemForm({
                fullPackageSize: editItemModal.fullPackageSize ? String(editItemModal.fullPackageSize) : '',
                fullPackageQtyReturned: formatUnitsReturnedForForm(editItemModal),
                standardPrice: editItemModal.standardPrice != null ? String(editItemModal.standardPrice) : '',
                returnStatus: editItemModal.returnStatus,
                destination: editItemModal.destination || '',
                memo: editItemModal.memo || '',
                nonReturnableReason: (editItemModal as any).nonReturnableReason || '',
            });
        }
    }, [editItemModal]);

    const handleDeleteItem = async () => {
        if (!deleteItemModal) return;
        const result = await dispatch(deleteTransactionItem({ transactionId: id, itemId: deleteItemModal.id }));
        if (deleteTransactionItem.fulfilled.match(result)) {
            showToast('Item deleted');
            setDeleteItemModal(null);
            refreshItems();
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to delete item', 'error');
            setDeleteItemModal(null);
        }
    };

    const handleUpdateItem = async () => {
        if (!editItemModal) return;
        const payload: Record<string, any> = {};

        // Core data fields — only include if not locked
        if (!isLocked) {
            const pkgSize = editItemForm.fullPackageSize ? parseInt(editItemForm.fullPackageSize) : 0;
            const qtyReturned = editItemForm.fullPackageQtyReturned ? parseInt(editItemForm.fullPackageQtyReturned) : 0;
            if (pkgSize > 0) payload.fullPackageSize = pkgSize;
            if (qtyReturned > 0) {
                payload.fullPackageQtyReturned = qtyReturned;
                if (pkgSize > 0 && qtyReturned < pkgSize) {
                    payload.quantity = 1;
                    payload.isPartial = true;
                    payload.partialPercentage = Math.round((qtyReturned / pkgSize) * 100 * 100) / 100;
                } else {
                    payload.quantity = qtyReturned >= pkgSize && pkgSize > 0 ? Math.floor(qtyReturned / pkgSize) : qtyReturned;
                    payload.isPartial = false;
                    payload.partialPercentage = null;
                }
            }
            if (editItemForm.standardPrice) payload.standardPrice = parseFloat(editItemForm.standardPrice);
        }

        // Classification fields — always allowed
        payload.returnStatus = editItemForm.returnStatus;
        if (editItemForm.destination) payload.destination = editItemForm.destination;
        if (editItemForm.memo) payload.memo = editItemForm.memo;

        // FCR-52: A non-returnable reason is required whenever the row ends
        // up non_returnable. The dropdown is shown in the modal in that case.
        if (editItemForm.returnStatus === 'non_returnable') {
            // if (!isValidNonReturnableReason(editItemForm.nonReturnableReason)) {
            //     showToast('Please select a non-returnable reason for this item.', 'error');
            //     return;
            // }
            if (editItemForm.nonReturnableReason) {
                payload.nonReturnableReason = editItemForm.nonReturnableReason;
            }
        }

        const result = await dispatch(updateTransactionItem({ transactionId: id, itemId: editItemModal.id, payload }));
        if (updateTransactionItem.fulfilled.match(result)) {
            showToast('Item updated');
            setEditItemModal(null);
            refreshItems();
            refresh();
        } else {
            showToast(result.payload as string || 'Failed to update item', 'error');
        }
    };

    // ── Wine Cellar handlers ────────────────────────────────────

    const openWcModal = async () => {
        if (!tx) return;
        setWcModal(true);
        setWcLoading(true);
        setWcSelected(new Set());
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const res = await apiClient.get<{ status: string; data: { items: WineCellarItem[] } }>(
                '/admin/wine-cellar', true, { pharmacy_id: tx.pharmacyId, status: 'ready_to_return', limit: '100' }
            );
            setWcItems(res.data.items || []);
        } catch {
            setWcItems([]);
        }
        setWcLoading(false);
    };

    const toggleWcSelect = (itemId: string) => {
        setWcSelected(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
            return next;
        });
    };

    const handleAddWcItems = async () => {
        if (wcSelected.size === 0 || !tx) return;
        setWcAdding(true);
        let successCount = 0;
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            for (const wcId of wcSelected) {
                try {
                    await apiClient.post(`/admin/wine-cellar/${encodeURIComponent(wcId)}/return`, { transactionId: tx.id }, true);
                    successCount++;
                } catch { /* skip failed */ }
            }
        } catch { /* ignore */ }
        setWcAdding(false);
        setWcModal(false);
        if (successCount > 0) {
            showToast(`${successCount} wine cellar item(s) marked as returned!`);
            refreshItems();
            refresh();
        } else {
            showToast('Failed to add wine cellar items', 'error');
        }
    };

    const handleMoveToWineCellar = async (item: ReturnTransactionItem) => {
        if (!tx || !item.expirationDate) {
            showToast('Item must have an expiration date to move to Wine Cellar', 'error');
            return;
        }
        // Calculate expected returnable date: 6 months after expiration
        const exp = new Date(item.expirationDate);
        exp.setMonth(exp.getMonth() + 6);
        const expectedDate = exp.toISOString().split('T')[0];

        const result = await dispatch(moveItemToWineCellar({
            transactionId: tx.id,
            itemId: item.id,
            expectedReturnableDate: expectedDate,
        }));
        if (moveItemToWineCellar.fulfilled.match(result)) {
            showToast(`${item.proprietaryName || item.ndc || 'Item'} moved to Wine Cellar! Returnable after ${expectedDate}`);
            refreshItems();
        } else {
            showToast(result.payload as string || 'Failed to move item to wine cellar', 'error');
        }
    };

    // ── Finalize & Document helpers ─────────────────────────────

    // Server-side pagination: items are already paginated from API
    const paginatedNonWcItems = items.filter(i => !i.wineCellarId);
    const nonWcItemsTableTotalPages = itemsPagination?.totalPages || 1;
    const totalItemsCount = itemsPagination?.totalItems || 0;
    const nonWcItemsTableRangeStart = totalItemsCount === 0
        ? 0
        : ((itemsPagination?.page || 1) - 1) * (itemsPagination?.limit || RETURN_DETAIL_ITEMS_PAGE_SIZE) + 1;
    const nonWcItemsTableRangeEnd = Math.min(
        ((itemsPagination?.page || 1) * (itemsPagination?.limit || RETURN_DETAIL_ITEMS_PAGE_SIZE)),
        totalItemsCount
    );
    const nonWcReturnableAndTbdItemsCount = paginatedNonWcItems.filter(i => i.returnStatus === 'returnable' || i.returnStatus === 'tbd').length;
    const nonWcReturnableValue = paginatedNonWcItems
        .filter(i => i.returnStatus === 'returnable')
        .reduce((sum, i) => sum + (i.estimatedValue ?? 0), 0);
    const nonWcTotalValue = nonWcReturnableValue;

    // ── Print helpers ─────────────────────────────────────────────

    const printJobSheet = () => {
        printHtml('job-sheet', 'job-sheet');
    };

    const printShippingLabels = () => {
        printHtml('shipping-labels', 'shipping-labels');
    };

    const printSingleLabel = (packageNumber: number) => {
        printHtml(`shipping-label/${packageNumber}`, `shipping-label-${packageNumber}`);
    };

    const tbdItems = items.filter(i => i.returnStatus === 'tbd');
    const ciiItems = items.filter(i => i.deaForm222Required);
    const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = ciiItems.length > 0;
    const isFinalized = tx ? ['finalized', 'received', 'closed_out'].includes(tx.status) : false;

    const downloadPdf = async (endpoint: string, filename: string) => {
        setPdfLoading(endpoint);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Download failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: any) {
            showToast(e.message || 'Failed to download document', 'error');
        }
        setPdfLoading(null);
    };

    const printHtml = async (endpoint: string, loadingKey: string) => {
        setPdfLoading(loadingKey);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/return-transactions/${encodeURIComponent(id)}/${endpoint}`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/html'
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            
            // Create a new window with the HTML content
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                // For single labels, the HTML includes auto-print script
                // For combined labels (shipping-labels endpoint), we handle printing here
                if (endpoint === 'shipping-labels') {
                    // Wait for content and images to load, then print all labels
                    printWindow.onload = () => {
                        // Additional wait for images and resources to load
                        setTimeout(() => {
                            printWindow.print();
                            // Close the window after printing
                            setTimeout(() => {
                                printWindow.close();
                            }, 1500);
                        }, 800);
                    };
                    
                    // Fallback if onload doesn't fire
                    setTimeout(() => {
                        if (printWindow && !printWindow.closed) {
                            printWindow.print();
                            setTimeout(() => {
                                printWindow.close();
                            }, 1500);
                        }
                    }, 2500);
                } else {
                    // For individual labels, just ensure window closes after the auto-print completes
                    printWindow.onload = () => {
                        setTimeout(() => {
                            // Individual labels auto-print, so we just close after delay
                            if (printWindow && !printWindow.closed) {
                                printWindow.close();
                            }
                        }, 2000);
                    };
                }
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            showToast(e.message || 'Failed to print document', 'error');
        }
        setPdfLoading(null);
    };

    function getItemStatusBadge(status: string): { variant: 'success' | 'warning' | 'danger' | 'default'; label: string } {
        switch (status) {
            case 'returnable': return { variant: 'success', label: 'Returnable' };
            case 'non_returnable': return { variant: 'danger', label: 'Non-Returnable' };
            case 'tbd': return { variant: 'warning', label: 'TBD' };
            default: return { variant: 'default', label: status };
        }
    }

    // ── Loading / Error States ─────────────────────────────────

    // Avoid flashing "not found" before the first fetch resolves.
    if (isLoading || (!tx && !error)) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <button onClick={handleBackNavigation} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="bg-red-50 border border-red-200 rounded-[4px] p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-800 font-medium">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push('/warehouse/returns')}>Go Back</Button>
                </div>
            </div>
        );
    }
    
    if (!tx) {
        return (
            <div className="space-y-4">
                <button onClick={handleBackNavigation} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="bg-red-50 border border-red-200 rounded-[4px] p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <p className="text-red-800 font-medium">Return transaction not found.</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push('/warehouse/returns')}>Go Back</Button>
                </div>
            </div>
        );
    }

    const badge = getStatusBadge(tx.status);

    return (
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={removeToast} />

            {/* Lock Status Warning */}
            {isLocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-[4px] px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-amber-800">Partially Locked — Core data is frozen</p>
                            <p className="text-[10px] text-amber-700">Item classification (status, destination, memo) and return notes can still be updated. Quantity, price, and other core fields are locked.</p>
                        </div>
                    </div>
                </div>
            )}


            {/* Back + Header */}
            <div>
                <button onClick={handleBackNavigation} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold font-mono text-gray-900">{tx.licensePlate}</h1>
                        <Badge variant={badge.variant}><span className="text-[10px]">{badge.label}</span></Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {/* {canDoAction(tx, 'edit') && (
                            <button onClick={() => setEditModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit className="w-3 h-3" /> {isLocked ? 'Edit Notes' : 'Edit'}
                            </button>
                        )} */}
                        {/* Pause hidden on scan / return detail page — restore if needed
                        {canDoAction(tx, 'pause') && canEdit && (
                            <button onClick={() => checkActionWithToast('pause return', () => setActionModal('pause'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors">
                                <Pause className="w-3 h-3" /> Pause
                            </button>
                        )}
                        */}
                        {canDoAction(tx, 'resume') && canEdit && (
                            <button onClick={() => checkActionWithToast('resume return', () => setActionModal('resume'))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors">
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && canEdit && (
                            <button onClick={() => {
                                // Require at least 1 item to complete a return
                                if (!items || items.length === 0) {
                                    showToast('Cannot complete return: At least 1 item is required', 'error');
                                    return;
                                }
                                checkActionWithToast('complete return', () => setActionModal('complete'));
                            }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#1d2222] text-white hover:bg-[#3d4343] transition-colors">
                                <CheckCircle className="w-3 h-3" /> Complete
                            </button>
                        )}
                        {canDoAction(tx, 'finalize') && canEdit && (
                            <button onClick={() => checkActionWithToast('finalize return', () => router.push(`/warehouse/returns/${id}/finalize`))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                                <Lock className="w-3 h-3" /> Finalize
                            </button>
                        )}
                        {/* Print Job Sheet - Moved to Documents section */}
                        {canDoAction(tx, 'delete') && canEdit && (
                            <button onClick={() => checkActionWithToast('delete return', () => setDeleteModal(true))} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && !canEdit && (
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Cards - Conditional Layout */}
            {(tx.fedexTracking || tx.fedexPickupConfirmation) ? (
                /* Layout with Shipping & Processing: 2x2 grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* General Info */}
                <div className="bg-white rounded-[4px] shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" /> General Information
                    </h2>
                    <dl className="space-y-1.5">
                        {[
                            { label: 'License Plate', value: <span className="font-mono font-semibold">{tx.licensePlate}</span> },
                            { label: 'Service Type', value: tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                            { label: 'Created', value: formatDate(tx.createdAt) },
                            { label: 'Last Updated', value: formatDate(tx.updatedAt) },
                            ...(tx.finalizedAt ? [{ label: 'Finalized', value: formatDate(tx.finalizedAt) }] : []),
                            ...(tx.batchId ? [{ 
                                label: 'Batch Assignment', 
                                value: (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-blue-600 font-medium">Assigned</span>
                                        <button
                                            onClick={() => handleUnassignFromBatch()}
                                            className="text-[9px] text-red-600 hover:text-red-800 underline ml-1"
                                            title="Remove from batch"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )
                            }] : [{ label: 'Batch Assignment', value: <span className="text-[10px] text-gray-400">Not assigned</span> }]),
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between">
                                <dt className="text-[11px] text-gray-500">{label}</dt>
                                <dd className="text-[11px] text-gray-900">{value}</dd>
                            </div>
                        ))}
                        {tx.notes && (
                            <div className="pt-1.5 border-t border-gray-100">
                                <dt className="text-[11px] text-gray-500 mb-0.5">Notes</dt>
                                <dd className="text-[11px] text-gray-700">{tx.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Store & Processor */}
                <div className="bg-white rounded-[4px] shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Store & Processor
                    </h2>
                    <ReturnTransactionStoreAndProcessorDl
                        tx={tx}
                        variant="plain"
                        onPrintAllShippingLabels={printShippingLabels}
                        onPrintShippingLabel={printSingleLabel}
                    />
                </div>

                </div>
            ) : (
                /* Layout without Shipping & Processing: 2 cards in one row */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* General Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[4px] shadow-sm border border-blue-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-[4px]">
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                            </div>
                            General Information
                        </h2>
                        <dl className="space-y-2.5">
                            {[
                                { label: 'License Plate', value: <span className="font-mono font-bold text-gray-800">{tx.licensePlate}</span> },
                                { label: 'Service Type', value: tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                { label: 'Created', value: formatDate(tx.createdAt) },
                                { label: 'Last Updated', value: formatDate(tx.updatedAt) },
                                ...(tx.finalizedAt ? [{ label: 'Finalized', value: formatDate(tx.finalizedAt) }] : []),
                                ...(tx.batchId ? [{ 
                                    label: 'Batch Assignment', 
                                    value: (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-blue-600 font-medium">Assigned to Batch</span>
                                            <button
                                                onClick={() => handleUnassignFromBatch()}
                                                className="text-xs text-red-600 hover:text-red-800 underline"
                                                title="Remove from batch"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )
                                }] : [{ label: 'Batch Assignment', value: <span className="text-xs text-gray-400">Not assigned</span> }]),
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <dt className="text-xs text-blue-700 font-medium">{label}</dt>
                                    <dd className="text-xs text-gray-800 font-semibold">{value}</dd>
                                </div>
                            ))}
                            {tx.notes && (
                                <div className="pt-2 border-t border-blue-200">
                                    <dt className="text-xs text-blue-700 font-medium mb-1">Notes</dt>
                                    <dd className="text-xs text-gray-700 bg-white/60 rounded px-2 py-1">{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-[4px] shadow-sm border border-emerald-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded-[4px]">
                                <Building2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            Store & Processor
                        </h2>
                        <ReturnTransactionStoreAndProcessorDl
                            tx={tx}
                            variant="emerald"
                            onPrintAllShippingLabels={printShippingLabels}
                            onPrintShippingLabel={printSingleLabel}
                        />
                    </div>

                    {/* Items & Values */}
                    {/* <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[4px] shadow-sm border border-amber-100 px-5 py-4 hover:shadow-md transition-shadow">
                        <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded-[4px]">
                                <Package className="w-4 h-4 text-amber-600" />
                            </div>
                            Items & Values
                        </h2>
                        <dl className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Total Items</dt>
                                <dd className="text-xs font-bold text-gray-800">{nonWcReturnableAndTbdItemsCount}</dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Returnable Value</dt>
                                <dd className="text-xs font-bold text-green-700">{formatCurrency(nonWcReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between items-center">
                                <dt className="text-xs text-amber-700 font-medium">Non-Returnable Value</dt>
                                <dd className="text-xs font-bold text-red-700">{formatCurrency(nonWcNonReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                                <dt className="text-xs text-amber-800 font-bold">Total Value</dt>
                                <dd className="text-sm font-black text-gray-900 bg-white/70 px-2 py-0.5 rounded">{formatCurrency(nonWcTotalValue)}</dd>
                            </div>
                        </dl>
                    </div> */}
                </div>
            )}

            {/* ── Debit Memos Summary ─────────────────────────── */}
            {((tx.paidMemoCount ?? 0) + (tx.unpaidMemoCount ?? 0)) > 0 && (
                <div className="bg-white rounded-[4px] shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Debit Memos
                    </h2>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <dt className="text-[11px] text-gray-500">Paid Memos</dt>
                            <dd className="text-sm font-semibold text-green-700">{tx.paidMemoCount ?? 0}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] text-gray-500">Unpaid Memos</dt>
                            <dd className="text-sm font-semibold text-red-600">{tx.unpaidMemoCount ?? 0}</dd>
                        </div>
                        {(tx.totalAskValue ?? 0) > 0 && (
                            <div>
                                <dt className="text-[11px] text-gray-500">Total Ask</dt>
                                <dd className="text-sm font-semibold text-gray-900">{formatCurrency(tx.totalAskValue ?? 0)}</dd>
                            </div>
                        )}
                        {(tx.totalReceivedValue ?? 0) > 0 && (
                            <div>
                                <dt className="text-[11px] text-gray-500">Total Received</dt>
                                <dd className="text-sm font-semibold text-green-700">{formatCurrency(tx.totalReceivedValue ?? 0)}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            )}

            {/* ── Documents Section (post-finalization) ──────── */}
            {isFinalized && (
                <div className="bg-white rounded-[4px] shadow px-4 py-3">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Documents
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                            disabled={pdfLoading === 'manifest'}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {pdfLoading === 'manifest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download Manifest
                        </button>
                        {/* DEA Form 222 - Available when there are CII items */}
                        {tx.hasCiiItems && (
                            <button
                                onClick={() => downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`)}
                                disabled={pdfLoading === 'dea-form-222'}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded text-xs text-orange-700 font-medium transition-colors disabled:opacity-50"
                                title="Download DEA Form 222 for Schedule II items"
                            >
                                {pdfLoading === 'dea-form-222' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                DEA Form 222
                            </button>
                        )}
                        {/* Print Job Sheet - Available for completed/finalized transactions with tracking */}
                        {(tx.status === 'completed' || tx.status === 'finalized') && (tx.fedexTracking || (tx.packageTracking && Object.keys(tx.packageTracking).length > 0)) && (
                            <button
                                onClick={printJobSheet}
                                disabled={pdfLoading === 'job-sheet'}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded text-xs text-green-700 font-medium transition-colors disabled:opacity-50"
                                title="Print job sheet with addresses and barcodes"
                            >
                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                Print Job Sheet
                            </button>
                        )}
                    </div>
                    {tx.manifestGeneratedAt && (
                        <p className="text-[10px] text-gray-400 mt-2">Manifest last generated: {formatDate(tx.manifestGeneratedAt)}</p>
                    )}
                </div>
            )}

            {/* ── Items Section ──────────────────────────────── */}
            <div className="bg-white rounded-[4px] shadow px-4 py-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ScanLine className="w-3.5 h-3.5" /> Products ({totalItemsCount})
                    </h2>
                    {isProcessor && canAddDeleteItems && (
                        <div className="flex gap-1.5">
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#1d2222] text-white hover:bg-[#3d4343] transition-colors">
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                            {/* Wine Cellar Items functionality moved to MainAdmin warehouse verification */}
                            {/* <button onClick={() => openWcModal()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                <Archive className="w-3 h-3" /> Wine Cellar Items
                            </button> */}
                        </div>
                    )}
                    {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                        <div className="flex gap-1.5">
                            <button disabled className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary Bar */}
                {/* {nonWcItems.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <div className="bg-gray-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-gray-500">Items</p>
                            <p className="text-xs font-bold text-gray-900">{nonWcReturnableAndTbdItemsCount}</p>
                        </div>
                        <div className="bg-green-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-green-600">Returnable</p>
                            <p className="text-xs font-bold text-green-800">{formatCurrency(nonWcReturnableValue)}</p>
                        </div>
                        <div className="bg-red-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-red-600">Non-Returnable</p>
                            <p className="text-xs font-bold text-red-800">{formatCurrency(nonWcNonReturnableValue)}</p>
                        </div>
                        <div className="bg-blue-50 rounded px-2.5 py-1.5 text-center">
                            <p className="text-[10px] text-blue-600">Total Value</p>
                            <p className="text-xs font-bold text-blue-800">{formatCurrency(nonWcTotalValue)}</p>
                        </div>
                    </div>
                )} */}

                {/* Items Filters */}
                <div className="flex flex-col sm:flex-row gap-1.5 mb-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Search by NDC, name, manufacturer, lot..."
                            className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                    </div>
                    <select
                        value={itemStatusFilter}
                        onChange={e => setItemStatusFilter(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="returnable">Returnable</option>
                        <option value="non_returnable">Non-Returnable</option>
                        <option value="tbd">TBD</option>
                    </select>
                </div>

                {/* Items Table */}
                {isItemsLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                    </div>
                ) : totalItemsCount === 0 ? (
                    <div className="text-center py-6">
                        <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs font-medium">No items yet</p>
                        {isProcessor && canAddDeleteItems && (
                            <button onClick={() => router.push(`/warehouse/returns/${id}/add-items`)} className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#1d2222] text-white hover:bg-[#3d4343] transition-colors">
                                <Plus className="w-3 h-3" /> Start Scanning
                            </button>
                        )}
                        {isProcessor && canDoAction(tx, 'edit') && !canEdit && (
                            <button disabled className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed">
                                <Lock className="w-3 h-3" /> Locked
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border" style={{ borderColor: '#9ca3af' }}>
                            <thead className="bg-[#f4f5f5] border-b" style={{ borderColor: '#9ca3af', borderBottomWidth: '1.5px' }}>
                                <tr className="bg-[#f4f5f5]">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">NDC</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Name</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Manufacturer</th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Pkg Size</th>
                                    <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Qty Returned</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Serial#</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Expires</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Destination</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                                {paginatedNonWcItems.map((item) => {
                                    const sBadge = getItemStatusBadge(item.returnStatus);
                                    return (
                                        <tr key={item.id} className="hover:bg-[#e9ebec] transition-colors" style={{ borderColor: '#d1d5db' }}>
                                            <td className="px-3 py-3 text-sm font-mono text-gray-900">{item.ndc || '—'}</td>
                                            <td className="px-3 py-3 text-sm text-gray-900 max-w-[130px] truncate" title={item.proprietaryName || ''}>
                                                {item.proprietaryName || item.genericName || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600 max-w-[110px] truncate" title={item.manufacturer || ''}>
                                                {item.manufacturer || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center text-gray-900">
                                                {item.fullPackageSize || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center text-gray-900">
                                                {(() => {
                                                    const units = getReturnItemUnitsReturned(item);
                                                    const kind = getReturnItemPackageKind(item);
                                                    const partialDetail = formatPartialReturnDetail(item);
                                                    return (
                                                        <div className="flex flex-col gap-0.5 items-center">
                                                            <span className="text-xs font-medium text-gray-900">{units || '—'}</span>
                                                            {kind === 'full' && (
                                                                <Badge variant="success"><span className="text-[10px]">Full Package</span></Badge>
                                                            )}
                                                            {kind === 'partial' && (
                                                                <Badge variant="warning"><span className="text-[10px]">Partial</span></Badge>
                                                            )}
                                                            {partialDetail && (
                                                                <span className="text-[10px] text-gray-500">{partialDetail}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">
                                                {item.serialNumber || '—'}
                                            </td>
                                            {/* <td className="px-2 py-1.5 text-[11px] text-right text-gray-900">
                                                {item.standardPrice != null ? formatCurrency(item.standardPrice) : '—'}
                                            </td>
                                            <td className="px-2 py-1.5 text-[11px] text-right font-medium text-gray-900">
                                                {item.estimatedValue != null ? formatCurrency(item.estimatedValue) : '—'}
                                            </td> */}
                                            {/* <td className="px-2 py-1.5 text-[11px] text-right font-medium text-gray-900">
                                                {item.estimatedStoreValue != null ? formatCurrency(item.estimatedStoreValue) : '—'}
                                            </td> */}
                                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                                {item.expirationDate ? formatDate(item.expirationDate) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant={sBadge.variant}><span className="text-[10px]">{sBadge.label}</span></Badge>
                                                        {item.wineCellarId && (
                                                            <Badge variant="info"><span className="text-[10px]"><Archive className="w-2.5 h-2.5 mr-0.5 inline" />WC</span></Badge>
                                                        )}
                                                    </div>
                                                    {/* FCR-52: Show reason for non-returnable items */}
                                                    {item.returnStatus === 'non_returnable' && item.nonReturnableReason && (
                                                        <span className="text-[10px] text-red-700 italic" title={formatNonReturnableReason(item.nonReturnableReason)}>
                                                            {formatNonReturnableReason(item.nonReturnableReason)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {item.returnStatus === 'returnable' ? (
                                                    item.destination ? (
                                                        <span className="capitalize font-medium text-gray-900">{item.destination}</span>
                                                    ) : (
                                                        <span className="text-orange-600 font-medium">Missing</span>
                                                    )
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    {canAddDeleteItems && item.nonReturnableReason === 'date' && !item.wineCellarId && (
                                                        <button onClick={() => handleMoveToWineCellar(item)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Move to Wine Cellar">
                                                            <Archive className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setEditItemModal(item)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title={isLocked ? 'Edit classification' : 'Edit item'}>
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {canAddDeleteItems && (
                                                        <button onClick={() => setDeleteItemModal(item)} className="p-1.5 text-gray-400 hover:text-[#516057] hover:bg-[#516057]/10 rounded transition-colors" title="Delete item">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {totalItemsCount > 0 && nonWcItemsTableTotalPages > 1 && (
                            <div className="flex items-center justify-between px-3 py-2 border-t gap-2 bg-[#fafbfb]" style={{ borderColor: '#d1d5db' }}>
                                <p className="text-[10px] text-gray-500">
                                    Showing {nonWcItemsTableRangeStart}–{nonWcItemsTableRangeEnd} of {totalItemsCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setItemsTablePage((p) => Math.max(1, p - 1))}
                                        disabled={itemsTablePage <= 1}
                                        className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                                    </button>
                                    <span className="text-[10px] text-gray-600 tabular-nums">
                                        Page {itemsTablePage} of {nonWcItemsTableTotalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setItemsTablePage((p) => Math.min(nonWcItemsTableTotalPages, p + 1))}
                                        disabled={itemsTablePage >= nonWcItemsTableTotalPages}
                                        className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Edit Item Modal ───────────────────────────── */}
            {editItemModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditItemModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Edit Item</h2>
                            <button onClick={() => setEditItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[11px] text-gray-500 mb-2">{editItemModal.proprietaryName || editItemModal.ndc} — Lot: {editItemModal.lotNumber || '—'}</p>
                            {isLocked && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5 mb-2">
                                    <p className="text-[10px] text-yellow-800">Core data (pkg size, qty, price) is locked. Classification fields can still be updated.</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Quantity</label>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-0.5">Package Size (units/pkg)</label>
                                            <div className="text-center py-1.5 bg-gray-50 border border-gray-200 rounded">
                                                {editItemForm.fullPackageSize || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-0.5">Qty Returned (units)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={editItemForm.fullPackageSize || undefined}
                                                value={editItemForm.fullPackageQtyReturned || ''} 
                                                onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })} 
                                                disabled={isLocked} 
                                                className={`w-full px-2 py-1.5 text-center text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
                                            />
                                        </div>
                                    </div>
                                    {editItemForm.fullPackageSize && editItemForm.fullPackageQtyReturned && (() => {
                                        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
                                        const units = parseInt(editItemForm.fullPackageQtyReturned) || 0;
                                        const kind = getPackageKindFromUnits(pkgSize, units);
                                        const partialDetail = formatPartialReturnDetail(
                                            { fullPackageSize: pkgSize, isPartial: kind === 'partial' },
                                            units,
                                        );
                                        return (
                                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                                {kind === 'full' && (
                                                    <Badge variant="success">
                                                        <span className="text-[10px]">Full Package — {units} units</span>
                                                    </Badge>
                                                )}
                                                {kind === 'partial' && (
                                                    <>
                                                        <Badge variant="warning">
                                                            <span className="text-[10px]">Partial Return</span>
                                                        </Badge>
                                                        {partialDetail && (
                                                            <span className="text-[10px] text-gray-500">{partialDetail}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Memo</label>
                                    <input type="text" value={editItemForm.memo} onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })} placeholder="Optional memo" className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleUpdateItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Item Modal ────────────────────────── */}
            {deleteItemModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Delete Item</h2>
                            <button onClick={() => setDeleteItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.ndc || 'this item'}</strong>
                                {deleteItemModal.lotNumber && <> (Lot: {deleteItemModal.lotNumber})</>}?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDeleteItem} disabled={isItemActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isItemActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────── */}
            {editModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                            <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            {isLocked && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5 mb-1">
                                    <p className="text-[10px] text-yellow-800">Return is locked. Only notes can be updated.</p>
                                </div>
                            )}
                            {/* <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">FedEx Tracking Number</label>
                                <input type="text" value={editForm.fedexTracking} onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} placeholder="Enter tracking number" />
                            </div> */}
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">FedEx Pickup Confirmation</label>
                                <input type="text" value={editForm.fedexPickupConfirmation} onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })} disabled={isLocked} className={`w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`} placeholder="Enter pickup confirmation" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Notes</label>
                                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none" placeholder="Optional notes" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Action Modal ──────────────────────── */}
            {actionModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {actionModal === 'pause' && 'Pause Return'}
                                {actionModal === 'resume' && 'Resume Return'}
                                {actionModal === 'complete' && 'Mark as Completed'}
                            </h2>
                            <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Are you sure you want to <strong>{actionModal}</strong> return <strong>{tx.licensePlate}</strong>?
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ─────────────────────────────── */}
            {deleteModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                    <div className="bg-white rounded-[4px] max-w-lg w-full shadow-xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-sm font-semibold text-gray-900">Delete Return</h2>
                            <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-700">
                                Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setDeleteModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                                {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Wine Cellar Items Modal ─────────────────────── */}
            {wcModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setWcModal(false)}>
                    <div className="bg-white rounded-[4px] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Wine Cellar Items</h2>
                                <p className="text-xs text-gray-500">Select items ready to return for {tx?.pharmacyName}</p>
                            </div>
                            <button onClick={() => setWcModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                            {wcLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Loading wine cellar items...</p>
                                    </div>
                                </div>
                            ) : wcItems.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <Archive className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500">No wine cellar items ready</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Items will appear here when they reach their expected return date
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                                    <input
                                                        type="checkbox"
                                                        checked={wcSelected.size === wcItems.length && wcItems.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setWcSelected(new Set(wcItems.map(item => item.id)));
                                                            } else {
                                                                setWcSelected(new Set());
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-slate-500"
                                                    />
                                                </th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">NDC</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Product Name</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Manufacturer</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Price</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Shelved Date</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {wcItems.map((item) => (
                                                <tr 
                                                    key={item.id} 
                                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${wcSelected.has(item.id) ? 'bg-blue-50' : ''}`}
                                                    onClick={() => {
                                                        const newSelected = new Set(wcSelected);
                                                        if (newSelected.has(item.id)) {
                                                            newSelected.delete(item.id);
                                                        } else {
                                                            newSelected.add(item.id);
                                                        }
                                                        setWcSelected(newSelected);
                                                    }}
                                                >
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={wcSelected.has(item.id)}
                                                            onChange={() => {}} // Handled by row click
                                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-slate-500"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-mono text-gray-900">{item.ndc}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">{item.productName || '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-700">{item.manufacturer || '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900">{item.standardPrice ? `$${item.standardPrice.toFixed(2)}` : '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-700">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-700">{item.physicalLocation || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <p className="text-xs text-gray-500">
                                {wcSelected.size > 0 ? `${wcSelected.size} item${wcSelected.size === 1 ? '' : 's'} selected` : 'No items selected'}
                            </p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setWcModal(false)} 
                                    className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (wcSelected.size === 0) return;
                                        setWcAdding(true);
                                        try {
                                            const { apiClient } = await import('@/lib/api/apiClient');
                                            let successCount = 0;
                                            const selectedItems = wcItems.filter(item => wcSelected.has(item.id));
                                            
                                            for (const item of selectedItems) {
                                                try {
                                                    await apiClient.post(`/admin/wine-cellar/${item.id}/return`, { transactionId: id }, true);
                                                    successCount++;
                                                } catch (e) {
                                                    console.error('Failed to add wine cellar item:', e);
                                                }
                                            }
                                            
                                            if (successCount > 0) {
                                                showToast(`${successCount} item${successCount === 1 ? '' : 's'} added from wine cellar`, 'success');
                                                setWcModal(false);
                                                refreshItems(); // Refresh the items list
                                            } else {
                                                showToast('Failed to add items from wine cellar', 'error');
                                            }
                                        } catch (error) {
                                            showToast('Failed to add items from wine cellar', 'error');
                                        }
                                        setWcAdding(false);
                                    }}
                                    disabled={wcSelected.size === 0 || wcAdding}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#1d2222] text-white hover:bg-[#3d4343] disabled:opacity-50 transition-colors"
                                >
                                    {wcAdding ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3 h-3" />
                                            Add {wcSelected.size} Item{wcSelected.size === 1 ? '' : 's'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
