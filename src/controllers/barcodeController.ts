import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import { 
  generateBarcode, 
  generateMultipleBarcodes, 
  validateBarcodeValue,
  getOptimalBarcodeFormat,
  BarcodeOptions 
} from '../services/barcodeService';

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }
  return supabaseAdmin;
}

// ============================================================
// GET /api/barcodes/generate/:value
// Generate and download a single barcode
// ============================================================
export const generateSingleBarcode = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { value } = req.params;
    const { 
      format, 
      width, 
      height, 
      displayValue, 
      fontSize,
      background,
      lineColor 
    } = req.query;

    if (!value) {
      throw new AppError('Barcode value is required', 400);
    }

    // Parse options from query parameters
    const options: BarcodeOptions = {};
    if (format) options.format = format as any;
    if (width) options.width = parseInt(width as string);
    if (height) options.height = parseInt(height as string);
    if (displayValue !== undefined) options.displayValue = displayValue === 'true';
    if (fontSize) options.fontSize = parseInt(fontSize as string);
    if (background) options.background = background as string;
    if (lineColor) options.lineColor = lineColor as string;

    // Auto-detect format if not specified
    if (!options.format) {
      options.format = getOptimalBarcodeFormat(value) as any;
    }

    // Validate barcode value
    if (!validateBarcodeValue(value, options.format)) {
      throw new AppError(
        `Invalid barcode value "${value}" for format ${options.format}`,
        400
      );
    }

    const barcode = generateBarcode(value, options);

    res.set({
      'Content-Type': barcode.mimeType,
      'Content-Disposition': `attachment; filename="${barcode.filename}"`,
      'Content-Length': barcode.buffer.length,
    });

    res.send(barcode.buffer);
  }
);

// ============================================================
// POST /api/barcodes/generate-multiple
// Generate and download multiple barcodes as ZIP
// ============================================================
export const generateMultipleBarcodesHandler = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { values, options } = req.body;

    if (!Array.isArray(values) || values.length === 0) {
      throw new AppError('Values array is required and must not be empty', 400);
    }

    if (values.length > 100) {
      throw new AppError('Maximum 100 barcodes can be generated at once', 400);
    }

    // Validate all values
    const barcodeOptions: BarcodeOptions = options || {};
    for (const value of values) {
      if (!validateBarcodeValue(value, barcodeOptions.format || 'CODE128')) {
        throw new AppError(
          `Invalid barcode value "${value}" for format ${barcodeOptions.format || 'CODE128'}`,
          400
        );
      }
    }

    const archive = await generateMultipleBarcodes(values, barcodeOptions);

    res.set({
      'Content-Type': archive.mimeType,
      'Content-Disposition': `attachment; filename="${archive.filename}"`,
      'Content-Length': archive.buffer.length,
    });

    res.send(archive.buffer);
  }
);

// ============================================================
// GET /api/return-transactions/:id/barcodes/tracking
// Generate barcode for transaction's tracking numbers
// ============================================================
export const generateTrackingBarcodes = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { format = 'zip' } = req.query; // 'zip' or 'single'

    const sb = ensureAdmin();
    const { data: tx, error } = await sb
      .from('return_transactions')
      .select('id, fedex_tracking, fedex_shipment_id, package_tracking')
      .eq('id', id)
      .single();

    if (error || !tx) {
      throw new AppError('Return transaction not found', 404);
    }

    // Collect all tracking numbers
    const trackingNumbers: string[] = [];
    
    // Add main tracking number
    if (tx.fedex_tracking) {
      trackingNumbers.push(tx.fedex_tracking);
    }
    
    // Add package tracking numbers
    if (tx.package_tracking && typeof tx.package_tracking === 'object') {
      Object.values(tx.package_tracking).forEach((trackingNum) => {
        if (trackingNum && typeof trackingNum === 'string' && !trackingNumbers.includes(trackingNum)) {
          trackingNumbers.push(trackingNum);
        }
      });
    }

    if (trackingNumbers.length === 0) {
      throw new AppError('No tracking numbers found for this transaction', 404);
    }

    const barcodeOptions: BarcodeOptions = {
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      height: 100,
    };

    if (format === 'single' && trackingNumbers.length === 1) {
      // Generate single barcode
      const barcode = generateBarcode(trackingNumbers[0], barcodeOptions);
      
      res.set({
        'Content-Type': barcode.mimeType,
        'Content-Disposition': `attachment; filename="tracking_${trackingNumbers[0]}.png"`,
        'Content-Length': barcode.buffer.length,
      });

      res.send(barcode.buffer);
    } else {
      // Generate ZIP archive
      const archive = await generateMultipleBarcodes(trackingNumbers, barcodeOptions);
      
      res.set({
        'Content-Type': archive.mimeType,
        'Content-Disposition': `attachment; filename="tracking_barcodes_${tx.id.substring(0, 8)}.zip"`,
        'Content-Length': archive.buffer.length,
      });

      res.send(archive.buffer);
    }
  }
);

// ============================================================
// GET /api/return-transactions/:id/barcodes/tracking/:trackingNumber
// Generate barcode for specific tracking number
// ============================================================
export const generateSpecificTrackingBarcode = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { id, trackingNumber } = req.params;

    const sb = ensureAdmin();
    const { data: tx, error } = await sb
      .from('return_transactions')
      .select('id, fedex_tracking, package_tracking')
      .eq('id', id)
      .single();

    if (error || !tx) {
      throw new AppError('Return transaction not found', 404);
    }

    // Verify tracking number belongs to this transaction
    let isValid = false;
    
    if (tx.fedex_tracking === trackingNumber) {
      isValid = true;
    }
    
    if (tx.package_tracking && typeof tx.package_tracking === 'object') {
      const packageNumbers = Object.values(tx.package_tracking);
      if (packageNumbers.includes(trackingNumber)) {
        isValid = true;
      }
    }

    if (!isValid) {
      throw new AppError('Tracking number not found for this transaction', 404);
    }

    const barcodeOptions: BarcodeOptions = {
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      height: 100,
    };

    const barcode = generateBarcode(trackingNumber, barcodeOptions);

    res.set({
      'Content-Type': barcode.mimeType,
      'Content-Disposition': `attachment; filename="tracking_${trackingNumber}.png"`,
      'Content-Length': barcode.buffer.length,
    });

    res.send(barcode.buffer);
  }
);