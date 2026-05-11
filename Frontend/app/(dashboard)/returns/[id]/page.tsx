'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import {
    ArrowLeft, Loader2, AlertCircle, X, Play, CheckCircle, Lock,
    Trash2, Edit, ClipboardList, Building2, Package, Truck,
    Plus, Search, ScanLine, FileText, Download, AlertTriangle, Printer, QrCode,
    ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
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
    storeNumber?: string | null;
    pharmacyStreetAddress?: string | null;
    pharmacyCity?: string | null;
    pharmacyState?: string | null;
    processorId?: string;
    processorName?: string;
    serviceType: string;
    status: string;
    totalItems: number;
    totalReturnableValue: number;
    totalNonReturnableValue: number;
    hasCiiItems?: boolean; // For DEA Form 222 availability
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
    createdByProcessor?: boolean;
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
    quantityReturned?: number;
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
    // If return was created by processor, pharmacy can only view - no actions allowed
    if (tx.processorId) {
        return false;
    }
    
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

/** Products table on return detail — rows per page */
const RETURN_DETAIL_ITEMS_PAGE_SIZE = 10;

const ITEM_SORT_OPTIONS = [
    { value: 'createdAt', label: 'Date Added' },
    { value: 'ndc', label: 'NDC' },
    { value: 'proprietaryName', label: 'Product Name' },
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'expirationDate', label: 'Expiration Date' },
    { value: 'returnStatus', label: 'Status' },
    { value: 'lotNumber', label: 'Lot Number' },
];

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
    const [itemsPagination, setItemsPagination] = useState<{
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
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

    // Filters and sorting
    const [itemSearch, setItemSearch] = useState('');
    const [itemStatusFilter, setItemStatusFilter] = useState('');
    const [itemSortBy, setItemSortBy] = useState('createdAt');
    const [itemSortOrder, setItemSortOrder] = useState<'asc' | 'desc'>('desc');
    const debouncedItemSearch = useDebounce(itemSearch, 300);
    const [itemsTablePage, setItemsTablePage] = useState(1);

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
            const queryParams: any = {
                page: itemsTablePage,
                limit: RETURN_DETAIL_ITEMS_PAGE_SIZE,
                sort: itemSortBy,
                order: itemSortOrder,
            };
            if (debouncedItemSearch) queryParams.search = debouncedItemSearch;
            if (itemStatusFilter) queryParams.status = itemStatusFilter;

            const res = await apiClient.get<any>(`/return-transactions/${id}/items`, queryParams, true);
            if (res.status === 'success') {
                setItems(res.data.items || []);
                if (res.data.summary) {
                    setItemsSummary(res.data.summary);
                }
                // Set pagination from API response
                if (res.data.pagination) {
                    setItemsPagination(res.data.pagination);
                }
            } else {
                throw new Error(res.message || 'Failed to fetch items');
            }
        } catch (err: any) {
            showToast('Failed to load items', 'error');
        } finally {
            setIsItemsLoading(false);
        }
    }, [id, debouncedItemSearch, itemStatusFilter, itemSortBy, itemSortOrder, itemsTablePage]);

    useEffect(() => {
        setItemsTablePage(1);
    }, [debouncedItemSearch, itemStatusFilter, itemSortBy, itemSortOrder]);

    useEffect(() => {
        if (itemsPagination) {
            const maxPage = Math.max(1, itemsPagination.totalPages);
            setItemsTablePage((p) => Math.min(p, maxPage));
        }
    }, [itemsPagination]);

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

    // Handle browser back button - always redirect to returns list
    useEffect(() => {
        // Push a dummy state to intercept back button
        window.history.pushState(null, '', window.location.href);
        
        const handlePopState = () => {
            // Push state again to prevent going further back
            window.history.pushState(null, '', window.location.href);
            // Use window.location for reliable navigation
            window.location.href = '/returns';
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

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
                fullPackageQtyReturned: (editItemModal.fullPackageQtyReturned ?? editItemModal.quantityReturned)
                    ? String(editItemModal.fullPackageQtyReturned ?? editItemModal.quantityReturned)
                    : (editItemModal.quantity ? String(editItemModal.quantity) : ''),
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
        // Policy check disabled
        return;
        // if (!editItemModal) return;
        // const ndc = editItemModal.ndc;
        // const expDate = editItemModal.expirationDate;
        // if (!ndc || !expDate) return;

        // const pkgSize = parseInt(editItemForm.fullPackageSize) || 0;
        // const qtyReturned = parseInt(editItemForm.fullPackageQtyReturned) || 0;
        // const isPartial = pkgSize > 0 && qtyReturned > 0 && qtyReturned < pkgSize;

        // setIsEditPolicyChecking(true);
        // setEditPolicyCheck(null);
        // try {
        //     const res = await apiClient.post<any>('/policies/check', {
        //         ndc,
        //         expirationDate: expDate,
        //         dosageForm: editItemModal.dosageForm || undefined,
        //         isPartial,
        //     }, true);
        //     if (res.status === 'success' && res.data) {
        //         const policy = res.data;
        //         setEditPolicyCheck(policy);
        //         if (policy.status === 'returnable' || policy.status === 'non_returnable') {
        //             setEditItemForm(prev => ({
        //                 ...prev,
        //                 returnStatus: policy.status,
        //                 destination: policy.destination || prev.destination,
        //             }));
        //         }
        //     }
        // } catch { /* non-critical */ }
        // setIsEditPolicyChecking(false);
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
        // if (editItemForm.returnStatus === 'non_returnable') {
        //     const { isValidNonReturnableReason } = await import('@/lib/constants/nonReturnableReasons');
        //     if (!isValidNonReturnableReason(editItemForm.nonReturnableReason)) {
        //         showToast('Please select a non-returnable reason for this item.', 'error');
        //         return;
        //     }
        // }

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
                        <p className="text-sm text-[#6b7280]">Loading return transaction...</p>
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
                <div className="bg-red-50 border border-red-200 rounded-[4px] p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-800">{error || 'Return transaction not found'}</p>
                    <button
                        className="mt-3 px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors"
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

    // Use server-side pagination data
    const itemsTableTotalPages = itemsPagination?.totalPages || 1;
    const paginatedItemsTable = items; // Items are already paginated by server
    const totalItemsCount = itemsPagination?.totalItems || items.length;
    const itemsTableRangeStart = totalItemsCount === 0 
        ? 0 
        : (itemsTablePage - 1) * RETURN_DETAIL_ITEMS_PAGE_SIZE + 1;
    const itemsTableRangeEnd = Math.min(
        itemsTablePage * RETURN_DETAIL_ITEMS_PAGE_SIZE,
        totalItemsCount
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
                            onClick={() => router.push('/returns')}
                            className="p-1.5 text-[#9ca3af] hover:text-[#505454] hover:bg-[#f5f2f1] rounded transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-lg font-mono font-bold text-[#000000]">{tx.licensePlate}</h1>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                            </div>
                            <p className="text-xs text-[#6b7280]">Return Transaction Details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canDoAction(tx, 'resume') && (
                            <button
                                onClick={() => setActionModal({ action: 'resume' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                            >
                                <Play className="w-3 h-3" /> Resume
                            </button>
                        )}
                        {canDoAction(tx, 'complete') && (
                            <button
                                onClick={() => {
                                    // Require at least 1 item to complete a return
                                    if (!items || items.length === 0) {
                                        showToast('Cannot complete return: At least 1 item is required', 'error');
                                        return;
                                    }
                                    setActionModal({ action: 'complete' });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
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
                        {/* Print Job Sheet - Moved to Documents section */}
                        {/* {canDoAction(tx, 'edit') && (
                            <button
                                onClick={() => setEditModal(true)}
                                className="p-1.5 text-[#9ca3af] hover:text-[#516057] hover:bg-[#f5f2f1] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                                title="Edit"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        )} */}
                        {canDoAction(tx, 'delete') && (
                            <button
                                onClick={() => setDeleteModal(true)}
                                className="p-1.5 text-[#9ca3af] hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Info Cards ──────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* General Information */}
                    <div className="bg-white rounded-[4px] shadow p-4">
                        <h2 className="text-sm font-semibold text-[#000000] mb-3 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-[#6b7280]" />
                            General Information
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">License Plate</dt>
                                <dd className="text-xs font-mono font-medium text-[#000000]">{tx.licensePlate}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Service Type</dt>
                                <dd className="text-xs font-medium text-[#000000]">
                                    {tx.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Created</dt>
                                <dd className="text-xs font-medium text-[#000000]">{formatDate(tx.createdAt)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Updated</dt>
                                <dd className="text-xs font-medium text-[#000000]">{formatDate(tx.updatedAt)}</dd>
                            </div>
                            {tx.finalizedAt && (
                                <div className="flex justify-between">
                                    <dt className="text-xs text-[#6b7280]">Finalized</dt>
                                    <dd className="text-xs font-medium text-[#000000]">{formatDate(tx.finalizedAt)}</dd>
                                </div>
                            )}
                            {tx.notes && (
                                <div className="pt-2 border-t border-[#f3f4f6]">
                                    <dt className="text-xs text-[#6b7280] mb-1">Notes</dt>
                                    <dd className="text-xs text-[#505454]">{tx.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Store & Processor */}
                    <div className="bg-white rounded-[4px] shadow p-4">
                        <h2 className="text-sm font-semibold text-[#000000] mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#6b7280]" />
                            Store &amp; Processor
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Store Name</dt>
                                <dd className="text-xs font-medium text-[#000000]">{tx.pharmacyName || '—'}</dd>
                            </div>
                            
                            {/* Store Address */}
                            {tx.pharmacyStreetAddress && (
                                <div className="flex justify-between">
                                    <dt className="text-xs text-[#6b7280]">Address</dt>
                                    <dd className="text-xs font-medium text-[#000000]">{tx.pharmacyStreetAddress}</dd>
                                </div>
                            )}
                            
                            {/* City / State */}
                            {(tx.pharmacyCity || tx.pharmacyState) && (
                                <div className="flex justify-between">
                                    <dt className="text-xs text-[#6b7280]">City / State</dt>
                                    <dd className="text-xs font-medium text-[#000000]">
                                        {[tx.pharmacyCity, tx.pharmacyState].filter(Boolean).join(', ') || '—'}
                                    </dd>
                                </div>
                            )}
                            
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Service Type</dt>
                                <dd className="text-xs font-medium text-[#000000]">
                                    {tx.serviceType ? tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}
                                </dd>
                            </div>
                            
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Processor</dt>
                                <dd className="text-xs font-medium text-[#000000]">{tx.processorName || '—'}</dd>
                            </div>
                            
                            {/* Shipping Details Section */}
                            {(tx.fedexTracking || tx.fedexPickupConfirmation) && (
                                <>
                                    <div className="pt-2 border-t border-[#f3f4f6]" />
                                    {tx.fedexTracking && (
                                        <div className="flex justify-between">
                                            <dt className="text-xs text-[#6b7280]">FedEx Tracking</dt>
                                            <dd className="text-xs font-medium text-[#000000] font-mono">{tx.fedexTracking}</dd>
                                        </div>
                                    )}
                                    {tx.fedexPickupConfirmation && (
                                        <div className="flex justify-between">
                                            <dt className="text-xs text-[#6b7280]">Pickup Confirmation</dt>
                                            <dd className="text-xs font-medium text-[#000000] font-mono">{tx.fedexPickupConfirmation}</dd>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {/* Package Tracking with Print Labels */}
                            {tx.packageTracking && Object.keys(tx.packageTracking).length > 0 && (
                                <div className="pt-2 border-t border-[#f3f4f6]">
                                    <dt className="text-xs text-[#6b7280] mb-2 flex items-center justify-between">
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
                                            .map(([key, val], idx) => {
                                                // Handle both formats: "package1" and "1"
                                                const displayKey = key.startsWith('package') 
                                                    ? key.replace(/([0-9]+)/, ' $1')
                                                    : `Package ${key}`;
                                                return (
                                                    <div key={key} className="flex justify-between items-center text-xs">
                                                        <span className="text-[#6b7280] capitalize">{displayKey}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[#000000]">{val}</span>
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
                                                );
                                            })
                                        }
                                    </dd>
                                </div>
                            )}

                            {/* FedEx Labels */}
                            {tx.fedexLabels && Object.keys(tx.fedexLabels).length > 0 && (
                                <div className="pt-2 border-t border-[#f3f4f6]">
                                    <dt className="text-xs text-[#6b7280] mb-1 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Shipping Labels</dt>
                                    <dd className="flex flex-wrap gap-2">
                                        {Object.keys(tx.fedexLabels).map((key) => {
                                            const num = key.replace('package', '');
                                            return (
                                                <a
                                                    key={key}
                                                    href={`${process.env.NEXT_PUBLIC_API_URL}/return-transactions/${tx.id}/labels/${num}/download`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-[#f5f2f1] hover:bg-[#e2e2e2] text-xs text-[#505454] rounded border border-[#e2e2e2] transition-colors"
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

                    {/* Items & Values */}
                    {/* <div className="bg-white rounded-[4px] shadow p-4">
                        <h2 className="text-sm font-semibold text-[#000000] mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#6b7280]" />
                            Items &amp; Values
                        </h2>
                        <dl className="space-y-2">
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Total Items</dt>
                                <dd className="text-xs font-medium text-[#000000]">{returnableAndTbdItemsCount}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Returnable Value</dt>
                                <dd className="text-xs font-medium text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-xs text-[#6b7280]">Non-Returnable Value</dt>
                                <dd className="text-xs font-medium text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</dd>
                            </div>
                            <div className="flex justify-between border-t border-[#e2e2e2] pt-2">
                                <dt className="text-xs font-semibold text-[#505454]">Total Value</dt>
                                <dd className="text-xs font-bold text-[#000000]">
                                    {formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}
                                </dd>
                            </div>
                        </dl>
                    </div> */}

                    {/* Shipping section completely commented out - moved to Store & Processor section */}
                </div>

                {/* ── Documents Section ───────────────────────────── */}
                {showDocuments && (
                    <div className="bg-white rounded-[4px] shadow p-4">
                        <h2 className="text-sm font-semibold text-[#000000] mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#6b7280]" />
                            Documents
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => downloadPdf('manifest', `manifest-${tx.licensePlate}.pdf`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                            >
                                <Download className="w-3.5 h-3.5" /> Download Manifest
                            </button>
                            {/* DEA Form 222 - Available when there are CII items */}
                            {tx.hasCiiItems && (
                                <button
                                    onClick={() => downloadPdf('dea-form-222', `dea-form-222-${tx.licensePlate}.pdf`)}
                                    disabled={pdfLoading === 'dea-form-222'}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                                    title="Print job sheet with addresses and barcodes"
                                >
                                    {pdfLoading === 'job-sheet' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    Print Job Sheet
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Summary Bar ─────────────────────────────────── */}
                {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-[4px] shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-[#6b7280] mb-1">Items</p>
                        <p className="text-lg font-bold text-[#000000]">{returnableAndTbdItemsCount}</p>
                    </div>
                    <div className="bg-white rounded-[4px] shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-green-600 mb-1">Returnable</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                    <div className="bg-white rounded-[4px] shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-red-600 mb-1">Non-Returnable</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(itemsSummary?.totalNonReturnableValue ?? tx.totalNonReturnableValue)}</p>
                    </div>
                    <div className="bg-white rounded-[4px] shadow px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-[#516057] mb-1">Total Value</p>
                        <p className="text-lg font-bold text-[#505454]">{formatCurrency(itemsSummary?.totalReturnableValue ?? tx.totalReturnableValue)}</p>
                    </div>
                </div> */}

                {/* ── Items Section ───────────────────────────────── */}
                <div className="bg-white rounded-[4px] shadow">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2]">
                        <h2 className="text-sm font-semibold text-[#000000] flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#6b7280]" />
                            Products ({totalItemsCount})
                        </h2>
                        {canDoAction(tx, 'add_items') && (
                            <button
                                onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                            >
                                <Plus className="w-3 h-3" /> Add Items
                            </button>
                        )}
                    </div>

                    {/* Items Filters */}
                    <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-[#f3f4f6]">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                            <input
                                type="text"
                                placeholder="Search by NDC, name, or manufacturer..."
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                            />
                        </div>
                        <select
                            value={itemStatusFilter}
                            onChange={e => setItemStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                        >
                            <option value="">All Statuses</option>
                            <option value="returnable">Returnable</option>
                            <option value="non_returnable">Non-Returnable</option>
                            <option value="tbd">TBD</option>
                        </select>
                        <select
                            value={itemSortBy}
                            onChange={e => setItemSortBy(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                            title="Sort by"
                        >
                            {ITEM_SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setItemSortOrder(itemSortOrder === 'asc' ? 'desc' : 'asc')}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057] bg-white hover:bg-gray-50 transition-colors"
                            title={`Sort ${itemSortOrder === 'asc' ? 'ascending' : 'descending'}`}
                        >
                            {itemSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{itemSortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                        </button>
                    </div>

                    {/* Items Table */}
                    {isItemsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-[#6b7280] font-medium mb-1">No items found</p>
                            <p className="text-xs text-[#9ca3af] mb-3">
                                {itemSearch || itemStatusFilter ? 'Try adjusting your filters.' : 'Start adding items to this return.'}
                            </p>
                            {canDoAction(tx, 'add_items') && !itemSearch && !itemStatusFilter && (
                                <button
                                    onClick={() => router.push(`/returns/${tx.id}/add-items`)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]"
                                >
                                    <ScanLine className="w-3 h-3" /> Start Scanning
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-[#516057] border-b-2 border-[#516057]">
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">NDC</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Name</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Manufacturer</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Pkg Size</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Qty Returned</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Serial#</th>
                                        {/* <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Price</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Est. Value</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Est. Store Value</th> */}
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Expires</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Status</th>
                                        <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Destination</th>
                                        <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItemsTable.map((item) => {
                                        const itemBadge = getItemStatusBadge(item.returnStatus);
                                        return (
                                            <tr key={item.id} className="border-b border-[#f3f4f6] hover:bg-[#f5f2f1] transition-colors">
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-[#000000]">{item.ndc}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="text-xs font-medium text-[#000000] truncate max-w-[180px]">
                                                        {item.proprietaryName || item.genericName || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#505454]">{item.manufacturer || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#000000]">{item.fullPackageSize || '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#000000]">
                                                        {(() => {
                                                            const qtyReturned = item.fullPackageQtyReturned ?? item.quantityReturned ?? item.quantity;
                                                            const fullPkgQty = item.fullPackageQtyReturned ?? item.quantityReturned;
                                                            const displayQty = (fullPkgQty && item.fullPackageSize && fullPkgQty === item.fullPackageSize) ? 1 : qtyReturned;
                                                            return <>{displayQty}{item.isPartial && <span className="text-orange-500 font-semibold ml-0.5">P</span>}</>;
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs font-mono text-[#505454]">{item.serialNumber || '—'}</span>
                                                </td>
                                                {/* <td className="px-3 py-2">
                                                    <span className="text-xs text-[#000000]">{item.standardPrice ? formatCurrency(item.standardPrice) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#000000] font-medium">{item.estimatedValue ? formatCurrency(item.estimatedValue) : '—'}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#000000]">{item.estimatedStoreValue ? formatCurrency(item.estimatedStoreValue) : '—'}</span>
                                                </td> */}
                                                <td className="px-3 py-2">
                                                    <span className="text-xs text-[#505454]">{item.expirationDate ? formatDate(item.expirationDate) : '—'}</span>
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
                                                            <span className="text-xs text-[#505454]">{item.destination}</span>
                                                        ) : (
                                                            <span className="text-xs text-orange-500 flex items-center gap-0.5">
                                                                <AlertTriangle className="w-3 h-3" /> Missing
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-[#9ca3af]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        {canDoAction(tx, 'edit') && (
                                                            <button
                                                                onClick={() => setEditItemModal(item)}
                                                                className="p-1.5 text-[#9ca3af] hover:text-[#516057] hover:bg-[#f5f2f1] rounded transition-colors"
                                                                title="Edit Item"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDoAction(tx, 'delete') && (
                                                            <button
                                                                onClick={() => setDeleteItemModal(item)}
                                                                className="p-1 text-[#9ca3af] hover:text-red-600 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-[#516057]"
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
                            {/* Pagination - Always show if there are items */}
                            {items.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e2e2] bg-white">
                                    <p className="text-sm text-[#6b7280]">
                                        Showing {itemsTableRangeStart}–{itemsTableRangeEnd} of {totalItemsCount} items
                                        {itemsTableTotalPages > 1 && (
                                            <span className="ml-2">• Page {itemsTablePage} of {itemsTableTotalPages}</span>
                                        )}
                                    </p>
                                    
                                    {itemsTableTotalPages > 1 && (
                                        <div className="flex items-center gap-1">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => setItemsTablePage(p => Math.max(1, p - 1))}
                                                disabled={itemsTablePage <= 1}
                                                className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[var(--surface-container)] transition-colors"
                                                title="Previous page"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-[#505454]" />
                                            </button>

                                            {/* Page Numbers */}
                                            {(() => {
                                                const totalPages = itemsTableTotalPages;
                                                const current = itemsTablePage;
                                                const pages = [];
                                                
                                                if (totalPages <= 5) {
                                                    for (let i = 1; i <= totalPages; i++) {
                                                        pages.push(i);
                                                    }
                                                } else {
                                                    pages.push(1);
                                                    if (current <= 3) {
                                                        for (let i = 2; i <= 3; i++) {
                                                            pages.push(i);
                                                        }
                                                        pages.push('...');
                                                        pages.push(totalPages);
                                                    } else if (current >= totalPages - 2) {
                                                        pages.push('...');
                                                        for (let i = totalPages - 2; i <= totalPages; i++) {
                                                            pages.push(i);
                                                        }
                                                    } else {
                                                        pages.push('...');
                                                        pages.push(current);
                                                        pages.push('...');
                                                        pages.push(totalPages);
                                                    }
                                                }
                                                
                                                return pages.map((page, index) => 
                                                    page === '...' ? (
                                                        <span key={`ellipsis-${index}`} className="px-2 py-1.5 text-sm text-[#9ca3af]">...</span>
                                                    ) : (
                                                        <button
                                                            key={page}
                                                            onClick={() => setItemsTablePage(page as number)}
                                                            className={`px-3 py-1.5 text-sm border rounded-[4px] transition-colors ${
                                                                page === current
                                                                    ? 'border-[#516057] bg-[#516057] text-white font-semibold'
                                                                    : 'border-[#e2e2e2] text-[#505454] hover:bg-[var(--surface-container)]'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    )
                                                );
                                            })()}

                                            {/* Next Button */}
                                            <button
                                                onClick={() => setItemsTablePage(p => Math.min(itemsTableTotalPages, p + 1))}
                                                disabled={itemsTablePage >= itemsTableTotalPages}
                                                className="p-1.5 border border-[#e2e2e2] rounded-[4px] disabled:opacity-40 hover:bg-[var(--surface-container)] transition-colors"
                                                title="Next page"
                                            >
                                                <ChevronRight className="w-4 h-4 text-[#505454]" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Edit Return Modal ───────────────────────────── */}
                {editModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(false)}>
                        <div className="bg-white rounded-[4px] max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                                <h2 className="text-sm font-semibold text-[#000000]">Edit Return — {tx.licensePlate}</h2>
                                <button onClick={() => setEditModal(false)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                {/* <div>
                                    <label className="block text-xs font-medium text-[#505454] mb-0.5">FedEx Tracking Number</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexTracking}
                                        onChange={e => setEditForm({ ...editForm, fedexTracking: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                                        placeholder="Enter tracking number"
                                    />
                                </div> */}
                                <div>
                                    <label className="block text-xs font-medium text-[#505454] mb-0.5">FedEx Pickup Confirmation</label>
                                    <input
                                        type="text"
                                        value={editForm.fedexPickupConfirmation}
                                        onChange={e => setEditForm({ ...editForm, fedexPickupConfirmation: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]"
                                        placeholder="Enter pickup confirmation"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#505454] mb-0.5">Notes</label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057] resize-none"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                                <button onClick={() => setEditModal(false)} className="px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors">Cancel</button>
                                <button onClick={handleUpdate} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Status Action Modal ─────────────────────────── */}
                {actionModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setActionModal(null)}>
                        <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                                <h2 className="text-sm font-semibold text-[#000000]">
                                    {actionModal.action === 'pause' && 'Pause Return'}
                                    {actionModal.action === 'resume' && 'Resume Return'}
                                    {actionModal.action === 'complete' && 'Mark as Completed'}
                                </h2>
                                <button onClick={() => setActionModal(null)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-[#505454]">
                                    Are you sure you want to <strong>{actionModal.action}</strong> return <strong>{tx.licensePlate}</strong>?
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                                <button onClick={() => setActionModal(null)} className="px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors">Cancel</button>
                                <button onClick={handleStatusAction} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Return Modal ─────────────────────────── */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(false)}>
                        <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                                <h2 className="text-sm font-semibold text-[#000000]">Delete Return</h2>
                                <button onClick={() => setDeleteModal(false)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-[#505454]">
                                    Are you sure you want to delete return <strong>{tx.licensePlate}</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                                <button onClick={() => setDeleteModal(false)} className="px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors">Cancel</button>
                                <button onClick={handleDelete} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting...</> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Item Modal ─────────────────────────────── */}
                {editItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditItemModal(null)}>
                        <div className="bg-white rounded-[4px] max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                                <h2 className="text-sm font-semibold text-[#000000]">Edit Item — {editItemModal.ndc}</h2>
                                <button onClick={() => setEditItemModal(null)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                <div>
                                    <label className="block text-xs font-medium text-[#505454] mb-0.5">Quantity</label>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <label className="block text-[10px] text-[#6b7280] mb-0.5">Pkg Size</label>
                                            <div className="text-center py-1.5 bg-[#f5f2f1] border border-[#e2e2e2] rounded">
                                                {editItemForm.fullPackageSize || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-[#6b7280] mb-0.5">Qty Returned (units)</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={editItemForm.fullPackageSize || undefined}
                                                value={editItemForm.fullPackageQtyReturned || ''} 
                                                onChange={e => setEditItemForm({ ...editItemForm, fullPackageQtyReturned: e.target.value })} 
                                                className="w-full px-2 py-1.5 text-center text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057]" 
                                            />
                                        </div>
                                        {/* <div>
                                            <label className="block text-[10px] text-[#6b7280] mb-0.5">#</label>
                                            <div className="text-center py-1.5 bg-[#f5f2f1] border border-[#e2e2e2] rounded">
                                                {editItemForm.fullPackageQtyReturned && editItemForm.fullPackageSize ? 
                                                    Math.ceil(Number(editItemForm.fullPackageQtyReturned) / Number(editItemForm.fullPackageSize)) : '—'}
                                            </div>
                                        </div> */}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#505454] mb-0.5">Memo</label>
                                    <textarea
                                        value={editItemForm.memo}
                                        onChange={e => setEditItemForm({ ...editItemForm, memo: e.target.value })}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs border border-[#e2e2e2] rounded focus:outline-none focus:ring-1 focus:ring-[#516057] resize-none"
                                        placeholder="Optional memo"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                                <button onClick={() => setEditItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors">Cancel</button>
                                <button onClick={handleUpdateItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[#516057] text-white hover:bg-[#505454] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]">
                                    {isActionLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Delete Item Modal ───────────────────────────── */}
                {deleteItemModal && (
                    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteItemModal(null)}>
                        <div className="bg-white rounded-[4px] max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e2] bg-[#f5f2f1]">
                                <h2 className="text-sm font-semibold text-[#000000]">Delete Item</h2>
                                <button onClick={() => setDeleteItemModal(null)} className="text-[#9ca3af] hover:text-[#505454]"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-xs text-[#505454]">
                                    Are you sure you want to delete <strong>{deleteItemModal.proprietaryName || deleteItemModal.genericName || deleteItemModal.ndc}</strong>
                                    {deleteItemModal.lotNumber && <> (Lot: <span className="font-mono">{deleteItemModal.lotNumber}</span>)</>}? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#e2e2e2] bg-[#f5f2f1]">
                                <button onClick={() => setDeleteItemModal(null)} className="px-3 py-1.5 text-xs rounded border border-[#e2e2e2] text-[#505454] hover:bg-[#f5f2f1] transition-colors">Cancel</button>
                                <button onClick={handleDeleteItem} disabled={isActionLoading} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#516057]">
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
