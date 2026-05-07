'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ReportLayout,
  PharmacyProcessorHeader,
} from '@/components/reports-hub/ReportLayout';
import {
  ReturnCodeLegend,
  DestructionItemsTable,
  DestructionFooter,
  DestructionSignatureBlock,
} from '@/components/reports-hub/DestructionComponents';
import {
  pharmacyReportsService,
  type ItemizedReport,
} from '@/lib/api/services';

export default function DestructionNonControlsReportPage() {
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
        const data =
          await pharmacyReportsService.getDestructionNonControls(refNum);
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
      reportTitle="Proof of Destruction — Non Controls"
    >
      {report && (
        <>
          <PharmacyProcessorHeader
            title="Proof of Destruction — Non Controls"
            subtitle="The following products are being surrendered for the purpose of destruction and/or credit. Items on this packet are non-controlled (RX / OTC) products designated for destruction in accordance with federal, state, and local disposal regulations."
            pharmacy={report.pharmacy}
            processor={report.processor}
            returnMeta={report.return}
            showDebitMemo
            badge="DESTRUCTION"
          />

          <ReturnCodeLegend />

          <DestructionItemsTable items={report.items} isControls={false} />

          <DestructionFooter
            receivedAt={report.return.receivedAt}
            verifiedAt={report.return.verifiedAt}
            shippedAt={report.return.shippedAt}
            destroyedAt={report.return.destroyedAt}
            totalValue={Number(report.totals.totalEstimatedValue)}
            totalItems={report.totals.totalItems}
            isControls={false}
          />

          <DestructionSignatureBlock />
        </>
      )}
    </ReportLayout>
  );
}
