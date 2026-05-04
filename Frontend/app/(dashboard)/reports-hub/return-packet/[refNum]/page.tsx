'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ReportLayout,
  PharmacyProcessorHeader,
  formatCurrency,
  formatFull,
  formatPartial,
  formatDeaColumn,
  formatExp,
  formatReturnCode,
  getItemName,
} from '@/components/reports-hub/ReportLayout';
import {
  pharmacyReportsService,
  type ReturnPacketReport,
  type ReportItem,
  type ManufacturerCreditGroup,
  type NeedsReviewReasonGroup,
} from '@/lib/api/services';

export default function ReturnPacketReportPage() {
  const params = useParams<{ refNum: string }>();
  const refNum = decodeURIComponent(String(params?.refNum || ''));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReturnPacketReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pharmacyReportsService.getReturnPacket(refNum);
        if (!cancelled) setReport(data);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refNum]);

  return (
    <ReportLayout loading={loading} error={error} reportTitle="Return Packet">
      {report && (
        <>
          <PharmacyProcessorHeader
            title="Return Goods Summary"
            subtitle="This packet summarizes the products picked up from your facility, along with their estimated credit value. Refer to the reference number when recording any credits or checks received for this return."
            pharmacy={report.pharmacy}
            processor={report.processor}
            returnMeta={report.return}
          />

          <ReturnGoodsSummarySection report={report} />

          {report.manufacturerCredits.length > 0 && (
            <div className="page-break mt-10">
              <ManufacturerCreditSummarySection
                groups={report.manufacturerCredits}
                totalEstimate={report.totals.totalReturnableValue}
              />
            </div>
          )}

          {report.manufacturerCredits.length > 0 && (
            <div className="page-break mt-10">
              <ReturnableProductsSection
                groups={report.manufacturerCredits}
                totalValue={report.totals.totalReturnableValue}
              />
            </div>
          )}

          {report.needsReviewByReason.length > 0 && (
            <div className="mt-10">
              <NeedsReviewSection
                groups={report.needsReviewByReason}
                totalValue={report.totals.totalNonReturnableValue}
              />
            </div>
          )}

          {report.items.length === 0 && (
            <div className="text-center text-sm text-gray-500 py-10">
              This return has no recorded items.
            </div>
          )}

          {report.return.fedexTracking && (
            <div className="mt-6 text-[11px] text-gray-600">
              FedEx tracking: {report.return.fedexTracking}
            </div>
          )}

          {report.return.notes && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                Notes
              </div>
              <div className="text-[11px] mt-1 whitespace-pre-wrap">
                {report.return.notes}
              </div>
            </div>
          )}
        </>
      )}
    </ReportLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// Return Goods Summary (top block with totals & breakdown)
// ═══════════════════════════════════════════════════════════════

function ReturnGoodsSummarySection({ report }: { report: ReturnPacketReport }) {
  const totals = report.totals;
  return (
    <section className="mt-4">
      <h2 className="text-sm font-bold uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
        Return Goods Summary
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
        <div className="border border-gray-300 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Returnable Products — to be credited
          </div>
          <div className="flex items-center justify-between">
            <span>Total items processed:</span>
            <span className="font-semibold">{totals.totalItems}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Returnable items:</span>
            <span className="font-semibold">{totals.totalReturnableItems}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Needs Review items:</span>
            <span className="font-semibold">
              {totals.totalNonReturnableItems}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
            <span className="font-semibold">Total Value of Returnable:</span>
            <span className="font-bold">
              {formatCurrency(Number(totals.totalReturnableValue))}
            </span>
          </div>
        </div>

        <div className="border border-gray-300 rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Needs Review — breakdown
          </div>
          {report.needsReviewByReason.length === 0 ? (
            <div className="text-gray-500">
              No items are pending review on this return.
            </div>
          ) : (
            <div className="space-y-0.5">
              {report.needsReviewByReason.map((g) => (
                <div key={g.reason} className="flex justify-between">
                  <span className="truncate pr-2">{g.reason}</span>
                  <span className="font-semibold whitespace-nowrap">
                    {formatCurrency(Number(g.totalValue))}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
            <span className="font-semibold">
              Total Value of Non-Returnable:
            </span>
            <span className="font-bold">
              {formatCurrency(Number(totals.totalNonReturnableValue))}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-2 border-gray-800 rounded p-3 flex items-center justify-between">
        <span className="text-sm font-bold">Total Value of All Products</span>
        <span className="text-lg font-bold">
          {formatCurrency(Number(totals.grandTotal))}
        </span>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Manufacturer Credit Summary (Credit Tracking Sheet)
// ═══════════════════════════════════════════════════════════════

function ManufacturerCreditSummarySection({
  groups,
  totalEstimate,
}: {
  groups: ManufacturerCreditGroup[];
  totalEstimate: number;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
        Manufacturer Credit Summary
      </h2>
      <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">
        Record the amount of your credits or checks on this sheet. Most credit
        memos will reference the reference number above — use that number when
        identifying or recording these credits.
      </p>
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left">
              Manufacturer
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right">
              Credit Estimate
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right">
              Amount Received
            </th>
            <th className="border border-gray-300 px-2 py-1 text-right">
              Date Received
            </th>
            <th className="border border-gray-300 px-2 py-1 text-left">
              Type Of Credit
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.manufacturer}>
              <td className="border border-gray-300 px-2 py-1">
                {g.manufacturer}
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right font-semibold">
                {formatCurrency(Number(g.totalValue))}
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                _______________
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                _______________
              </td>
              <td className="border border-gray-300 px-2 py-1">
                _______________
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="border border-gray-300 px-2 py-1 font-bold text-right">
              Total Estimate
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right font-bold">
              {formatCurrency(Number(totalEstimate))}
            </td>
            <td colSpan={3} className="border border-gray-300 px-2 py-1" />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Returnable Products — grouped by manufacturer
// ═══════════════════════════════════════════════════════════════

function ReturnableProductsSection({
  groups,
  totalValue,
}: {
  groups: ManufacturerCreditGroup[];
  totalValue: number;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
        Returnable Products Report
      </h2>
      <p className="text-[11px] text-gray-600 mb-4 leading-relaxed">
        This is a summary of your returnable merchandise grouped by
        manufacturer. Refer to the reference number above to identify credits
        received from this return.
      </p>

      {groups.map((g) => (
        <div key={g.manufacturer} className="mb-4">
          <div className="font-bold uppercase tracking-wide text-[12px] bg-gray-100 px-2 py-1 border border-gray-300 border-b-0">
            {g.manufacturer}
          </div>
          <PdfItemTable items={g.items} showReturnCode />
          <div className="flex justify-end border border-gray-300 border-t-0 bg-gray-50 px-2 py-1 text-[11px]">
            <span className="mr-2">Total Value For {g.manufacturer}:</span>
            <span className="font-bold">
              {formatCurrency(Number(g.totalValue))}
            </span>
          </div>
        </div>
      ))}

      <div className="mt-4 border-2 border-gray-800 rounded p-2 flex items-center justify-between">
        <span className="text-sm font-bold">Total Value For Return</span>
        <span className="text-sm font-bold">
          {formatCurrency(Number(totalValue))}
        </span>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Needs Review — grouped by non_returnable_reason
// ═══════════════════════════════════════════════════════════════

function NeedsReviewSection({
  groups,
  totalValue,
}: {
  groups: NeedsReviewReasonGroup[];
  totalValue: number;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide border-b border-gray-400 pb-1 mb-3">
        Needs Review Report
      </h2>
      <p className="text-[11px] text-gray-600 mb-4 leading-relaxed">
        This is a summary of products which require further research to
        determine their credit-worthiness. In the event these products are
        deemed to be non-returnable, the probable reason for such determination
        is listed.
      </p>

      {groups.map((g) => (
        <div key={g.reason} className="mb-4">
          <div className="font-bold uppercase tracking-wide text-[12px] bg-rose-50 border border-rose-200 px-2 py-1 border-b-0">
            {g.reason}
          </div>
          <PdfItemTable items={g.items} showManufacturer />
          <div className="flex justify-end border border-rose-200 border-t-0 bg-rose-50 px-2 py-1 text-[11px]">
            <span className="mr-2">
              Needs Review ({g.reason}) — Value:
            </span>
            <span className="font-bold">
              {formatCurrency(Number(g.totalValue))}
            </span>
          </div>
        </div>
      ))}

      <div className="mt-4 border-2 border-gray-800 rounded p-2 flex items-center justify-between">
        <span className="text-sm font-bold">
          Total Value of Needs Review Products
        </span>
        <span className="text-sm font-bold">
          {formatCurrency(Number(totalValue))}
        </span>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// PDF-style table row (shared by all Return Packet sub-tables)
// ═══════════════════════════════════════════════════════════════

function PdfItemTable({
  items,
  showManufacturer = false,
  showReturnCode = false,
}: {
  items: ReportItem[];
  showManufacturer?: boolean;
  showReturnCode?: boolean;
}) {
  return (
    <table className="w-full border-collapse text-[10.5px]">
      <thead>
        <tr className="bg-gray-50 text-left">
          <th className="border border-gray-300 px-1.5 py-1 font-semibold">
            NDC/List #
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-right">
            Full
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-right">
            Partial
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-right">
            Pkg Sz
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-right">
            Case Sz
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold">
            Product Description
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-center">
            DEA
          </th>
          {showManufacturer && (
            <th className="border border-gray-300 px-1.5 py-1 font-semibold">
              Manufacturer
            </th>
          )}
          <th className="border border-gray-300 px-1.5 py-1 font-semibold">
            Lot Number
          </th>
          <th className="border border-gray-300 px-1.5 py-1 font-semibold">
            Expires
          </th>
          {showReturnCode && (
            <th className="border border-gray-300 px-1.5 py-1 font-semibold text-center">
              Code
            </th>
          )}
          <th className="border border-gray-300 px-1.5 py-1 font-semibold text-right">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => {
          const full = formatFull(it);
          const partial = formatPartial(it);
          const code = formatReturnCode(it);
          return (
            <tr key={it.id}>
              <td className="border border-gray-300 px-1.5 py-1 font-mono">
                {it.ndc || '—'}
              </td>
              <td className="border border-gray-300 px-1.5 py-1 text-right">
                {full || 0}
              </td>
              <td className="border border-gray-300 px-1.5 py-1 text-right">
                {partial || 0}
              </td>
              <td className="border border-gray-300 px-1.5 py-1 text-right">
                {it.fullPackageSize ?? '—'}
              </td>
              <td className="border border-gray-300 px-1.5 py-1 text-right">
                1
              </td>
              <td className="border border-gray-300 px-1.5 py-1">
                {getItemName(it)}
              </td>
              <td className="border border-gray-300 px-1.5 py-1 text-center">
                {formatDeaColumn(it)}
              </td>
              {showManufacturer && (
                <td className="border border-gray-300 px-1.5 py-1">
                  {it.manufacturer || '—'}
                </td>
              )}
              <td className="border border-gray-300 px-1.5 py-1 font-mono">
                {it.lotNumber || '—'}
              </td>
              <td className="border border-gray-300 px-1.5 py-1">
                {formatExp(it.expirationDate)}
              </td>
              {showReturnCode && (
                <td className="border border-gray-300 px-1.5 py-1 text-center font-semibold">
                  {code || 'X'}
                </td>
              )}
              <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold">
                {formatCurrency(Number(it.estimatedValue ?? 0))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
