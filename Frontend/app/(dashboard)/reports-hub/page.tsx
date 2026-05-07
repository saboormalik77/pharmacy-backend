'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  PackageOpen,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import {
  pharmacyReportsService,
  type ReportDropdownItem,
} from '@/lib/api/services';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

interface ReportCardConfig {
  id:
    | 'return-packet'
    | 'controlled-substance'
    | 'destruction-controls'
    | 'destruction-non-controls';
  title: string;
  subtitle: string;
  sectionLabel?: string;
  icon: typeof FileText;
  accentClass: string;
  iconBgClass: string;
}

const REPORT_CARDS: ReportCardConfig[] = [
  {
    id: 'return-packet',
    title: 'Return Reports',
    subtitle: 'Full return packet: pharmacy header, items, lots, totals.',
    icon: PackageOpen,
    accentClass: 'from-teal-500 to-emerald-500',
    iconBgClass: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'controlled-substance',
    title: 'Controlled Substance Report',
    subtitle: 'All Schedule II-V items for the selected reference number.',
    icon: ShieldAlert,
    accentClass: 'from-amber-500 to-orange-500',
    iconBgClass: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'destruction-controls',
    title: 'Controls',
    subtitle: 'Proof of Destruction — Controlled substance items.',
    sectionLabel: 'Proof of Destruction',
    icon: Trash2,
    accentClass: 'from-rose-500 to-red-500',
    iconBgClass: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'destruction-non-controls',
    title: 'Non Controls',
    subtitle: 'Proof of Destruction — Non-controlled items.',
    sectionLabel: 'Proof of Destruction',
    icon: Trash2,
    accentClass: 'from-indigo-500 to-blue-500',
    iconBgClass: 'bg-indigo-100 text-indigo-700',
  },
];

function formatLabel(item: ReportDropdownItem): string {
  if (item.label) return item.label;
  return `${item.date} | ${item.refNum} | ${formatCurrency(item.amount)}`;
}

export default function ReportsHubPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<ReportDropdownItem[]>([]);
  const [selectedRefNum, setSelectedRefNum] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const selectedReturn = useMemo(
    () => returns.find((r) => r.refNum === selectedRefNum) || null,
    [returns, selectedRefNum],
  );

  const loadReturns = useCallback(async () => {
    try {
      setError(null);
      const rows = await pharmacyReportsService.listReturns();
      setReturns(rows);
      if (rows.length > 0) {
        setSelectedRefNum((prev) => {
          if (prev && rows.some((r) => r.refNum === prev)) return prev;
          return rows[0].refNum;
        });
      } else {
        setSelectedRefNum('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load returns. Please try again.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadReturns();
      setLoading(false);
    })();
  }, [loadReturns]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReturns();
    setRefreshing(false);
  }, [loadReturns]);

  const openReport = useCallback(
    (cardId: ReportCardConfig['id']) => {
      if (!selectedRefNum) return;
      const url = `/reports-hub/${cardId}/${encodeURIComponent(selectedRefNum)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [selectedRefNum],
  );

  const disabled = !selectedRefNum || loading;

  return (
    <PermissionGuard anyPermission={['returns:view', 'analytics:view', 'documents:view']}>
      <DashboardLayout>
        <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRight className="w-3.5 h-3.5" />
                Reports
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1">
                Reports Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a completed return, then view the detailed report you need.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div>
                <label
                  htmlFor="ras"
                  className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2"
                >
                  Reference Number
                </label>

                {loading ? (
                  <div className="h-11 rounded-lg bg-muted/60 animate-pulse" />
                ) : error ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">Couldn't load returns</div>
                      <div className="text-xs mt-0.5 break-words">{error}</div>
                    </div>
                  </div>
                ) : returns.length === 0 ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">No completed returns yet</div>
                      <div className="text-xs mt-0.5">
                        Once a return transaction is completed or finalized it
                        will appear here.
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    id="ras"
                    value={selectedRefNum}
                    onChange={(e) => setSelectedRefNum(e.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {returns.map((r) => (
                      <option key={r.refNum} value={r.refNum}>
                        {formatLabel(r)}
                      </option>
                    ))}
                  </select>
                )}

                {selectedReturn && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="uppercase tracking-wide text-muted-foreground">
                        Reference #
                      </div>
                      <div className="font-semibold mt-0.5 break-all">
                        {selectedReturn.refNum}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="uppercase tracking-wide text-muted-foreground">
                        Date
                      </div>
                      <div className="font-semibold mt-0.5">
                        {selectedReturn.date}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="uppercase tracking-wide text-muted-foreground">
                        Items
                      </div>
                      <div className="font-semibold mt-0.5">
                        {selectedReturn.totalItems ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <div className="uppercase tracking-wide text-muted-foreground">
                        Total
                      </div>
                      <div className="font-semibold mt-0.5 text-teal-700">
                        {formatCurrency(selectedReturn.amount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {REPORT_CARDS.slice(0, 2).map((card) => (
                  <ReportTile
                    key={card.id}
                    card={card}
                    disabled={disabled}
                    onView={() => openReport(card.id)}
                  />
                ))}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Proof of Destruction
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {REPORT_CARDS.slice(2).map((card) => (
                    <ReportTile
                      key={card.id}
                      card={card}
                      disabled={disabled}
                      onView={() => openReport(card.id)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}

function ReportTile({
  card,
  disabled,
  onView,
}: {
  card: ReportCardConfig;
  disabled: boolean;
  onView: () => void;
}) {
  const Icon = card.icon;
  return (
    <div className="rounded-xl border bg-card hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${card.accentClass}`} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBgClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">{card.title}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">
              {card.subtitle}
            </div>
          </div>
        </div>
        <Button
          onClick={onView}
          disabled={disabled}
          size="sm"
          className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
        >
          {disabled ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              View Report
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
