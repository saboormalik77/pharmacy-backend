import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import { AppError } from '../utils/appError';

export interface BarcodeOptions {
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'top';
  textMargin?: number;
  fontOptions?: string;
  font?: string;
  background?: string;
  lineColor?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

export interface BarcodeResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Generate a barcode image for a given value
 */
export function generateBarcode(
  value: string,
  options: BarcodeOptions = {}
): BarcodeResult {
  try {
    // Default options optimized for FedEx tracking numbers
    const defaultOptions: BarcodeOptions = {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 14,
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2,
      background: '#ffffff',
      lineColor: '#000000',
      margin: 10,
      marginTop: 10,
      marginBottom: 20,
      marginLeft: 10,
      marginRight: 10,
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create canvas
    const canvas = createCanvas(400, 150); // Will be adjusted by JsBarcode
    
    // Generate barcode
    JsBarcode(canvas, value, finalOptions);

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Clean filename (remove special characters)
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '_');
    
    return {
      buffer,
      mimeType: 'image/png',
      filename: `barcode_${cleanValue}.png`,
    };
  } catch (error) {
    throw new AppError(
      `Failed to generate barcode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Generate multiple barcodes and return as a ZIP file
 */
export async function generateMultipleBarcodes(
  values: string[],
  options: BarcodeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const archiver = require('archiver');
  
  try {
    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    // Collect archive data
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    // Generate individual barcodes and add to archive
    for (const value of values) {
      const barcode = generateBarcode(value, options);
      archive.append(barcode.buffer, { name: barcode.filename });
    }
    
    // Finalize archive
    archive.finalize();
    
    return new Promise((resolve, reject) => {
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          mimeType: 'application/zip',
          filename: `barcodes_${Date.now()}.zip`,
        });
      });
      
      archive.on('error', reject);
    });
  } catch (error) {
    throw new AppError(
      `Failed to generate barcode archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

/**
 * Validate barcode value format
 */
export function validateBarcodeValue(value: string, format: string = 'CODE128'): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  switch (format) {
    case 'CODE128':
      // CODE128 can encode ASCII characters 0-127
      return /^[\x00-\x7F]+$/.test(value) && value.length > 0;
    case 'CODE39':
      // CODE39 supports A-Z, 0-9, and some special characters
      return /^[A-Z0-9\-. $\/+%]+$/.test(value);
    case 'EAN13':
      // EAN13 must be exactly 13 digits
      return /^\d{13}$/.test(value);
    case 'EAN8':
      // EAN8 must be exactly 8 digits
      return /^\d{8}$/.test(value);
    case 'UPC':
      // UPC-A must be exactly 12 digits
      return /^\d{12}$/.test(value);
    default:
      return true; // Default to allowing any value
  }
}

/**
 * Get optimal barcode format for a given value
 */
export function getOptimalBarcodeFormat(value: string): string {
  if (/^\d{13}$/.test(value)) return 'EAN13';
  if (/^\d{12}$/.test(value)) return 'UPC';
  if (/^\d{8}$/.test(value)) return 'EAN8';
  if (/^[A-Z0-9\-. $\/+%]+$/.test(value)) return 'CODE39';
  return 'CODE128'; // Most flexible format
}