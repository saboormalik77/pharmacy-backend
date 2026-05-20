'use client';

import { PermissionGate } from '@/components/auth/PermissionGate';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Loader2, ChevronLeft, ChevronRight, X, Clock,
    Mail, MailCheck, CheckCircle, Truck, AlertTriangle, Send,
    RefreshCw, Download, Printer, Edit, Layers, Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    fetchRATracking, fetchRATrackingGroupedByReturn, sendRARequest, receiveRA, resendRA, shipMemo,
    createDebitMemoFedexShipment, scheduleDebitMemoPickup,
    fetchEmailPreview, clearError, clearEmailPreview,
} from '@/lib/store/raTrackingSlice';
import {
    fetchAvailableMemosForGrouping, createShipmentGroup,
    createGroupFedexShipment, fetchShippedShipmentGroups, scheduleShipmentGroupPickup,
    clearError as clearGroupError,
} from '@/lib/store/shipmentGroupSlice';
import { DebitMemo, RAEmailTemplate, ReturnWithMemos } from '@/lib/types';
import { sumMemosTotalAskValue, sumMemosTotalItems } from '@/lib/utils/paymentTracking';

// ── Helpers ────────────────────────────────────────────────────

const RA_STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'requested', label: 'Requested' },
    { value: 'received', label: 'Received' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'overdue', label: 'Overdue' },
];

const DESTINATION_OPTIONS = [
    { value: '', label: 'All Destinations' },
    { value: 'Inmar', label: 'Inmar' },
    { value: 'PharmaLink', label: 'PharmaLink' },
    { value: 'Cardinal', label: 'Cardinal' },
    { value: 'Direct', label: 'Direct' },
];

function formatCurrency(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function getRAStatusBadge(s: string): { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'default' | 'secondary' } {
    switch (s) {
        case 'pending':   return { label: 'Pending', variant: 'default' };
        case 'requested': return { label: 'Requested', variant: 'info' };
        case 'received':  return { label: 'Received', variant: 'success' };
        case 'shipped':   return { label: 'Shipped', variant: 'secondary' };
        case 'overdue':   return { label: 'Overdue', variant: 'danger' };
        default:          return { label: s, variant: 'default' };
    }
}

/**
 * Workflow status for UI/actions. Uses timestamps and RA # when ra_status drifted
 * (e.g. pending in DB but ra_number / outbound_tracking already set).
 */
function effectiveRaStatus(memo: DebitMemo): 'pending' | 'requested' | 'received' | 'shipped' | 'overdue' {
    const outbound = (memo.outboundTracking || '').trim();
    if (memo.shippedAt != null || outbound !== '' || memo.raStatus === 'shipped') return 'shipped';
    if (memo.raReceivedAt != null || (memo.raNumber || '').trim() !== '' || memo.raStatus === 'received') {
        return 'received';
    }
    if (memo.raStatus === 'overdue') return 'overdue';
    if (
        memo.ticklerDate &&
        new Date(memo.ticklerDate) < new Date() &&
        (memo.raRequestedAt != null || memo.raStatus === 'requested')
    ) {
        return 'overdue';
    }
    if (memo.raRequestedAt != null || memo.raStatus === 'requested') return 'requested';
    return 'pending';
}

function isOverdue(memo: DebitMemo): boolean {
    return effectiveRaStatus(memo) === 'overdue';
}

type ModalType = null | 'request' | 'receive' | 'resend' | 'ship' | 'preview';

export default function RATrackingPage() {
    const dispatch = useAppDispatch();
    const { memos, pagination, summary, groupedReturns, groupedPagination, emailPreview, isLoading, isActionLoading, isPreviewLoading, error } =
        useAppSelector(s => s.raTracking);
    const {
        availableMemos,
        shippedGroups,
        shippedPagination,
        isLoading: isGroupLoading,
        isActionLoading: isGroupActionLoading,
        error: groupError,
    } = useAppSelector(s => s.shipmentGroup);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [raStatus, setRaStatus] = useState('');
    const [destination, setDestination] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [raView, setRaView] = useState<'memos' | 'group-shipments'>('memos');
    const [shippedGroupsPage, setShippedGroupsPage] = useState(1);
    const [expandedShippedGroupId, setExpandedShippedGroupId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [selectedMemo, setSelectedMemo] = useState<DebitMemo | null>(null);

    // Request modal state
    const [requestEmail, setRequestEmail] = useState('');

    // Receive modal state
    const [receiveRaNumber, setReceiveRaNumber] = useState('');
    const [receivePdfUrl, setReceivePdfUrl] = useState('');

    // Ship modal state
    const [shipTracking, setShipTracking] = useState('');
    const [shipMode, setShipMode] = useState<'choose' | 'fedex' | 'manual'>('choose');
    const [fedexBoxCount, setFedexBoxCount] = useState('1');
    const [fedexLoading, setFedexLoading] = useState(false);
    const [fedexResult, setFedexResult] = useState<{
        masterTrackingNumber: string;
        shipmentId: string;
        packageCount: number;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    } | null>(null);
    const [fedexLabels, setFedexLabels] = useState<Record<string, string>>({});
    
    // Group shipping state
    /** Memo IDs to include on one FedEx shipment from the Ship modal (always includes the opened memo). */
    const [selectedMemosForGroup, setSelectedMemosForGroup] = useState<string[]>([]);
    const [groupFedexLoading, setGroupFedexLoading] = useState(false);
    /** Shown in group-ship modal overlay while create-group / create-fedex run sequentially */
    const [groupShipSubmitPhase, setGroupShipSubmitPhase] = useState<'idle' | 'creating-group' | 'creating-fedex'>('idle');
    const [groupFedexResult, setGroupFedexResult] = useState<{
        masterTrackingNumber: string;
        shipmentId: string;
        packageCount: number;
        packages: { trackingNumber: string; hasLabel: boolean }[];
    } | null>(null);
    const [groupShipGroupId, setGroupShipGroupId] = useState<string | null>(null);
    const [groupShippedMemos, setGroupShippedMemos] = useState<DebitMemo[]>([]);
    const [groupPickupForm, setGroupPickupForm] = useState({
        readyTime: '09:00',
        closeTime: '17:00',
        pickupDate: new Date().toISOString().split('T')[0],
    });
    const [groupPickupLoading, setGroupPickupLoading] = useState(false);
    const [groupPickupConfirmation, setGroupPickupConfirmation] = useState('');
    /** Shipment group id, or `${groupId}:pkg:N` for a single package — only that control shows loading. */
    const [printGroupLabelLoading, setPrintGroupLabelLoading] = useState<string | null>(null);
    
    // Schedule pickup state
    const [pickupForm, setPickupForm] = useState({
        readyTime: '09:00',
        closeTime: '17:00',
        pickupDate: new Date().toISOString().split('T')[0],
    });
    const [pickupLoading, setPickupLoading] = useState(false);
    const [pickupConfirmation, setPickupConfirmation] = useState('');

    const [printLabelLoading, setPrintLabelLoading] = useState<string | null>(null);
    const [printAllPackageLabelsLoading, setPrintAllPackageLabelsLoading] = useState(false);
    const [printSinglePackageLabelLoading, setPrintSinglePackageLabelLoading] = useState<string | null>(null);

    const printDebitMemoLabel = async (memo: DebitMemo) => {
        setPrintLabelLoading(memo.id);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            if (memo.shipmentGroupId) {
                await printGroupLabels(memo.shipmentGroupId, { skipLoadingState: true });
                return;
            }
            const res = await fetch(`${baseUrl}/admin/debit-memos/${encodeURIComponent(memo.id)}/shipping-label`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print label', 'error');
        } finally {
            setPrintLabelLoading(null);
        }
    };

    /**
     * Print group labels: FedEx PDFs when stored on the group (new + old shipments alike).
     * Falls back to the HTML packing slip only when no PDFs exist in the database.
     */
    const printGroupLabels = async (
        groupId: string,
        options?: { skipLoadingState?: boolean }
    ) => {
        if (!options?.skipLoadingState) setPrintGroupLabelLoading(groupId);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const headers = { Authorization: `Bearer ${token}`, Accept: 'text/html' };

            let res = await fetch(
                `${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/fedex-labels/print-all`,
                { headers }
            );
            if (!res.ok) {
                res = await fetch(
                    `${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/shipping-label`,
                    { headers }
                );
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }

            const htmlContent = await res.text();
            const isFedexPdfPrintPage = htmlContent.includes('FedEx Shipping Labels Ready');
            const isPackingSlipOnly =
                htmlContent.includes('GROUP SHIPMENT —') && !isFedexPdfPrintPage;
            if (htmlContent.includes('sandbox-warning')) {
                addToast(
                    'FedEx sandbox/test mode: labels show TEST LABEL, SAMPLE, and 0000 tracking. Use production FEDEX_API_URL and create a new shipment for real labels.',
                    'warning'
                );
            }
            if (isPackingSlipOnly) {
                // addToast(
                //     'No FedEx PDF labels are saved for this group (common for older shipments). Showing address slip only. Create a new FedEx group shipment to store printable labels.',
                //     'warning'
                // );
            }

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                if (isPackingSlipOnly) {
                    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
                }
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print group labels', 'error');
        } finally {
            if (!options?.skipLoadingState) setPrintGroupLabelLoading(null);
        }
    };

    // Print a single package's clean HTML shipping label (with addresses + barcode)
    const printSinglePackageLabel = async (memoId: string, packageNumber: number, trackingNumber: string, totalPackages: number) => {
        setPrintSinglePackageLabelLoading(trackingNumber);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const url = `${baseUrl}/admin/debit-memos/${encodeURIComponent(memoId)}/shipping-label?tracking=${encodeURIComponent(trackingNumber)}&packageNumber=${packageNumber}&totalPackages=${totalPackages}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print label', 'error');
        } finally {
            setPrintSinglePackageLabelLoading(null);
        }
    };

    // Print all package labels (one per page) using clean HTML format
    const printAllPackageLabels = async (memoId: string, trackingNumbers: string[]) => {
        if (trackingNumbers.length === 0) {
            addToast('No tracking numbers available', 'error');
            return;
        }
        setPrintAllPackageLabelsLoading(true);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const url = `${baseUrl}/admin/debit-memos/${encodeURIComponent(memoId)}/shipping-label?trackingNumbers=${encodeURIComponent(trackingNumbers.join(','))}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print labels', 'error');
        } finally {
            setPrintAllPackageLabelsLoading(false);
        }
    };

    const printShipmentGroupLabel = async (groupId: string) => {
        setPrintGroupLabelLoading(groupId);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/shipping-label`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print group label', 'error');
        } finally {
            setPrintGroupLabelLoading(null);
        }
    };

    const printAllFedexLabels = async (groupId: string, trackingNumbers?: string[]) => {
        setPrintGroupLabelLoading(groupId);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const q = trackingNumbers?.length
                ? `?trackingNumbers=${encodeURIComponent(trackingNumbers.join(','))}`
                : '';
            const res = await fetch(`${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/fedex-labels/print-all${q}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Print failed' }));
                throw new Error(err.message || 'Print failed');
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print FedEx labels', 'error');
        } finally {
            setPrintGroupLabelLoading(null);
        }
    };

    const printSingleFedexLabel = async (groupId: string, packageNumber: number, trackingNumber?: string) => {
        const loadingKey = `${groupId}:pkg:${packageNumber}`;
        setPrintGroupLabelLoading(loadingKey);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const params = new URLSearchParams({ format: 'print' });
            if (trackingNumber) params.set('tracking', trackingNumber);
            params.set('totalPackages', String(groupFedexResult?.packages.length || 1));
            const url = `${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/fedex-labels/${packageNumber}/download?${params.toString()}`;
            // Use format=print to get an HTML page with embedded PDF that auto-prints
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/html' },
            });
            if (!res.ok) {
                // FedEx PDF not stored (sandbox mode or older shipment) — fall back to the
                // same HTML packing-slip / FedEx-PDF chain that the listing uses.
                await printGroupLabels(groupId, { skipLoadingState: true });
                return;
            }
            const htmlContent = await res.text();
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                throw new Error('Unable to open print window. Please check popup blockers.');
            }
        } catch (e: any) {
            addToast(e.message || 'Failed to print FedEx label', 'error');
        } finally {
            setPrintGroupLabelLoading(null);
        }
    };

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message: msg, type }]);
    }, []);

    const loadData = useCallback(() => {
        dispatch(fetchRATrackingGroupedByReturn({
            raStatus: raStatus || undefined,
            destination: destination || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: debouncedSearch || undefined,
            page: currentPage,
            limit: 10,
        }));
    }, [dispatch, raStatus, destination, dateFrom, dateTo, debouncedSearch, currentPage]);

    const loadShippedGroups = useCallback(() => {
        dispatch(fetchShippedShipmentGroups({
            page: shippedGroupsPage,
            limit: 10,
            destination: destination?.trim() || undefined,
        }));
    }, [dispatch, shippedGroupsPage, destination]);

    useEffect(() => { if (raView === 'memos') loadData(); }, [loadData, raView]);
    useEffect(() => { if (raView === 'group-shipments') loadShippedGroups(); }, [loadShippedGroups, raView]);
    useEffect(() => { if (error) { addToast(error, 'error'); dispatch(clearError()); } }, [error, addToast, dispatch]);
    useEffect(() => { if (groupError) { addToast(groupError, 'error'); dispatch(clearGroupError()); } }, [groupError, addToast, dispatch]);

    // ── Modal openers ──────────────────────────────────────────

    const openRequest = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setRequestEmail('');
        setActiveModal('request');
        dispatch(fetchEmailPreview({ memoId: memo.id, type: 'request' }));
    };

    const openReceive = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setReceiveRaNumber('');
        setReceivePdfUrl('');
        setActiveModal('receive');
    };

    const openResend = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setRequestEmail('');
        setActiveModal('resend');
        dispatch(fetchEmailPreview({ memoId: memo.id, type: 'reminder' }));
    };

    const openShip = (memo: DebitMemo) => {
        setSelectedMemo(memo);
        setShipTracking('');
        setShipMode('choose');
        setFedexBoxCount('1');
        setFedexLoading(false);
        setFedexResult(null);
        setFedexLabels({});
        setPickupConfirmation('');
        setPickupLoading(false);
        setPickupForm({ readyTime: '09:00', closeTime: '17:00', pickupDate: new Date().toISOString().split('T')[0] });
        setGroupFedexResult(null);
        setGroupShipGroupId(null);
        setGroupShippedMemos([]);
        setGroupPickupConfirmation('');
        setGroupPickupLoading(false);
        setGroupPickupForm({
            readyTime: '09:00',
            closeTime: '17:00',
            pickupDate: new Date().toISOString().split('T')[0],
        });
        setGroupFedexLoading(false);
        setGroupShipSubmitPhase('idle');
        setSelectedMemosForGroup([memo.id]);
        const memoDest = memo.destination?.trim();
        dispatch(fetchAvailableMemosForGrouping(memoDest ? { destination: memoDest } : undefined));
        setActiveModal('ship');
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedMemo(null);
        setFedexResult(null);
        setFedexLabels({});
        setGroupFedexResult(null);
        setGroupShipGroupId(null);
        setGroupShippedMemos([]);
        setGroupPickupConfirmation('');
        setGroupPickupLoading(false);
        setGroupFedexLoading(false);
        setGroupShipSubmitPhase('idle');
        setSelectedMemosForGroup([]);
        dispatch(clearEmailPreview());
    };

    // ── Actions ────────────────────────────────────────────────

    const handleSendRequest = async () => {
        if (!selectedMemo) return;
        const result = await dispatch(sendRARequest({
            memoId: selectedMemo.id,
            emailOverride: requestEmail || undefined,
        }));
        if (sendRARequest.fulfilled.match(result)) {
            addToast('RA request sent successfully', 'success');
            closeModal();
            loadData();
        }
    };

    const handleReceive = async () => {
        if (!selectedMemo) return;
        if (!receiveRaNumber.trim()) { addToast('RA number is required', 'warning'); return; }
        const result = await dispatch(receiveRA({
            memoId: selectedMemo.id,
            raNumber: receiveRaNumber.trim(),
            pdfUrl: receivePdfUrl || undefined,
        }));
        if (receiveRA.fulfilled.match(result)) {
            addToast('RA received recorded', 'success');
            closeModal();
            loadData();
        }
    };

    const handleResend = async () => {
        if (!selectedMemo) return;
        const result = await dispatch(resendRA({
            memoId: selectedMemo.id,
            emailOverride: requestEmail || undefined,
        }));
        if (resendRA.fulfilled.match(result)) {
            addToast('RA reminder sent', 'success');
            closeModal();
            loadData();
        }
    };

    const handleShip = async () => {
        if (!selectedMemo) return;
        if (!shipTracking.trim()) { addToast('Tracking number is required', 'warning'); return; }
        const result = await dispatch(shipMemo({
            memoId: selectedMemo.id,
            outboundTracking: shipTracking.trim(),
        }));
        if (shipMemo.fulfilled.match(result)) {
            addToast('Shipment recorded', 'success');
            closeModal();
            loadData();
        }
    };

    // ── Group Shipping Handlers ────────────────────────────────

    const handleGroupFedexShip = async () => {
        if (!selectedMemo) return;
        let memoIds = selectedMemosForGroup.includes(selectedMemo.id)
            ? selectedMemosForGroup
            : [...selectedMemosForGroup, selectedMemo.id];
        memoIds = [...new Set(memoIds)];
        if (memoIds.length < 2) {
            addToast('Select at least one additional memo to ship as a group, or use single-memo FedEx below.', 'warning');
            return;
        }

        const boxCount = parseInt(fedexBoxCount, 10) || 1;
        setGroupFedexLoading(true);
        setGroupShipSubmitPhase('creating-group');
        try {
            const groupResult = await dispatch(createShipmentGroup({
                memoIds,
                boxCount,
            }));

            if (createShipmentGroup.rejected.match(groupResult) || !createShipmentGroup.fulfilled.match(groupResult)) {
                return;
            }

            const groupId = groupResult.payload.group.id;
            setGroupShipSubmitPhase('creating-fedex');

            const fedexAction = await dispatch(createGroupFedexShipment({
                groupId,
                boxCount,
            }));

            console.log('🚀 FedEx Action Result:', fedexAction);

            if (!createGroupFedexShipment.fulfilled.match(fedexAction)) {
                console.log('❌ FedEx action NOT fulfilled:', fedexAction.type);
                return;
            }

            const p = fedexAction.payload;
            console.log('✅ FedEx payload:', p);
            setGroupFedexResult(p.shipment);
            setGroupShipGroupId(groupId);
            setGroupShippedMemos(p.memos || []);
            setGroupPickupConfirmation('');
            addToast(`FedEx shipment created for ${p.memos?.length ?? memoIds.length} memos`, 'success');
            loadData();
            if (raView === 'group-shipments') loadShippedGroups();
        } finally {
            setGroupFedexLoading(false);
            setGroupShipSubmitPhase('idle');
        }
    };

    const toggleShipWithMemo = (memoId: string) => {
        if (selectedMemo && memoId === selectedMemo.id) return;
        setSelectedMemosForGroup((prev) =>
            prev.includes(memoId) ? prev.filter((id) => id !== memoId) : [...prev, memoId]
        );
    };

    const selectAllShipPeersSameDestination = () => {
        if (!selectedMemo) return;
        const norm = (s: string) => (s || '').toLowerCase().trim();
        const nk = norm(selectedMemo.destination || '');
        const ids = availableMemos.filter((m) => norm(m.destination || '') === nk).map((m) => m.id);
        const withPrimary = ids.includes(selectedMemo.id) ? ids : [...ids, selectedMemo.id];
        setSelectedMemosForGroup(withPrimary);
    };

    const normShipDest = (s: string) => (s || '').toLowerCase().trim();
    const shipModalPeers = selectedMemo
        ? availableMemos.filter(
              (m) =>
                  m.id !== selectedMemo.id &&
                  normShipDest(m.destination || '') === normShipDest(selectedMemo.destination || '')
          )
        : [];

    const totalPages = groupedPagination?.totalPages || 1;

    // ── Row action buttons based on RA status ──────────────────

    const getRowActions = (memo: DebitMemo) => {
        const actions: React.ReactElement[] = [];
        const s = effectiveRaStatus(memo);

        if (s === 'pending') {
            actions.push(
                <Button key="req" variant="primary" size="sm" onClick={e => { e.stopPropagation(); openRequest(memo); }}>
                    <Mail className="w-3.5 h-3.5 mr-1" /> Request RA
                </Button>
            );
        }
        if (s === 'requested' || s === 'overdue') {
            actions.push(
                <Button key="resend" variant="warning" size="sm" onClick={e => { e.stopPropagation(); openResend(memo); }}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Resend
                </Button>
            );
            actions.push(
                <Button key="recv" variant="success" size="sm" onClick={e => { e.stopPropagation(); openReceive(memo); }}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Record RA
                </Button>
            );
        }
        if (s === 'received') {
            actions.push(
                <Button key="ship" variant="primary" size="sm" onClick={e => { e.stopPropagation(); openShip(memo); }}>
                    <Truck className="w-3.5 h-3.5 mr-1" /> Ship
                </Button>
            );
        }
        return actions;
    };

    return (
        <PermissionGate permission="warehouse">
        <div className="space-y-3">
            <ToastContainer toasts={toasts} onClose={id => setToasts(t => t.filter(x => x.id !== id))} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/warehouse"
                        className="inline-flex items-center gap-1 text-[11px] mb-1.5 transition-colors hover:underline"
                        style={{ color: 'var(--outline)' }}
                    >
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>RA Tracking</h1>
                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Track Return Authorization requests, receipts, and shipments</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setRaView('memos')}
                    className="px-3 py-1.5 rounded-[4px] text-xs font-medium border transition-colors hover:bg-primary-50/40 cursor-pointer"
                    style={{
                        backgroundColor: raView === 'memos' ? 'var(--primary)' : 'var(--surface-container-lowest)',
                        color: raView === 'memos' ? 'white' : 'var(--on-surface)',
                        borderColor: raView === 'memos' ? 'var(--primary)' : 'var(--outline-variant)',
                    }}
                >
                    All debit memos
                </button>
                <button
                    type="button"
                    onClick={() => { setRaView('group-shipments'); setShippedGroupsPage(1); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-medium border transition-colors hover:bg-primary-50/40 cursor-pointer"
                    style={{
                        backgroundColor: raView === 'group-shipments' ? 'var(--tertiary)' : 'var(--surface-container-lowest)',
                        color: raView === 'group-shipments' ? 'white' : 'var(--on-surface)',
                        borderColor: raView === 'group-shipments' ? 'var(--tertiary)' : 'var(--outline-variant)',
                    }}
                >
                    <Package className="w-3.5 h-3.5" /> Group shipments
                </button>
            </div>

            {raView === 'memos' && (<>
            {/* Summary Cards — compact inline strip */}
            {summary && (
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { icon: <Clock className="w-3.5 h-3.5" style={{ color: 'var(--outline)' }} />, label: 'Pending',   value: summary.pending,   valueColor: 'var(--on-surface)', bg: 'var(--surface-container-low)' },
                        { icon: <Mail className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />,  label: 'Requested', value: summary.requested, valueColor: 'var(--primary)', bg: 'var(--primary-fixed)' },
                        { icon: <MailCheck className="w-3.5 h-3.5" style={{ color: 'var(--secondary)' }} />, label: 'Received', value: summary.received, valueColor: 'var(--secondary)', bg: 'var(--secondary-container)' },
                        { icon: <Truck className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} />, label: 'Shipped', value: summary.shipped, valueColor: 'var(--tertiary)', bg: 'var(--tertiary-fixed)' },
                        { icon: <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} />, label: 'Overdue', value: summary.overdue, valueColor: 'var(--error)', bg: 'var(--error-container)' },
                    ].map(card => (
                        <div
                            key={card.label}
                            className="rounded-[4px] border px-3 py-2 flex items-center gap-2"
                            style={{ backgroundColor: card.bg, borderColor: 'var(--outline-variant)' }}
                        >
                            {card.icon}
                            <div>
                                <p className="text-[10px] leading-none" style={{ color: 'var(--on-surface-variant)' }}>{card.label}</p>
                                <p className="text-base font-bold leading-tight" style={{ color: card.valueColor }}>{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters — single compact row */}
            <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--outline)' }} />
                        <input
                            type="text" placeholder="Search memo #, pharmacy, RA #..."
                            className="w-full pl-8 pr-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={raStatus}
                        onChange={e => { setRaStatus(e.target.value); setCurrentPage(1); }}>
                        {RA_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                        className="border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}>
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input
                        type="date"
                        className="border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} title="From date" />
                    <input
                        type="date"
                        className="border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} title="To date" />
                </div>
            </div>

            {/* Table grouped by return */}
            <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                ) : groupedReturns.length === 0 ? (
                    <div className="text-center py-12" style={{ color: 'var(--on-surface-variant)' }}>
                        <MailCheck className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                        <p className="text-sm font-medium">No RA records found</p>
                        <p className="text-xs mt-1">RA tracking entries appear after batches are closed and debit memos generated.</p>
                    </div>
                ) : (
                    <div>
                        {groupedReturns.map((returnGroup) => (
                            <div
                                key={returnGroup.returnId}
                                className="border-b last:border-b-0"
                                style={{ borderColor: 'var(--outline-variant)' }}
                            >
                                {/* Return group header */}
                                <div
                                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-b"
                                    style={{
                                        backgroundColor: 'var(--surface-container-low)',
                                        borderColor: 'var(--outline-variant)',
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                                        <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
                                            Return
                                        </span>
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>
                                            {returnGroup.licensePlate}
                                        </span>
                                        <span className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                                            · {returnGroup.pharmacyName}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--outline)' }}>
                                            · {formatDate(returnGroup.returnCreatedAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>
                                        <span>
                                            {returnGroup.totalMemos} memo{returnGroup.totalMemos === 1 ? '' : 's'}
                                        </span>
                                        <span>·</span>
                                        <span>{sumMemosTotalItems(returnGroup.memos)} items</span>
                                        <span>·</span>
                                        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                            {formatCurrency(sumMemosTotalAskValue(returnGroup.memos))} ask
                                        </span>
                                    </div>
                                </div>

                                {/* Memo table within return group */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline-variant)' }}>
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Memo #</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Dest.</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Labeler</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Ask</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Requested</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Tickler</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">RA #</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Status</th>
                                                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                            {returnGroup.memos.map(memo => {
                                                const eff = effectiveRaStatus(memo);
                                                const sb = getRAStatusBadge(eff);
                                                const overdue = isOverdue(memo);
                                                return (
                                                    <tr
                                                        key={memo.id}
                                                        className="transition-colors hover:bg-[var(--surface-container)]"
                                                        style={{ backgroundColor: overdue ? 'var(--error-container)' : undefined, borderColor: 'var(--outline-variant)' }}
                                                    >
                                                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--primary)' }}>{memo.memoNumber}</td>
                                                        <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>{memo.destination || '—'}</td>
                                                        <td className="px-3 py-2 text-xs max-w-[120px] truncate" style={{ color: 'var(--on-surface-variant)' }}>{memo.labelerName || '—'}</td>
                                                        <td className="px-3 py-2 text-xs font-medium whitespace-nowrap">{formatCurrency(memo.totalAskValue)}</td>
                                                        <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>
                                                            {memo.raRequestedAt ? formatDate(memo.raRequestedAt) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                                                            {memo.ticklerDate ? (
                                                                <span style={{ color: overdue ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: overdue ? 600 : 400 }}>
                                                                    {formatDate(memo.ticklerDate)}{overdue && ' ⚠'}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{memo.raNumber || '—'}</td>
                                                        <td className="px-3 py-2">
                                                            <Badge variant={sb.variant}><span className="text-[10px]">{sb.label}</span></Badge>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {eff === 'pending' && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); openRequest(memo); }}
                                                                        title="Send RA Request"
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors whitespace-nowrap cursor-pointer"
                                                                    >
                                                                        <Mail className="w-3 h-3" /> Request
                                                                    </button>
                                                                )}
                                                                {(eff === 'requested' || eff === 'overdue') && (
                                                                    <>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); openResend(memo); }}
                                                                            title="Resend Reminder"
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:opacity-95 cursor-pointer"
                                                                        style={{ backgroundColor: 'var(--tertiary)', color: 'var(--on-tertiary)', borderColor: 'var(--outline-variant)' }}
                                                                        >
                                                                            <RefreshCw className="w-3 h-3" /> Resend
                                                                        </button>
                                                                        <button
                                                                            onClick={e => { e.stopPropagation(); openReceive(memo); }}
                                                                            title="Record RA Received"
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:bg-primary-50/40 cursor-pointer"
                                                                        style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}
                                                                        >
                                                                            <CheckCircle className="w-3 h-3" /> Record
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {eff === 'received' && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); openShip(memo); }}
                                                                        title="Record Shipment"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap hover:opacity-95 cursor-pointer"
                                                                    style={{ backgroundColor: 'var(--tertiary)', color: 'var(--on-tertiary)', borderColor: 'var(--outline-variant)' }}
                                                                    >
                                                                        <Truck className="w-3 h-3" /> Ship
                                                                    </button>
                                                                )}
                                                                {eff === 'shipped' && memo.outboundTracking && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); printDebitMemoLabel(memo); }}
                                                                        disabled={printLabelLoading === memo.id}
                                                                        title="Print shipping label"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50/40 cursor-pointer"
                                                                    style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}
                                                                    >
                                                                        {printLabelLoading === memo.id
                                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                            : <Printer className="w-3 h-3" />
                                                                        }
                                                                        Print Labels
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
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                            Page {currentPage} of {totalPages}{groupedPagination?.total != null && ` · ${groupedPagination.total} returns`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            </>)}

            {raView === 'group-shipments' && (
                <>
                    <div className="rounded-[4px] shadow px-3 py-2 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        <p className="text-xs mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                            Shipments where multiple debit memos were sent together (one FedEx tracking). Use destination to narrow the list.
                        </p>
                        <select
                            className="border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500"
                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                            value={destination}
                            onChange={e => { setDestination(e.target.value); setShippedGroupsPage(1); }}
                        >
                            {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="rounded-[4px] shadow overflow-hidden border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                        {isGroupLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                            </div>
                        ) : shippedGroups.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--on-surface-variant)' }}>
                                <Package className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                                <p className="text-sm font-medium">No group shipments found</p>
                                <p className="text-xs mt-1">Ship a received memo from the list and include other memos with the same destination on one FedEx shipment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                    <thead>
                                        <tr className="bg-[var(--surface-container-low)]">
                                            <th className="px-3 py-3 w-8" />
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Shipped</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Destination</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Tracking</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Boxes</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Memos</th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                        {shippedGroups.map(row => {
                                            const g = row.group;
                                            const open = expandedShippedGroupId === g.id;
                                            return (
                                                <React.Fragment key={g.id}>
                                                    <tr className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                        <td className="px-3 py-3">
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded border hover:bg-primary-50/40 cursor-pointer"
                                                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}
                                                                onClick={() => setExpandedShippedGroupId(open ? null : g.id)}
                                                                aria-expanded={open}
                                                            >
                                                                <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--on-surface)' }}>
                                                            {g.shippedAt ? formatDate(g.shippedAt) : '—'}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>{g.destination || '—'}</td>
                                                        <td className="px-3 py-3 text-sm font-mono" style={{ color: 'var(--foreground)' }}>
                                                            {g.packageTracking && Object.keys(g.packageTracking).length > 0
                                                                ? Object.entries(g.packageTracking)
                                                                    .sort(([a], [b]) => a.localeCompare(b))
                                                                    .map(([key, val]) => (
                                                                        <div key={key} className="text-xs leading-5">{val}</div>
                                                                    ))
                                                                : (g.outboundTracking || '—')}
                                                        </td>
                                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{g.boxCount ?? 1}</td>
                                                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--on-surface)' }}>{row.memos?.length ?? g.totalMemos ?? 0}</td>
                                                        <td className="px-3 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => printShipmentGroupLabel(g.id)}
                                                                disabled={printGroupLabelLoading === g.id}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors hover:bg-primary-50/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                                style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }}
                                                            >
                                                                {printGroupLabelLoading === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                Print Labels
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {open && (
                                                        <tr style={{ backgroundColor: 'color-mix(in srgb, var(--tertiary-fixed) 35%, transparent)' }}>
                                                            <td colSpan={7} className="px-4 py-3">
                                                                <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--on-surface-variant)' }}>Debit memos in this shipment</p>
                                                                <div className="overflow-x-auto border rounded-[4px]" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
                                                                    <table className="min-w-full text-xs border" style={{ borderColor: 'var(--outline)' }}>
                                                                        <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                                                                            <tr className="bg-[var(--surface-container-low)]">
                                                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Memo #</th>
                                                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Pharmacy</th>
                                                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">RA #</th>
                                                                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Labeler</th>
                                                                                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Items</th>
                                                                                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)] whitespace-nowrap">Ask</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                                                            {(row.memos || []).map((m: DebitMemo) => (
                                                                                <tr key={m.id} className="hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                                                                                    <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--primary)' }}>{m.memoNumber}</td>
                                                                                    <td className="px-3 py-3 text-sm max-w-[140px] truncate" style={{ color: 'var(--on-surface)' }}>{m.pharmacyName}</td>
                                                                                    <td className="px-3 py-3 text-sm font-mono" style={{ color: 'var(--foreground)' }}>{m.raNumber || '—'}</td>
                                                                                    <td className="px-3 py-3 text-sm max-w-[120px] truncate" style={{ color: 'var(--on-surface-variant)' }}>{m.labelerName || '—'}</td>
                                                                                    <td className="px-3 py-3 text-sm text-right">{m.totalItems}</td>
                                                                                    <td className="px-3 py-3 text-sm text-right font-medium">{formatCurrency(m.totalAskValue)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {(shippedPagination?.totalPages ?? 0) > 1 && (
                            <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                                    Page {shippedGroupsPage} of {shippedPagination?.totalPages}
                                    {shippedPagination?.total != null && ` · ${shippedPagination.total} groups`}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <Button variant="outline" size="sm" disabled={shippedGroupsPage <= 1} onClick={() => setShippedGroupsPage(p => p - 1)}>
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={shippedGroupsPage >= (shippedPagination?.totalPages || 1)}
                                        onClick={() => setShippedGroupsPage(p => p + 1)}
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Request RA Modal — same shell as warehouse/batches modals ── */}
            {activeModal === 'request' && selectedMemo && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto p-4"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                    onClick={closeModal}
                    role="presentation"
                >
                    <div
                        className="rounded-[4px] shadow-xl max-w-lg w-full max-h-[92vh] my-auto flex flex-col border min-h-0"
                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ra-request-modal-title"
                    >
                        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 pr-2">
                                    <h2 id="ra-request-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>Send RA Request</h2>
                                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                        Email preview loads below. Use override if the labeler address is missing.
                                    </p>
                                </div>
                                <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-primary-50/40 cursor-pointer shrink-0" style={{ color: 'var(--outline)' }} aria-label="Close">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-4 min-h-0">
                            <div className="rounded-[4px] p-4 text-sm space-y-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Memo</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Pharmacy</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.pharmacyName}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Destination</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.destination || '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Labeler</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Items</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.totalItems}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Ask Value</span><span className="font-medium" style={{ color: 'var(--secondary)' }}>{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {isPreviewLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-[4px] border" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                                    <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Loading email preview…</p>
                                </div>
                            ) : emailPreview ? (
                                <div className="rounded-[4px] border p-3 space-y-3" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Email preview</p>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--on-surface-variant)' }}>To</label>
                                        <p className="text-xs font-medium break-all" style={{ color: 'var(--foreground)' }}>
                                            {emailPreview.to || <span style={{ color: 'var(--error)' }}>No email found — enter override below</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--on-surface-variant)' }}>Subject</label>
                                        <p className="text-xs" style={{ color: 'var(--on-surface)' }}>{emailPreview.subject}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--on-surface-variant)' }}>Body</label>
                                        <pre className="text-xs rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>{emailPreview.body}</pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[4px] border p-3 text-xs" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>
                                    <p className="font-medium">Preview unavailable</p>
                                    <p className="mt-1" style={{ color: 'var(--on-secondary-container)' }}>You can still send using the email override if you have the correct address.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Email override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                    placeholder="Override destination email…"
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Leave blank to use manufacturer policy email when available.</p>
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t flex justify-end gap-2 shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40 cursor-pointer"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendRequest}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Send RA Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Resend RA Modal — same shell as warehouse/batches ── */}
            {activeModal === 'resend' && selectedMemo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={closeModal} role="presentation">
                    <div className="rounded-[4px] shadow-xl max-w-lg w-full max-h-[92vh] my-auto flex flex-col border min-h-0" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ra-resend-modal-title">
                        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 pr-2">
                                    <h2 id="ra-resend-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>Resend RA Reminder</h2>
                                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>Send another reminder to the labeler contact.</p>
                                </div>
                                <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-primary-50/40 cursor-pointer shrink-0" style={{ color: 'var(--outline)' }} aria-label="Close"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-4 min-h-0">
                            <div className="border rounded-[4px] p-3 text-sm" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)', color: 'var(--on-secondary-container)' }}>
                                <p>Original request sent: <strong style={{ color: 'var(--foreground)' }}>{selectedMemo.raRequestedAt ? formatDate(selectedMemo.raRequestedAt) : 'N/A'}</strong></p>
                                {selectedMemo.ticklerDate && (
                                    <p>Tickler date: <strong style={{ color: isOverdue(selectedMemo) ? 'var(--error)' : 'var(--foreground)' }}>{formatDate(selectedMemo.ticklerDate)}</strong>
                                    {isOverdue(selectedMemo) && ' — OVERDUE'}</p>
                                )}
                            </div>

                            <div className="rounded-[4px] p-4 text-sm space-y-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Memo</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Labeler</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Ask Value</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                            ) : emailPreview ? (
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: 'var(--on-surface-variant)' }}>Reminder Preview</label>
                                    <pre className="text-xs rounded p-3 whitespace-pre-wrap max-h-32 overflow-y-auto border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>{emailPreview.body}</pre>
                                </div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Email Override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                    placeholder="Override destination email..."
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t flex justify-end gap-2 shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40 cursor-pointer"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Resend Reminder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receive RA Modal — same shell as warehouse/batches ── */}
            {activeModal === 'receive' && selectedMemo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }} onClick={closeModal} role="presentation">
                    <div className="rounded-[4px] shadow-xl max-w-md w-full max-h-[92vh] my-auto flex flex-col border min-h-0" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ra-receive-modal-title">
                        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 pr-2">
                                    <h2 id="ra-receive-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>Record RA Received</h2>
                                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>Enter the RA number from the manufacturer.</p>
                                </div>
                                <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-primary-50/40 cursor-pointer shrink-0" style={{ color: 'var(--outline)' }} aria-label="Close"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-4 min-h-0">
                            <div className="rounded-[4px] p-4 text-sm space-y-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Memo</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Labeler</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Destination</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.destination || '—'}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>RA Number *</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                    placeholder="Enter RA number..."
                                    value={receiveRaNumber}
                                    onChange={e => setReceiveRaNumber(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>PDF URL (optional)</label>
                                <input
                                    type="url"
                                    className="w-full border rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                    placeholder="https://..."
                                    value={receivePdfUrl}
                                    onChange={e => setReceivePdfUrl(e.target.value)}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>Link to the RA authorization PDF if available.</p>
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t flex justify-end gap-2 shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40 cursor-pointer"
                                style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReceive}
                                disabled={isActionLoading || !receiveRaNumber.trim()}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Record RA Received
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Ship Modal (FedEx + Manual) — same shell as warehouse/batches ── */}
            {activeModal === 'ship' && selectedMemo && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto p-4"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
                    onClick={() => {
                        if (!fedexLoading && !groupFedexLoading) closeModal();
                    }}
                    role="presentation"
                >
                    <div
                        className="rounded-[4px] shadow-xl max-w-2xl w-full max-h-[92vh] my-auto flex flex-col overflow-hidden relative border min-h-0"
                        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ra-ship-modal-title"
                    >
                        {groupFedexLoading && (
                            <div
                                className="absolute inset-0 z-30 backdrop-blur-[1px] flex flex-col items-center justify-center px-6"
                                style={{ backgroundColor: 'color-mix(in srgb, var(--surface-container-lowest) 90%, transparent)' }}
                                role="status"
                                aria-live="polite"
                                aria-busy="true"
                            >
                                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
                                <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                    {groupShipSubmitPhase === 'creating-group'
                                        ? 'Creating shipment group…'
                                        : 'Creating FedEx shipment…'}
                                </p>
                                <p className="mt-2 text-xs text-center max-w-sm" style={{ color: 'var(--on-surface-variant)' }}>
                                    {groupShipSubmitPhase === 'creating-fedex'
                                        ? 'Please wait for labels and tracking from FedEx.'
                                        : 'Preparing your multi-memo shipment.'}
                                </p>
                            </div>
                        )}
                        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 pr-2">
                                    <h2 id="ra-ship-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                                        Ship to reverse distributor
                                    </h2>
                                    <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                        FedEx shipment or manual tracking — same destination memos can ship together.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={fedexLoading || groupFedexLoading}
                                    className="p-1 rounded hover:bg-primary-50/40 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer shrink-0"
                                    style={{ color: 'var(--outline)' }}
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-4 min-h-0">
                            {groupFedexResult && groupShipGroupId ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-heading text-sm font-bold mb-2" style={{ color: 'var(--foreground)' }}>Group shipment</h3>
                                        <div className="rounded-[4px] p-4 text-sm space-y-2 max-h-40 overflow-y-auto border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                            <div className="flex justify-between" style={{ color: 'var(--on-surface-variant)' }}><span>Memos</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{groupShippedMemos.length}</span></div>
                                            <div className="flex justify-between" style={{ color: 'var(--on-surface-variant)' }}><span>Destination</span><span className="font-medium capitalize" style={{ color: 'var(--foreground)' }}>{groupShippedMemos[0]?.destination || '—'}</span></div>
                                            <ul className="text-xs border-t pt-2 mt-2 space-y-1" style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}>
                                                {groupShippedMemos.map(m => (
                                                    <li key={m.id} className="flex justify-between gap-2">
                                                        <span className="font-medium" style={{ color: 'var(--primary)' }}>{m.memoNumber}</span>
                                                        <span className="truncate">{m.pharmacyName}</span>
                                                        <span className="whitespace-nowrap" style={{ color: 'var(--on-surface-variant)' }}>RA {m.raNumber}</span>
                                                        <span>{m.totalItems} items</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="rounded-[4px] px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--primary)' }}>
                                        <p className="text-sm font-bold text-white">FedEx API Shipment</p>
                                        <span className="text-sm font-bold text-white underline font-mono">{groupFedexResult.masterTrackingNumber}</span>
                                    </div>
                                    <div className="border rounded-[4px] p-4 space-y-3" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                            <p className="text-sm font-semibold" style={{ color: 'var(--on-secondary-container)' }}>Shipment Created Successfully</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span style={{ color: 'var(--on-surface-variant)' }}>Master Tracking:</span>
                                                <span className="ml-1 font-mono font-bold" style={{ color: 'var(--foreground)' }}>{groupFedexResult.masterTrackingNumber}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--on-surface-variant)' }}>Packages:</span>
                                                <span className="ml-1 font-medium" style={{ color: 'var(--foreground)' }}>{groupFedexResult.packages.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Package Tracking Numbers:</p>
                                            <button
                                                type="button"
                                                onClick={() => printAllFedexLabels(
                                                    groupShipGroupId,
                                                    groupFedexResult.packages.map(p => p.trackingNumber).filter(Boolean)
                                                )}
                                                disabled={printGroupLabelLoading === groupShipGroupId}
                                                className="flex items-center gap-1 px-2 py-1 text-xs rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50/40 cursor-pointer"
                                                style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
                                            >
                                                {printGroupLabelLoading === groupShipGroupId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                Print Labels
                                            </button>
                                        </div>
                                        <div className="border rounded-[4px] overflow-hidden divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                            {groupFedexResult.packages.map((pkg, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs px-4 py-2.5" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Package {i + 1}:</span>
                                                        <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>{pkg.trackingNumber}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => printSingleFedexLabel(groupShipGroupId, i + 1, pkg.trackingNumber)}
                                                        disabled={printGroupLabelLoading === `${groupShipGroupId}:pkg:${i + 1}`}
                                                        className="flex items-center justify-center w-7 h-7 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50/40 cursor-pointer"
                                                        style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
                                                        title={`Print label for package ${i + 1}`}
                                                    >
                                                        {printGroupLabelLoading === `${groupShipGroupId}:pkg:${i + 1}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--outline-variant)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Schedule FedEx Pickup (Optional)</p>
                                        {groupPickupConfirmation ? (
                                            <div className="border rounded-[4px] p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--secondary)' }} />
                                                <div className="text-xs">
                                                    <span className="font-medium" style={{ color: 'var(--on-secondary-container)' }}>Pickup scheduled!</span>
                                                    <span className="ml-1" style={{ color: 'var(--on-secondary-container)' }}>Confirmation: <span className="font-mono font-semibold">{groupPickupConfirmation}</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="border rounded-[4px] p-3" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                    <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode.
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={groupPickupForm.pickupDate}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={groupPickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={groupPickupForm.readyTime}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={groupPickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={groupPickupForm.closeTime}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={groupPickupLoading}
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!groupShipGroupId) return;
                                                                setGroupPickupLoading(true);
                                                                try {
                                                                    const result = await dispatch(scheduleShipmentGroupPickup({
                                                                        groupId: groupShipGroupId,
                                                                        ...groupPickupForm,
                                                                    }));
                                                                    if (scheduleShipmentGroupPickup.fulfilled.match(result)) {
                                                                        setGroupPickupConfirmation(result.payload.pickup.pickupConfirmationNumber);
                                                                        addToast(`Pickup scheduled: ${result.payload.pickup.pickupConfirmationNumber}`, 'success');
                                                                    } else {
                                                                        addToast(result.payload as string || 'Failed to schedule pickup', 'error');
                                                                    }
                                                                } catch {
                                                                    addToast('Unexpected error scheduling pickup', 'error');
                                                                } finally {
                                                                    setGroupPickupLoading(false);
                                                                }
                                                            }}
                                                            disabled={groupPickupLoading}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                            style={{ backgroundColor: 'var(--secondary)' }}
                                                        >
                                                            {groupPickupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                                            Schedule Pickup
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : fedexResult ? (
                                <div className="space-y-4">
                                    {/* Shipment header banner */}
                                    <div className="rounded-[4px] px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--primary)' }}>
                                        <p className="text-sm font-bold text-white">FedEx API Shipment</p>
                                        <span className="text-sm font-bold text-white underline font-mono">{fedexResult.masterTrackingNumber}</span>
                                    </div>

                                    {/* Success info */}
                                    <div className="border rounded-[4px] p-4 space-y-3" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                            <p className="text-sm font-semibold" style={{ color: 'var(--on-secondary-container)' }}>Shipment Created Successfully</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span style={{ color: 'var(--on-surface-variant)' }}>Master Tracking:</span>
                                                <span className="ml-1 font-mono font-bold" style={{ color: 'var(--foreground)' }}>{fedexResult.masterTrackingNumber}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--on-surface-variant)' }}>Packages:</span>
                                                <span className="ml-1 font-medium" style={{ color: 'var(--foreground)' }}>{fedexResult.packages.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package Tracking Numbers */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Package Tracking Numbers:</p>
                                            {selectedMemo && fedexResult.packages.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => printAllPackageLabels(
                                                        selectedMemo.id,
                                                        fedexResult.packages.map(p => p.trackingNumber).filter(Boolean)
                                                    )}
                                                    disabled={printAllPackageLabelsLoading}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors hover:bg-primary-50/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
                                                    title="Print all shipping labels"
                                                >
                                                    {printAllPackageLabelsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                    Print Labels
                                                </button>
                                            )}
                                        </div>
                                        <div className="border rounded-[4px] overflow-hidden divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                                            {fedexResult.packages.map((pkg, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs px-4 py-2.5" style={{ backgroundColor: 'var(--surface-container-lowest)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Package {i + 1}:</span>
                                                        <span className="font-mono font-semibold" style={{ color: 'var(--foreground)' }}>{pkg.trackingNumber}</span>
                                                    </div>
                                                    {selectedMemo && pkg.trackingNumber && (
                                                        <button
                                                            type="button"
                                                            onClick={() => printSinglePackageLabel(
                                                                selectedMemo.id,
                                                                i + 1,
                                                                pkg.trackingNumber,
                                                                fedexResult.packages.length
                                                            )}
                                                            disabled={printSinglePackageLabelLoading === pkg.trackingNumber}
                                                            className="flex items-center justify-center w-7 h-7 rounded border transition-colors hover:bg-primary-50/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                            style={{ backgroundColor: 'var(--surface-container-low)', color: 'var(--secondary)', borderColor: 'var(--outline-variant)' }}
                                                            title={`Print shipping label for package ${i + 1} (${pkg.trackingNumber})`}
                                                        >
                                                            {printSinglePackageLabelLoading === pkg.trackingNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Schedule Pickup */}
                                    <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--outline-variant)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Schedule FedEx Pickup (Optional)</p>
                                        {pickupConfirmation ? (
                                            <div className="border rounded-[4px] p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--secondary)' }} />
                                                <div className="text-xs">
                                                    <span className="font-medium" style={{ color: 'var(--on-secondary-container)' }}>Pickup scheduled!</span>
                                                    <span className="ml-1" style={{ color: 'var(--on-secondary-container)' }}>Confirmation: <span className="font-mono font-semibold">{pickupConfirmation}</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="border rounded-[4px] p-3" style={{ backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                    <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode.
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={pickupForm.pickupDate}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.readyTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.closeTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button
                                                            onClick={async () => {
                                                                if (!selectedMemo) return;
                                                                setPickupLoading(true);
                                                                try {
                                                                    const result = await dispatch(scheduleDebitMemoPickup({
                                                                        memoId: selectedMemo.id,
                                                                        ...pickupForm,
                                                                    }));
                                                                    if (scheduleDebitMemoPickup.fulfilled.match(result)) {
                                                                        setPickupConfirmation(result.payload.pickup.pickupConfirmationNumber);
                                                                        addToast(`Pickup scheduled: ${result.payload.pickup.pickupConfirmationNumber}`, 'success');
                                                                    } else {
                                                                        addToast(result.payload as string || 'Failed to schedule pickup', 'error');
                                                                    }
                                                                } catch {
                                                                    addToast('Unexpected error scheduling pickup', 'error');
                                                                } finally {
                                                                    setPickupLoading(false);
                                                                }
                                                            }}
                                                            disabled={pickupLoading}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                            style={{ backgroundColor: 'var(--secondary)' }}
                                                        >
                                                            {pickupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                                            Schedule Pickup
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-[4px] p-4 text-sm space-y-1 border" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                                        <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Memo</span><span className="font-medium" style={{ color: 'var(--foreground)' }}>{selectedMemo.memoNumber}</span></div>
                                        <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>RA #</span><span className="font-medium" style={{ color: 'var(--secondary)' }}>{selectedMemo.raNumber}</span></div>
                                        <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Destination</span><span className="capitalize font-medium" style={{ color: 'var(--foreground)' }}>{selectedMemo.destination || '—'}</span></div>
                                        <div className="flex justify-between"><span style={{ color: 'var(--on-surface-variant)' }}>Items</span><span style={{ color: 'var(--on-surface)' }}>{selectedMemo.totalItems}</span></div>
                                    </div>

                                    <div
                                        className="rounded-[4px] border border-solid p-4 space-y-3"
                                        style={{
                                            backgroundColor: 'var(--surface-container-low)',
                                            borderColor: 'var(--outline-variant)',
                                            borderLeftWidth: 4,
                                            borderLeftColor: 'var(--secondary)',
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-9 h-9 rounded-[4px] flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: 'var(--surface-container-high)' }}
                                            >
                                                <Layers className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                                                    Ship together (same destination)
                                                </p>
                                                <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                                                    Add other <strong style={{ color: 'var(--foreground)' }}>received</strong> memos routed to{' '}
                                                    <span className="font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                                                        {selectedMemo.destination || 'this reverse distributor'}
                                                    </span>{' '}
                                                    so they go on <strong style={{ color: 'var(--foreground)' }}>one FedEx shipment</strong>. The memo you opened stays included.
                                                </p>
                                            </div>
                                        </div>
                                        {isGroupLoading ? (
                                            <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--on-surface-variant)' }}>
                                                <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--secondary)' }} />
                                                Checking for other eligible memos…
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label
                                                    className="flex items-center gap-3 p-2.5 rounded-[4px] border cursor-default"
                                                    style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
                                                >
                                                    <input type="checkbox" checked readOnly disabled className="rounded opacity-70" style={{ accentColor: 'var(--primary)' }} />
                                                    <div className="flex-1 min-w-0 text-sm">
                                                        <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{selectedMemo.memoNumber}</span>
                                                        <span className="mx-2" style={{ color: 'var(--on-surface-variant)' }}>{selectedMemo.pharmacyName}</span>
                                                        <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>RA {selectedMemo.raNumber}</span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded-[4px]" style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>
                                                        This memo
                                                    </span>
                                                </label>
                                                {shipModalPeers.map(memo => (
                                                    <label
                                                        key={memo.id}
                                                        className="flex items-center gap-3 p-2.5 rounded-[4px] border cursor-pointer transition-colors hover:bg-primary-50/40"
                                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMemosForGroup.includes(memo.id)}
                                                            onChange={() => toggleShipWithMemo(memo.id)}
                                                            className="rounded focus:ring-primary-500 cursor-pointer"
                                                            style={{ accentColor: 'var(--primary)' }}
                                                        />
                                                        <div className="flex-1 min-w-0 text-sm flex flex-wrap gap-x-3 gap-y-0.5 items-baseline">
                                                            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{memo.memoNumber}</span>
                                                            <span style={{ color: 'var(--on-surface)' }}>{memo.pharmacyName}</span>
                                                            <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>RA {memo.raNumber}</span>
                                                            <span className="text-xs tabular-nums" style={{ color: 'var(--on-surface-variant)' }}>{formatCurrency(memo.totalAskValue)}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                                {shipModalPeers.length === 0 && (
                                                    <p className="text-xs leading-snug rounded-[4px] px-2.5 py-2 border" style={{ color: 'var(--on-surface-variant)', backgroundColor: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)' }}>
                                                        No other eligible memos share this destination right now. You can still ship this memo alone.
                                                    </p>
                                                )}
                                                {shipModalPeers.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={selectAllShipPeersSameDestination}
                                                        className="text-xs font-semibold hover:underline cursor-pointer text-left"
                                                        style={{ color: 'var(--secondary)' }}
                                                    >
                                                        Select all at this destination ({shipModalPeers.length + 1} memos)
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {shipMode === 'choose' && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>How would you like to ship?</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('fedex')}
                                                    className="flex flex-col items-center gap-2 p-4 border-2 rounded-[4px] transition-all hover:bg-primary-50/40 cursor-pointer"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                                                >
                                                    <Truck className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Create FedEx Shipment</span>
                                                    <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Auto-generate labels & tracking</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('manual')}
                                                    className="flex flex-col items-center gap-2 p-4 border-2 rounded-[4px] transition-all hover:bg-primary-50/40 cursor-pointer"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
                                                >
                                                    <Edit className="w-6 h-6" style={{ color: 'var(--on-surface-variant)' }} />
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Enter Manually</span>
                                                    <span className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>Paste tracking number</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {shipMode === 'fedex' && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>
                                                Create a FedEx Ground shipment from the warehouse to <strong className="capitalize">{selectedMemo.destination}</strong>
                                                {selectedMemosForGroup.length >= 2 && (
                                                    <span className="block mt-2 font-semibold" style={{ color: 'var(--primary)' }}>
                                                        {selectedMemosForGroup.length} memos will ship on one FedEx shipment.
                                                    </span>
                                                )}
                                            </p>

                                            <div className="flex items-center justify-center gap-4">
                                                <div>
                                                    <label className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Number of Boxes:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={fedexBoxCount}
                                                        onChange={e => setFedexBoxCount(e.target.value)}
                                                        className="ml-2 w-20 px-3 py-1.5 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                        disabled={fedexLoading || groupFedexLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border rounded-[4px] p-3 text-xs text-center space-y-1" style={{ backgroundColor: 'var(--surface-container-high)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>
                                                <p>Shipment: <strong>Warehouse</strong> → <strong className="capitalize">{selectedMemo.destination}</strong></p>
                                                <p>Ensure the warehouse address and reverse distributor address are configured.</p>
                                            </div>

                                            <div className="flex justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('choose')}
                                                    className="px-4 py-2 text-sm transition-colors hover:underline cursor-pointer"
                                                    style={{ color: 'var(--on-surface-variant)' }}
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!selectedMemo) return;
                                                        const ids = [...new Set(
                                                            selectedMemosForGroup.includes(selectedMemo.id)
                                                                ? selectedMemosForGroup
                                                                : [...selectedMemosForGroup, selectedMemo.id]
                                                        )];
                                                        if (ids.length >= 2) {
                                                            await handleGroupFedexShip();
                                                            return;
                                                        }
                                                        setFedexLoading(true);
                                                        try {
                                                            const result = await dispatch(createDebitMemoFedexShipment({
                                                                memoId: selectedMemo.id,
                                                                boxCount: parseInt(fedexBoxCount, 10) || 1,
                                                            }));
                                                            if (createDebitMemoFedexShipment.fulfilled.match(result)) {
                                                                const { shipment, labels } = result.payload;
                                                                setFedexResult(shipment);
                                                                setFedexLabels(labels || {});
                                                                setShipTracking(shipment.masterTrackingNumber);
                                                                addToast('FedEx shipment created & recorded!', 'success');
                                                                loadData();
                                                            } else {
                                                                addToast(result.payload as string || 'Failed to create FedEx shipment', 'error');
                                                            }
                                                        } catch {
                                                            addToast('Unexpected error creating shipment', 'error');
                                                        } finally {
                                                            setFedexLoading(false);
                                                        }
                                                    }}
                                                    disabled={fedexLoading || groupFedexLoading || !fedexBoxCount}
                                                    className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    style={{ backgroundColor: 'var(--primary)' }}
                                                >
                                                    {(fedexLoading || groupFedexLoading) ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating Shipment...</>
                                                    ) : (
                                                        <>
                                                            <Truck className="w-4 h-4" />
                                                            {selectedMemosForGroup.length >= 2
                                                                ? `Create FedEx Shipment (${selectedMemosForGroup.length} memos)`
                                                                : 'Create FedEx Shipment'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {shipMode === 'manual' && (
                                        <div className="space-y-4">
                                            {selectedMemosForGroup.length > 1 && (
                                                <p className="text-xs border rounded-[4px] p-2" style={{ color: 'var(--on-surface)', backgroundColor: 'var(--secondary-container)', borderColor: 'var(--outline-variant)' }}>
                                                    Manual tracking applies to this memo only. Other checked memos are not updated on this step.
                                                </p>
                                            )}
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Outbound Tracking # *</label>
                                                <input
                                                    type="text"
                                                    className="w-full border rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)', color: 'var(--foreground)' }}
                                                    placeholder="FedEx/UPS tracking number..."
                                                    value={shipTracking}
                                                    onChange={e => setShipTracking(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t flex justify-end gap-2 shrink-0" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
                            {groupFedexResult && groupShipGroupId ? (
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors cursor-pointer"
                                >
                                    Done
                                </button>
                            ) : fedexResult ? (
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors cursor-pointer"
                                >
                                    Done
                                </button>
                            ) : shipMode === 'manual' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShipMode('choose')}
                                        className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40 cursor-pointer"
                                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleShip}
                                        disabled={isActionLoading || !shipTracking.trim()}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                                        Record Shipment
                                    </button>
                                </>
                            ) : shipMode === 'choose' ? (
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={groupFedexLoading}
                                    className="px-3 py-1.5 text-xs rounded border transition-colors hover:bg-primary-50/40 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)' }}
                                >
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

        </div>
        </PermissionGate>
    );
}
