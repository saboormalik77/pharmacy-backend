import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { getWarehouseAddressFromTable } from '../utils/warehouseAddress';

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

function handleRpcError(data: any, rpcError: any, label: string) {
  if (rpcError) throw new AppError(`${label}: ${rpcError.message}`, 400);
  if (!data) throw new AppError(`${label}: no data returned`, 500);
  if (data.error) throw new AppError(data.message || label, data.code || 400);
}

// ============================================================
// Interfaces
// ============================================================

export interface ShipmentGroup {
  id: string;
  destination: string;
  outboundTracking: string | null;
  shippedAt: string | null;
  boxCount: number;
  totalMemos: number;
  fedexShipmentId: string | null;
  fedexLabels: any | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentGroupRequest {
  memoIds: string[];
  boxCount?: number;
  notes?: string;
}

export interface ShipGroupRequest {
  outboundTracking: string;
  shippedAt?: string;
  fedexShipmentId?: string;
  fedexLabels?: any;
}

// ============================================================
// Service functions
// ============================================================

export const listMemosForGroupShipping = async (destination?: string): Promise<any[]> => {
  const sb = ensureAdmin();
  const dest = destination != null && String(destination).trim() !== '' ? String(destination).trim() : null;
  const { data, error } = await sb.rpc('list_memos_for_group_shipping', {
    p_destination: dest,
  });
  handleRpcError(data, error, 'Failed to list memos for group shipping');
  return data.data;
};

export const createShipmentGroup = async (request: CreateShipmentGroupRequest): Promise<{
  group: ShipmentGroup;
  memoIds: string[];
  memoCount: number;
}> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('create_shipment_group', {
    p_memo_ids: request.memoIds,
    p_box_count: request.boxCount || 1,
    p_notes: request.notes || null,
  });
  handleRpcError(data, error, 'Failed to create shipment group');
  return data.data;
};

export const shipMemoGroup = async (
  groupId: string,
  request: ShipGroupRequest
): Promise<{
  group: ShipmentGroup;
  memosShipped: number;
}> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('ship_memo_group', {
    p_group_id: groupId,
    p_outbound_tracking: request.outboundTracking,
    // Omit when unset so Postgres can apply DEFAULT NOW(); explicit null was clearing shipped_at (see fcr_39b ship_memo_group).
    ...(request.shippedAt != null && request.shippedAt !== ''
      ? { p_shipped_at: request.shippedAt }
      : {}),
    p_fedex_shipment_id: request.fedexShipmentId || null,
    p_fedex_labels: request.fedexLabels || null,
  });
  handleRpcError(data, error, 'Failed to ship memo group');
  return data.data;
};

export const getShipmentGroupDetails = async (groupId: string): Promise<{
  group: ShipmentGroup;
  memos: any[];
}> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_shipment_group_details', {
    p_group_id: groupId,
  });
  handleRpcError(data, error, 'Failed to get shipment group details');
  return data.data;
};

export const listShippedShipmentGroups = async (
  page?: number,
  limit?: number,
  destination?: string
): Promise<{ data: any[]; pagination: any }> => {
  const sb = ensureAdmin();
  const dest = destination != null && String(destination).trim() !== '' ? String(destination).trim() : null;
  const { data, error } = await sb.rpc('list_shipped_shipment_groups', {
    p_page: page || 1,
    p_limit: limit || 20,
    p_destination: dest,
  });
  handleRpcError(data, error, 'Failed to list shipped shipment groups');
  return { data: data.data || [], pagination: data.pagination };
};

export const createShipmentGroupFedexShipment = async (
  groupId: string,
  boxCount: number,
  packageWeight?: number,
  serviceType?: string
): Promise<{
  group: ShipmentGroup;
  memos: any[];
  shipment: {
    masterTrackingNumber: string;
    shipmentId: string;
    packageCount: number;
    packages: { trackingNumber: string; hasLabel: boolean }[];
  };
  labels: Record<string, string>;
}> => {
  const sb = ensureAdmin();

  const groupDetails = await getShipmentGroupDetails(groupId);
  const group = groupDetails.group;
  const memos = groupDetails.memos;

  if (!group) throw new AppError('Shipment group not found', 404);
  if (group.shippedAt) throw new AppError('Shipment group is already shipped', 400);
  if (memos.length === 0) throw new AppError('No memos in shipment group', 400);

  for (const memo of memos) {
    if (!memo.raNumber) {
      throw new AppError(`Memo ${memo.memoNumber} does not have an RA number`, 400);
    }
  }

  const s = await getWarehouseAddressFromTable();
  if (!s.warehouseStreet || !s.warehouseCity || !s.warehouseState || !s.warehouseZip) {
    throw new AppError('Warehouse address is not configured. Set it in Admin Settings.', 400);
  }

  const cleanWarehousePhone = (s.warehousePhone || '').replace(/\D/g, '');
  if (cleanWarehousePhone.length !== 10) {
    throw new AppError(`Invalid warehouse phone. Must be 10 digits.`, 400);
  }

  const { data: distributor, error: distErr } = await sb
    .from('reverse_distributors')
    .select('id, name, contact_email, contact_phone, address')
    .ilike('name', group.destination)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (distErr || !distributor) {
    throw new AppError(`Reverse distributor "${group.destination}" not found. Add it in the Distributors page.`, 404);
  }

  const distAddr = distributor.address as { street?: string; city?: string; state?: string; zipCode?: string } | null;
  const missingFields: string[] = [];
  if (!distAddr?.street || distAddr.street.trim() === '') missingFields.push('street address');
  if (!distAddr?.city || distAddr.city.trim() === '') missingFields.push('city');
  if (!distAddr?.state || distAddr.state.trim() === '') missingFields.push('state');
  if (!distAddr?.zipCode || distAddr.zipCode.trim() === '') missingFields.push('ZIP code');

  if (missingFields.length > 0 || !distAddr) {
    throw new AppError(
      `Reverse distributor "${group.destination}" is missing: ${missingFields.join(', ')}. Update it in the Distributors page.`,
      400
    );
  }

  const addr = distAddr;

  const cleanDistPhone = (distributor.contact_phone || '').replace(/\D/g, '');
  const recipientPhone = cleanDistPhone.length === 10 ? cleanDistPhone : cleanWarehousePhone;

  const { createShipment } = await import('./fedexService');

  const fedexResult = await createShipment({
    shipperAddress: {
      streetLines: [s.warehouseStreet],
      city: s.warehouseCity,
      stateOrProvinceCode: s.warehouseState,
      postalCode: s.warehouseZip,
      countryCode: s.warehouseCountry || 'US',
    },
    shipperContact: {
      personName: s.warehouseContactName || s.warehouseName || 'Warehouse',
      phoneNumber: cleanWarehousePhone,
      companyName: s.warehouseName || undefined,
    },
    recipientAddress: {
      streetLines: [addr.street!],
      city: addr.city!,
      stateOrProvinceCode: addr.state!,
      postalCode: addr.zipCode!,
      countryCode: 'US',
    },
    recipientContact: {
      personName: distributor.name,
      phoneNumber: recipientPhone,
      companyName: distributor.name,
    },
    boxCount,
    packageWeight: packageWeight ?? 10,
    serviceType: serviceType || 'FEDEX_GROUND',
  });

  const labelsMap = fedexResult.packages.reduce((acc, p, i) => {
    if (p.labelBase64) acc[`package${i + 1}`] = p.labelBase64;
    return acc;
  }, {} as Record<string, string>);

  // Debug logging to verify labels are being stored
  console.log('FedEx labels to store:', {
    packageCount: fedexResult.packages.length,
    labelsFound: Object.keys(labelsMap).length,
    labelSizes: Object.entries(labelsMap).map(([k, v]) => `${k}: ${v ? v.length : 0} chars`),
  });

  await shipMemoGroup(groupId, {
    outboundTracking: fedexResult.masterTrackingNumber,
    fedexShipmentId: fedexResult.shipmentId,
    fedexLabels: labelsMap as unknown as Record<string, string>,
  });

  const after = await getShipmentGroupDetails(groupId);

  return {
    group: after.group,
    memos: after.memos,
    shipment: {
      masterTrackingNumber: fedexResult.masterTrackingNumber,
      shipmentId: fedexResult.shipmentId,
      packageCount: fedexResult.packages.length,
      packages: fedexResult.packages.map((pkg) => ({
        trackingNumber: pkg.trackingNumber,
        hasLabel: !!pkg.labelBase64,
      })),
    },
    labels: labelsMap,
  };
};

export const scheduleShipmentGroupPickup = async (
  groupId: string,
  params: { readyTime?: string; closeTime?: string; pickupDate?: string }
): Promise<{ pickupConfirmationNumber: string; pickupDate: string }> => {
  const sb = ensureAdmin();
  const { data: row, error } = await sb
    .from('shipment_groups')
    .select('id, outbound_tracking, box_count')
    .eq('id', groupId)
    .single();

  if (error || !row?.outbound_tracking) {
    throw new AppError('Shipment group not found or has no outbound tracking. Create FedEx shipment first.', 400);
  }

  const s = await getWarehouseAddressFromTable();
  if (!s.warehouseStreet || !s.warehouseCity || !s.warehouseState || !s.warehouseZip) {
    throw new AppError('Warehouse address is not configured. Set it in Admin Settings.', 400);
  }

  const cleanPhone = (s.warehousePhone || '').replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new AppError('Invalid warehouse phone. Must be 10 digits.', 400);
  }

  const pkgCount = Math.max(1, row.box_count || 1);
  const { schedulePickup } = await import('./fedexService');

  return schedulePickup({
    pickupAddress: {
      streetLines: [s.warehouseStreet],
      city: s.warehouseCity,
      stateOrProvinceCode: s.warehouseState,
      postalCode: s.warehouseZip,
      countryCode: s.warehouseCountry || 'US',
    },
    pickupContact: {
      personName: s.warehouseContactName || s.warehouseName || 'Warehouse',
      phoneNumber: cleanPhone,
      companyName: s.warehouseName || undefined,
    },
    packageCount: pkgCount,
    totalWeight: 10 * pkgCount,
    readyTime: params.readyTime || '09:00',
    closeTime: params.closeTime || '17:00',
    pickupDate: params.pickupDate || new Date().toISOString().split('T')[0],
  });
};