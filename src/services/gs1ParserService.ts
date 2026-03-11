/**
 * GS1 Digital Link & Barcode Parser
 *
 * Parses GS1 Digital Link URLs and raw GS1 element strings to extract:
 *   GTIN, lot number, serial number, expiration date
 * Then converts GTIN-14 → NDC-10 → three candidate NDC-11 formats.
 */

export interface GS1ParsedData {
  gtin: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expirationDate: string | null;   // YYYY-MM-DD
  ndc10: string | null;
  ndcCandidates: string[];         // up to 3 possible NDC-11 formats (5-4-2, 5-3-2, 4-4-2)
  rawInput: string;
}

// GS1 Application Identifier codes
const AI = {
  GTIN:       '01',
  LOT:        '10',
  SERIAL:     '21',
  EXPIRY:     '17',
  PROD_DATE:  '11',
} as const;

/**
 * Main entry: accepts any scanned string (URL or raw barcode) and extracts GS1 data.
 */
export function parseGS1(input: string): GS1ParsedData {
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return parseDigitalLink(trimmed);
  }

  if (trimmed.includes('\u001d') || trimmed.startsWith('01')) {
    return parseElementString(trimmed);
  }

  return parseElementString(trimmed);
}

/**
 * Parse a GS1 Digital Link URL.
 * Example: https://go.gs1.org/01/00343547325060/10/0000054575/21/100000033382?17=251110
 */
function parseDigitalLink(url: string): GS1ParsedData {
  const result: GS1ParsedData = {
    gtin: null, lotNumber: null, serialNumber: null,
    expirationDate: null, ndc10: null, ndcCandidates: [], rawInput: url,
  };

  try {
    const parsed = new URL(url);

    // Extract AIs from path segments: /01/VALUE/10/VALUE/21/VALUE
    const segments = parsed.pathname.split('/').filter(Boolean);
    for (let i = 0; i < segments.length - 1; i++) {
      const ai = segments[i];
      const val = decodeURIComponent(segments[i + 1]);
      switch (ai) {
        case AI.GTIN:   result.gtin = val;         i++; break;
        case AI.LOT:    result.lotNumber = val;     i++; break;
        case AI.SERIAL: result.serialNumber = val;  i++; break;
        case AI.EXPIRY: result.expirationDate = parseGS1Date(val); i++; break;
      }
    }

    // Extract AIs from query params: ?17=251110
    for (const [key, val] of parsed.searchParams.entries()) {
      switch (key) {
        case AI.EXPIRY:    result.expirationDate = parseGS1Date(val); break;
        case AI.LOT:       result.lotNumber = val;                    break;
        case AI.SERIAL:    result.serialNumber = val;                 break;
        case AI.PROD_DATE: break; // not needed for returns
      }
    }
  } catch {
    // Fall back to treating the whole thing as an element string
    return parseElementString(url);
  }

  if (result.gtin) {
    result.ndc10 = gtinToNdc10(result.gtin);
    result.ndcCandidates = ndc10ToNdc11Candidates(result.ndc10);
  }

  return result;
}

/**
 * Parse a raw GS1 element string (FNC1-delimited or fixed-length).
 * Handles both the GS character (\u001d) separator and parenthesized AIs.
 */
function parseElementString(raw: string): GS1ParsedData {
  const result: GS1ParsedData = {
    gtin: null, lotNumber: null, serialNumber: null,
    expirationDate: null, ndc10: null, ndcCandidates: [], rawInput: raw,
  };

  // Strip parenthesized AIs: (01)00343547325060(10)LOT → 0100343547325060\x1d10LOT
  let cleaned = raw.replace(/\((\d{2,4})\)/g, '\u001d$1');
  if (cleaned.startsWith('\u001d')) cleaned = cleaned.slice(1);

  // Split on GS character
  const parts = cleaned.split('\u001d');

  for (const part of parts) {
    if (part.startsWith('01') && part.length >= 16) {
      result.gtin = part.slice(2, 16);
    } else if (part.startsWith('17') && part.length >= 8) {
      result.expirationDate = parseGS1Date(part.slice(2, 8));
    } else if (part.startsWith('10')) {
      result.lotNumber = part.slice(2);
    } else if (part.startsWith('21')) {
      result.serialNumber = part.slice(2);
    }
  }

  if (result.gtin) {
    result.ndc10 = gtinToNdc10(result.gtin);
    result.ndcCandidates = ndc10ToNdc11Candidates(result.ndc10);
  }

  return result;
}

/**
 * Convert GTIN-14 → NDC-10.
 *
 * GTIN-14 layout: [indicator(1)][GTIN-13]
 * GTIN-13 layout: [0][UPC-12]
 * UPC-12  layout: [3(drug prefix)][NDC-10][check-digit]
 *
 * So NDC-10 lives at positions 3..12 (0-indexed) of GTIN-14.
 */
export function gtinToNdc10(gtin: string): string | null {
  const digits = gtin.replace(/\D/g, '');
  if (digits.length < 13) return null;

  const g14 = digits.padStart(14, '0');
  return g14.slice(3, 13);
}

/**
 * NDC-10 → up to 3 NDC-11 candidates.
 *
 * The 10-digit NDC is ambiguous because the original dashes are lost.
 * Three possible interpretations:
 *   5-4-1 → pad package to 2:  LLLLL-PPPP-0K  (most common for Rx)
 *   5-3-2 → pad product to 4:  LLLLL-0PPP-KK
 *   4-4-2 → pad labeler to 5:  0LLLL-PPPP-KK
 */
export function ndc10ToNdc11Candidates(ndc10: string | null): string[] {
  if (!ndc10 || ndc10.length !== 10) return [];

  const d = ndc10;
  return [
    // 5-4-1 → 5-4-2 (pad package segment with leading 0)
    `${d.slice(0, 5)}-${d.slice(5, 9)}-0${d.slice(9, 10)}`,
    // 5-3-2 → 5-4-2 (pad product segment with leading 0)
    `${d.slice(0, 5)}-0${d.slice(5, 8)}-${d.slice(8, 10)}`,
    // 4-4-2 → 5-4-2 (pad labeler with leading 0)
    `0${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8, 10)}`,
  ];
}

/**
 * Parse GS1 date (YYMMDD) → YYYY-MM-DD.
 * If DD is "00", defaults to last day of month.
 */
function parseGS1Date(gs1Date: string): string | null {
  const d = gs1Date.replace(/\D/g, '');
  if (d.length < 6) return null;

  const yy = parseInt(d.slice(0, 2), 10);
  const mm = d.slice(2, 4);
  let dd = d.slice(4, 6);

  // 2-digit year: 00-49 → 2000-2049, 50-99 → 1950-1999
  const yyyy = yy <= 49 ? 2000 + yy : 1900 + yy;

  if (dd === '00') {
    const lastDay = new Date(yyyy, parseInt(mm, 10), 0).getDate();
    dd = String(lastDay);
  }

  return `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
}
