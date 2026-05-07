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
 *            in multiple chunks, keep the instance with the highest confidence
 *            score, then by specificity (ndc_exact > ndc_partial > product_name).
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
 * ≈ 25 000 tokens — keeps well within GPT-4 Turbo's 128k window when
 * combined with the debit-item context and expected response size.
 */
const CHUNK_SIZE_CHARS = 100_000;

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
  return METHOD_RANK[method] ?? 99;
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
    return `${i + 1}. NDC: ${ndc} | Product: ${name} | Ask: ${ask} | Qty: ${qty}`;
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

DEBIT MEMO ITEMS (NDC | Product | Ask Price | Qty):
{itemsSection}

TASK
====
Read the credit memo text chunk supplied in the user message and find the received / credited amount for every matching debit memo item.

MATCHING RULES
--------------
1. Match by NDC code FIRST (exact, ignoring dashes/spaces).
   matchMethod = "ndc_exact"
2. If the credit memo has no NDC for an entry, match by product name (partial OK, case-insensitive).
   matchMethod = "product_name"
3. If only a partial NDC match (e.g. labeler-code only): matchMethod = "ndc_partial"
4. The received price = the amount the manufacturer credited / paid / allowed for that item.
5. If the same NDC appears multiple times in the chunk, SUM the credited amounts.
6. ONLY include items where you found a real positive credited dollar amount.
   Never invent numbers.
7. Skip items whose credited amount is zero or absent.

OUTPUT FORMAT
-------------
Return ONLY valid JSON — no extra text, no markdown fences:

{
  "manufacturerName": "...",
  "totalCredit": 1234.56,
  "matches": [
    {
      "ndc": "45802-012-85",
      "productName": "Drug Name",
      "askPrice": 12.50,
      "receivedPrice": 11.20,
      "confidence": 95,
      "matchMethod": "ndc_exact"
    }
  ]
}

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
  // Map from normalised NDC (no dashes, uppercase) → accumulated entry
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
      // SUM received amounts — the same credit line can span PDF pages / chunks.
      const summedRecv = existing.receivedPrice + recv;

      // Update metadata (confidence, matchMethod) to the more specific entry.
      const existingConf = existing.confidence ?? 0;
      const existingRank = rankMethod(existing.matchMethod);
      const incomingRank = rankMethod(raw.matchMethod);
      const incomingIsBetter =
        conf > existingConf || (conf === existingConf && incomingRank < existingRank);

      best.set(normNdc, {
        ...(incomingIsBetter ? { ...raw, ndc } : existing),
        _normNdc: normNdc,
        receivedPrice: summedRecv,
        askPrice: ask ?? existing.askPrice,
        confidence: incomingIsBetter ? conf : existingConf,
      });
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

  // Backfill pharmacyName on each item (the RPC expects it)
  lineItems.forEach(it => {
    it.pharmacyName = input.pharmacyName ?? null;
    it.manufacturer = collectedManufacturerName ?? debitMemo!.labelerName ?? null;
  });

  const sumFromItems = lineItems.reduce((acc, it) => acc + (it.receivedPrice || 0), 0);
  const totalAmount = collectedTotalCredit ?? (sumFromItems > 0 ? sumFromItems : null);

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
