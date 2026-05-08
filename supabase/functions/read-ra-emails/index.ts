// Supabase Edge Function: read-ra-emails
// Reads incoming emails via IMAP, extracts RA numbers using Azure OpenAI,
// and auto-updates the RA tracking in the database.
//
// Deploy:  npx supabase functions deploy read-ra-emails --no-verify-jwt
// Invoke:  POST /functions/v1/read-ra-emails
//
// Required secrets:
//   IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS
//   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injected), or EDGE_SUPABASE_URL + EDGE_SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  edgeSupabaseServiceRoleKey,
  edgeSupabaseUrl,
} from '../_shared/supabase_env.ts';
import { ImapFlow } from 'npm:imapflow';
import { simpleParser } from 'npm:mailparser';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Helpers ──────────────────────────────────────────────────

function env(key: string, fallback = ''): string {
  return Deno.env.get(key) ?? fallback;
}

function getSupabase() {
  const url = edgeSupabaseUrl();
  const key = edgeSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'Missing Supabase URL or service role key (set EDGE_SUPABASE_* secrets or use linked project defaults)'
    );
  }
  return createClient(url, key);
}

// ── IMAP Connection ──────────────────────────────────────────

async function connectImap(): Promise<ImapFlow> {
  const host = env('IMAP_HOST', 'imap.gmail.com');
  const port = parseInt(env('IMAP_PORT', '993'), 10);
  const user = env('IMAP_USER');
  const pass = env('IMAP_PASS');
  // Confirms in Edge logs which mailbox is used (never log password).
  console.log(
    `[read-ra-emails] IMAP login: user=${user || '(IMAP_USER missing)'} host=${host} port=${port} passwordSet=${Boolean(pass)}`
  );

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  return client;
}

// ── Azure OpenAI RA extraction ───────────────────────────────

const EXTRACTION_PROMPT = `You are an expert at extracting Return Authorization (RA) numbers from manufacturer email replies in the pharmaceutical return processing industry.

Analyze the following email and extract:
1. The RA number / RMA number / Return Authorization number
2. Any return shipping instructions
3. Any deadline or expiration for the authorization

Common RA number formats:
- RA# followed by digits or alphanumeric
- RA- followed by alphanumeric
- RMA# or RMA- followed by alphanumeric
- "Return Authorization Number:" followed by the number
- "Authorization #:" followed by the number
- Just a standalone number referenced as the authorization

Important:
- If no RA number is found, set ra_number to null
- If the email is not related to Return Authorization at all, set ra_number to null
- Be precise - only extract what is clearly an RA/RMA number
- Do NOT confuse debit memo numbers (formats: DM-XXXX-XXXX or DELMMYYxxxNNNNN) with RA numbers

Respond ONLY with valid JSON (no markdown, no code fences, no explanation):
{
  "ra_number": "extracted RA number or null",
  "confidence": 0.0,
  "return_instructions": "special instructions or null",
  "return_address": "shipping address or null",
  "expiration_date": "RA expiration date or null",
  "notes": "brief one-line summary"
}`;

interface AIExtractionResult {
  ra_number: string | null;
  confidence: number;
  return_instructions: string | null;
  return_address: string | null;
  expiration_date: string | null;
  notes: string | null;
}

async function extractRAFromEmail(
  subject: string,
  body: string
): Promise<AIExtractionResult> {
  const endpoint = env('AZURE_OPENAI_ENDPOINT').replace(/\/$/, '');
  const deployment = env('AZURE_OPENAI_DEPLOYMENT', 'gpt-4.1');
  const apiVersion = env('AZURE_OPENAI_API_VERSION', '2025-01-01-preview');
  const apiKey = env('AZURE_OPENAI_API_KEY');

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  // Truncate body to ~6000 chars to stay within token limits
  const truncatedBody = body.length > 6000 ? body.slice(0, 6000) + '\n[... truncated]' : body;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: `Subject: ${subject}\n\nEmail Body:\n${truncatedBody}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Azure OpenAI error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      ra_number: null,
      confidence: 0,
      return_instructions: null,
      return_address: null,
      expiration_date: null,
      notes: 'No response from AI',
    };
  }

  try {
    // Strip markdown code fences if AI added them despite instructions
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as AIExtractionResult;
  } catch {
    console.error('Failed to parse AI response:', content);
    return {
      ra_number: null,
      confidence: 0,
      return_instructions: null,
      return_address: null,
      expiration_date: null,
      notes: `Parse error: ${content.slice(0, 200)}`,
    };
  }
}

// ── Memo Number Extraction from Subject ──────────────────────

function extractMemoNumber(subject: string): string | null {
  // New format: DEL + MMYY (4 digits) + 3 alpha chars + labeler_id (3-10 digits)
  // e.g. DEL0127AAA29300
  const newFmt = subject.match(/\bDEL\d{4}[A-Z]{3}\d{3,10}\b/i);
  if (newFmt) return newFmt[0].toUpperCase();
  // Legacy format: DM-XXXX-XXXX
  const oldFmt = subject.match(/DM-\d{4}-\d{4}/i);
  return oldFmt ? oldFmt[0].toUpperCase() : null;
}

// ── Strip HTML to plain text ─────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Database Operations ──────────────────────────────────────

async function findDebitMemoByNumber(
  sb: ReturnType<typeof createClient>,
  memoNumber: string
): Promise<{ id: string; ra_status: string; ra_number: string | null } | null> {
  const { data, error } = await sb
    .from('debit_memos')
    .select('id, ra_status, ra_number')
    .eq('memo_number', memoNumber)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

async function updateRAReceived(
  sb: ReturnType<typeof createClient>,
  debitMemoId: string,
  raNumber: string
): Promise<boolean> {
  const { data, error } = await sb.rpc('ra_receive', {
    p_debit_memo_id: debitMemoId,
    p_ra_number: raNumber,
    p_pdf_url: null,
  });

  if (error) {
    console.error('ra_receive error:', error);
    return false;
  }
  if (data?.error) {
    console.error('ra_receive returned error:', data.message);
    return false;
  }
  return true;
}

async function logProcessedEmail(
  sb: ReturnType<typeof createClient>,
  record: {
    email_uid: string;
    email_message_id: string | null;
    from_address: string;
    to_address: string | null;
    subject: string;
    received_at: string | null;
    memo_number: string | null;
    debit_memo_id: string | null;
    extracted_ra_number: string | null;
    ai_confidence: number;
    ai_raw_response: Record<string, unknown>;
    status: string;
    error_message: string | null;
  }
) {
  const { error } = await sb.from('processed_inbox_emails').insert(record);
  if (error) {
    console.error('Failed to log processed email:', error.message);
  }
}

// ── Result interface ─────────────────────────────────────────

interface ProcessedResult {
  uid: string;
  messageId: string | null;
  from: string;
  subject: string;
  memoNumber: string | null;
  extractedRaNumber: string | null;
  confidence: number;
  status: 'matched' | 'updated' | 'already_received' | 'no_memo_found' | 'no_ra_found' | 'memo_not_in_db' | 'update_failed' | 'error';
  notes: string | null;
}

// ── Main Processing Logic ────────────────────────────────────

async function processEmails(maxEmails = 10, markAsRead = true): Promise<{
  processed: number;
  updated: number;
  results: ProcessedResult[];
}> {
  const timeout = 50000; // 50 seconds timeout for processing
  return Promise.race([
    processEmailsWithTimeout(maxEmails, markAsRead),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), timeout))
  ]);
}

async function processEmailsWithTimeout(maxEmails = 10, markAsRead = true): Promise<{
  processed: number;
  updated: number;
  results: ProcessedResult[];
}> {
  const results: ProcessedResult[] = [];
  let updated = 0;
  let client: ImapFlow | null = null;

  try {
    client = await connectImap();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for unread emails — look for RA-related replies
      // Gmail IMAP search: UNSEEN emails with subjects likely to be RA responses
      const uids = await client.search({
        seen: false,
      });

      if (!uids.length) {
        return { processed: 0, updated: 0, results: [] };
      }

      // Newest first (higher UID ≈ more recent on Gmail). Otherwise old unread
      // onboarding mail (UID 1–10) starves real RA replies forever — we never
      // mark no_memo_found as read, so the same messages are re-fetched every run.
      uids.sort((a, b) => Number(b) - Number(a));

      const emailsToProcess = uids.slice(0, Math.min(maxEmails, 5)); // Limit to 5 emails per run to avoid timeout
      const sb = getSupabase();
      const myAddress = env('IMAP_USER').toLowerCase();

      for (const uid of emailsToProcess) {
        const result: ProcessedResult = {
          uid: String(uid),
          messageId: null,
          from: '',
          subject: '',
          memoNumber: null,
          extractedRaNumber: null,
          confidence: 0,
          status: 'error',
          notes: null,
        };

        try {
          // Fetch the full message
          const msg = await client.fetchOne(uid, {
            source: true,
            envelope: true,
            uid: true,
          });

          if (!msg?.source) {
            result.notes = 'Could not fetch message source';
            results.push(result);
            continue;
          }

          // Parse the email
          const parsed = await simpleParser(msg.source);

          result.from = parsed.from?.value?.[0]?.address || '';
          result.subject = parsed.subject || '';
          result.messageId = parsed.messageId || null;

          // Skip our own outgoing emails
          if (result.from.toLowerCase() === myAddress) {
            result.status = 'error';
            result.notes = 'Skipped: own outgoing email';
            // Mark as read so we don't process it again
            if (markAsRead) {
              await client.messageFlagsAdd(uid, ['\\Seen']);
            }
            results.push(result);
            continue;
          }

          // Extract memo number from subject
          result.memoNumber = extractMemoNumber(result.subject);

          if (!result.memoNumber) {
            // Try to find memo number in the email body
            const bodyText = parsed.text || (parsed.html ? htmlToText(parsed.html) : '');
            const bodyNewFmt = bodyText.match(/\bDEL\d{4}[A-Z]{3}\d{3,10}\b/i);
            const bodyOldFmt = bodyText.match(/DM-\d{4}-\d{4}/i);
            const bodyMatch = bodyNewFmt ?? bodyOldFmt;
            result.memoNumber = bodyMatch ? bodyMatch[0].toUpperCase() : null;
          }

          if (!result.memoNumber) {
            result.status = 'no_memo_found';
            result.notes = 'No debit memo number found in email';
            // Don't mark as read — might be unrelated email
            results.push(result);
            continue;
          }

          // Look up the debit memo
          const memo = await findDebitMemoByNumber(sb, result.memoNumber);

          if (!memo) {
            result.status = 'memo_not_in_db';
            result.notes = `Memo ${result.memoNumber} not found in database`;
            if (markAsRead) {
              await client.messageFlagsAdd(uid, ['\\Seen']);
            }
            await logProcessedEmail(sb, {
              email_uid: String(uid),
              email_message_id: result.messageId,
              from_address: result.from,
              to_address: myAddress,
              subject: result.subject,
              received_at: parsed.date?.toISOString() || null,
              memo_number: result.memoNumber,
              debit_memo_id: null,
              extracted_ra_number: null,
              ai_confidence: 0,
              ai_raw_response: {},
              status: 'memo_not_in_db',
              error_message: result.notes,
            });
            results.push(result);
            continue;
          }

          // Skip if RA already received for this memo
          if (memo.ra_number && memo.ra_status === 'received') {
            result.status = 'already_received';
            result.extractedRaNumber = memo.ra_number;
            result.notes = `RA already received: ${memo.ra_number}`;
            if (markAsRead) {
              await client.messageFlagsAdd(uid, ['\\Seen']);
            }
            await logProcessedEmail(sb, {
              email_uid: String(uid),
              email_message_id: result.messageId,
              from_address: result.from,
              to_address: myAddress,
              subject: result.subject,
              received_at: parsed.date?.toISOString() || null,
              memo_number: result.memoNumber,
              debit_memo_id: memo.id,
              extracted_ra_number: memo.ra_number,
              ai_confidence: 1,
              ai_raw_response: {},
              status: 'already_received',
              error_message: null,
            });
            results.push(result);
            continue;
          }

          // Use Azure OpenAI to extract RA number from email body
          const bodyText = parsed.text || (parsed.html ? htmlToText(parsed.html) : '');
          const aiResult = await extractRAFromEmail(result.subject, bodyText);

          result.extractedRaNumber = aiResult.ra_number;
          result.confidence = aiResult.confidence;
          result.notes = aiResult.notes;

          if (!aiResult.ra_number) {
            result.status = 'no_ra_found';
            if (markAsRead) {
              await client.messageFlagsAdd(uid, ['\\Seen']);
            }
            await logProcessedEmail(sb, {
              email_uid: String(uid),
              email_message_id: result.messageId,
              from_address: result.from,
              to_address: myAddress,
              subject: result.subject,
              received_at: parsed.date?.toISOString() || null,
              memo_number: result.memoNumber,
              debit_memo_id: memo.id,
              extracted_ra_number: null,
              ai_confidence: aiResult.confidence,
              ai_raw_response: aiResult as unknown as Record<string, unknown>,
              status: 'no_ra_found',
              error_message: 'AI could not extract RA number',
            });
            results.push(result);
            continue;
          }

          // Update the database with the RA number
          const updateSuccess = await updateRAReceived(sb, memo.id, aiResult.ra_number);

          if (updateSuccess) {
            result.status = 'updated';
            updated++;
            console.log(
              `✅ RA updated: memo=${result.memoNumber}, ra=${aiResult.ra_number}, confidence=${aiResult.confidence}`
            );
          } else {
            result.status = 'update_failed';
            result.notes = 'Database update failed';
          }

          // Mark as read
          if (markAsRead) {
            await client.messageFlagsAdd(uid, ['\\Seen']);
          }

          // Log to database
          await logProcessedEmail(sb, {
            email_uid: String(uid),
            email_message_id: result.messageId,
            from_address: result.from,
            to_address: myAddress,
            subject: result.subject,
            received_at: parsed.date?.toISOString() || null,
            memo_number: result.memoNumber,
            debit_memo_id: memo.id,
            extracted_ra_number: aiResult.ra_number,
            ai_confidence: aiResult.confidence,
            ai_raw_response: aiResult as unknown as Record<string, unknown>,
            status: updateSuccess ? 'updated' : 'update_failed',
            error_message: updateSuccess ? null : 'Database update failed',
          });

          results.push(result);
        } catch (emailErr: any) {
          result.status = 'error';
          result.notes = emailErr.message;
          console.error(`Error processing email UID ${uid}:`, emailErr.message);
          results.push(result);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (connErr: any) {
    console.error('IMAP connection error:', connErr.message);
    throw connErr;
  }

  return { processed: results.length, updated, results };
}

// ── HTTP Handler ─────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let maxEmails = 5; // Reduced default to prevent CPU timeout
    let markAsRead = true;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        maxEmails = body.maxEmails ?? 5; // Reduced default to prevent CPU timeout
        markAsRead = body.markAsRead ?? true;
      } catch {
        // Empty body is fine, use defaults
      }
    }

    console.log(`Processing up to ${maxEmails} emails, markAsRead=${markAsRead}`);

    const result = await processEmails(maxEmails, markAsRead);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('read-ra-emails error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
