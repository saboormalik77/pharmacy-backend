/**
 * Helpers for printing FedEx PDF labels stored on shipment_groups.fedex_labels.
 */

export function parseShipmentGroupFedexLabels(
  raw: unknown
): Record<string, string> | null {
  if (!raw) return null;
  let labels: Record<string, unknown>;
  try {
    labels =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
  } catch {
    return null;
  }
  if (!labels || typeof labels !== 'object') return null;

  const parsed: Record<string, string> = {};
  for (const [key, val] of Object.entries(labels)) {
    if (typeof val === 'string' && val.length > 0) {
      parsed[key] = val;
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

export function isFedexTestLabel(base64: string): boolean {
  try {
    const text = Buffer.from(base64, 'base64').toString('latin1').toUpperCase();
    return text.includes('TEST LABEL') || text.includes('SAMPLE') || text.includes('DO NOT SHIP');
  } catch {
    return false;
  }
}

export function buildFedexLabelsPrintHtml(
  group: { id: string; outbound_tracking?: string | null },
  labels: Record<string, string>,
  options?: { fedExSandbox?: boolean }
): string {
  const sandboxBanner = options?.fedExSandbox
    ? `<div class="sandbox-warning">
  <strong>FedEx test (sandbox) labels</strong> — PDFs show &quot;TEST LABEL - DO NOT SHIP&quot;, tracking 0000…, and SAMPLE watermark.
  Set <code>FEDEX_API_URL=https://apis.fedex.com</code> with production credentials, then create a <strong>new</strong> shipment for real labels.
</div>`
    : '';
  const labelEntries = Object.entries(labels).sort(([a], [b]) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });

  const labelPages = labelEntries
    .map(([key, base64], i) => {
      const pkgNum = key.replace('package', '');
      return `
        <div class="label-page" id="page-${i}">
          <div class="label-header">FedEx Label - Package ${pkgNum} of ${labelEntries.length}</div>
          <embed src="data:application/pdf;base64,${base64}" type="application/pdf" class="label-embed" />
        </div>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FedEx Labels - ${group.outbound_tracking || group.id}</title>
<style>
  @page { margin: 0; size: 4in 6in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .label-page {
    width: 4in;
    height: 6in;
    page-break-after: always;
    position: relative;
    margin: 0 auto 20px;
    border: 1px solid #ccc;
    background: #fff;
  }
  .label-page:last-child { page-break-after: auto; }
  .label-header {
    text-align: center;
    font-size: 10pt;
    padding: 6px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    font-weight: bold;
  }
  .label-embed {
    width: 100%;
    height: calc(6in - 30px);
    border: none;
  }
  .print-info {
    text-align: center;
    padding: 20px;
    background: #e8f5e9;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  .print-info h2 { margin: 0 0 10px; color: #2e7d32; }
  .print-info p { margin: 0; color: #555; }
  .print-btn {
    display: inline-block;
    margin-top: 15px;
    padding: 10px 30px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
  }
  .print-btn:hover { background: #1565c0; }
  .sandbox-warning {
    margin: 0 20px 16px;
    padding: 12px 16px;
    background: #fff3e0;
    border: 1px solid #ffb74d;
    border-radius: 4px;
    font-size: 13px;
    color: #5d4037;
    line-height: 1.45;
  }
  .sandbox-warning code { font-size: 12px; }
  @media print {
    .sandbox-warning { display: none; }
    .print-info { display: none; }
    .label-page { margin: 0; border: none; }
    .label-header { display: none; }
    .label-embed { height: 6in; }
  }
</style>
</head>
<body>
${sandboxBanner}
<div class="print-info">
  <h2>FedEx Shipping Labels Ready</h2>
  <p>Tracking: <strong>${group.outbound_tracking || 'N/A'}</strong> | Total Labels: <strong>${labelEntries.length}</strong></p>
  <button class="print-btn" onclick="window.print()">Print All Labels</button>
</div>
${labelPages}
<script>
  setTimeout(function() { window.print(); }, 1500);
</script>
</body>
</html>`;
}
