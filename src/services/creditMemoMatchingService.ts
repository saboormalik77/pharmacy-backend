/**
 * Credit Memo Matching Service (FCR-56b)
 *
 * Hybrid pipeline for turning a manufacturer credit-memo PDF into
 * confirmed per-NDC ask / received pairs:
 *
 *   Step 1 — Fetch debit memo + its line items (NDC, product name, ask price)
 *            from the database using the debit memo UUID.
 *
 *   Step 2 — (Optional) If a filename is supplied, verify it matches the debit
 *            memo by finding the memo's "key" (memo_number stripped of the
 *            leading "DEL") inside the filename.
 *
 *   Step 3 — Extract full plain text from the credit memo PDF using Azure
 *            Document Intelligence (prebuilt-layout).
 *
 *   Step 4 — Split that text into chunks of at most CHUNK_SIZE_CHARS characters
 *            (≈ 25 000 tokens). GPT-4 Turbo supports a 128 000-token context
 *            window; we keep well under that so the prompt (system + debit memo
 *            items + chunk + response) never exceeds ~35 000 tokens.
 *
 *   Step 5 — For each chunk call Azure OpenAI (the same client/deployment
 *            already configured in src/config/azureOpenAI.ts):
 *              • System message:  ALL debit memo items  +  instructions
 *              • User message:    the current credit memo text chunk
 *            Wait CALL_INTERVAL_MS between consecutive calls.
 *
 *   Step 6 — Merge match results from all chunks.  When the same NDC appears
 *            in more than one chunk, keep the single best match (highest
 *            confidence, then by specificity: ndc_exact > ndc_partial >
 *            product_name).  Received amounts are NOT summed — each credit line
 *            is one dollar figure and summing would inflate the value.
 *
 *   Step 7 — Return a CreditMemoAnalysisResult that the controller can pass
 *            straight to recordCreditMemoAnalysis (the SQL RPC).
 *
 * ─── Context-limit calculation ──────────────────────────────────────────────
 *   GPT-4 Turbo: 128 000 token context (≈ 512 000 chars @ ~4 chars/token)
 *
 *   Budget per call:
 *     System prompt + debit items  ≈  2 000 – 15 000 chars   (≈ 3 750 tokens)
 *     Credit memo text chunk       ≤  100 000 chars           (≈ 25 000 tokens)
 *     Response                     ≤  16 000 chars            (≈ 4 000 tokens)
 *     ─────────────────────────────────────────────────────────────────────────
 *     Total per call               ≤  131 000 chars           ≈ 32 750 tokens
 *
 *   A typical credit memo (1–20 pages) has 5 000 – 60 000 chars of text, so
 *   most uploads will complete in ONE Azure OpenAI call.
 *   Very large annual summaries (> 100 000 chars) will use two or more calls.
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { client, deployment } from '../config/azureOpenAI';
import { extractTextFromPDF } from './returnReportService';
import type {
  CreditMemoAnalysisResult,
  CreditMemoLineItem,
} from './azureDocumentIntelligenceService';

// ============================================================
// Configuration
// ============================================================

/**
 * Max characters of credit memo text included in a single OpenAI call.
 * Kept at 30 000 chars (≈7 500 tokens) so the model has focused context
 * and a typical short credit memo gets at least 2 passes if needed.
 */
const CHUNK_SIZE_CHARS = 30_000;

/** Minimum pause between consecutive OpenAI calls (milliseconds). */
const CALL_INTERVAL_MS = 5_000;

/** Maximum tokens in OpenAI's response for each matching call. */
const MAX_RESPONSE_TOKENS = 4_000;

// ============================================================
// Types
// ============================================================

interface DebitMemoItemRow {
  id: string;
  ndc: string | null;
  productName: string | null;
  quantity: number;
  askPrice: number | null;
  lotNumber: string | null;
  expirationDate: string | null;
}

interface DebitMemoContext {
  id: string;
  memoNumber: string;
  labelerName: string | null;
  destination: string | null;
  amountRequested: number;
  items: DebitMemoItemRow[];
}

/** Shape returned by OpenAI for each matched item. */
interface RawMatch {
  ndc?: string | null;
  productName?: string | null;
  askPrice?: number | null;
  receivedPrice?: number | null;
  confidence?: number | null;
  matchMethod?: string | null;
  quantity?: number | null;
}

// ============================================================
// Helpers
// ============================================================

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

/** Strip a leading "DEL" prefix from a memo number to get the match key. */
function memoKey(memoNumber: string): string {
  return memoNumber.startsWith('DEL') ? memoNumber.slice(3) : memoNumber;
}

/** Sanitise an NDC token from arbitrary LLM output. */
function normaliseNdc(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d{4,5}-\d{3,4}-\d{1,2}|\d{10,11})/);
  return m ? m[1] : null;
}

function toPositiveNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Priority ranking for deduplication: lower number = preferred. */
const METHOD_RANK: Record<string, number> = {
  ndc_exact: 0,
  ndc_partial: 1,
  product_name: 2,
};

function rankMethod(method: string | null | undefined): number {
  if (!method) return 99;
  return METHOD_RANK[method.toLowerCase().replace(/\s+/g, '_')] ?? 99;
}

// ============================================================
// Step 1 — Fetch debit memo with items
// ============================================================

async function fetchDebitMemoWithItems(
  debitMemoId: string
): Promise<DebitMemoContext | null> {
  const sb = ensureAdmin();

  const { data: memo, error: memoErr } = await sb
    .from('debit_memos')
    .select('id, memo_number, labeler_name, destination, amount_requested')
    .eq('id', debitMemoId)
    .single();

  if (memoErr || !memo) return null;

  const { data: items, error: itemsErr } = await sb
    .from('debit_memo_items')
    .select('id, ndc, product_name, quantity, ask_price, lot_number, expiration_date')
    .eq('debit_memo_id', debitMemoId)
    .order('product_name');

  if (itemsErr) {
    console.error('[CreditMemoMatching] debit_memo_items query failed:', itemsErr.message);
    return null;
  }

  const itemRows: DebitMemoItemRow[] = (items || []).map((r: any) => ({
    id: r.id,
    ndc: r.ndc ?? null,
    productName: r.product_name ?? null,
    quantity: r.quantity ?? 1,
    askPrice: r.ask_price != null ? Number(r.ask_price) : null,
    lotNumber: r.lot_number ?? null,
    expirationDate: r.expiration_date ?? null,
  }));

  return {
    id: memo.id,
    memoNumber: memo.memo_number,
    labelerName: memo.labeler_name ?? null,
    destination: memo.destination ?? null,
    amountRequested: Number(memo.amount_requested) || 0,
    items: itemRows,
  };
}

// ============================================================
// Step 2 — (Optional) Verify credit memo filename matches
// ============================================================

/**
 * Returns true if the credit memo filename contains the debit memo's key
 * (memo_number with leading "DEL" stripped).  Used for a sanity check so we
 * can log a warning without blocking the pipeline.
 */
function filenameMatchesMemo(filename: string, memoNumber: string): boolean {
  const key = memoKey(memoNumber);
  return filename.toUpperCase().includes(key.toUpperCase());
}

// ============================================================
// Step 3 — Credit memo text chunker
// ============================================================

function chunkText(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + chunkSize, text.length);
    // Try to break at a newline boundary to avoid cutting mid-line
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      if (lastNewline > offset + chunkSize / 2) end = lastNewline + 1;
    }
    chunks.push(text.slice(offset, end));
    offset = end;
  }
  return chunks;
}

// ============================================================
// Step 4–5 — Build prompts and call Azure OpenAI
// ============================================================

/**
 * Format debit memo items as a compact table-like string for the system prompt.
 * Kept ASCII so it doesn't inflate token count with Unicode.
 */
function buildDebitItemsSection(ctx: DebitMemoContext): string {
  const rows = ctx.items.map((it, i) => {
    const ndc = it.ndc ?? '(no NDC)';
    const name = it.productName ?? '(unknown)';
    const ask = it.askPrice != null ? `$${it.askPrice.toFixed(2)}` : '(unknown)';
    const qty = it.quantity;
    const lot = it.lotNumber ?? '-';
    return `${i + 1}. NDC: ${ndc} | Product: ${name} | Lot: ${lot} | Ask: ${ask} | Qty: ${qty}`;
  });
  return rows.join('\n');
}

const MATCH_SYSTEM_PROMPT_TEMPLATE = `\
You are an expert pharmaceutical payment analyst. Your job is to match manufacturer credit memo line items to the debit memo items listed below and extract the received/credited dollar amount for each matched item.

DEBIT MEMO (our return request):
  Memo Number : {memoNumber}
  Manufacturer: {labelerName}
  Total Asked : ${'{totalAsked}'}
  Items       : {itemCount} items

DEBIT MEMO ITEMS (NDC | Product | Lot | Ask Price | Qty):
{itemsSection}

TASK
====
Read the credit memo text chunk supplied in the user message and find the received / credited amount for every matching debit memo item.
Credit memos come in MANY formats — tables, lists, plain text, multi-column layouts. OCR text may be messy with broken spacing. Look CAREFULLY at every line.

MATCHING RULES (try these in order — use whatever matches first)
----------------------------------------------------------------
A. NDC EXACT — same digits, ignoring dashes/spaces/leading zeros.
   matchMethod = "ndc_exact", confidence 95.
   IMPORTANT EXAMPLE: debit memo NDC "29300-0289-13" and credit memo NDC "29300-289-13"
   are the SAME — a leading zero may be dropped in the middle segment. Always strip
   dashes and compare raw digit strings before deciding they differ.
B. NDC PARTIAL — labeler segment matches OR first 9–10 digits match.
   matchMethod = "ndc_partial", confidence 75.
C. LOT NUMBER — credit memo line shows the same lot number as a debit item.
   matchMethod = "ndc_exact" (lot is unique enough), confidence 90.
D. PRODUCT NAME — brand or generic name matches partially (case-insensitive,
   ignore words like "TABLET", "CAPSULE", "TAB", "MG", numbers/dosage).
   Examples that should match:
     "ATORVASTATIN 40MG"  ↔ "Atorvastatin Calcium 40 mg Tab"
     "OMEPRAZOLE DR 20MG" ↔ "Omeprazole 20mg Cap"
   matchMethod = "product_name", confidence 60.

WHAT TO EXTRACT
---------------
For each match, extract the RECEIVED PRICE = the UNIT PRICE (per-item price) the
manufacturer credited / paid / allowed / approved / accepted for that item.

CRITICAL: Always extract the UNIT PRICE, NOT the extended/total line price.
- If the credit memo shows "Qty: 5" and "Total Credit: $50.00", the receivedPrice is $10.00 (50÷5).
- If the credit memo shows "Unit Price: $10.00" and "Extended: $50.00", use $10.00.
- If only a total amount is shown with quantity, DIVIDE to get the unit price.
- The receivedPrice must represent the credit for ONE unit, matching how askPrice is stored.

Common column / label names for total: "Credit Amount", "Credit", "Allowed", "Approved",
"Net Credit", "Amount", "Total", "Payment", "Paid", "Reimbursement", "Settlement", "Extended".
Common column / label names for unit price: "Unit Price", "Price", "Unit Credit", "Each".

If a line has multiple dollar columns:
1. First look for a dedicated UNIT PRICE column — use that directly.
2. If only TOTAL/EXTENDED is shown, DIVIDE by the quantity to get unit price.
3. If quantity is 1 or not specified, the total equals the unit price.

RULES
-----
1. ONLY include items with a real positive credited dollar amount. Never invent.
2. Skip items whose credited amount is zero or absent.
3. Use ONLY the first matching line per NDC — do NOT sum across rows.
4. Each NDC must appear AT MOST ONCE in matches.
5. Process EVERY row in any table — do not stop early.
6. Be GENEROUS — if you are 50% sure an item matches, include it with low
   confidence rather than skipping it. We would rather over-extract than miss data.
7. If the credit memo has line items but you cannot confidently link them to
   debit items, still include them with the NDC / product name as written
   in the credit memo and matchMethod = "product_name" with confidence 40.
8. ALWAYS return UNIT PRICE in receivedPrice, NOT total/extended price.
   If credit memo shows Qty=10 and Total=$100, receivedPrice must be $10.00 (100÷10).

OUTPUT FORMAT
-------------
CRITICAL: For the "ndc" field always use the NDC EXACTLY as it appears in the
DEBIT MEMO ITEMS list above — NOT the NDC from the credit memo text.
The credit memo may print the NDC with fewer digits or different dashes; ignore
that and always output the debit memo NDC.

Return ONLY valid JSON — no extra text, no markdown fences:

{
  "manufacturerName": "...",
  "totalCredit": 1234.56,
  "matches": [
    {
      "ndc": "45802-012-85",
      "productName": "Drug Name",
      "quantity": 5,
      "askPrice": 12.50,
      "receivedPrice": 11.20,
      "confidence": 95,
      "matchMethod": "ndc_exact"
    }
  ]
}

IMPORTANT: receivedPrice and askPrice are ALWAYS the UNIT PRICE (per single item).
If credit memo shows Qty=5 and Total Credit=$56.00, then receivedPrice = 56÷5 = $11.20.
Never return the extended/total price as receivedPrice.

confidence is 0-100. Use 95 for ndc_exact, 75 for ndc_partial, 60 for product_name.
If no matches found in this chunk return: {"manufacturerName": null, "totalCredit": null, "matches": []}
`;

function buildSystemPrompt(ctx: DebitMemoContext): string {
  return MATCH_SYSTEM_PROMPT_TEMPLATE
    .replace('{memoNumber}', ctx.memoNumber)
    .replace('{labelerName}', ctx.labelerName ?? 'Unknown')
    .replace('{totalAsked}', ctx.amountRequested.toFixed(2))
    .replace('{itemCount}', String(ctx.items.length))
    .replace('{itemsSection}', buildDebitItemsSection(ctx));
}

/** Call Azure OpenAI once with the system prompt + one credit memo text chunk. */
async function callOpenAIForChunk(
  systemPrompt: string,
  chunkText: string,
  chunkIndex: number
): Promise<{ matches: RawMatch[]; manufacturerName: string | null; totalCredit: number | null }> {
  const userMessage = `Credit memo text (chunk ${chunkIndex + 1}):\n\n${chunkText}`;

  const response = await client.chat.completions.create({
    model: deployment as string,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
    max_tokens: MAX_RESPONSE_TOKENS,
    temperature: 0.0,
    response_format: { type: 'json_object' } as any,
  });

  const rawContent = response.choices?.[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    console.warn(`[CreditMemoMatching] chunk ${chunkIndex + 1}: OpenAI returned invalid JSON — skipping`);
    return { matches: [], manufacturerName: null, totalCredit: null };
  }

  const matches: RawMatch[] = Array.isArray(parsed.matches) ? parsed.matches : [];
  const manufacturerName: string | null =
    typeof parsed.manufacturerName === 'string' ? parsed.manufacturerName.trim() || null : null;
  const totalCredit = toPositiveNumber(parsed.totalCredit);

  return { matches, manufacturerName, totalCredit };
}

// ============================================================
// Step 6 — Merge / deduplicate across chunks
// ============================================================

function mergeMatches(allMatches: RawMatch[]): CreditMemoLineItem[] {
  // Map from normalised NDC (no dashes, uppercase) → single best match entry.
  // When the same NDC appears in multiple chunks we keep only the one match
  // with the highest confidence / most specific match method.  We do NOT sum
  // received amounts: each credit line is a single dollar figure, and the AI
  // may surface the same line in more than one chunk — summing would inflate it.
  const best = new Map<string, RawMatch & { _normNdc: string; receivedPrice: number }>();

  for (const raw of allMatches) {
    const ndc = normaliseNdc(raw.ndc);
    if (!ndc) continue;
    const recv = toPositiveNumber(raw.receivedPrice);
    if (!recv) continue; // hard rule: skip zero/absent received values
    const ask = toPositiveNumber(raw.askPrice);
    const conf = typeof raw.confidence === 'number' ? raw.confidence : 50;
    const normNdc = ndc.replace(/-/g, '').toUpperCase();

    const existing = best.get(normNdc);
    if (!existing) {
      best.set(normNdc, { ...raw, ndc, _normNdc: normNdc, receivedPrice: recv, askPrice: ask, confidence: conf });
    } else {
      // Keep whichever match has higher confidence; break ties by match method specificity.
      const existingConf = existing.confidence ?? 0;
      const existingRank = rankMethod(existing.matchMethod);
      const incomingRank = rankMethod(raw.matchMethod);
      const incomingIsBetter =
        conf > existingConf || (conf === existingConf && incomingRank < existingRank);

      if (incomingIsBetter) {
        best.set(normNdc, {
          ...raw, ndc,
          _normNdc: normNdc,
          receivedPrice: recv,
          askPrice: ask ?? existing.askPrice,
          confidence: conf,
        });
      } else if (ask != null && (existing.askPrice == null || (existing.askPrice as number) <= 0)) {
        // Incoming is not better overall, but can still fill a missing askPrice
        // on the existing entry without displacing its received amount or confidence.
        best.set(normNdc, { ...existing, askPrice: ask });
      }
    }
  }

  return Array.from(best.values()).map(m => ({
    ndc: m.ndc as string,
    productName: typeof m.productName === 'string' ? m.productName || null : null,
    manufacturer: null,
    pharmacyName: null,
    quantity: typeof m.quantity === 'number' ? m.quantity : null,
    askPrice: m.askPrice as number,
    receivedPrice: m.receivedPrice as number,
    isPartial: false,
    percentageReturned:
      m.askPrice && m.receivedPrice
        ? Math.round((m.receivedPrice / m.askPrice) * 10000) / 100
        : null,
    askDate: null,
    receiveDate: null,
    paymentMethod: 'credit_memo',
    aiConfidence: m.confidence ?? 70,
  }));
}

// ============================================================
// Public API
// ============================================================

/**
 * Analyse a credit memo PDF and match its line items to the corresponding
 * debit memo's items using Azure Document Intelligence (text extraction)
 * and Azure OpenAI (intelligent matching with full debit memo context).
 *
 * Always resolves — on failure returns success=false so the caller can still
 * persist an audit row via record_credit_memo_analysis.
 */
export const analyzeAndMatchCreditMemo = async (input: {
  debitMemoId: string;
  pdfBuffer: Buffer;
  filename?: string;
  pharmacyName?: string | null;
}): Promise<CreditMemoAnalysisResult> => {
  try {
    return await _analyzeAndMatchCreditMemoInner(input);
  } catch (unexpectedErr: any) {
    console.error('[CreditMemoMatching] Unexpected error (non-blocking):', unexpectedErr);
    return {
      success: false,
      status: 'failed',
      confidence: 0,
      totalAmount: null,
      manufacturerName: null,
      lineItems: [],
      errorMessage: unexpectedErr?.message ?? String(unexpectedErr),
    };
  }
};

// Internal implementation so the public export is always a clean catch boundary.
const _analyzeAndMatchCreditMemoInner = async (input: {
  debitMemoId: string;
  pdfBuffer: Buffer;
  filename?: string;
  pharmacyName?: string | null;
}): Promise<CreditMemoAnalysisResult> => {
  // ── Step 1: Fetch debit memo with items ──────────────────────────────────
  let debitMemo: DebitMemoContext | null = null;
  try {
    debitMemo = await fetchDebitMemoWithItems(input.debitMemoId);
  } catch (dbErr: any) {
    console.error('[CreditMemoMatching] DB fetch failed:', dbErr?.message);
  }

  if (!debitMemo) {
    return {
      success: false,
      status: 'failed',
      confidence: 0,
      totalAmount: null,
      manufacturerName: null,
      lineItems: [],
      errorMessage: `Debit memo not found or DB error for id: ${input.debitMemoId}`,
    };
  }

  if (debitMemo.items.length === 0) {
    return {
      success: false,
      status: 'manual_review',
      confidence: 0,
      totalAmount: null,
      manufacturerName: debitMemo.labelerName,
      lineItems: [],
      errorMessage: `Debit memo ${debitMemo.memoNumber} has no items — cannot match credit memo`,
    };
  }

  // ── Step 2: Optional filename verification ───────────────────────────────
  if (input.filename && !filenameMatchesMemo(input.filename, debitMemo.memoNumber)) {
    console.warn(
      `[CreditMemoMatching] filename "${input.filename}" does not contain ` +
      `the key for memo "${debitMemo.memoNumber}" (${memoKey(debitMemo.memoNumber)}). ` +
      `Proceeding anyway (debitMemoId is the authoritative link).`
    );
  }

  // ── Step 3: Extract credit memo text via Azure DI ────────────────────────
  let creditMemoText: string;
  try {
    creditMemoText = await extractTextFromPDF(input.pdfBuffer);
  } catch (diErr: any) {
    console.error('[CreditMemoMatching] Azure DI text extraction failed:', diErr?.message);
    return {
      success: false,
      status: 'failed',
      confidence: 0,
      totalAmount: null,
      manufacturerName: debitMemo.labelerName,
      lineItems: [],
      errorMessage: `Azure Document Intelligence text extraction failed: ${diErr?.message}`,
    };
  }

  if (!creditMemoText || creditMemoText.trim().length === 0) {
    return {
      success: false,
      status: 'manual_review',
      confidence: 0,
      totalAmount: null,
      manufacturerName: debitMemo.labelerName,
      lineItems: [],
      errorMessage: 'Azure Document Intelligence returned empty text for this PDF',
    };
  }

  // ── Step 4: Chunk the credit memo text ───────────────────────────────────
  const chunks = chunkText(creditMemoText, CHUNK_SIZE_CHARS);
  console.log(
    `[CreditMemoMatching] memo=${debitMemo.memoNumber} ` +
    `items=${debitMemo.items.length} ` +
    `textLen=${creditMemoText.length} ` +
    `chunks=${chunks.length}`
  );

  // Log the debit memo items we are trying to match against the credit memo
  console.log(`[CreditMemoMatching] Debit memo items to match (memo=${debitMemo.memoNumber}):`);
  debitMemo.items.forEach((it, idx) => {
    console.log(
      `  [${idx + 1}] NDC: ${it.ndc ?? '(none)'} | ` +
      `Product: ${it.productName ?? '(unknown)'} | ` +
      `Lot: ${it.lotNumber ?? '-'} | ` +
      `Ask: ${it.askPrice != null ? `$${it.askPrice.toFixed(2)}` : '(unknown)'} | ` +
      `Qty: ${it.quantity}`
    );
  });

  // ── Step 5: Call OpenAI for each chunk ───────────────────────────────────
  const systemPrompt = buildSystemPrompt(debitMemo);
  const allRawMatches: RawMatch[] = [];
  let collectedManufacturerName: string | null = null;
  let collectedTotalCredit: number | null = null;

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, CALL_INTERVAL_MS));
    }
    try {
      const { matches, manufacturerName, totalCredit } = await callOpenAIForChunk(
        systemPrompt,
        chunks[i],
        i
      );
      allRawMatches.push(...matches);
      if (!collectedManufacturerName && manufacturerName) {
        collectedManufacturerName = manufacturerName;
      }
      if (!collectedTotalCredit && totalCredit) {
        collectedTotalCredit = totalCredit;
      }
      console.log(
        `[CreditMemoMatching] chunk ${i + 1}/${chunks.length}: ` +
        `found ${matches.length} raw match(es)`
      );
      if (matches.length > 0) {
        matches.forEach((m, mi) => {
          console.log(
            `    match[${mi + 1}] NDC: ${m.ndc ?? '(none)'} | ` +
            `Product: ${m.productName ?? '-'} | ` +
            `Ask: ${m.askPrice != null ? `$${m.askPrice}` : '-'} | ` +
            `Received: ${m.receivedPrice != null ? `$${m.receivedPrice}` : '-'} | ` +
            `Method: ${m.matchMethod ?? '-'} | Confidence: ${m.confidence ?? '-'}`
          );
        });
      } else {
        console.log(`    (no matches in this chunk)`);
      }
    } catch (oaiErr: any) {
      console.error(
        `[CreditMemoMatching] OpenAI call failed for chunk ${i + 1}:`,
        oaiErr?.message
      );
      // Continue with remaining chunks even if one fails
    }
  }

  // ── Step 6: Merge and deduplicate ────────────────────────────────────────
  const lineItems = mergeMatches(allRawMatches);

  // Build a digits-only lookup from debit memo NDCs.
  // Used to replace whatever NDC the AI returned with the exact NDC from our DB.
  const debitNdcDigits = debitMemo.items
    .filter(it => !!it.ndc)
    .map(it => ({ canonical: it.ndc as string, digits: it.ndc!.replace(/\D/g, '') }));

  /** Find the debit-memo NDC whose digit string contains or is contained by
   *  the AI-returned NDC's digit string (handles dropped leading zeros, etc.) */
  function findDebitNdc(aiNdc: string): string | null {
    const aiDigits = aiNdc.replace(/\D/g, '');
    if (!aiDigits) return null;
    // 1. Exact digit match
    const exact = debitNdcDigits.find(d => d.digits === aiDigits);
    if (exact) return exact.canonical;
    // 2. One contains the other (handles leading-zero differences in segments)
    const contained = debitNdcDigits.find(
      d => d.digits.includes(aiDigits) || aiDigits.includes(d.digits)
    );
    if (contained) return contained.canonical;
    return null;
  }

  // Backfill pharmacyName, manufacturer, and canonical NDC on each item
  lineItems.forEach(it => {
    it.pharmacyName = input.pharmacyName ?? null;
    it.manufacturer = collectedManufacturerName ?? debitMemo!.labelerName ?? null;

    // Always replace the AI-returned NDC with the exact debit memo NDC
    if (it.ndc) {
      const canonical = findDebitNdc(it.ndc);
      if (canonical && canonical !== it.ndc) {
        console.log(
          `[CreditMemoMatching] NDC replaced: credit="${it.ndc}" → debit="${canonical}"`
        );
        it.ndc = canonical;
      } else if (canonical) {
        it.ndc = canonical; // already correct, keep it
      }
    }
  });

  // IMPORTANT: Always use sum of unit prices for totalAmount
  // The AI's collectedTotalCredit is the document's extended total, but since
  // we're extracting unit prices, we must sum those instead for consistency.
  const sumFromItems = lineItems.reduce((acc, it) => acc + (it.receivedPrice || 0), 0);
  const totalAmount = sumFromItems > 0 ? sumFromItems : collectedTotalCredit;

  if (lineItems.length === 0) {
    return {
      success: false,
      status: 'manual_review',
      confidence: 30,
      totalAmount,
      manufacturerName: collectedManufacturerName ?? debitMemo.labelerName,
      lineItems: [],
      errorMessage:
        `Azure OpenAI processed ${chunks.length} chunk(s) but found no matching ` +
        `NDC ask/received pairs between memo ${debitMemo.memoNumber} and the credit memo PDF. ` +
        `Manual review recommended.`,
    };
  }

  // Confidence: weight by match-method distribution
  const avgConf =
    lineItems.reduce((acc, it) => acc + (it.aiConfidence ?? 70), 0) / lineItems.length;

  return {
    success: true,
    status: 'completed',
    confidence: Math.round(avgConf),
    totalAmount,
    manufacturerName: collectedManufacturerName ?? debitMemo.labelerName,
    lineItems,
  };
};

/**
 * Utility: given a credit memo filename, find the debit memo whose key
 * (memo_number stripped of "DEL") appears in the filename.
 *
 * Queries the DB directly; intended for bulk-processing workflows where
 * the debit memo UUID is not otherwise known.
 */
export const findDebitMemoByFilename = async (
  filename: string
): Promise<{ memoId: string; memoNumber: string } | null> => {
  const sb = ensureAdmin();
  const { data } = await sb
    .from('debit_memos')
    .select('id, memo_number')
    .order('created_at', { ascending: false });

  for (const row of data || []) {
    const key = memoKey(row.memo_number);
    if (filename.toUpperCase().includes(key.toUpperCase())) {
      return { memoId: row.id, memoNumber: row.memo_number };
    }
  }
  return null;
};
