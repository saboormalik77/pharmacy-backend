'use client';

import { ReactNode } from 'react';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type {
  PharmacyHeader,
  ProcessorInfo,
  ReportItem,
  ReportReturnMeta,
} from '@/lib/api/services';
import { formatCurrency } from '@/lib/utils/format';

interface ReportLayoutProps {
  loading: boolean;
  error: string | null;
  reportTitle: string;
  children?: ReactNode;
}

/**
 * Top-level frame for a printable PDF-style report. Handles the
 * loading / error states, the Back / Print toolbar (hidden on print),
 * and wraps the content in a Letter-size sheet with sensible print CSS.
 */
export function ReportLayout({
  loading,
  error,
  reportTitle,
  children,
}: ReportLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-muted/30">
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .report-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-wrapper {
            padding: 0 !important;
            background: #fff !important;
          }
          @page { size: Letter; margin: 12mm; }
          table { break-inside: auto; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          h1, h2, h3 { break-after: avoid; }
          .page-break { page-break-after: always; break-after: page; }
        }
      `}</style>

      <div className="no-print border-b bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="hidden sm:block text-xs text-muted-foreground truncate">
            {reportTitle}
          </div>
          <button
            onClick={() => window.print()}
            disabled={loading || !!error}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="report-wrapper py-6 px-4">
        <div className="report-sheet max-w-5xl mx-auto bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 font-semibold text-base mb-2">
                Unable to load report
              </div>
              <div className="text-sm text-muted-foreground break-words max-w-md mx-auto">
                {error}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-10 text-[11px] text-gray-900">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PDF-style Pharmacy / Processor header (two-column)
//   Left  = "PRODUCT REMOVED FROM" (pharmacy)
//   Right = "PROCESSED BY"         (processor)
// Optionally a third "Ship To" block for destruction reports.
// ═══════════════════════════════════════════════════════════════

interface PharmacyProcessorHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  pharmacy: PharmacyHeader;
  processor: ProcessorInfo;
  returnMeta: ReportReturnMeta;
  showDebitMemo?: boolean;
  extraInfoLines?: { label: string; value: ReactNode }[];
  controlledBanner?: boolean;
}

export function PharmacyProcessorHeader({
  title,
  subtitle,
  badge,
  pharmacy,
  processor,
  returnMeta,
  showDebitMemo = false,
  extraInfoLines,
  controlledBanner = false,
}: PharmacyProcessorHeaderProps) {
  return (
    <div className="pb-4 mb-4 border-b-2 border-gray-800">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">
              {title}
            </h1>
            {badge && (
              <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-gray-900 text-white">
                {badge}
              </span>
            )}
            {controlledBanner && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded border-2 border-red-600 text-red-600 text-lg font-bold">
                C
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-[11px] text-gray-600 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </div>
          )}
        </div>

        <div className="text-[11px] text-right space-y-0.5 min-w-[220px]">
          {showDebitMemo && (
            <div>
              <span className="text-gray-500 mr-1">Debit Memo #:</span>
              <span className="font-bold">
                {returnMeta.debitMemoNum || returnMeta.refNum}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500 mr-1">Reference #:</span>
            <span className="font-bold">{returnMeta.refNum}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-1">Date:</span>
            <span className="font-semibold">
              {returnMeta.serviceDate || returnMeta.reportDate}
            </span>
          </div>
          {extraInfoLines?.map((line, idx) => (
            <div key={idx}>
              <span className="text-gray-500 mr-1">{line.label}:</span>
              <span className="font-semibold">{line.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PharmacyBlock pharmacy={pharmacy} />
        <ProcessorBlock processor={processor} />
      </div>
    </div>
  );
}

function PharmacyBlock({ pharmacy }: { pharmacy: PharmacyHeader }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
        Product Removed From
      </div>
      <div className="text-sm font-bold">
        {pharmacy.pharmacyName || '—'}
      </div>
      {pharmacy.corporateName &&
        pharmacy.corporateName !== pharmacy.pharmacyName && (
          <div className="text-gray-600 text-[11px]">
            {pharmacy.corporateName}
          </div>
        )}
      {pharmacy.street && (
        <div className="text-[11px] mt-0.5">{pharmacy.street}</div>
      )}
      {(pharmacy.city || pharmacy.state || pharmacy.zip) && (
        <div className="text-[11px]">
          {[pharmacy.city, pharmacy.state].filter(Boolean).join(', ')}
          {pharmacy.zip ? ` ${pharmacy.zip}` : ''}
        </div>
      )}
      <div className="mt-1.5 text-[11px] space-y-0.5">
        {pharmacy.storeNumber && (
          <div>
            <span className="text-gray-500">Account #: </span>
            <span className="font-semibold">{pharmacy.storeNumber}</span>
          </div>
        )}
        {pharmacy.deaNumber && (
          <div>
            <span className="text-gray-500">DEA #: </span>
            <span className="font-semibold">{pharmacy.deaNumber}</span>
          </div>
        )}
        {pharmacy.npiNumber && (
          <div>
            <span className="text-gray-500">NPI: </span>
            <span className="font-semibold">{pharmacy.npiNumber}</span>
          </div>
        )}
        {pharmacy.stateLicenseNumber && (
          <div>
            <span className="text-gray-500">State License: </span>
            <span className="font-semibold">{pharmacy.stateLicenseNumber}</span>
          </div>
        )}
        {pharmacy.contactPhone && (
          <div>
            <span className="text-gray-500">Phone: </span>
            <span className="font-semibold">{pharmacy.contactPhone}</span>
          </div>
        )}
        {pharmacy.primaryWholesaler && (
          <div>
            <span className="text-gray-500">Wholesaler: </span>
            <span className="font-semibold">{pharmacy.primaryWholesaler}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessorBlock({ processor }: { processor: ProcessorInfo }) {
  return (
    <div className="md:text-right">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
        Processed By
      </div>
      <div className="text-sm font-bold">{processor.name}</div>
      {processor.address && (
        <div className="text-[11px] mt-0.5 whitespace-pre-line">
          {processor.address}
        </div>
      )}
      <div className="mt-1.5 text-[11px] space-y-0.5">
        {processor.phone && (
          <div>
            <span className="text-gray-500">Phone #: </span>
            <span className="font-semibold">{processor.phone}</span>
          </div>
        )}
        {processor.deaNumber && (
          <div>
            <span className="text-gray-500">DEA #: </span>
            <span className="font-semibold">{processor.deaNumber}</span>
          </div>
        )}
        {processor.email && (
          <div>
            <span className="text-gray-500">Email: </span>
            <span className="font-semibold break-all">{processor.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PDF-style row helpers
// ═══════════════════════════════════════════════════════════════

export function formatFull(item: ReportItem): number {
  if (item.isPartial) return 0;
  return Number(item.quantity ?? 0);
}

export function formatPartial(item: ReportItem): number {
  if (!item.isPartial) return 0;
  return Number(item.quantity ?? 0);
}

export function formatPartialPct(item: ReportItem): string {
  if (!item.isPartial) return '';
  const pct = Number(item.partialPercentage ?? 0);
  if (!pct) return '';
  const ratio = pct > 1 ? pct / 100 : pct;
  return ratio.toFixed(3);
}

export function formatDeaColumn(item: ReportItem): string {
  const raw = (item.deaSchedule || '').trim().toUpperCase();
  if (!raw) return 'RX';
  const cleaned = raw.replace(/[^0-9IV]/g, '');
  if (['1', 'I'].includes(cleaned)) return '1';
  if (['2', 'II'].includes(cleaned)) return '2';
  if (['3', 'III'].includes(cleaned)) return '3';
  if (['4', 'IV'].includes(cleaned)) return '4';
  if (['5', 'V'].includes(cleaned)) return '5';
  return cleaned || 'RX';
}

export function formatExp(expirationDate: string | null): string {
  if (!expirationDate) return '—';
  const d = new Date(expirationDate);
  if (isNaN(d.getTime())) return expirationDate;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

export function formatReturnCode(item: ReportItem): string {
  const r = (item.returnReason || '').toLowerCase();
  if (r.includes('expir')) return 'X';
  if (r.includes('damag')) return 'D';
  if (r.includes('overstock')) return 'O';
  if (r.includes('recall')) return 'R';
  return '';
}

export function getItemName(item: ReportItem): string {
  return item.proprietaryName || item.genericName || '—';
}

// ═══════════════════════════════════════════════════════════════
// Reusable currency helper (re-exported for report pages)
// ═══════════════════════════════════════════════════════════════
export { formatCurrency };
