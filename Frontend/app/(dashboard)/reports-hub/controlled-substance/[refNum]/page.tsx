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
  getItemName,
} from '@/components/reports-hub/ReportLayout';
import {
  pharmacyReportsService,
  type ItemizedReport,
} from '@/lib/api/services';

export default function ControlledSubstanceReportPage() {
  const params = useParams<{ refNum: string }>();
  const refNum = decodeURIComponent(String(params?.refNum || ''));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ItemizedReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pharmacyReportsService.getControlledSubstance(refNum);
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
    <ReportLayout
      loading={loading}
      error={error}
      reportTitle="Controlled Substance Report"
    >
      {report && (
        <>
          <PharmacyProcessorHeader
            title="Controlled Substance Report"
            subtitle="This report is a summary of all controlled substances removed from the inventory of this facility on the date listed. These products are to be returned to their respective manufacturer for credit or destroyed. The other reports corresponding to this service detail the disposition of these products."
            pharmacy={report.pharmacy}
            processor={report.processor}
            returnMeta={report.return}
            showDebitMemo
            badge="CONFIDENTIAL"
          />

          {report.items.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10 border rounded-lg">
              No controlled-substance items in this return.
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-1.5 py-1 text-right font-bold">
                    FULL
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-right font-bold">
                    PAR
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-right font-bold">
                    PKG
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-right font-bold">
                    CASE
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-left font-bold">
                    LABEL NAME
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-center font-bold">
                    DEA
                  </th>
                  <th className="border border-gray-400 px-1.5 py-1 text-left font-bold">
                    NDC
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((it) => (
                  <tr key={it.id}>
                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                      {formatFull(it)}
                    </td>
                    <td className="border border-gray-300 px-1.5 py-1 text-right">
                      {formatPartial(it)}
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
                    <td className="border border-gray-300 px-1.5 py-1 text-center font-semibold">
                      {formatDeaColumn(it)}
                    </td>
                    <td className="border border-gray-300 px-1.5 py-1 font-mono">
                      {it.ndc || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {report.totals && (
            <div className="mt-6 border-t-2 border-gray-800 pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-gray-600">
                Total items: {report.totals.totalItems}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">
                  Total Estimated Value
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(Number(report.totals.totalEstimatedValue))}
                </div>
              </div>
            </div>
          )}

          <SignatureBlock />
        </>
      )}
    </ReportLayout>
  );
}

function SignatureBlock() {
  return (
    <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
      <div>
        <div className="h-10 border-b border-gray-400" />
        <div className="mt-1 text-gray-600">Pharmacist / Authorized Signer</div>
      </div>
      <div>
        <div className="h-10 border-b border-gray-400" />
        <div className="mt-1 text-gray-600">Date</div>
      </div>
    </div>
  );
}
