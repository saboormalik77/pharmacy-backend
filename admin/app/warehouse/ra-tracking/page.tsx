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
    fetchRATracking, sendRARequest, receiveRA, resendRA, shipMemo,
    createDebitMemoFedexShipment, scheduleDebitMemoPickup,
    fetchEmailPreview, clearError, clearEmailPreview,
} from '@/lib/store/raTrackingSlice';
import {
    fetchAvailableMemosForGrouping, createShipmentGroup,
    createGroupFedexShipment, fetchShippedShipmentGroups, scheduleShipmentGroupPickup,
    clearError as clearGroupError,
} from '@/lib/store/shipmentGroupSlice';
import { DebitMemo, RAEmailTemplate } from '@/lib/types';

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
    const { memos, pagination, summary, emailPreview, isLoading, isActionLoading, isPreviewLoading, error } =
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
    const [printGroupLabelLoading, setPrintGroupLabelLoading] = useState(false);
    
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

    const printDebitMemoLabel = async (memoId: string) => {
        setPrintLabelLoading(memoId);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/admin/debit-memos/${encodeURIComponent(memoId)}/shipping-label`, {
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
        }
        setPrintLabelLoading(null);
    };

    const printShipmentGroupLabel = async (groupId: string) => {
        setPrintGroupLabelLoading(true);
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
        }
        setPrintGroupLabelLoading(false);
    };

    const printAllFedexLabels = async (groupId: string) => {
        setPrintGroupLabelLoading(true);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/fedex-labels/print-all`, {
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
        }
        setPrintGroupLabelLoading(false);
    };

    const printSingleFedexLabel = async (groupId: string, packageNumber: number) => {
        setPrintGroupLabelLoading(true);
        try {
            const { cookieUtils } = await import('@/lib/utils/cookies');
            const token = cookieUtils.getAuthToken();
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            // Use format=print to get an HTML page with embedded PDF that auto-prints
            const res = await fetch(`${baseUrl}/admin/shipment-groups/${encodeURIComponent(groupId)}/fedex-labels/${packageNumber}/download?format=print`, {
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
            addToast(e.message || 'Failed to print FedEx label', 'error');
        }
        setPrintGroupLabelLoading(false);
    };

    const addToast = useCallback((msg: string, type: Toast['type']) => {
        setToasts(prev => [...prev, { id: Date.now().toString(), message: msg, type }]);
    }, []);

    const loadData = useCallback(() => {
        dispatch(fetchRATracking({
            raStatus: raStatus || undefined,
            destination: destination || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: debouncedSearch || undefined,
            page: currentPage,
            limit: 20,
        }));
    }, [dispatch, raStatus, destination, dateFrom, dateTo, debouncedSearch, currentPage]);

    const loadShippedGroups = useCallback(() => {
        dispatch(fetchShippedShipmentGroups({
            page: shippedGroupsPage,
            limit: 15,
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

            if (!createGroupFedexShipment.fulfilled.match(fedexAction)) {
                return;
            }

            const p = fedexAction.payload;
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

    const totalPages = pagination?.totalPages || 1;

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
                    <Link href="/warehouse" className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 mb-1.5 transition-colors">
                        <ChevronLeft className="w-3 h-3" /> Back to Warehouse
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900">RA Tracking</h1>
                    <p className="text-xs text-gray-500">Track Return Authorization requests, receipts, and shipments</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setRaView('memos')}
                    className={`px-3 py-1.5 rounded-[4px] text-xs font-medium border transition-colors ${raView === 'memos' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    All debit memos
                </button>
                <button
                    type="button"
                    onClick={() => { setRaView('group-shipments'); setShippedGroupsPage(1); }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-medium border transition-colors ${raView === 'group-shipments' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <Package className="w-3.5 h-3.5" /> Group shipments
                </button>
            </div>

            {raView === 'memos' && (<>
            {/* Summary Cards — compact inline strip */}
            {summary && (
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { icon: <Clock className="w-3.5 h-3.5 text-gray-500" />, label: 'Pending',   value: summary.pending,   color: 'text-gray-700',   bg: 'bg-gray-50'   },
                        { icon: <Mail className="w-3.5 h-3.5 text-blue-500" />,  label: 'Requested', value: summary.requested, color: 'text-blue-700',   bg: 'bg-blue-50'   },
                        { icon: <MailCheck className="w-3.5 h-3.5 text-green-500" />, label: 'Received', value: summary.received, color: 'text-green-700', bg: 'bg-green-50' },
                        { icon: <Truck className="w-3.5 h-3.5 text-purple-500" />, label: 'Shipped', value: summary.shipped,   color: 'text-purple-700', bg: 'bg-purple-50' },
                        { icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />, label: 'Overdue', value: summary.overdue, color: 'text-red-700',  bg: 'bg-red-50'   },
                    ].map(card => (
                        <div key={card.label} className={`${card.bg} rounded-[4px] border border-gray-100 px-3 py-2 flex items-center gap-2`}>
                            {card.icon}
                            <div>
                                <p className="text-[10px] text-gray-500 leading-none">{card.label}</p>
                                <p className={`text-base font-bold leading-tight ${card.color}`}>{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters — single compact row */}
            <div className="bg-white rounded-[4px] shadow px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text" placeholder="Search memo #, pharmacy, RA #..."
                            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500" value={raStatus}
                        onChange={e => { setRaStatus(e.target.value); setCurrentPage(1); }}>
                        {RA_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500" value={destination}
                        onChange={e => { setDestination(e.target.value); setCurrentPage(1); }}>
                        {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500" value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} title="From date" />
                    <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary-500" value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} title="To date" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[4px] shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                ) : memos.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MailCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">No RA records found</p>
                        <p className="text-xs mt-1">RA tracking entries appear after batches are closed and debit memos generated.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Memo #</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Dest.</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Labeler</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ask</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tickler</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">RA #</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {memos.map(memo => {
                                    const eff = effectiveRaStatus(memo);
                                    const sb = getRAStatusBadge(eff);
                                    const overdue = isOverdue(memo);
                                    return (
                                        <tr key={memo.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                                            <td className="px-3 py-1.5 text-xs font-semibold text-primary-600 whitespace-nowrap">{memo.memoNumber}</td>
                                            <td className="px-3 py-1.5 text-xs text-gray-700 max-w-[130px] truncate">{memo.pharmacyName}</td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">{memo.destination || '—'}</td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600 max-w-[120px] truncate">{memo.labelerName || '—'}</td>
                                            <td className="px-3 py-1.5 text-xs font-medium whitespace-nowrap">{formatCurrency(memo.totalAskValue)}</td>
                                            <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                                                {memo.raRequestedAt ? formatDate(memo.raRequestedAt) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                                                {memo.ticklerDate ? (
                                                    <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                                        {formatDate(memo.ticklerDate)}{overdue && ' ⚠'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5 text-xs font-medium text-gray-800 whitespace-nowrap">{memo.raNumber || '—'}</td>
                                            <td className="px-3 py-1.5">
                                                <Badge variant={sb.variant}><span className="text-[10px]">{sb.label}</span></Badge>
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {eff === 'pending' && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openRequest(memo); }}
                                                            title="Send RA Request"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors whitespace-nowrap"
                                                        >
                                                            <Mail className="w-3 h-3" /> Request
                                                        </button>
                                                    )}
                                                    {(eff === 'requested' || eff === 'overdue') && (
                                                        <>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); openResend(memo); }}
                                                                title="Resend Reminder"
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 transition-colors whitespace-nowrap"
                                                            >
                                                                <RefreshCw className="w-3 h-3" /> Resend
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); openReceive(memo); }}
                                                                title="Record RA Received"
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors whitespace-nowrap"
                                                            >
                                                                <CheckCircle className="w-3 h-3" /> Record
                                                            </button>
                                                        </>
                                                    )}
                                                    {eff === 'received' && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); openShip(memo); }}
                                                            title="Record Shipment"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors whitespace-nowrap"
                                                        >
                                                            <Truck className="w-3 h-3" /> Ship
                                                        </button>
                                                    )}
                                                    {eff === 'shipped' && memo.outboundTracking && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); printDebitMemoLabel(memo.id); }}
                                                            disabled={printLabelLoading === memo.id}
                                                            title="Print shipping label"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors whitespace-nowrap disabled:opacity-50"
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
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            Page {currentPage} of {totalPages}{pagination?.total != null && ` · ${pagination.total} memos`}
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
                    <div className="bg-white rounded-[4px] shadow px-3 py-2">
                        <p className="text-xs text-gray-600 mb-2">
                            Shipments where multiple debit memos were sent together (one FedEx tracking). Use destination to narrow the list.
                        </p>
                        <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                            value={destination}
                            onChange={e => { setDestination(e.target.value); setShippedGroupsPage(1); }}
                        >
                            {DESTINATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="bg-white rounded-[4px] shadow overflow-hidden">
                        {isGroupLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            </div>
                        ) : shippedGroups.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No group shipments found</p>
                                <p className="text-xs mt-1">Ship a received memo from the list and include other memos with the same destination on one FedEx shipment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 w-8" />
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Shipped</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Destination</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Tracking</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Boxes</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Memos</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {shippedGroups.map(row => {
                                            const g = row.group;
                                            const open = expandedShippedGroupId === g.id;
                                            return (
                                                <React.Fragment key={g.id}>
                                                    <tr className="hover:bg-gray-50">
                                                        <td className="px-3 py-1.5">
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded hover:bg-gray-200 text-gray-600"
                                                                onClick={() => setExpandedShippedGroupId(open ? null : g.id)}
                                                                aria-expanded={open}
                                                            >
                                                                <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                                                            {g.shippedAt ? formatDate(g.shippedAt) : '—'}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-xs font-medium capitalize">{g.destination || '—'}</td>
                                                        <td className="px-3 py-1.5 text-xs font-mono text-gray-800">{g.outboundTracking || '—'}</td>
                                                        <td className="px-3 py-1.5 text-xs text-gray-600">{g.boxCount ?? 1}</td>
                                                        <td className="px-3 py-1.5 text-xs text-gray-700">{row.memos?.length ?? g.totalMemos ?? 0}</td>
                                                        <td className="px-3 py-1.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => printShipmentGroupLabel(g.id)}
                                                                disabled={printGroupLabelLoading}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                                                            >
                                                                {printGroupLabelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                                Print label
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {open && (
                                                        <tr className="bg-purple-50/40">
                                                            <td colSpan={7} className="px-4 py-3">
                                                                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Debit memos in this shipment</p>
                                                                <div className="overflow-x-auto border border-gray-200 rounded-[4px] bg-white">
                                                                    <table className="min-w-full text-xs">
                                                                        <thead className="bg-gray-50 border-b border-gray-200">
                                                                            <tr>
                                                                                <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Memo #</th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Pharmacy</th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold text-gray-500">RA #</th>
                                                                                <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Labeler</th>
                                                                                <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Items</th>
                                                                                <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Ask</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {(row.memos || []).map((m: DebitMemo) => (
                                                                                <tr key={m.id}>
                                                                                    <td className="px-2 py-1.5 font-medium text-primary-600">{m.memoNumber}</td>
                                                                                    <td className="px-2 py-1.5 text-gray-700 max-w-[140px] truncate">{m.pharmacyName}</td>
                                                                                    <td className="px-2 py-1.5 font-mono text-gray-800">{m.raNumber || '—'}</td>
                                                                                    <td className="px-2 py-1.5 text-gray-600 max-w-[120px] truncate">{m.labelerName || '—'}</td>
                                                                                    <td className="px-2 py-1.5 text-right">{m.totalItems}</td>
                                                                                    <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(m.totalAskValue)}</td>
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
                            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
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

            {/* ── Request RA Modal (Task 11.6) ──────────────────── */}
            {activeModal === 'request' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-[4px] shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Send RA Request</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Memo Details */}
                            <div className="bg-gray-50 rounded-[4px] p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Pharmacy</span><span>{selectedMemo.pharmacyName}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{selectedMemo.destination || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{selectedMemo.totalItems}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Ask Value</span><span className="font-medium text-green-700">{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {/* Email Preview */}
                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                            ) : emailPreview ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">To</label>
                                        <p className="text-sm font-medium">{emailPreview.to || <span className="text-red-500">No email found — enter override below</span>}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Subject</label>
                                        <p className="text-sm">{emailPreview.subject}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Preview</label>
                                        <pre className="text-xs bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-200">{emailPreview.body}</pre>
                                    </div>
                                </div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    placeholder="Override destination email..."
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">Leave blank to use the email from manufacturer policies.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="primary" onClick={handleSendRequest} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                                Send RA Request
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Resend RA Modal ────────────────────────────────── */}
            {activeModal === 'resend' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-[4px] shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Resend RA Reminder</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-[4px] p-3 text-sm text-yellow-800">
                                <p>Original request sent: <strong>{selectedMemo.raRequestedAt ? formatDate(selectedMemo.raRequestedAt) : 'N/A'}</strong></p>
                                {selectedMemo.ticklerDate && (
                                    <p>Tickler date: <strong className={isOverdue(selectedMemo) ? 'text-red-600' : ''}>{formatDate(selectedMemo.ticklerDate)}</strong>
                                    {isOverdue(selectedMemo) && ' — OVERDUE'}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-[4px] p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Ask Value</span><span className="font-medium">{formatCurrency(selectedMemo.totalAskValue)}</span></div>
                            </div>

                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
                            ) : emailPreview ? (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Reminder Preview</label>
                                    <pre className="text-xs bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-32 overflow-y-auto border border-gray-200">{emailPreview.body}</pre>
                                </div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Override (optional)</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm"
                                    placeholder="Override destination email..."
                                    value={requestEmail}
                                    onChange={e => setRequestEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="warning" onClick={handleResend} disabled={isActionLoading}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                Resend Reminder
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receive RA Modal (Task 11.7) ──────────────────── */}
            {activeModal === 'receive' && selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
                    <div className="bg-white rounded-[4px] shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Record RA Received</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-[4px] p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Labeler</span><span>{selectedMemo.labelerName || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Destination</span><span>{selectedMemo.destination || '—'}</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RA Number *</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                                    placeholder="Enter RA number..."
                                    value={receiveRaNumber}
                                    onChange={e => setReceiveRaNumber(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (optional)</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm"
                                    placeholder="https://..."
                                    value={receivePdfUrl}
                                    onChange={e => setReceivePdfUrl(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">Link to the RA authorization PDF if available.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button variant="success" onClick={handleReceive} disabled={isActionLoading || !receiveRaNumber.trim()}>
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                Record RA Received
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Ship Modal (FedEx + Manual) ──────────────────── */}
            {activeModal === 'ship' && selectedMemo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => {
                        if (!fedexLoading && !groupFedexLoading) closeModal();
                    }}
                >
                    <div
                        className="bg-white rounded-[4px] shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {groupFedexLoading && (
                            <div
                                className="absolute inset-0 z-30 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center px-6"
                                role="status"
                                aria-live="polite"
                                aria-busy="true"
                            >
                                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                                <p className="mt-4 text-sm font-semibold text-gray-900">
                                    {groupShipSubmitPhase === 'creating-group'
                                        ? 'Creating shipment group…'
                                        : 'Creating FedEx shipment…'}
                                </p>
                                <p className="mt-2 text-xs text-gray-500 text-center max-w-sm">
                                    {groupShipSubmitPhase === 'creating-fedex'
                                        ? 'Please wait for labels and tracking from FedEx.'
                                        : 'Preparing your multi-memo shipment.'}
                                </p>
                            </div>
                        )}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Ship to Reverse Distributor</h2>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={fedexLoading || groupFedexLoading}
                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {groupFedexResult && groupShipGroupId ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2">Group shipment</h3>
                                        <div className="bg-gray-50 rounded-[4px] p-4 text-sm space-y-2 max-h-40 overflow-y-auto">
                                            <div className="flex justify-between text-gray-500"><span>Memos</span><span className="font-medium text-gray-900">{groupShippedMemos.length}</span></div>
                                            <div className="flex justify-between text-gray-500"><span>Destination</span><span className="font-medium capitalize text-gray-900">{groupShippedMemos[0]?.destination || '—'}</span></div>
                                            <ul className="text-xs text-gray-700 border-t border-gray-200 pt-2 mt-2 space-y-1">
                                                {groupShippedMemos.map(m => (
                                                    <li key={m.id} className="flex justify-between gap-2">
                                                        <span className="font-medium text-purple-700">{m.memoNumber}</span>
                                                        <span className="truncate">{m.pharmacyName}</span>
                                                        <span className="text-gray-500 whitespace-nowrap">RA {m.raNumber}</span>
                                                        <span>{m.totalItems} items</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="bg-blue-600 rounded-[4px] px-4 py-3 flex items-center justify-between">
                                        <p className="text-sm font-bold text-white">FedEx API Shipment</p>
                                        <span className="text-sm font-bold text-white underline font-mono">{groupFedexResult.masterTrackingNumber}</span>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-[4px] p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <p className="text-sm font-semibold text-green-800">Shipment Created Successfully</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">Master Tracking:</span>
                                                <span className="ml-1 font-mono font-bold text-gray-900">{groupFedexResult.masterTrackingNumber}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Packages:</span>
                                                <span className="ml-1 font-medium text-gray-900">{groupFedexResult.packages.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-800">Package Tracking Numbers:</p>
                                            <button
                                                type="button"
                                                onClick={() => printAllFedexLabels(groupShipGroupId)}
                                                disabled={printGroupLabelLoading}
                                                className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 disabled:opacity-50"
                                            >
                                                {printGroupLabelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                Print Labels
                                            </button>
                                        </div>
                                        <div className="border border-gray-200 rounded-[4px] overflow-hidden divide-y divide-gray-100">
                                            {groupFedexResult.packages.map((pkg, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-white px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500 font-medium">Package {i + 1}:</span>
                                                        <span className="font-mono font-semibold text-gray-900">{pkg.trackingNumber}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => printSingleFedexLabel(groupShipGroupId, i + 1)}
                                                        disabled={printGroupLabelLoading}
                                                        className="flex items-center justify-center w-7 h-7 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 disabled:opacity-50"
                                                        title={`Print label for package ${i + 1}`}
                                                    >
                                                        {printGroupLabelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4 space-y-3">
                                        <p className="text-sm font-medium text-gray-700">Schedule FedEx Pickup (Optional)</p>
                                        {groupPickupConfirmation ? (
                                            <div className="bg-green-50 border border-green-200 rounded-[4px] p-3 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                <div className="text-xs">
                                                    <span className="text-green-800 font-medium">Pickup scheduled!</span>
                                                    <span className="ml-1 text-green-700">Confirmation: <span className="font-mono font-semibold">{groupPickupConfirmation}</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-3">
                                                    <p className="text-xs text-amber-800">
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode.
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs text-gray-500">Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={groupPickupForm.pickupDate}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            disabled={groupPickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={groupPickupForm.readyTime}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            disabled={groupPickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={groupPickupForm.closeTime}
                                                            onChange={e => setGroupPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-[4px] transition-colors"
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
                                    <div className="bg-blue-600 rounded-[4px] px-4 py-3 flex items-center justify-between">
                                        <p className="text-sm font-bold text-white">FedEx API Shipment</p>
                                        <span className="text-sm font-bold text-white underline font-mono">{fedexResult.masterTrackingNumber}</span>
                                    </div>

                                    {/* Success info */}
                                    <div className="bg-green-50 border border-green-200 rounded-[4px] p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <p className="text-sm font-semibold text-green-800">Shipment Created Successfully</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">Master Tracking:</span>
                                                <span className="ml-1 font-mono font-bold text-gray-900">{fedexResult.masterTrackingNumber}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Packages:</span>
                                                <span className="ml-1 font-medium text-gray-900">{fedexResult.packages.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package Tracking Numbers */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-800">Package Tracking Numbers:</p>
                                            {selectedMemo && (
                                                <button
                                                    onClick={() => printDebitMemoLabel(selectedMemo.id)}
                                                    disabled={printLabelLoading === selectedMemo.id}
                                                    className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-xs text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                    title="Print shipping label"
                                                >
                                                    {printLabelLoading === selectedMemo.id
                                                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Printing...</>
                                                        : <><Printer className="w-3 h-3" /> Print Labels</>
                                                    }
                                                </button>
                                            )}
                                        </div>
                                        <div className="border border-gray-200 rounded-[4px] overflow-hidden divide-y divide-gray-100">
                                            {fedexResult.packages.map((pkg, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-white px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500 font-medium">Package {i + 1}:</span>
                                                        <span className="font-mono font-semibold text-gray-900">{pkg.trackingNumber}</span>
                                                    </div>
                                                    {selectedMemo && (
                                                        <button
                                                            onClick={() => printDebitMemoLabel(selectedMemo.id)}
                                                            disabled={printLabelLoading === selectedMemo.id}
                                                            className="flex items-center justify-center w-7 h-7 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors disabled:opacity-50"
                                                            title="Print shipping label"
                                                        >
                                                            {printLabelLoading === selectedMemo.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Printer className="w-3 h-3" />
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Schedule Pickup */}
                                    <div className="border-t border-gray-200 pt-4 space-y-3">
                                        <p className="text-sm font-medium text-gray-700">Schedule FedEx Pickup (Optional)</p>
                                        {pickupConfirmation ? (
                                            <div className="bg-green-50 border border-green-200 rounded-[4px] p-3 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                <div className="text-xs">
                                                    <span className="text-green-800 font-medium">Pickup scheduled!</span>
                                                    <span className="ml-1 text-green-700">Confirmation: <span className="font-mono font-semibold">{pickupConfirmation}</span></span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-3">
                                                    <p className="text-xs text-amber-800">
                                                        <strong>Note:</strong> Pickup scheduling may not work in sandbox/test mode.
                                                        You can also call FedEx directly at <strong>1-800-463-3339</strong> and say &quot;Ground Return Pickup&quot;.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div>
                                                        <label className="text-xs text-gray-500">Pickup Date</label>
                                                        <input
                                                            type="date"
                                                            value={pickupForm.pickupDate}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                                                            className="block w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Ready Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.readyTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, readyTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            disabled={pickupLoading}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">Close Time</label>
                                                        <input
                                                            type="time"
                                                            value={pickupForm.closeTime}
                                                            onChange={e => setPickupForm(prev => ({ ...prev, closeTime: e.target.value }))}
                                                            className="block w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-[4px] transition-colors"
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
                                    <div className="bg-gray-50 rounded-[4px] p-4 text-sm space-y-1">
                                        <div className="flex justify-between"><span className="text-gray-500">Memo</span><span className="font-medium">{selectedMemo.memoNumber}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">RA #</span><span className="font-medium text-green-700">{selectedMemo.raNumber}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Destination</span><span className="capitalize font-medium">{selectedMemo.destination || '—'}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{selectedMemo.totalItems}</span></div>
                                    </div>

                                    <div className="border border-purple-200 bg-purple-50/70 rounded-[4px] p-4 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <Layers className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Ship together (same destination)</p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    Add other received memos going to <span className="font-medium capitalize">{selectedMemo.destination || 'this reverse distributor'}</span> on one FedEx shipment. This memo stays included.
                                                </p>
                                            </div>
                                        </div>
                                        {isGroupLoading ? (
                                            <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                                Checking for other eligible memos…
                                            </div>
                                        ) : (
                                            <>
                                                <label className="flex items-center gap-3 p-2 rounded bg-white border border-gray-100">
                                                    <input type="checkbox" checked readOnly disabled className="rounded border-gray-300 text-purple-600 opacity-70" />
                                                    <div className="flex-1 min-w-0 text-sm">
                                                        <span className="font-medium text-purple-700">{selectedMemo.memoNumber}</span>
                                                        <span className="text-gray-500 mx-2">{selectedMemo.pharmacyName}</span>
                                                        <span className="text-gray-400 text-xs">RA {selectedMemo.raNumber}</span>
                                                    </div>
                                                    <span className="text-[10px] uppercase text-gray-400 shrink-0">This memo</span>
                                                </label>
                                                {shipModalPeers.map(memo => (
                                                    <label key={memo.id} className="flex items-center gap-3 p-2 rounded hover:bg-white border border-transparent hover:border-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMemosForGroup.includes(memo.id)}
                                                            onChange={() => toggleShipWithMemo(memo.id)}
                                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <div className="flex-1 min-w-0 text-sm flex flex-wrap gap-x-3 gap-y-0.5">
                                                            <span className="font-medium text-purple-700">{memo.memoNumber}</span>
                                                            <span className="text-gray-600">{memo.pharmacyName}</span>
                                                            <span className="text-gray-400 text-xs">RA {memo.raNumber}</span>
                                                            <span className="text-gray-500">{formatCurrency(memo.totalAskValue)}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                                {shipModalPeers.length === 0 && (
                                                    <p className="text-xs text-gray-500">No other eligible memos share this destination right now.</p>
                                                )}
                                                {shipModalPeers.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={selectAllShipPeersSameDestination}
                                                        className="text-xs font-medium text-purple-700 hover:text-purple-900"
                                                    >
                                                        Select all at this destination ({shipModalPeers.length + 1} memos)
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {shipMode === 'choose' && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600 text-center">How would you like to ship?</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('fedex')}
                                                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-[4px] hover:border-blue-500 hover:bg-blue-50 transition-all"
                                                >
                                                    <Truck className="w-6 h-6 text-blue-600" />
                                                    <span className="text-sm font-semibold text-gray-900">Create FedEx Shipment</span>
                                                    <span className="text-[10px] text-gray-500">Auto-generate labels & tracking</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('manual')}
                                                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-[4px] hover:border-gray-500 hover:bg-gray-50 transition-all"
                                                >
                                                    <Edit className="w-6 h-6 text-gray-600" />
                                                    <span className="text-sm font-semibold text-gray-900">Enter Manually</span>
                                                    <span className="text-[10px] text-gray-500">Paste tracking number</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {shipMode === 'fedex' && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600 text-center">
                                                Create a FedEx Ground shipment from the warehouse to <strong className="capitalize">{selectedMemo.destination}</strong>
                                                {selectedMemosForGroup.length >= 2 && (
                                                    <span className="block mt-2 font-semibold text-blue-800">
                                                        {selectedMemosForGroup.length} memos will ship on one FedEx shipment.
                                                    </span>
                                                )}
                                            </p>

                                            <div className="flex items-center justify-center gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Number of Boxes:</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="99"
                                                        value={fedexBoxCount}
                                                        onChange={e => setFedexBoxCount(e.target.value)}
                                                        className="ml-2 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                        disabled={fedexLoading || groupFedexLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-[4px] p-3 text-xs text-blue-800 text-center space-y-1">
                                                <p>Shipment: <strong>Warehouse</strong> → <strong className="capitalize">{selectedMemo.destination}</strong></p>
                                                <p>Ensure the warehouse address and reverse distributor address are configured.</p>
                                            </div>

                                            <div className="flex justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShipMode('choose')}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-[4px] transition-colors"
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
                                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-[4px] p-2">
                                                    Manual tracking applies to this memo only. Other checked memos are not updated on this step.
                                                </p>
                                            )}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Outbound Tracking # *</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
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

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            {groupFedexResult && groupShipGroupId ? (
                                <Button variant="primary" onClick={closeModal}>
                                    Done
                                </Button>
                            ) : fedexResult ? (
                                <Button variant="primary" onClick={closeModal}>
                                    Done
                                </Button>
                            ) : shipMode === 'manual' ? (
                                <>
                                    <Button variant="ghost" onClick={() => setShipMode('choose')}>Back</Button>
                                    <Button variant="primary" onClick={handleShip} disabled={isActionLoading || !shipTracking.trim()}>
                                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
                                        Record Shipment
                                    </Button>
                                </>
                            ) : shipMode === 'choose' ? (
                                <Button variant="ghost" onClick={closeModal} disabled={groupFedexLoading}>
                                    Cancel
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

        </div>
        </PermissionGate>
    );
}
