/**
 * Parses barcode data to extract NDC, lot number, and expiration date
 * Supports various barcode formats commonly used in pharmaceuticals
 */

export interface ParsedBarcodeData {
  ndc: string;
  lotNumber?: string;
  expirationDate?: string;
}

/**
 * Parse barcode string to extract NDC, lot number, and expiration date
 * Supports formats like:
 * - NDC only: "12345-678-90"
 * - NDC with data: "12345-678-90|LOT123|2024-12-31"
 * - GS1 format: "01123456789012345678901234567890"
 * - Custom delimited: "NDC:LOT:EXP"
 */
export function parseBarcode(barcode: string): ParsedBarcodeData {
  if (!barcode || !barcode.trim()) {
    return { ndc: '' };
  }

  const trimmed = barcode.trim();

  // Try to detect format and parse accordingly
  // Format 1: Pipe-delimited (NDC|LOT|EXP or similar)
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim());
    const ndc = parts[0] || '';
    const lotNumber = parts[1] || undefined;
    const expirationDate = parts[2] || undefined;
    
    return {
      ndc: normalizeNDC(ndc),
      lotNumber: lotNumber || undefined,
      expirationDate: normalizeDate(expirationDate),
    };
  }

  // Format 2: Colon-delimited
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(p => p.trim());
    const ndc = parts.find(p => /^\d{5,11}[-]?\d{3,4}[-]?\d{1,2}$/.test(p.replace(/-/g, ''))) || parts[0] || '';
    const lotNumber = parts.find(p => p.toUpperCase().startsWith('LOT') || /^[A-Z0-9]{4,}$/i.test(p)) || undefined;
    const expirationDate = parts.find(p => /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(p)) || undefined;
    
    return {
      ndc: normalizeNDC(ndc),
      lotNumber: lotNumber?.replace(/^LOT/i, '').trim() || undefined,
      expirationDate: normalizeDate(expirationDate),
    };
  }

  // Format 3: GS1 format (long numeric string)
  if (/^\d{14,}$/.test(trimmed)) {
    // GS1 format: Application Identifier (01) + GTIN + (10) + Lot + (17) + Exp Date
    // This is simplified - full GS1 parsing would be more complex
    const ndc = extractNDCFromGS1(trimmed);
    return {
      ndc: normalizeNDC(ndc),
      lotNumber: undefined, // Would need full GS1 parser
      expirationDate: undefined,
    };
  }

  // Format 4: Try to extract NDC from the string (most common case)
  const ndcMatch = trimmed.match(/(\d{5,11}[-]?\d{3,4}[-]?\d{1,2})/);
  if (ndcMatch) {
    const ndc = ndcMatch[1];
    const remaining = trimmed.replace(ndc, '').trim();
    
    // Try to find lot number and expiration date in remaining text
    const lotMatch = remaining.match(/(?:LOT|LOT#|LOT\s*:?\s*)([A-Z0-9]+)/i);
    const expMatch = remaining.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
    
    return {
      ndc: normalizeNDC(ndc),
      lotNumber: lotMatch ? lotMatch[1] : undefined,
      expirationDate: normalizeDate(expMatch ? expMatch[1] : undefined),
    };
  }

  // Format 5: Just assume the whole string is NDC if it looks like one
  if (/^\d{5,11}[-]?\d{3,4}[-]?\d{1,2}$/.test(trimmed.replace(/-/g, ''))) {
    return {
      ndc: normalizeNDC(trimmed),
      lotNumber: undefined,
      expirationDate: undefined,
    };
  }

  // Default: treat entire string as NDC
  return {
    ndc: normalizeNDC(trimmed),
    lotNumber: undefined,
    expirationDate: undefined,
  };
}

/**
 * Normalize NDC format to standard XXXXX-XXXX-XX format
 */
function normalizeNDC(ndc: string): string {
  if (!ndc) return '';
  
  // Remove all non-digits
  const digits = ndc.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 11) {
    // Format: XXXXX-XXXX-XX
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 11)}`;
  } else if (digits.length === 10) {
    // Format: XXXXX-XXXX-X
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 10)}`;
  } else if (digits.length === 9) {
    // Format: XXXX-XXXX-X
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 9)}`;
  }
  
  // Return as-is if doesn't match standard formats
  return ndc;
}

/**
 * Normalize date format to YYYY-MM-DD
 */
function normalizeDate(date?: string): string | undefined {
  if (!date) return undefined;
  
  // Try to parse various date formats
  const dateMatch = date.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  
  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = date.match(/(\d{1,2})[/](\d{1,2})[/](\d{4})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    // Assume MM/DD/YYYY format
    return `${year}-${month}-${day}`;
  }
  
  return date;
}

/**
 * Extract NDC from GS1 barcode format (simplified)
 */
function extractNDCFromGS1(gs1: string): string {
  // GS1 format is complex, this is a simplified extraction
  // In production, you'd use a proper GS1 parser
  // For now, try to find NDC-like pattern in the string
  const ndcMatch = gs1.match(/(\d{5,11})/);
  return ndcMatch ? ndcMatch[1] : gs1.slice(0, 11);
}


