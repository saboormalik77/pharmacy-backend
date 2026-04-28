'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, Package, Truck,
    Plus, Search, ScanLine, FileText, Download, AlertTriangle, Printer, QrCode,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api/client';
import { getToken } from '@/lib/utils/cookies';
import { NON_RETURNABLE_REASONS, formatNonReturnableReason } from '@/lib/constants/nonReturnableReasons';

// ── Types ──────────────────────────────────────────────────────

interface ReturnTransaction {
    id: string;
    licensePlate: string;
    pharmacyId: string;
    pharmacyName?: string;
    processorId?: string;
    processorName?: string;
    serviceType: string;
    status: string;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    fedexTracking?: string;
    fedexPickupConfirmation?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    finalizedAt?: string;
    boxCount?: number;
    prpNumber?: string;
    packageTracking?: Record<string, string>;
    fedexShipmentId?: string;
    fedexLabels?: Record<string, string>;
    manifestGeneratedAt?: string;
    receivedInWarehouseDate?: string;
}

interface ReturnTransactionItem {
    id: string;
    ndc: string;
    ndc10?: string;
    proprietaryName?: string;
    genericName?: string;
    manufacturer?: string;
    packageDescription?: string;
    dosageForm?: string;
    strength?: string;
    lotNumber?: string;
    serialNumber?: string;
    expirationDate?: string;
    standardPrice?: number;
    quantity: number;
    quantityReturned: number;
    isPartial?: boolean;
    partialPercentage?: number;
    fullPackageSize?: number;
    fullPackageQtyReturned?: number;
    estimatedValue?: number;
    estimatedStoreValue?: number;
    returnStatus: string;
    returnReason?: string;
    destination?: string;
    memo?: string;
    wineCellarId?: string;
    nonReturnableReason?: string;
    deaForm222Required?: boolean;
    deaSchedule?: string;
    productType?: string;
    scanSource?: string;
    createdAt: string;
    updatedAt?: string;
}

interface ReverseDistributor {
    id: string;
    name: string;
}

// ── Helpers ────────────────────────────────────────────────────

function canDoAction(tx: ReturnTransaction, action: string): boolean {
    switch (action) {
        case 'pause': return tx.status === 'in_progress';
        case 'resume': return tx.status === 'paused';
        case 'complete': return tx.status === 'in_progress' || tx.status === 'paused';
        case 'finalize': return tx.status === 'completed';
        case 'edit': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
        case 'delete': return !['finalized', 'received', 'verified', 'closed_out'].includes(tx.status);
        case 'add_items': return tx.status === 'in_progress' || tx.status === 'paused';
        default: return false;
    }
}

function getStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
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

function getItemStatusBadge(status: string): { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string } {
    switch (status) {
        case 'returnable': return { variant: 'success', label: 'Returnable' };
        case 'non_returnable': return { variant: 'error', label: 'Non-Returnable' };
        case 'tbd': return { variant: 'warning', label: 'TBD' };
        default: return { variant: 'default', label: status };
    }
}

// ── Page ───────────────────────────────────────────────────────

export default function ReturnDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [tx, setTx] = useState<ReturnTransaction | null>(null);
    const [items, setItems] = useState<ReturnTransactionItem[]>([]);
    const [itemsSummary, setItemsSummary] = useState<{
        totalItems: number;
        totalReturnableValue: number;
        totalNonReturnableValue: number;
        totalValue: number;
    } | null>(null);
    const [reverseDistributors, setReverseDistributors] = useState<ReverseDistributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const toastId = Date.now().toString();
        setToasts(prev => [...prev, { id: toastId, message, type }]);
    };
    const removeToast = (toastId: string) => setToasts(prev => prev.filter(t => t.id !== toastId));

    // Modal states
    const [pdfLoading, setPdfLoading] = useState<string | null>(null);

    // Filters
    const [itemSearch, setItemSearch] = useState('');
    const [itemStatusFilter, setItemStatusFilter] = useState('');
    const debouncedItemSearch = useDebounce(itemSearch, 300);

    // Modals
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [actionModal, setActionModal] = useState<{ action: 'pause' | 'resume' | 'complete' } | null>(null);
    const [editItemModal, setEditItemModal] = useState<ReturnTransactionItem | null>(null);
    const [deleteItemModal, setDeleteItemModal] = useState<ReturnTransactionItem | null>(null);

    // Edit forms
    const [editForm, setEditForm] = useState({ fedexTracking: '', fedexPickupConfirmation: '', notes: '' });
    const [editItemForm, setEditItemForm] = useState({
        fullPackageSize: '',
        fullPackageQtyReturned: '',
        standardPrice: 0,
        returnStatus: '',
        destination: '',
        memo: '',
        nonReturnableReason: '',
    });
    const [editPolicyCheck, setEditPolicyCheck] = useState<{
        status: 'returnable' | 'non_returnable' | 'tbd';
        reason?: string;
        destination?: string;
        manufacturerName?: string;
    } | null>(null);
    const [isEditPolicyChecking, setIsEditPolicyChecking] = useState(false);

    // ── Data fetching ─────────────────────────────────────────

    const fetchTransaction = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.get<any>(`/return-transactions/${id}`, {}, true);
            if (res.status === 'success') {
                setTx(res.data);
            } else {
                throw new Error(res.message || 'Failed to fetch transaction');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load return transaction');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const fetchItems = useCallback(async () => {
        if (!id) return;
        setIsItemsLoading(true);
        try {
            const queryParams: any = {};
            if (debouncedItemSearch) queryParams.search = debouncedItemSearch;
            if (itemStatusFilter) queryParams.status = itemStatusFilter;

            const res = await apiClient.get<any>(`/return-transactions/${id}/items`, queryParams, true);
            if (res.status === 'success') {
                setItems(res.data.items || []);
                if (res.data.summary) {
                    setItemsSummary(res.data.summary);
                }
            } else {
                throw new Error(res.message || 'Failed to fetch items');
            }
        } catch (err: any) {
            showToast('Failed to load items', 'error');
        } finally {
            setIsItemsLoading(false);
        }
    }, [id, debouncedItemSearch, itemStatusFilter]);

    const fetchReverseDistributors = useCallback(async () => {
        try {
            const res = await apiClient.get<any>('/admin/reverse-distributors', {}, true);
            if (res.status === 'success') {
                setReverseDistributors(res.data || []);
            }
        } catch {
            // non-critical
        }
    }, []);

    useEffect(() => {
        fetchTransaction();
        fetchReverseDistributors();
    }, [fetchTransaction, fetchReverseDistributors]);

    useEffect(() => {
        if (tx) fetchItems();
    }, [fetchItems, tx]);

    useEffect(() => {
        if (editModal && tx) {
            setEditForm({
                fedexTracking: tx.fedexTracking || '',
                fedexPickupConfirmation: tx.fedexPickupConfirmation || '',
                notes: tx.notes || '',
            });
        }
    }, [editModal, tx]);

    useEffect(() => {
        if (editItemModal) {
            setEditItemForm({
                fullPackageSize: editItemModal.fullPackageSize ? String(editItemModal.fullPackageSize) : '',
                fullPackageQtyReturned: editItemModal.fullPackageQtyReturned ? String(editItemModal.fullPackageQtyReturned) : (editItemModal.quantity ? String(editItemModal.quantity) : ''),
                standardPrice: editItemModal.standardPrice || 0,
                returnStatus: editItemModal.returnStatus,
                destination: editItemModal.destination || '',
                memo: editItemModal.memo || '',
                nonReturnableReason: editItemModal.nonReturnableReason || '',
            });
            setEditPolicyCheck(null);
        }
    }, [editItemModal]);

    const runEditPolicyCheck = useCallback(async () => {
        if (!editItemModal) return;
        const ndc = editItemModal.ndc;
        const expDate = editItemModal.expirationDate;
        if (!ndc || !expDate) return;

        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        const isPartial = pkgSize > 0 && qtyReturned > 0 && qtyReturned < pkgSize;

        setIsEditPolicyChecking(true);
        setEditPolicyCheck(null);
        try {
            const res = await apiClient.post<any>('/policies/check', {
                ndc,
                expirationDate: expDate,
                dosageForm: editItemModal.dosageForm || undefined,
                isPartial,
            }, true);
            if (res.status === 'success' && res.data) {
                const policy = res.data;
                setEditPolicyCheck(policy);
                if (policy.status === 'returnable' || policy.status === 'non_returnable') {
                    setEditItemForm(prev => ({
                        ...prev,
                        returnStatus: policy.status,
                        destination: policy.destination || prev.destination,
                    }));
                }
            }
        } catch { /* non-critical */ }
        setIsEditPolicyChecking(false);
    }, [editItemModal, editItemForm.fullPackageSize, editItemForm.fullPackageQtyReturned]);

    const editPolicyModalIdRef = useRef<string | null>(null);
    const prevEditPkgRef = useRef<string>('');
    const prevEditQtyRef = useRef<string>('');

    useEffect(() => {
        if (!editItemModal) {
            editPolicyModalIdRef.current = null;
            return;
        }
        const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        if (pkgSize <= 0 || qtyReturned <= 0) return;

        const pkgStr = editItemForm.fullPackageSize;
        const qtyStr = editItemForm.fullPackageQtyReturned;

        const modalOpened = editPolicyModalIdRef.current !== editItemModal.id;
        if (modalOpened) {
            editPolicyModalIdRef.current = editItemModal.id;
            prevEditPkgRef.current = pkgStr;
            prevEditQtyRef.current = qtyStr;
            runEditPolicyCheck();
            return;
        }

        const pkgChanged = prevEditPkgRef.current !== pkgStr;
        const qtyChanged = prevEditQtyRef.current !== qtyStr;
        prevEditPkgRef.current = pkgStr;
        prevEditQtyRef.current = qtyStr;

        if (pkgChanged && !qtyChanged) {
            runEditPolicyCheck();
            return;
        }

        const t = window.setTimeout(() => runEditPolicyCheck(), 600);
        return () => window.clearTimeout(t);
    }, [editItemForm.fullPackageSize, editItemForm.fullPackageQtyReturned, editItemModal, runEditPolicyCheck]);

    // ── Action handlers ────────────────────────────────────────

    const handleStatusAction = async () => {
        if (!actionModal || !tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.post(`/return-transactions/${tx.id}/${actionModal.action}`, {}, true);
            if (res.status === 'success') {
                const labels: Record<string, string> = { pause: 'paused', resume: 'resumed', complete: 'completed' };
                showToast(`Return ${tx.licensePlate} ${labels[actionModal.action]} successfully!`);
                setActionModal(null);
                fetchTransaction();
            } else {
                throw new Error(res.message || `Failed to ${actionModal.action} return`);
            }
        } catch (err: any) {
            showToast(err.message || `Failed to ${actionModal.action} return`, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.patch(`/return-transactions/${tx.id}`, editForm, true);
            if (res.status === 'success') {
                showToast(`Return ${tx.licensePlate} updated!`);
                setEditModal(false);
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to update return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to update return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!tx) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.delete(`/return-transactions/${tx.id}`, true);
            if (res.status === 'success') {
                showToast(`Return ${tx.licensePlate} deleted!`);
                setDeleteModal(false);
                router.push('/returns');
            } else {
                throw new Error(res.message || 'Failed to delete return');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to delete return', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    // ── Finalize Functions ─────────────────────────────────────

    const downloadPdf = async (endpoint: string, filename: string) => {
        setPdfLoading(endpoint);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const response = await fetch(`${baseUrl}/return-transactions/${tx?.id}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Download failed');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err: any) {
            showToast(err.message || 'Download failed', 'error');
        }
        setPdfLoading(null);
    };

    const printHtml = async (endpoint: string, loadingKey: string) => {
        setPdfLoading(loadingKey);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const token = getToken();
            const res = await fetch(`${baseUrl}/return-transactions/${tx?.id}/${endpoint}`, {
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
                
                // Wait for content to load, then print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to print document', 'error');
        }
        setPdfLoading(null);
    };

    const printJobSheet = () => {
        printHtml('job-sheet', 'job-sheet');
    };

    const printShippingLabels = () => {
        printHtml('shipping-labels', 'shipping-labels');
    };

    const printSingleLabel = (packageNumber: number) => {
        printHtml(`shipping-label/${packageNumber}`, `shipping-label-${packageNumber}`);
    };

    // Calculate item state
    const returnableAndTbdItemsCount = items.filter(item => item.returnStatus === 'returnable' || item.returnStatus === 'tbd').length;
    const tbdItems = items.filter(item => item.returnStatus === 'tbd');
    const ciiItems = items.filter(item => item.deaForm222Required);
    const hasTbdItems = tbdItems.length > 0;
    const hasCiiItems = ciiItems.length > 0;

    const handleUpdateItem = async () => {
        if (!editItemModal) return;

        // FCR-52: Require a reason whenever the row ends up non_returnable.
        if (editItemForm.returnStatus === 'non_returnable') {
            const { isValidNonReturnableReason } = await import('@/lib/constants/nonReturnableReasons');
            if (!isValidNonReturnableReason(editItemForm.nonReturnableReason)) {
                showToast('Please select a non-returnable reason for this item.', 'error');
                return;
            }
        }

        setIsActionLoading(true);
        try {
            const payload: Record<string, any> = {
                returnStatus: editItemForm.returnStatus,
            };

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
            if (editItemForm.standardPrice) payload.standardPrice = editItemForm.standardPrice;
            if (editItemForm.destination) payload.destination = editItemForm.destination;
            if (editItemForm.memo) payload.memo = editItemForm.memo;
            if (editItemForm.returnStatus === 'non_returnable') {
                payload.nonReturnableReason = editItemForm.nonReturnableReason;
            }

            const res = await apiClient.patch(
                `/return-transactions/${id}/items/${editItemModal.id}`,
                payload,
                true,
            );
            if (res.status === 'success') {
                showToast('Item updated successfully!');
                setEditItemModal(null);
                fetchItems();
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to update item');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to update item', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!deleteItemModal) return;
        setIsActionLoading(true);
        try {
            const res = await apiClient.delete(
                `/return-transactions/${id}/items/${deleteItemModal.id}`,
                true,
            );
            if (res.status === 'success') {
                showToast('Item deleted successfully!');
                setDeleteItemModal(null);
                fetchItems();
                fetchTransaction();
            } else {
                throw new Error(res.message || 'Failed to delete item');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to delete item', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };


    // ── Render ─────────────────────────────────────────────────

    if (isLoading) {
        return (
            <DashboardLayout>
                <PermissionGuard permission="returns:view">
                <div className="flex items-center justify-center min-h-64">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Loading return transaction...</p>
                    </div>
                </div>
                </PermissionGuard>
            </DashboardLayout>
        );
    }

    if (error || !tx) {
        return (
            <DashboardLayout>
                <PermissionGuard permission="returns:view">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-800">{error || 'Return transaction not found'}</p>
                    <button
                        className="mt-3 px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => router.push('/returns')}
                    >
                        Back to Returns
                    </button>
                </div>
                </PermissionGuard>
            </DashboardLayout>
        );
    }

    const badge = getStatusBadge(tx.status);
    const showDocuments = ['finalized', 'received', 'closed_out'].includes(tx.status);
    const showShipping = !!(
        tx.fedexTracking ||
        tx.fedexPickupConfirmation ||
        (tx.packageTracking && Object.keys(tx.packageTracking).length > 0) ||
        (tx.fedexLabels && Object.keys(tx.fedexLabels).length > 0)
    );

    return (
        <DashboardLayout>
            <PermissionGuard permission="returns:view">
            <div className="space-y-4">
                <ToastContainer toasts={toasts} onClose={removeToast} />

                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-lg font-mono font-bold text-gray-900">{tx.licensePlate}</h1>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">Return Transaction Details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canDoAction(tx, 'resume') && (
                            <button
                                onClick={() => setActionModal({ action: 'resume' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && (
                            <button
                                onClick={() => setActionModal({ action: 'complete' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <CheckCircle className="w-3 h-3" /> Complete
                            </button>
                        )}
                        {canDoAction(tx, 'finalize') && (
                            <button
                                onClick={() => router.push(`/returns/${id}/finalize`)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <Lock className="w-3 h-3" /> Finalize
                            </button>
                        )}
                        {/* Print Job Sheet - Available for completed/finalized transactions with tracking */}
                        {(tx.status === 'completed' || tx.status === 'finalized') && (tx.fedexTracking || (tx.packageTracking && Object.keys(tx.packageTracking).length > 0)) && (
                            <button
                                onClick={printJobSheet}
                                disabled={pdfLoading === 'job-sheet'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                                title="Print job sheet with addresses and barcodes"
                            >
                                {pdfLoading === 'job-sheet' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
                                Print Job Sheet
                            </button>
                        )}
                        {canDoAction(tx, 'edit') && (
                            <button
                                onClick={() => setEditModal(true)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        )}
                        {canDoAction(tx, 'delete') && (
                            <button
                                onClick={() => setDeleteModal(true)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Info Cards ──────────────────────────────────── */}
                <div className={`grid grid-cols-1 gap-4 ${showShipping ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-3'}`}>
                    {/* General Information */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-gray-500" />
                            General Information
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">License Plate</dt>
                                <dd className="text-xs font-mono font-medium text-gray-900">{tx.licensePlate}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Service Type</dt>
                                <dd className="text-xs font-medium text-gray-900">
                                    {tx.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Created</dt>
                                <dd className="text-xs font-medium text-gray-900">{formatDate(tx.createdAt)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Updated</dt>
                                <dd className="text-xs font-medium text-gray-900">{formatDate(tx.updatedAt)}</dd>
                            </div>
                            {tx.finalizedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-xs text-gray-500">Finalized</dt>
                                    <dd className="text-xs font-medium text-gray-900">{formatDate(tx.finalizedAt)}</dd>
                                </div>
                            )}
                            {tx.notes && (
                                <div className="pt-2 border-t border-gray-100">
                                    <dt className="text-xs text-gray-500 mb-1">Notes</dt>
                                    <dd className="text-xs text-gray-700">{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            Store &amp; Processor
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Store Name</dt>
                                <dd className="text-xs font-medium text-gray-900">{tx.pharmacyName || '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Processor</dt>
                                <dd className="text-xs font-medium text-gray-900">{tx.processorName || '—'}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Items & Values */}
                    {/* <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            Items &amp; Values
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Total Items</dt>
                                <dd className="text-xs font-medium text-gray-900">{returnableAndTbdItemsCount}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Returnable Value</dt>
                                <dd className="text-xs font-medium text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-gray-500">Non-Returnable Value</dt>
                                <dd className="text-xs font-medium text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <dt className="text-xs font-semibold text-gray-700">Total Value</dt>
                                <dd className="text-xs font-bold text-gray-900">
                                    {formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}
                                </dd>
                            </div>
                        </dl>
                    </div> */}

                    {/* Shipping (conditional) */}
                    {showShipping && (
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-gray-500" />
                                Shipping
                            </h2>
                            <dl className="space-y-2">
                                {tx.fedexTracking && (
                                    <div className="flex justify-between">
                                        <dt className="text-xs text-gray-500">FedEx Tracking</dt>
                                        <dd className="text-xs font-medium text-gray-900 font-mono">{tx.fedexTracking}</dd>
                                    </div>
                                )}
                                {tx.fedexPickupConfirmation && (
                                    <div className="flex justify-between">
                                        <dt className="text-xs text-gray-500">Pickup Confirmation</dt>
                                        <dd className="text-xs font-medium text-gray-900 font-mono">{tx.fedexPickupConfirmation}</dd>
                                    </div>
                                )}
                                
                                {/* Package Tracking with Print Labels */}
                                {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <dt className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                                            <span>Package Tracking</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={printShippingLabels}
                                                    disabled={pdfLoading === 'shipping-labels'}
                                                    className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                    title="Print all shipping labels with addresses and barcodes"
                                                >
                                                    {pdfLoading === 'shipping-labels' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                    Print All Labels
                                                </button>
                                            </div>
                                        </dt>
                                        <dd className="space-y-1.5 mt-1">
                                            {Object.entries(tx.packageTracking)
                                                .filter(([, v]) => v)
                                                .map(([key, val], idx) => (
                                                    <div key={key} className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500 capitalize">{key.replace(/([0-9]+)/, ' $1')}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-gray-900">{val}</span>
                                                            <button
                                                                onClick={() => printSingleLabel(idx + 1)}
                                                                disabled={pdfLoading === `shipping-label-${idx + 1}`}
                                                                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                                title={`Print shipping label for ${val}`}
                                                            >
                                                                {pdfLoading === `shipping-label-${idx + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </dd>
                                    </div>
                                )}
                                
                                {/* FedEx Labels */}
                                {tx.fedexLabels && Object.keys(tx.fedexLabels).length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <dt className="text-gray-500 mb-1 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Shipping Labels</dt>
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
                        </div>
                    )}
                </div>

                {/* ── Documents Section ───────────────────────────── */}
                {showDocuments && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            Documents
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Download className="w-3.5 h-3.5" /> Download Manifest
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Summary Bar ─────────────────────────────────── */}
                {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Items</p>
                        <p className="text-lg font-bold text-gray-900">{returnableAndTbdItemsCount}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-green-600 mb-1">Returnable</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-red-600 mb-1">Non-Returnable</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-blue-600 mb-1">Total Value</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                </div> */}

                {/* ── Items Section ───────────────────────────────── */}
                <div className="bg-white rounded-lg shadow">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            Products ({itemsSummary?.totalItems ?? items.length})
                        </h2>
                        {canDoAction(tx, 'add_items') && (
                            <button
                                onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                        )}
                    </div>

                    {/* Items Filters */}
                    <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-gray-100">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by NDC, name, or manufacturer..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={itemStatusFilter}
                            onChange={e => setItemStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="returnable">Returnable</option>
                            <option value="non_returnable">Non-Returnable</option>
                            <option value="tbd">TBD</option>
                        </select>
                    </div>

                    {/* Items Table */}
                    {isItemsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium mb-1">No items found</p>
                            <p className="text-xs text-gray-400 mb-3">
                                {itemSearch || itemStatusFilter ? 'Try adjusting your filters.' : 'Start adding items to this return.'}
                            </p>
                            {canDoAction(tx, 'add_items') && !itemSearch && !itemStatusFilter && (
                                <button
                                    onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <ScanLine className="w-3 h-3" /> Start Scanning
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">NDC</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Manufacturer</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Pkg Size</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Qty Returned</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Serial#</th>
                                        {/* <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Price</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Est. Value</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Est. Store Value</th> */}
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Expires</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Destination</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const itemBadge = getItemStatusBadge(item.returnStatus);
                                        return (
                                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-gray-900">{item.ndc}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="text-xs font-medium text-gray-900 truncate max-w-[180px]">
                                                        {item.proprietaryName || item.genericName || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-700">{item.manufacturer || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.fullPackageSize || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">
                                                        {(() => {
                                                            const qtyReturned = item.fullPackageQtyReturned ?? item.quantity;
                                                            const displayQty = (item.fullPackageQtyReturned && item.fullPackageSize && item.fullPackageQtyReturned === item.fullPackageSize) ? 1 : qtyReturned;
                                                            return <>{displayQty}{item.isPartial && <span className="text-orange-500 font-semibold ml-0.5">P</span>}</>;
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-gray-700">{item.serialNumber || '—'}</span>
                                                </td>
                                                {/* <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.standardPrice ? formatCurrency(item.standardPrice) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900 font-medium">{item.estimatedValue ? formatCurrency(item.estimatedValue) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-900">{item.estimatedStoreValue ? formatCurrency(item.estimatedStoreValue) : '—'}</span>
                                                </td> */}
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-gray-700">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant={itemBadge.variant}>
                                                                <span className="text-[10px]">{itemBadge.label}</span>
                                                            </Badge>
                                                            {item.wineCellarId && (
                                                                <Badge variant="info">
                                                                    <span className="text-[10px]">WC</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {/* FCR-52: Show reason for non-returnable items */}
                                                        {item.returnStatus === 'non_returnable' && item.nonReturnableReason && (
                                                            <span
                                                                className="text-[10px] text-red-700 italic"
                                                                title={formatNonReturnableReason(item.nonReturnableReason)}
                                                            >
                                                                {formatNonReturnableReason(item.nonReturnableReason)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {item.returnStatus === 'returnable' ? (
                                                        item.destination ? (
                                                            <span className="text-xs text-gray-700">{item.destination}</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-500 flex items-center gap-0.5">
                                                                <AlertTriangle className="w-3 h-3" /> Missing
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        {canDoAction(tx, 'edit') && (
                                                            <button
                                                                onClick={() => setEditItemModal(item)}
                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                title="Edit Item"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDoAction(tx, 'delete') && (
                                                            <button
                                                                onClick={() => setDeleteItemModal(item)}
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Edit Return Modal ───────────────────────────── */}
                {editModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Edit Return — {tx.licensePlate}</h2>
                                <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">FedEx Tracking Number</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexTracking}
                                        onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        placeholder="Enter tracking number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">FedEx Pickup Confirmation</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexPickupConfirmation}
                                        onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        placeholder="Enter pickup confirmation"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Status Action Modal ─────────────────────────── */}
                {actionModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    {actionModal.action === 'pause' && 'Pause Return'}
                                    {actionModal.action === 'resume' && 'Resume Return'}
                                    {actionModal.action === 'complete' && 'Mark as Completed'}
                                </h2>
                                <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-gray-700">
                                    Are you sure you want to <strong>{actionModal.action}</strong> return <strong>{tx.licensePlate}</strong>?
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Return Modal ─────────────────────────── */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
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
                                <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Item Modal ─────────────────────────────── */}
                {editItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditItemModal(null)}>
                        <div className="bg-white rounded-lg max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Edit Item — {editItemModal.ndc}</h2>
                                <button onClick={() => setEditItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Pkg Size</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editItemForm.fullPackageSize}
                                            onChange={e => setEditItemForm({ ...editItemForm, fullPackageSize: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. 60"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Qty Returned</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editItemForm.fullPackageQtyReturned}
                                            onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. 45"
                                        />
                                    </div>
                                </div>
                                {isEditPolicyChecking && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Checking policy...
                                    </div>
                                )}
                                {editPolicyCheck && (
                                    <div className={`flex items-start gap-1.5 text-xs rounded px-2.5 py-1.5 border ${
                                        editPolicyCheck.status === 'returnable' ? 'bg-green-50 border-green-200 text-green-800' :
                                        editPolicyCheck.status === 'non_returnable' ? 'bg-red-50 border-red-200 text-red-800' :
                                        'bg-yellow-50 border-yellow-200 text-yellow-800'
                                    }`}>
                                        {editPolicyCheck.status === 'returnable' ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                                         editPolicyCheck.status === 'non_returnable' ? <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> :
                                         <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                                        <div>
                                            <span className="font-semibold">{editPolicyCheck.manufacturerName ? `${editPolicyCheck.manufacturerName}: ` : 'Policy: '}</span>
                                            {editPolicyCheck.status === 'returnable' && 'Returnable — status & destination updated.'}
                                            {editPolicyCheck.status === 'non_returnable' && `Non-Returnable${editPolicyCheck.reason ? ` — ${editPolicyCheck.reason.replace(/_/g, ' ')}` : ''}`}
                                            {editPolicyCheck.status === 'tbd' && 'No policy found — set status manually.'}
                                        </div>
                                    </div>
                                )}
                                {/* <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editItemForm.standardPrice}
                                        onChange={e => setEditItemForm({ ...editItemForm, standardPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        min="0"
                                    />
                                </div> */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Return Status</label>
                                    <select
                                        value={editItemForm.returnStatus}
                                        onChange={e => setEditItemForm({ ...editItemForm, returnStatus: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="tbd">TBD</option>
                                        <option value="returnable">Returnable</option>
                                        <option value="non_returnable">Non-Returnable</option>
                                    </select>
                                </div>
                                {/* FCR-52: Non-returnable reason — required when status is non_returnable */}
                                {editItemForm.returnStatus === 'non_returnable' && (
                                    <div className="p-2.5 rounded border border-red-200 bg-red-50">
                                        <label className="block text-xs font-semibold text-red-800 mb-1">
                                            Non-Returnable Reason <span className="text-red-600">*</span>
                                        </label>
                                        <select
                                            value={editItemForm.nonReturnableReason}
                                            onChange={e => setEditItemForm({ ...editItemForm, nonReturnableReason: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs border border-red-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                                        >
                                            <option value="">— Select a reason —</option>
                                            {NON_RETURNABLE_REASONS.map(r => (
                                                <option key={r.id} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Destination</label>
                                    <select
                                        value={editItemForm.destination}
                                        onChange={e => setEditItemForm({ ...editItemForm, destination: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="">— Select Destination —</option>
                                        {reverseDistributors.map(rd => (
                                            <option key={rd.id} value={rd.name}>{rd.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Memo</label>
                                    <textarea
                                        value={editItemForm.memo}
                                        onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                        placeholder="Optional memo"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleUpdateItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Item Modal ───────────────────────────── */}
                {deleteItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                        <div className="bg-white rounded-lg max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-900">Delete Item</h2>
                                <button onClick={() => setDeleteItemModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-gray-700">
                                    Are you sure you want to delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.genericName || deleteItemModal.ndc}</strong>
                                    {deleteItemModal.lotNumber && <> (Lot: <span className="font-mono">{deleteItemModal.lotNumber}</span>)</>}? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={handleDeleteItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            </PermissionGuard>
        </DashboardLayout>
    );
}
