/**
 * Azure Document Intelligence Service (FCR-56)
 *
 * Reads manufacturer credit-memo PDFs and extracts per-NDC ask/received pairs
 * by parsing the structured `tables` returned by Azure Document Intelligence
 * `prebuilt-layout`. No LLM is involved.
 *
 * The submit + poll pattern is the same one already used in
 * src/services/returnReportService.ts (left untouched on purpose — this file
 * is self-contained so the existing report-extraction flow keeps working).
 *
 * Pipeline:
 *   1. POST PDF to /documentintelligence/documentModels/prebuilt-layout:analyze
 *   2. Poll Operation-Location until status === "succeeded"
 *   3. For each table in analyzeResult.tables:
 *        - Build a 2D grid (string[][]) honouring rowSpan / columnSpan
 *        - Locate the header row (kind === "columnHeader" or row 0 fallback)
 *        - Map columns by header text: NDC / Ask / Received / Product / Qty
 *        - Walk every data row, emit one CreditMemoLineItem per valid pair
 *   4. Return a result the caller can persist via record_credit_memo_analysis.
 */

import dotenv from 'dotenv';
import { AppError } from '../utils/appError';

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

// ============================================================
// Config (matches the existing returnReportService.ts integration)
// ============================================================

const AZURE_DOCUMENT_ENDPOINT = process.env.AZURE_DOCUMENT_ENDPOINT;
const AZURE_DOCUMENT_API_KEY = process.env.AZURE_DOCUMENT_API_KEY;
const AZURE_DOCUMENT_API_VERSION =
  process.env.AZURE_DOCUMENT_API_VERSION || '2023-10-31-preview';

const POLL_MAX_ATTEMPTS = 60; // ≈ 2 minutes
const POLL_INTERVAL_MS = 2000;

// ============================================================
// Types
// ============================================================

export interface CreditMemoLineItem {
  ndc: string;
  productName?: string | null;
  manufacturer?: string | null;
  pharmacyName?: string | null;
  quantity?: number | null;
  askPrice: number;
  receivedPrice: number;
  isPartial?: boolean;
  percentageReturned?: number | null;
  askDate?: string | null;
  receiveDate?: string | null;
  paymentMethod?: string | null;
  aiConfidence?: number | null;
}

export interface CreditMemoAnalysisResult {
  success: boolean;
  status: 'completed' | 'failed' | 'manual_review';
  confidence: number;
  totalAmount: number | null;
  manufacturerName: string | null;
  lineItems: CreditMemoLineItem[];
  errorMessage?: string | null;
}

// ============================================================
// Header → column-role matchers
//
// Credit-memo headers are messy. We can't just use first-match-wins on a flat
// pattern list because real-world cases collide:
//
//   "Qty Credited"      should be QTY  (count, not money — credited unit count)
//   "Amount Credited"   should be RECV (money — credited dollars)
//   "Asked Amount"      should be ASK  (money — asked-for dollars)
//   "Submitted"         should be ASK  (verb only)
//   "Credit Issued"     should be RECV (verb only)
//
// Disambiguation rule:
//   1. NDC token            → NDC
//   2. Explicit MONEY token (amount/amt/total/usd/dollar)
//      + RECV verb          → RECV
//      + ASK verb           → ASK
//      else                 → unclassified (rare; "Total" alone usually
//                              labels a totals ROW, not a column)
//   3. COUNT token (qty/quantity/units/count/pcs/pieces)
//                            → QTY  (beats verbs — "Qty Paid" = count, not $)
//   4. RECV verb             → RECV
//   5. ASK verb              → ASK
//   6. Product noun          → PRODUCT
// ============================================================

const RX_NDC      = /\bndc\b/;
const RX_MONEY    = /\b(amount|amt|total|dollar|dollars|usd)\b/;
const RX_QTY      = /\b(qty|quantity|units|count|pcs|pieces)\b/;
const RX_ASK_VERB = /\b(ask|asked|asking|request|requested|requesting|submitted|submit|claim|claimed|debit|debited|billed|invoice|invoiced|due|owed|charged|charge)\b/;
const RX_RECV_VERB = /\b(received|receive|paid|pay|credit|credited|crediting|approved|approve|allowed|allow|payment|payments|settled|settle|issued|issue|reimbursed|reimburse|net)\b/;
const RX_PRODUCT  = /\b(product|description|item|drug|label name|labelname|item name|drug name|name)\b/;

// ============================================================
// Low-level Azure DI calls (submit + poll)
// ============================================================

const submitDocumentToAzure = async (pdfBuffer: Buffer): Promise<string> => {
  if (!AZURE_DOCUMENT_ENDPOINT || !AZURE_DOCUMENT_API_KEY) {
    throw new Error(
      'Azure Document Intelligence is not configured (set AZURE_DOCUMENT_ENDPOINT and AZURE_DOCUMENT_API_KEY)'
    );
  }

  const url = `${AZURE_DOCUMENT_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${AZURE_DOCUMENT_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_API_KEY,
    },
    body: pdfBuffer as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Azure Document Intelligence submit failed: ${response.status} - ${errorText}`
    );
  }

  const operationLocation = response.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error(
      'Azure Document Intelligence did not return an Operation-Location header'
    );
  }
  return operationLocation;
};

const pollAzureResults = async (operationLocation: string): Promise<any> => {
  if (!AZURE_DOCUMENT_API_KEY) {
    throw new Error('Azure Document Intelligence API key not configured');
  }

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(operationLocation, {
      method: 'GET',
      headers: { 'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_API_KEY },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure Document Intelligence poll failed: ${response.status} - ${errorText}`
      );
    }

    const result: any = await response.json();
    if (result.status === 'succeeded') return result.analyzeResult;
    if (result.status === 'failed') {
      throw new Error(
        `Document analysis failed: ${result.error?.message || 'Unknown error'}`
      );
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Azure Document Intelligence analysis timed out (2 minutes)');
};

// ============================================================
// Cell parsing helpers
// ============================================================

/** Pull the first NDC-shaped token out of arbitrary cell text. */
function sanitizeNdc(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Match either dashed (4-4-2 / 5-3-2 / 5-4-2 / 4-3-2) or 10-/11-digit forms.
  const m = raw.match(/(\d{4,5}-\d{3,4}-\d{1,2}|\d{10,11})/);
  if (!m) return null;
  return m[1];
}

/**
 * Parse a money-shaped value out of a cell. Handles `$1,234.56`, `1234.56`,
 * `(34.10)` (negative), and ignores trailing labels like "USD".
 */
function parseMoney(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  // Detect parens-as-negative
  const isNegative = /^\(.*\)$/.test(s);
  const stripped = s
    .replace(/[()$,\s]/g, '')
    .replace(/usd$/i, '')
    .replace(/[^\d.\-]/g, '');
  if (!stripped || stripped === '-' || stripped === '.') return null;
  const n = Number(stripped);
  if (!Number.isFinite(n)) return null;
  return isNegative ? -n : n;
}

function parseQuantity(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// Table parsing
// ============================================================

interface DiCell {
  rowIndex: number;
  columnIndex: number;
  rowSpan?: number;
  columnSpan?: number;
  content?: string;
  kind?: string;
}

interface DiTable {
  rowCount: number;
  columnCount: number;
  cells: DiCell[];
}

/**
 * Build a (rowCount × columnCount) grid of cell text. For cells with
 * row/column spans we copy the content into every covered slot so that
 * downstream column lookup works regardless of which slot the lookup hits.
 */
function buildTableGrid(table: DiTable): string[][] {
  const rows = table.rowCount;
  const cols = table.columnCount;
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => '')
  );
  for (const cell of table.cells || []) {
    const rSpan = Math.max(1, cell.rowSpan || 1);
    const cSpan = Math.max(1, cell.columnSpan || 1);
    const text = (cell.content || '').trim();
    for (let r = cell.rowIndex; r < cell.rowIndex + rSpan && r < rows; r++) {
      for (let c = cell.columnIndex; c < cell.columnIndex + cSpan && c < cols; c++) {
        if (!grid[r][c]) grid[r][c] = text;
      }
    }
  }
  return grid;
}

/**
 * Determine which row of the grid contains the header. We prefer the row that
 * has the most cells flagged with `kind === 'columnHeader'`. If no cell is
 * flagged we fall back to row 0.
 */
function findHeaderRowIndex(table: DiTable): number {
  const counts = new Map<number, number>();
  for (const cell of table.cells || []) {
    if (cell.kind === 'columnHeader') {
      counts.set(cell.rowIndex, (counts.get(cell.rowIndex) || 0) + 1);
    }
  }
  if (counts.size === 0) return 0;
  let bestRow = 0;
  let bestCount = -1;
  for (const [row, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestRow = row;
    }
  }
  return bestRow;
}

type ColumnRole = 'ndc' | 'ask' | 'received' | 'product' | 'qty';

/**
 * Classify a single header cell into a role using the tiered rule documented
 * above. Returns null if the header doesn't fit any role.
 */
function matchHeaderRole(header: string): ColumnRole | null {
  const norm = normalizeHeader(header);
  if (!norm) return null;

  if (RX_NDC.test(norm)) return 'ndc';

  const hasMoney = RX_MONEY.test(norm);
  const hasQty = RX_QTY.test(norm);
  const hasRecvVerb = RX_RECV_VERB.test(norm);
  const hasAskVerb = RX_ASK_VERB.test(norm);

  // Tier 2: explicit money word disambiguates qty-vs-money — money wins.
  // ("Asked Qty Amount" → ask, "Amount Credited" → received.)
  if (hasMoney) {
    if (hasRecvVerb) return 'received';
    if (hasAskVerb) return 'ask';
    return null;
  }

  // Tier 3: count word with no money word ⇒ quantity column.
  // ("Qty Paid" / "Units Paid" / "Quantity Credited" → qty.)
  if (hasQty) return 'qty';

  if (hasRecvVerb) return 'received';
  if (hasAskVerb) return 'ask';

  if (RX_PRODUCT.test(norm)) return 'product';

  return null;
}

/** Map each column index → role based on header text matches. */
function mapColumnRoles(headerRow: string[]): {
  ndc?: number;
  ask?: number;
  received?: number;
  product?: number;
  qty?: number;
} {
  const out: { ndc?: number; ask?: number; received?: number; product?: number; qty?: number } = {};

  headerRow.forEach((h, idx) => {
    const role = matchHeaderRole(h);
    if (!role) return;
    // Keep the LEFTMOST column for each role
    if (out[role] == null) out[role] = idx;
  });

  return out;
}

/**
 * Decide whether a row looks like a TOTAL / subtotal row that should be
 * skipped (instead of trying to insert a phantom NDC observation).
 */
function isTotalsRow(row: string[]): boolean {
  const joined = row.join(' ').toLowerCase();
  return /\b(total|subtotal|grand total|sum)\b/.test(joined) && !/\bndc\b/.test(joined);
}

function parseTablesForAskReceived(
  tables: DiTable[],
  fallbackManufacturer: string | null
): { items: CreditMemoLineItem[]; tablesUsed: number; rowsScanned: number } {
  let tablesUsed = 0;
  let rowsScanned = 0;
  const items: CreditMemoLineItem[] = [];

  for (const table of tables || []) {
    if (!table || !table.rowCount || !table.columnCount) continue;

    const grid = buildTableGrid(table);
    const headerRowIndex = findHeaderRowIndex(table);
    if (headerRowIndex >= grid.length) continue;

    const cols = mapColumnRoles(grid[headerRowIndex]);
    if (cols.ndc == null || cols.ask == null || cols.received == null) {
      // Not a credit-memo table (or the headers are too unusual to map).
      continue;
    }

    tablesUsed += 1;

    for (let r = headerRowIndex + 1; r < grid.length; r++) {
      const row = grid[r];
      rowsScanned += 1;
      if (isTotalsRow(row)) continue;

      const ndc = sanitizeNdc(row[cols.ndc]);
      const ask = parseMoney(row[cols.ask]);
      const recv = parseMoney(row[cols.received]);

      if (!ndc) continue;
      if (ask == null || recv == null) continue;
      // Hard rule from the user: never persist rows that have an ask but no
      // received value. A zero received is treated the same as missing — the
      // manufacturer effectively rejected the claim and we don't seed those
      // into pricing intelligence (matches the CSV-seed filter).
      if (ask <= 0 || recv <= 0) continue;

      const productName =
        cols.product != null
          ? (row[cols.product] || '').trim() || null
          : null;
      const qty = cols.qty != null ? parseQuantity(row[cols.qty]) : null;

      const ratio = ask > 0 ? Math.round((recv / ask) * 10000) / 100 : null;

      items.push({
        ndc,
        productName,
        manufacturer: fallbackManufacturer,
        pharmacyName: null,
        quantity: qty,
        askPrice: ask,
        receivedPrice: recv,
        isPartial: false,
        percentageReturned: ratio,
        askDate: null,
        receiveDate: null,
        paymentMethod: 'credit_memo',
        aiConfidence: 90,
      });
    }
  }

  return { items, tablesUsed, rowsScanned };
}

/**
 * Best-effort manufacturer extraction from `analyzeResult.keyValuePairs` if
 * present, otherwise null. Credit memos commonly have a "Manufacturer:" or
 * "Vendor:" key-value pair near the top.
 */
function extractManufacturerFromKvPairs(analyzeResult: any): string | null {
  const pairs = Array.isArray(analyzeResult?.keyValuePairs)
    ? analyzeResult.keyValuePairs
    : [];
  for (const pair of pairs) {
    const key = (pair?.key?.content || '').toLowerCase().trim();
    const value = (pair?.value?.content || '').trim();
    if (!value) continue;
    if (
      /\b(manufacturer|vendor|labeler|company|supplier|payee|payer)\b/.test(key)
    ) {
      return value;
    }
  }
  return null;
}

/**
 * Best-effort total-amount extraction from kvPairs — looks for keys like
 * "Total", "Total Credit", "Amount Paid". Returns null if not found.
 */
function extractTotalFromKvPairs(analyzeResult: any): number | null {
  const pairs = Array.isArray(analyzeResult?.keyValuePairs)
    ? analyzeResult.keyValuePairs
    : [];
  for (const pair of pairs) {
    const key = (pair?.key?.content || '').toLowerCase().trim();
    const value = pair?.value?.content;
    if (!key || value == null) continue;
    if (/\b(total|grand total|amount paid|total credit|net credit)\b/.test(key)) {
      const n = parseMoney(value);
      if (n != null) return n;
    }
  }
  return null;
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyze a credit-memo PDF buffer with Azure Document Intelligence and
 * extract per-NDC ask / received pairs from its tables.
 *
 * Always resolves; on failure returns success=false + an error message so the
 * caller can still persist an audit row via record_credit_memo_analysis.
 */
export const analyzeCreditMemoPdf = async (
  pdfBuffer: Buffer,
  filename?: string
): Promise<CreditMemoAnalysisResult> => {
  if (!AZURE_DOCUMENT_ENDPOINT || !AZURE_DOCUMENT_API_KEY) {
    return {
      success: false,
      status: 'failed',
      confidence: 0,
      totalAmount: null,
      manufacturerName: null,
      lineItems: [],
      errorMessage:
        'Azure Document Intelligence not configured (AZURE_DOCUMENT_ENDPOINT / AZURE_DOCUMENT_API_KEY missing)',
    };
  }

  try {
    const opLocation = await submitDocumentToAzure(pdfBuffer);
    const analyzeResult = await pollAzureResults(opLocation);

    const tables: DiTable[] = Array.isArray(analyzeResult?.tables)
      ? analyzeResult.tables
      : [];

    const manufacturerName = extractManufacturerFromKvPairs(analyzeResult);

    const { items, tablesUsed, rowsScanned } = parseTablesForAskReceived(
      tables,
      manufacturerName
    );

    if (items.length === 0) {
      return {
        success: false,
        status: 'manual_review',
        confidence: 0,
        totalAmount: extractTotalFromKvPairs(analyzeResult),
        manufacturerName,
        lineItems: [],
        errorMessage:
          tables.length === 0
            ? `Azure DI returned no tables for this PDF${filename ? ` (${filename})` : ''}; manual review recommended`
            : `Azure DI parsed ${tables.length} table${
                tables.length === 1 ? '' : 's'
              } (used ${tablesUsed}, scanned ${rowsScanned} rows) but found no NDC ask/received pairs; manual review recommended`,
      };
    }

    const totalAmount =
      extractTotalFromKvPairs(analyzeResult) ??
      items.reduce((acc, it) => acc + (it.receivedPrice || 0), 0);

    return {
      success: true,
      status: 'completed',
      confidence: 92, // DI table extraction is high-confidence when items are present
      totalAmount,
      manufacturerName,
      lineItems: items,
    };
  } catch (err: any) {
    if (err instanceof AppError) {
      return {
        success: false,
        status: 'failed',
        confidence: 0,
        totalAmount: null,
        manufacturerName: null,
        lineItems: [],
        errorMessage: err.message,
      };
    }
    return {
      success: false,
      status: 'failed',
      confidence: 0,
      totalAmount: null,
      manufacturerName: null,
      lineItems: [],
      errorMessage: err?.message || 'Unknown error analyzing credit memo',
    };
  }
};
