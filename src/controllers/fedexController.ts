import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import * as fedexService from '../services/fedexService';

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

function handleRpcError(data: any, rpcError: any, label: string) {
  if (rpcError) throw new AppError(`${label}: ${rpcError.message}`, 400);
  if (!data) throw new AppError(`${label}: no data returned`, 500);
  if (data.error) throw new AppError(data.message || label, data.code || 400);
}

// ============================================================
// Helpers to load pharmacy address and warehouse address
// ============================================================

async function getPharmacyAddress(pharmacyId: string) {
  const sb = ensureAdmin();
  const { data, error } = await sb
    .from('pharmacy')
    .select('pharmacy_name, physical_address, phone, email')
    .eq('id', pharmacyId)
    .single();

  if (error || !data) {
    throw new AppError('Pharmacy not found', 404);
  }

  const addr = data.physical_address as { street?: string; city?: string; state?: string; zip?: string } | null;
  if (!addr?.street || !addr?.city || !addr?.state || !addr?.zip) {
    throw new AppError('Pharmacy physical address is incomplete. Please update it in pharmacy settings.', 400);
  }

  // Validate US address format
  const zipPattern = /^\d{5}(-\d{4})?$/;
  if (!zipPattern.test(addr.zip)) {
    throw new AppError(`Invalid pharmacy ZIP code: ${addr.zip}. Must be 5 digits (e.g., 75001).`, 400);
  }

  const statePattern = /^[A-Z]{2}$/;
  if (!statePattern.test(addr.state)) {
    throw new AppError(`Invalid pharmacy state: ${addr.state}. Must be 2-letter US state code (e.g., TX).`, 400);
  }

  // Clean phone number to digits only
  const cleanPhone = (data.phone || '').replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new AppError(`Invalid pharmacy phone: ${data.phone}. Must be 10 digits.`, 400);
  }

  return {
    address: {
      streetLines: [addr.street],
      city: addr.city,
      stateOrProvinceCode: addr.state,
      postalCode: addr.zip,
      countryCode: 'US',
    },
    contact: {
      personName: data.pharmacy_name || 'Pharmacy',
      phoneNumber: cleanPhone,
      companyName: data.pharmacy_name || undefined,
    },
  };
}

async function getWarehouseAddress() {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_admin_settings');

  if (error) throw new AppError(`Failed to load settings: ${error.message}`, 500);

  const s = data?.settings || data;
  if (!s?.warehouseStreet || !s?.warehouseCity || !s?.warehouseState || !s?.warehouseZip) {
    throw new AppError(
      'Warehouse address is not configured. Please set it in Admin Settings > Warehouse Address.',
      400
    );
  }

  // Validate warehouse address format
  const zipPattern = /^\d{5}(-\d{4})?$/;
  if (!zipPattern.test(s.warehouseZip)) {
    throw new AppError(`Invalid warehouse ZIP code: ${s.warehouseZip}. Must be 5 digits.`, 400);
  }

  const statePattern = /^[A-Z]{2}$/;
  if (!statePattern.test(s.warehouseState)) {
    throw new AppError(`Invalid warehouse state: ${s.warehouseState}. Must be 2-letter US state code.`, 400);
  }

  // Clean phone number
  const cleanPhone = (s.warehousePhone || '').replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new AppError(`Invalid warehouse phone: ${s.warehousePhone}. Must be 10 digits.`, 400);
  }

  return {
    address: {
      streetLines: [s.warehouseStreet],
      city: s.warehouseCity,
      stateOrProvinceCode: s.warehouseState,
      postalCode: s.warehouseZip,
      countryCode: s.warehouseCountry || 'US',
    },
    contact: {
      personName: s.warehouseContactName || s.warehouseName || 'Warehouse',
      phoneNumber: cleanPhone,
      companyName: s.warehouseName || undefined,
    },
  };
}

async function getReturnTransaction(id: string) {
  const sb = ensureAdmin();
  const { data, error } = await sb
    .from('return_transactions')
    .select('id, pharmacy_id, status, box_count, fedex_tracking, fedex_shipment_id, fedex_labels, package_tracking, prp_number')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Return transaction not found', 404);
  }
  return data;
}

// ============================================================
// POST /api/return-transactions/:id/create-shipment
// ============================================================
export const createShipmentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { boxCount, packageWeight, serviceType } = req.body;

    const tx = await getReturnTransaction(id);

    if (!['completed', 'in_progress', 'paused'].includes(tx.status)) {
      throw new AppError(`Cannot create shipment for status "${tx.status}"`, 400);
    }

    const resolvedBoxCount = boxCount || tx.box_count || 1;
    const shipper = await getPharmacyAddress(tx.pharmacy_id);
    const recipient = await getWarehouseAddress();

    console.log('FedEx shipment addresses:', {
      shipper: shipper.address,
      shipperContact: shipper.contact,
      recipient: recipient.address,
      recipientContact: recipient.contact,
      boxCount: resolvedBoxCount,
    });

    const result = await fedexService.createShipment({
      shipperAddress: shipper.address,
      shipperContact: shipper.contact,
      recipientAddress: recipient.address,
      recipientContact: recipient.contact,
      boxCount: resolvedBoxCount,
      packageWeight: packageWeight || 10,
      serviceType: serviceType || 'FEDEX_GROUND',
    });

    const packageTracking: Record<string, string> = {};
    const labelsData: Record<string, string> = {};

    result.packages.forEach((pkg, i) => {
      if (pkg.trackingNumber) {
        packageTracking[`package${i + 1}`] = pkg.trackingNumber;
      }
      if (pkg.labelBase64) {
        labelsData[`package${i + 1}`] = pkg.labelBase64;
      }
    });

    const sb = ensureAdmin();
    const { data: saved, error: saveErr } = await sb.rpc('save_fedex_shipment_data', {
      p_id: id,
      p_fedex_shipment_id: result.shipmentId,
      p_fedex_tracking: result.masterTrackingNumber,
      p_prp_number: result.masterTrackingNumber,
      p_box_count: resolvedBoxCount,
      p_package_tracking: packageTracking,
      p_fedex_labels: labelsData,
    });

    handleRpcError(saved, saveErr, 'Failed to save FedEx shipment data');

    res.status(200).json({
      status: 'success',
      data: {
        transaction: saved.data,
        shipment: {
          masterTrackingNumber: result.masterTrackingNumber,
          shipmentId: result.shipmentId,
          packageCount: result.packages.length,
          packages: result.packages.map((p) => ({
            trackingNumber: p.trackingNumber,
            hasLabel: !!p.labelBase64,
          })),
        },
      },
    });
  }
);

// ============================================================
// POST /api/return-transactions/:id/schedule-pickup
// ============================================================
export const schedulePickupHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { readyTime, closeTime, pickupDate } = req.body;

    const tx = await getReturnTransaction(id);

    // Require that a shipment exists before scheduling pickup
    if (!tx.fedex_tracking && !tx.fedex_shipment_id) {
      throw new AppError('Cannot schedule pickup: Create FedEx shipment first.', 400);
    }

    const shipper = await getPharmacyAddress(tx.pharmacy_id);
    const boxCount = tx.box_count || 1;

    const result = await fedexService.schedulePickup({
      pickupAddress: shipper.address,
      pickupContact: shipper.contact,
      packageCount: boxCount,
      totalWeight: boxCount * 10,
      readyTime: readyTime || '09:00',
      closeTime: closeTime || '17:00',
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
    });

    const sb = ensureAdmin();
    const { data: saved, error: saveErr } = await sb.rpc('save_fedex_pickup_confirmation', {
      p_id: id,
      p_fedex_pickup_confirmation: result.pickupConfirmationNumber,
    });

    handleRpcError(saved, saveErr, 'Failed to save pickup confirmation');

    res.status(200).json({
      status: 'success',
      data: {
        transaction: saved.data,
        pickup: result,
      },
    });
  }
);

// ============================================================
// DELETE /api/return-transactions/:id/cancel-shipment
// ============================================================
export const cancelShipmentHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    const tx = await getReturnTransaction(id);

    if (!tx.fedex_tracking && !tx.fedex_shipment_id) {
      throw new AppError('No FedEx shipment to cancel', 400);
    }

    const trackingNumber = tx.fedex_tracking || tx.fedex_shipment_id;
    await fedexService.cancelShipment(trackingNumber!);

    const sb = ensureAdmin();
    const { data: saved, error: saveErr } = await sb.rpc('save_fedex_shipment_data', {
      p_id: id,
      p_fedex_shipment_id: null,
      p_fedex_tracking: null,
      p_prp_number: null,
      p_box_count: null,
      p_package_tracking: null,
      p_fedex_labels: null,
    });

    handleRpcError(saved, saveErr, 'Failed to clear shipment data');

    res.status(200).json({
      status: 'success',
      data: saved.data,
    });
  }
);

// ============================================================
// GET /api/return-transactions/:id/labels
// ============================================================
export const getLabelsHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { packageNumber } = req.query;

    const tx = await getReturnTransaction(id);

    if (!tx.fedex_labels) {
      throw new AppError('No shipping labels found for this return', 404);
    }

    const labels = typeof tx.fedex_labels === 'string'
      ? JSON.parse(tx.fedex_labels)
      : tx.fedex_labels;

    if (packageNumber) {
      const key = `package${packageNumber}`;
      const labelBase64 = labels[key];
      if (!labelBase64) {
        throw new AppError(`No label found for package ${packageNumber}`, 404);
      }

      const pdfBuffer = Buffer.from(labelBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="label_${id}_pkg${packageNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    }

    const labelSummary = Object.entries(labels).map(([key, val]) => ({
      package: key,
      hasLabel: !!(val as string),
    }));

    res.status(200).json({
      status: 'success',
      data: { labels: labelSummary, totalLabels: labelSummary.length },
    });
  }
);

// ============================================================
// GET /api/return-transactions/:id/labels/:packageNumber/download
// ============================================================
export const downloadLabelHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id, packageNumber } = req.params;

    const tx = await getReturnTransaction(id);

    if (!tx.fedex_labels) {
      throw new AppError('No shipping labels found for this return', 404);
    }

    const labels = typeof tx.fedex_labels === 'string'
      ? JSON.parse(tx.fedex_labels)
      : tx.fedex_labels;

    const key = `package${packageNumber}`;
    const labelBase64 = labels[key];
    if (!labelBase64) {
      throw new AppError(`No label found for package ${packageNumber}`, 404);
    }

    const pdfBuffer = Buffer.from(labelBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label_${id}_pkg${packageNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }
);
