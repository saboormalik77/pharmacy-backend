import { AppError } from '../utils/appError';

// ============================================================
// Interfaces
// ============================================================

interface FedExAddress {
  streetLines: string[];
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

interface FedExContact {
  personName: string;
  phoneNumber: string;
  companyName?: string;
}

interface FedExPackageResult {
  trackingNumber: string;
  labelBase64: string;
}

export interface CreateShipmentParams {
  shipperAddress: FedExAddress;
  shipperContact: FedExContact;
  recipientAddress: FedExAddress;
  recipientContact: FedExContact;
  boxCount: number;
  packageWeight?: number;
  serviceType?: string;
}

export interface CreateShipmentResult {
  masterTrackingNumber: string;
  shipmentId: string;
  packages: FedExPackageResult[];
}

export interface SchedulePickupParams {
  pickupAddress: FedExAddress;
  pickupContact: FedExContact;
  packageCount: number;
  totalWeight: number;
  readyTime: string;
  closeTime: string;
  pickupDate: string;
}

export interface SchedulePickupResult {
  pickupConfirmationNumber: string;
  pickupDate: string;
}

// ============================================================
// Token Cache
// ============================================================

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/** True when using FedEx sandbox (labels show TEST LABEL / SAMPLE — not valid for shipping). */
export function isFedExSandbox(): boolean {
  const apiUrl = process.env.FEDEX_API_URL || 'https://apis.fedex.com';
  return apiUrl.includes('sandbox');
}

function getFedExConfig() {
  const apiKey = process.env.FEDEX_API_KEY;
  const secretKey = process.env.FEDEX_SECRET_KEY;
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER;
  const apiUrl = process.env.FEDEX_API_URL || 'https://apis.fedex.com';

  if (!apiKey || !secretKey || !accountNumber) {
    throw new AppError(
      'FedEx API credentials not configured. Set FEDEX_API_KEY, FEDEX_SECRET_KEY, and FEDEX_ACCOUNT_NUMBER.',
      500
    );
  }

  return { apiKey, secretKey, accountNumber, apiUrl };
}

// ============================================================
// OAuth 2.0 Token Management
// ============================================================

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 5 * 60 * 1000) {
    return cachedToken;
  }

  const { apiKey, secretKey, apiUrl } = getFedExConfig();

  const response = await fetch(`${apiUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secretKey,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('FedEx OAuth error:', errorBody);
    throw new AppError(`FedEx authentication failed: ${response.status}`, 502);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;

  return cachedToken!;
}

async function fedexRequest(method: string, path: string, body?: object): Promise<any> {
  const { apiUrl } = getFedExConfig();
  const token = await getAccessToken();

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-locale': 'en_US',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode = responseData?.errors?.[0]?.code || '';
    const errorMsg = responseData?.errors?.[0]?.message
      || responseData?.message
      || `FedEx API error: ${response.status}`;
    console.error('FedEx API error:', JSON.stringify(responseData, null, 2));
    
    // Provide more helpful error messages for common issues
    if (errorCode === 'SYSTEM.UNEXPECTED.ERROR' && path.includes('pickup')) {
      throw new AppError(
        'FedEx Pickup scheduling is not available in sandbox/test mode. In production, this will work with a live FedEx account. For now, you can skip pickup scheduling and call FedEx directly at 1-800-463-3339.',
        502
      );
    }
    
    throw new AppError(errorMsg, 502);
  }

  return responseData;
}

// ============================================================
// Create Shipment (multi-piece)
// ============================================================

export async function createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
  const { accountNumber } = getFedExConfig();
  const {
    shipperAddress,
    shipperContact,
    recipientAddress,
    recipientContact,
    boxCount,
    packageWeight = 10,
    serviceType = 'FEDEX_GROUND',
  } = params;

  const requestedPackageLineItems = Array.from({ length: boxCount }, (_, i) => ({
    sequenceNumber: i + 1,
    weight: { units: 'LB' as const, value: packageWeight },
    dimensions: {
      length: 12,
      width: 12,
      height: 12,
      units: 'IN'
    },
    groupPackageCount: 1,
  }));

  const shipmentPayload = {
    labelResponseOptions: 'LABEL',
    requestedShipment: {
      shipper: {
        address: shipperAddress,
        contact: shipperContact,
      },
      recipients: [{
        address: recipientAddress,
        contact: recipientContact,
      }],
      shipDatestamp: new Date().toISOString().split('T')[0],
      serviceType,
      packagingType: 'YOUR_PACKAGING',
      pickupType: 'USE_SCHEDULED_PICKUP',
      blockInsightVisibility: false,
      shippingChargesPayment: {
        paymentType: 'SENDER',
        payor: {
          responsibleParty: {
            accountNumber: { value: accountNumber },
          },
        },
      },
      labelSpecification: {
        labelFormatType: 'COMMON2D',
        imageType: 'PDF',
        labelStockType: 'PAPER_4X6',
      },
      requestedPackageLineItems,
      packageCount: boxCount,
    },
    accountNumber: { value: accountNumber },
  };

  console.log('FedEx shipment request:', JSON.stringify(shipmentPayload, null, 2));
  const data = await fedexRequest('POST', '/ship/v1/shipments', shipmentPayload);

  // Log full response structure for debugging
  console.log('FedEx full response:', JSON.stringify(data, null, 2));

  const output = data?.output;
  if (!output?.transactionShipments?.length) {
    throw new AppError('FedEx returned no shipment data', 502);
  }

  const shipment = output.transactionShipments[0];
  
  // Log shipment structure
  console.log('Shipment structure:', {
    hasMasterTracking: !!shipment.masterTrackingNumber,
    masterTrackingNumber: shipment.masterTrackingNumber?.trackingNumber,
    pieceResponsesCount: shipment.pieceResponses?.length || 0,
    hasCompletedShipmentDetail: !!shipment.completedShipmentDetail,
  });
  
  const masterTrackingNumber = shipment.masterTrackingNumber?.trackingNumber
    || shipment.pieceResponses?.[0]?.trackingNumber
    || '';

  // Process packages and fetch label content
  const packages: FedExPackageResult[] = [];
  const pieceResponses = shipment.pieceResponses || [];
  
  console.log('FedEx pieceResponses count:', pieceResponses.length);
  
  for (let i = 0; i < pieceResponses.length; i++) {
    const piece = pieceResponses[i];
    const doc = piece.packageDocuments?.[0];
    let labelBase64 = doc?.encodedLabel || '';
    
    console.log(`Package ${i + 1}:`, {
      trackingNumber: piece.trackingNumber,
      hasEncodedLabel: !!doc?.encodedLabel,
      encodedLabelLength: doc?.encodedLabel?.length || 0,
      hasUrl: !!doc?.url,
      url: doc?.url?.substring(0, 100),
      docCount: piece.packageDocuments?.length || 0,
    });
    
    // If no encoded label but we have a URL, fetch the PDF from the URL
    if (!labelBase64 && doc?.url) {
      try {
        console.log(`Fetching label from URL for tracking ${piece.trackingNumber}`);
        const labelRes = await fetch(doc.url);
        if (labelRes.ok) {
          const arrayBuffer = await labelRes.arrayBuffer();
          labelBase64 = Buffer.from(arrayBuffer).toString('base64');
          console.log(`Fetched label for ${piece.trackingNumber}, size: ${labelBase64.length}`);
        }
      } catch (err) {
        console.error('Failed to fetch label from URL:', err);
      }
    }
    
    packages.push({
      trackingNumber: piece.trackingNumber || '',
      labelBase64,
    });
  }

  return {
    masterTrackingNumber,
    shipmentId: shipment.shipmentId || masterTrackingNumber,
    packages,
  };
}

// ============================================================
// Schedule Pickup
// ============================================================

export async function schedulePickup(params: SchedulePickupParams): Promise<SchedulePickupResult> {
  const { accountNumber } = getFedExConfig();

  // Convert date to proper format and ensure it's not in the past
  const pickupDate = new Date(params.pickupDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (pickupDate < today) {
    throw new AppError('Pickup date cannot be in the past', 400);
  }

  const pickupPayload = {
    associatedAccountNumber: { value: accountNumber },
    originDetail: {
      pickupAddressDetail: {
        address: params.pickupAddress,
        contact: params.pickupContact,
      },
      readyDateTimestamp: `${params.pickupDate}T${params.readyTime}:00`,
      customerCloseTime: `${params.closeTime}:00`,
    },
    associatedAccountNumberType: 'FEDEX_GROUND',
    totalWeight: { units: 'LB', value: params.totalWeight },
    packageCount: params.packageCount,
    carrierCode: 'FDXG',
    countryRelationships: 'DOMESTIC',
    remarks: 'Pharmacy return pickup',
  };

  console.log('FedEx pickup request:', JSON.stringify(pickupPayload, null, 2));
  const data = await fedexRequest('POST', '/pickup/v1/pickups', pickupPayload);

  const confirmationNumber = data?.output?.pickupConfirmationCode
    || data?.output?.confirmationNumber
    || '';

  return {
    pickupConfirmationNumber: confirmationNumber,
    pickupDate: params.pickupDate,
  };
}

// ============================================================
// Cancel Shipment
// ============================================================

export async function cancelShipment(trackingNumber: string): Promise<void> {
  const { accountNumber } = getFedExConfig();

  await fedexRequest('PUT', '/ship/v1/shipments/cancel', {
    accountNumber: { value: accountNumber },
    trackingNumber,
    senderCountryCode: 'US',
    deletionControl: 'DELETE_ALL_PACKAGES',
  });
}

// ============================================================
// Validate Address (optional utility)
// ============================================================

export async function validateAddress(address: FedExAddress): Promise<{
  valid: boolean;
  resolvedAddress?: FedExAddress;
  classification?: string;
}> {
  try {
    const data = await fedexRequest('POST', '/address/v1/addresses/resolve', {
      addressesToValidate: [{
        address: {
          streetLines: address.streetLines,
          city: address.city,
          stateOrProvinceCode: address.stateOrProvinceCode,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
        },
      }],
    });

    const resolved = data?.output?.resolvedAddresses?.[0];
    if (!resolved) {
      return { valid: false };
    }

    return {
      valid: true,
      resolvedAddress: {
        streetLines: resolved.streetLinesToken || address.streetLines,
        city: resolved.city || address.city,
        stateOrProvinceCode: resolved.stateOrProvinceCode || address.stateOrProvinceCode,
        postalCode: resolved.postalCode || address.postalCode,
        countryCode: resolved.countryCode || address.countryCode,
      },
      classification: resolved.classification,
    };
  } catch {
    return { valid: false };
  }
}
