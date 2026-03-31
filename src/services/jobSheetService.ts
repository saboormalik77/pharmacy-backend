import { AppError } from '../utils/appError';
import { generateBarcode } from './barcodeService';

export interface JobSheetData {
  transaction: {
    id: string;
    licensePlate: string;
    pharmacyName: string;
    processorName: string;
    status: string;
    boxCount: number;
    prpNumber?: string;
    fedexTracking?: string;
    fedexShipmentId?: string;
    packageTracking?: Record<string, string>;
    createdAt: string;
    finalizedAt?: string;
  };
  pharmacy: {
    businessName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    contactName?: string;
    storeNumber?: string;
    deaNumber?: string;
    deaExpiration?: string;
    primaryWholesaler?: string;
    wholesalerAccountNumber?: string;
    pharmacyProcessor?: string;
  };
  warehouse: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    contactName: string;
  };
}

function makeBarcodeDataUrl(value: string, height = 50): string {
  try {
    const barcode = generateBarcode(value, {
      format: 'CODE128',
      width: 2,
      height,
      displayValue: true,
      fontSize: 12,
      textMargin: 2,
      margin: 5,
      marginTop: 5,
      marginBottom: 5,
      marginLeft: 5,
      marginRight: 5,
    });
    return `data:image/png;base64,${barcode.buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

// ────────────────────────────────────────────────────────────
// Page 1 : Return Transaction Job Report  (matches the image)
// ────────────────────────────────────────────────────────────
export function generateJobSheetHTML(data: JobSheetData): string {
  const { transaction: tx, pharmacy: ph, warehouse: wh } = data;

  const returnDate = new Date(tx.createdAt).toLocaleDateString('en-US');
  const licensePlateBarcode = makeBarcodeDataUrl(tx.licensePlate, 40);

  // Collect all unique tracking numbers (display without barcodes)
  const trackingNumbers: string[] = [];
  if (tx.packageTracking) {
    Object.values(tx.packageTracking).forEach(n => {
      if (n && !trackingNumbers.includes(n)) trackingNumbers.push(n);
    });
  }
  if (trackingNumbers.length === 0 && tx.fedexTracking) {
    trackingNumbers.push(tx.fedexTracking);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${ph.businessName} Job Sheet</title>
<style>
  @page { margin: 0.4in 0.5in; size: letter; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color:#000; background:#fff; }
  .page { width:100%; max-width:7.5in; margin:0 auto; }

  /* ── header ── */
  .report-title { font-size:18pt; font-weight:bold; text-align:right; margin-bottom:4px; }
  .header-row { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px double #000; padding-bottom:8px; margin-bottom:12px; }
  .header-left { }
  .header-right { text-align:right; }
  .header-field { margin-bottom:2px; }
  .header-field b { min-width:110px; display:inline-block; }

  /* ── info table ── */
  .info-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
  .info-table td { padding:3px 6px; vertical-align:top; border-bottom:1px solid #ccc; }
  .info-table .lbl { font-weight:bold; white-space:nowrap; width:160px; }

  /* ── separator ── */
  hr.thick { border:none; border-top:2px solid #000; margin:10px 0; }
  hr.thin  { border:none; border-top:1px solid #999; margin:8px 0; }

  /* ── tracking section ── */
  .tracking-title { font-weight:bold; font-size:11pt; margin:10px 0 6px; }
  .tracking-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:10px; }
  .tracking-card { border:1.5px solid #000; padding:8px; text-align:center; page-break-inside:avoid; }
  .tracking-card .pkg-label { font-size:9pt; color:#555; margin-bottom:2px; }
  .tracking-card .pkg-number { font-family:'Courier New',monospace; font-size:12pt; font-weight:bold; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { max-width:none; }
    .no-print { display:none; }
  }
</style>
</head>
<body>

<!-- ═══════════════ PAGE 1: JOB REPORT ═══════════════ -->
<div class="page">

  <div class="report-title">Return Transaction Job Report</div>

  <div class="header-row">
    <div class="header-left">
      <div class="header-field"><b>Return Date:</b> ${returnDate}</div>
      <div class="header-field"><b>Return Number:</b> ${tx.licensePlate}</div>
      ${licensePlateBarcode ? `<div style="margin-top:4px"><img src="${licensePlateBarcode}" alt="barcode" style="height:40px"></div>` : ''}
    </div>
    <div class="header-right">
      ${tx.finalizedAt ? `<div class="header-field"><b>Finalized:</b> ${new Date(tx.finalizedAt).toLocaleDateString('en-US')}</div>` : ''}
    </div>
  </div>

  <!-- Store / Pharmacy Info -->
  <table class="info-table">
    <tr><td class="lbl">Store Name:</td><td>${ph.businessName}</td></tr>
    <tr><td class="lbl">Store Address:</td><td>${ph.address}</td></tr>
    <tr><td class="lbl">C/S/Z:</td><td>${ph.city}, ${ph.state} ${ph.zipCode}</td></tr>
    ${ph.deaNumber ? `<tr><td class="lbl">DEA Number:</td><td>${ph.deaNumber}</td></tr>` : ''}
    ${ph.deaExpiration ? `<tr><td class="lbl">DEA Expiration:</td><td>${ph.deaExpiration}</td></tr>` : ''}
    ${ph.storeNumber ? `<tr><td class="lbl">Store Number:</td><td>${ph.storeNumber}</td></tr>` : ''}
    <tr><td class="lbl">Store Phone #:</td><td>${ph.phone}</td></tr>
    ${ph.contactName ? `<tr><td class="lbl">Store Contact:</td><td>${ph.contactName}</td></tr>` : ''}
    ${ph.pharmacyProcessor ? `<tr><td class="lbl">Processor:</td><td>${ph.pharmacyProcessor}</td></tr>` : ''}
  </table>

  <hr class="thick">

  <!-- Wholesaler Info -->
  <table class="info-table">
    ${ph.primaryWholesaler ? `<tr><td class="lbl">Wholesaler:</td><td>${ph.primaryWholesaler}</td></tr>` : ''}
    ${ph.wholesalerAccountNumber ? `<tr><td class="lbl">Wholesaler Number:</td><td>${ph.wholesalerAccountNumber}</td></tr>` : ''}
  </table>

  <hr class="thick">

  <!-- FedEx / Shipping -->
  <table class="info-table">
    ${tx.prpNumber ? `<tr><td class="lbl">FedEX PRP or USPS:</td><td>${tx.prpNumber}</td></tr>` : ''}
    <tr><td class="lbl">Number of Boxes:</td><td>${tx.boxCount || '—'}</td></tr>
  </table>

  <hr class="thin">

  <!-- Tracking Numbers (without barcodes) -->
  ${trackingNumbers.length > 0 ? `
  <div class="tracking-title">FedEX or USPS Tracking Numbers</div>
  <div class="tracking-grid">
    ${trackingNumbers.map((num, i) => `
    <div class="tracking-card">
      <div class="pkg-label">Package ${i + 1}</div>
      <div class="pkg-number">${num}</div>
    </div>`).join('')}
  </div>
  ` : ''}

</div><!-- /page -->

</body>
</html>`;
}

// ────────────────────────────────────────────────────────────
// Single shipping label HTML (for per-package download)
// ────────────────────────────────────────────────────────────
export function generateShippingLabelHTML(
  data: JobSheetData,
  trackingNumber: string,
  packageIndex: number,
  totalPackages: number,
): string {
  const { pharmacy: ph, warehouse: wh } = data;
  const barcodeUrl = makeBarcodeDataUrl(trackingNumber, 60);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${ph.businessName} Label</title>
<style>
  @page { margin: 0.3in; size: 4in 6in; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,Helvetica,sans-serif; font-size:10pt; color:#000; background:#fff; }
  .label { width:100%; max-width:3.6in; margin:0 auto; padding:10px 0; }
  .label-box { border:2px solid #000; padding:12px; margin-bottom:14px; }
  .label-heading { font-size:8pt; font-weight:bold; color:#555; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; border-bottom:1px solid #aaa; padding-bottom:2px; }
  .label-name { font-size:13pt; font-weight:bold; margin-bottom:2px; }
  .label-line { font-size:10pt; margin-bottom:1px; }
  .barcode-section { text-align:center; margin:12px 0 4px; }
  .barcode-section img { max-width:100%; }
  .tracking-text { font-family:'Courier New',monospace; font-size:14pt; font-weight:bold; margin-top:4px; text-align:center; }
  .pkg-info { text-align:center; font-size:9pt; color:#555; margin-bottom:8px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .label { max-width:none; } }
</style>
<script>window.onload=function(){setTimeout(()=>window.print(),400)}</script>
</head>
<body>
<div class="label">
  <div class="pkg-info">SHIPPING LABEL — Package ${packageIndex} of ${totalPackages}</div>

  <div class="label-box">
    <div class="label-heading">From — Shipper</div>
    <div class="label-name">${ph.businessName}</div>
    ${ph.contactName && ph.contactName !== ph.businessName ? `<div class="label-line">${ph.contactName}</div>` : ''}
    <div class="label-line">${ph.address}</div>
    <div class="label-line">${ph.city}, ${ph.state} ${ph.zipCode}</div>
    <div class="label-line">Phone: ${ph.phone}</div>
  </div>

  <div class="label-box">
    <div class="label-heading">To — Recipient</div>
    <div class="label-name">${wh.name}</div>
    <div class="label-line">${wh.contactName}</div>
    <div class="label-line">${wh.address}</div>
    <div class="label-line">${wh.city}, ${wh.state} ${wh.zipCode}</div>
    <div class="label-line">Phone: ${wh.phone}</div>
  </div>

  <div class="barcode-section">
    ${barcodeUrl ? `<img src="${barcodeUrl}" alt="barcode">` : ''}
  </div>
  <div class="tracking-text">${trackingNumber}</div>
</div>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────────
// Data fetcher
// ────────────────────────────────────────────────────────────
export async function getJobSheetData(transactionId: string, supabaseClient: any): Promise<JobSheetData> {
  // 1. Transaction with processor name
  const { data: transaction, error: txError } = await supabaseClient
    .from('return_transactions')
    .select(`
      id, license_plate, pharmacy_id, processor_id, status, box_count,
      fedex_tracking, fedex_shipment_id, package_tracking, prp_number,
      created_at, finalized_at
    `)
    .eq('id', transactionId)
    .single();

  if (txError || !transaction) {
    throw new AppError('Return transaction not found', 404);
  }

  // 2. Get processor name
  let processorName = '';
  if (transaction.processor_id) {
    const { data: proc } = await supabaseClient
      .from('admin_users')
      .select('name')
      .eq('id', transaction.processor_id)
      .single();
    processorName = proc?.name || '';
  }

  // 3. Pharmacy core + store settings
  const { data: pharmacy, error: pharmacyError } = await supabaseClient
    .from('pharmacy')
    .select(`
      pharmacy_name, physical_address, phone, email,
      store_number, dea_number, dea_expiration_date,
      primary_wholesaler, wholesaler_account_number,
      assigned_processor_id
    `)
    .eq('id', transaction.pharmacy_id)
    .single();

  if (pharmacyError || !pharmacy) {
    throw new AppError('Pharmacy not found', 404);
  }

  // 3a. Get pharmacy processor if assigned
  let pharmacyProcessorName = '';
  if (pharmacy.assigned_processor_id) {
    const { data: pharmacyProc } = await supabaseClient
      .from('processors')
      .select('name')
      .eq('id', pharmacy.assigned_processor_id)
      .single();
    pharmacyProcessorName = pharmacyProc?.name || '';
  }

  const addr = pharmacy.physical_address as { street?: string; city?: string; state?: string; zip?: string } | null;

  // 4. Warehouse settings
  const { data: settings, error: settingsError } = await supabaseClient.rpc('get_admin_settings');
  if (settingsError || !settings) {
    throw new AppError('Warehouse settings not found', 404);
  }

  // Debug: Log warehouse settings to help troubleshoot
  console.log('Warehouse settings from admin_settings:', {
    warehouseName: settings.warehouseName,
    warehouseStreet: settings.warehouseStreet,
    warehouseCity: settings.warehouseCity,
    warehouseState: settings.warehouseState,
    warehouseZip: settings.warehouseZip,
    warehousePhone: settings.warehousePhone,
    warehouseContactName: settings.warehouseContactName,
  });

  return {
    transaction: {
      id: transaction.id,
      licensePlate: transaction.license_plate,
      pharmacyName: pharmacy.pharmacy_name,
      processorName,
      status: transaction.status,
      boxCount: transaction.box_count,
      prpNumber: transaction.prp_number,
      fedexTracking: transaction.fedex_tracking,
      fedexShipmentId: transaction.fedex_shipment_id,
      packageTracking: transaction.package_tracking,
      createdAt: transaction.created_at,
      finalizedAt: transaction.finalized_at,
    },
    pharmacy: {
      businessName: pharmacy.pharmacy_name,
      address: addr?.street || 'Address not available',
      city: addr?.city || '',
      state: addr?.state || '',
      zipCode: addr?.zip || '',
      phone: pharmacy.phone || '',
      contactName: pharmacy.pharmacy_name,
      storeNumber: pharmacy.store_number || undefined,
      deaNumber: pharmacy.dea_number || undefined,
      deaExpiration: pharmacy.dea_expiration_date || undefined,
      primaryWholesaler: pharmacy.primary_wholesaler || undefined,
      wholesalerAccountNumber: pharmacy.wholesaler_account_number || undefined,
      pharmacyProcessor: pharmacyProcessorName || undefined,
    },
    warehouse: {
      name: settings.warehouseName || 'FCR Returns Warehouse',
      address: settings.warehouseStreet || '123 Warehouse Blvd',
      city: settings.warehouseCity || 'Dallas',
      state: settings.warehouseState || 'TX',
      zipCode: settings.warehouseZip || '75001',
      phone: settings.warehousePhone || '4695551234',
      contactName: settings.warehouseContactName || 'Receiving Department',
    },
  };
}
