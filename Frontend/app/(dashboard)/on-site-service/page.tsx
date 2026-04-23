'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Truck,
  Plus,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Info,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import {
  onSiteServiceService,
  ServiceRequestListItem,
  ServiceRequestDetail,
  ServiceRequestStatus,
} from '@/lib/api/services/onSiteServiceService';
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions';
import { toast } from 'react-toastify';
import { getToken } from '@/lib/utils/cookies';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusBadge(status: ServiceRequestStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
          <Clock className="w-3 h-3 mr-1 inline" />
          Pending
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
          <CalendarClock className="w-3 h-3 mr-1 inline" />
          Scheduled
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="w-3 h-3 mr-1 inline" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

export default function OnSiteServicePage() {
  // ==========================================================================
  // IMPORTANT: All hooks MUST be declared at the top of the component,
  // before any conditional returns. This prevents "Rendered more hooks than
  // during the previous render" errors (Rules of Hooks).
  // ==========================================================================

  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const { isParent, hasPermission, isLoaded, isSigningOut, grantAll, permissions } = usePharmacyPermissions();

  const [items, setItems] = useState<ServiceRequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ServiceRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [manuallyClosedId, setManuallyClosedId] = useState<string | null>(null);

  // Derived values (not hooks, safe to compute here)
  const hasViewPermission = mounted && (hasPermission('on_site_service:view') || grantAll);
  const hasCreatePermission = mounted && (hasPermission('on_site_service:create') || grantAll);

  // Fix hydration mismatch by only showing dynamic content after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging for permissions
  useEffect(() => {
    if (mounted && isLoaded) {
      console.log('[OnSiteService] Permission check:', {
        isLoaded,
        isSigningOut,
        hasViewPermission,
        hasCreatePermission,
        grantAll,
        isParent,
        permissionsCount: permissions.length,
      });
    }
  }, [mounted, isLoaded, isSigningOut, hasViewPermission, hasCreatePermission, grantAll, isParent, permissions.length]);

  const fetchItems = useCallback(async () => {
    if (!mounted || !isLoaded || isSigningOut || !hasViewPermission) return;

    const token = getToken();
    if (!token) {
      console.warn('[OnSiteService] No token available, skipping API call');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('[OnSiteService] Making API call to list service requests');
      const data = await onSiteServiceService.list({
        status: statusFilter || undefined,
        page,
        limit,
      });
      setItems(data.items);
      setTotal(data.total);
      console.log('[OnSiteService] API call successful, loaded', data.items.length, 'items');
    } catch (err: any) {
      console.error('[OnSiteService] API call failed:', err);
      if (err?.status === 403 || err?.status === 401) {
        setError('You don\'t have permission to view on-site service requests.');
      } else {
        setError(err?.message || 'Failed to load requests');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit, hasViewPermission, mounted, isLoaded, isSigningOut]);

  useEffect(() => {
    if (mounted && isLoaded && hasViewPermission && !isSigningOut) {
      fetchItems();
    } else if (mounted && isLoaded && !hasViewPermission && !isSigningOut) {
      setLoading(false);
    }
  }, [fetchItems, mounted, isLoaded, hasViewPermission, isSigningOut]);


  // Auto-open service request details if 'open' parameter is in URL
  useEffect(() => {
    if (!mounted || !isLoaded || !hasViewPermission || isSigningOut) return;

    const openRequestId = searchParams?.get('open');
    
    // Clear manuallyClosedId if URL changed to different request or no open parameter
    if (!openRequestId || (openRequestId && openRequestId !== manuallyClosedId)) {
      setManuallyClosedId(null);
    }
    
    if (openRequestId && !detail && !detailLoading && openRequestId !== manuallyClosedId) {
      // Auto-open the detail modal only if it wasn't manually closed
      setDetailLoading(true);
      onSiteServiceService.getById(openRequestId)
        .then((d) => setDetail(d))
        .catch((err) => toast.error(err?.message || 'Failed to load request'))
        .finally(() => setDetailLoading(false));
    }
  }, [mounted, isLoaded, hasViewPermission, isSigningOut, searchParams, detail, detailLoading, manuallyClosedId]);

  // ==========================================================================
  // Early returns AFTER all hooks are declared — safe per Rules of Hooks
  // ==========================================================================

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isSigningOut || !isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasViewPermission) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the On-Site Service feature.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator to request access.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await onSiteServiceService.getById(id);
      setDetail(d);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load request');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    const openRequestId = searchParams?.get('open');
    if (openRequestId) {
      setManuallyClosedId(openRequestId);
    }
    setDetail(null);
    // Clear the 'open' parameter from URL if it exists
    if (openRequestId) {
      router.replace('/on-site-service');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Reason for cancelling (optional):') ?? undefined;
    try {
      await onSiteServiceService.cancel(id, reason);
      toast.success('Request cancelled');
      closeDetail();
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" />
              On-Site Service
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Request a field representative to visit your store for returns, training, or inventory review.
            </p>
          </div>
          {hasCreatePermission && (
            <Button
              onClick={() => router.push('/on-site-service/new')}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          )}
        </div>

        {/* Info banner */}
        <Card className="border-teal-200 bg-teal-50/60">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-teal-900">
              <strong>How this works:</strong> When you submit a request, it is automatically routed to every
              field representative assigned to your store. The first rep to claim and schedule it owns the
              visit. You'll receive an email once a rep confirms a date.
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              {loading ? 'Loading...' : `${total} request${total === 1 ? '' : 's'}`}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm mb-3">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            {loading ? (
              <div className="py-12 flex justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No service requests yet. Click <strong>New Request</strong> to schedule your first visit.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Requested</th>
                      <th className="py-2 pr-4 font-medium">Requested Date</th>
                      <th className="py-2 pr-4 font-medium">Scheduled</th>
                      <th className="py-2 pr-4 font-medium">Rep</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Branch</th>
                      <th className="py-2 pr-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b last:border-0 hover:bg-accent/40 cursor-pointer"
                        onClick={() => openDetail(r.id)}
                      >
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="py-3 pr-4">{formatDate(r.requested_date)}</td>
                        <td className="py-3 pr-4">
                          {r.scheduled_date ? formatDate(r.scheduled_date) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 pr-4">
                          {r.claimed_processor_name || <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 pr-4">{getStatusBadge(r.status)}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {r.branch_business_name || r.branch_name || 'Main'}
                        </td>
                        <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {r.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(r.id)}
                              className="text-red-600 hover:text-red-700 h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Detail modal */}
      {detail && (
        <DetailModal
          detail={detail}
          onClose={closeDetail}
          onCancel={() => handleCancel(detail.id)}
        />
      )}
      {detailLoading && !detail && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      )}
    </DashboardLayout>
  );
}


// =====================================================================
// Detail modal
// =====================================================================

function DetailModal({
  detail,
  onClose,
  onCancel,
}: {
  detail: ServiceRequestDetail;
  onClose: () => void;
  onCancel: () => void;
}) {
  const statusBadge = getStatusBadge(detail.status);
  const canCancel = detail.status === 'pending';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background w-full max-w-2xl rounded-lg shadow-lg border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div>
            <h2 className="font-semibold">Service Request Details</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              ID: {detail.id.slice(0, 8)}… · Created {formatDate(detail.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-accent rounded"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-sm">
          <Section title="Request">
            <Row icon={<Calendar className="w-4 h-4" />} label="Preferred Date">
              {formatDate(detail.requested_date)}
            </Row>
            {detail.scheduled_date && (
              <Row icon={<CalendarClock className="w-4 h-4" />} label="Scheduled Date">
                <strong>{formatDate(detail.scheduled_date)}</strong>
              </Row>
            )}
            {detail.branch && (
              <Row icon={<MapPin className="w-4 h-4" />} label="Branch">
                {detail.branch.business_name || detail.branch.pharmacy_name}
              </Row>
            )}
            {detail.special_instructions && (
              <Row icon={<FileText className="w-4 h-4" />} label="Special Instructions">
                <div className="whitespace-pre-wrap">{detail.special_instructions}</div>
              </Row>
            )}
          </Section>

          {detail.claimed_processor && (
            <Section title="Your Field Representative">
              <Row icon={<User className="w-4 h-4" />} label="Name">
                {detail.claimed_processor.name || '—'}
              </Row>
              {detail.claimed_processor.email && (
                <Row icon={<Mail className="w-4 h-4" />} label="Email">
                  <a
                    href={`mailto:${detail.claimed_processor.email}`}
                    className="text-teal-700 hover:underline"
                  >
                    {detail.claimed_processor.email}
                  </a>
                </Row>
              )}
              {detail.claimed_processor.phone && (
                <Row icon={<Phone className="w-4 h-4" />} label="Phone">
                  <a
                    href={`tel:${detail.claimed_processor.phone}`}
                    className="text-teal-700 hover:underline"
                  >
                    {detail.claimed_processor.phone}
                  </a>
                </Row>
              )}
            </Section>
          )}

          {detail.scheduler_notes && detail.status === 'scheduled' && (
            <Section title="Notes from Rep">
              <div className="p-3 bg-blue-50 border-l-2 border-blue-400 rounded whitespace-pre-wrap">
                {detail.scheduler_notes}
              </div>
            </Section>
          )}

          {detail.completion_notes && (
            <Section title="Completion Notes">
              <div className="p-3 bg-green-50 border-l-2 border-green-400 rounded whitespace-pre-wrap">
                {detail.completion_notes}
              </div>
              {detail.completed_at && (
                <div className="text-xs text-muted-foreground mt-2">
                  Completed on {formatDate(detail.completed_at)}
                </div>
              )}
            </Section>
          )}

          {detail.cancelled_at && (
            <Section title="Cancellation">
              <Row icon={<XCircle className="w-4 h-4" />} label="Cancelled On">
                {formatDate(detail.cancelled_at)}
              </Row>
              <Row icon={<User className="w-4 h-4" />} label="Cancelled By">
                {detail.cancelled_by || '—'}
              </Row>
              {detail.cancelled_reason && (
                <Row icon={<FileText className="w-4 h-4" />} label="Reason">
                  <div className="whitespace-pre-wrap">{detail.cancelled_reason}</div>
                </Row>
              )}
            </Section>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20 sticky bottom-0">
          {canCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancel Request
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 w-40 flex-shrink-0 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
