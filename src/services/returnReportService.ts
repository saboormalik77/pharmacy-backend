import pdf from 'pdf-parse';
import { client, deployment } from '../config/azureOpenAI';
import { AppError } from '../utils/appError';
import { supabaseAdmin } from '../config/supabase';
import { verifyPharmacyStatus } from '../middleware/auth';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

// Azure Document Intelligence Configuration
const AZURE_DOCUMENT_ENDPOINT = process.env.AZURE_DOCUMENT_ENDPOINT;
const AZURE_DOCUMENT_API_KEY = process.env.AZURE_DOCUMENT_API_KEY;
const AZURE_DOCUMENT_API_VERSION = process.env.AZURE_DOCUMENT_API_VERSION || '2023-10-31-preview';

// Validate required environment variables
if (!AZURE_DOCUMENT_ENDPOINT) {
  throw new Error('AZURE_DOCUMENT_ENDPOINT environment variable is required. Please set it in .env.local');
}
if (!AZURE_DOCUMENT_API_KEY) {
  throw new Error('AZURE_DOCUMENT_API_KEY environment variable is required. Please set it in .env.local');
}

export interface ReverseDistributorInfo {
  name?: string; // Name of the reverse distributor company
  contactEmail?: string; // Contact email address
  contactPhone?: string; // Contact phone number
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    [key: string]: any;
  };
  portalUrl?: string; // Portal/website URL
  supportedFormats?: string[]; // Supported file formats (e.g., ["PDF", "CSV"])
  serviceFee?: {
    percentage?: number; // Service fee percentage (e.g., 13.4 for 13.4%)
    paymentPeriodDays?: number; // Payment period in days (e.g., 30, 60, 90)
  };
  reportDate?: string; // Report date from the document (YYYY-MM-DD format) - used for fee rate tracking
}

export interface ReturnReportData {
  reverseDistributor?: string; // Name of the reverse distributor company (for backward compatibility)
  reverseDistributorInfo?: ReverseDistributorInfo; // Detailed distributor information
  pharmacy?: string; // Pharmacy name (if available)
  reportDate?: string; // Date of the credit report (YYYY-MM-DD format)
  creditReportNumber?: string; // Report/credit number/reference number
  items?: Array<{
    ndcCode?: string; // NDC code (National Drug Code) - CRITICAL for price comparison
    itemName?: string; // Product/item name
    manufacturer?: string; // Manufacturer information
    lotNumber?: string; // Lot/batch number
    expirationDate?: string; // Expiration date (YYYY-MM-DD format)
    quantity?: number; // Quantity returned (calculated as: full + partial)
    creditAmount?: number; // Credit amount/payment for this product
    pricePerUnit?: number; // Calculated: creditAmount / quantity
    full?: number; // Number of full packages (numeric value)
    partial?: number; // Number of partial packages (numeric value)
    pkgSz?: string | number; // Package size
    caseSz?: string | number; // Case size
  }>;
  totalCreditAmount?: number; // Total credit amount for the entire report
  totalItems?: number; // Total number of items in the report
  [key: string]: any;
}

/**
 * Submit PDF to Azure Document Intelligence for text extraction
 */
const submitDocumentToAzure = async (pdfBuffer: Buffer): Promise<string> => {
  if (!AZURE_DOCUMENT_API_KEY) {
    throw new Error('Azure Document Intelligence API key not configured');
  }

  const analyzeUrl = `${AZURE_DOCUMENT_ENDPOINT}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${AZURE_DOCUMENT_API_VERSION}`;
  
  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_API_KEY,
    },
    body: pdfBuffer as any
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Document Intelligence API error: ${response.status} - ${errorText}`);
  }

  const operationLocation = response.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No operation location returned from Azure Document Intelligence');
  }

  return operationLocation;
};

/**
 * Poll for Azure Document Intelligence analysis results
 */
const pollAzureResults = async (operationLocation: string): Promise<any> => {
  if (!AZURE_DOCUMENT_API_KEY) {
    throw new Error('Azure Document Intelligence API key not configured');
  }

  let attempts = 0;
  const maxAttempts = 60; // Max 60 attempts (about 2 minutes)
  const pollInterval = 2000; // Poll every 2 seconds

  while (attempts < maxAttempts) {
    attempts++;
    
    const response = await fetch(operationLocation, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_API_KEY,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get analysis results: ${response.status} - ${errorText}`);
    }

    const result: any = await response.json();

    if (result.status === 'succeeded') {
      return result.analyzeResult;
    }

    if (result.status === 'failed') {
      throw new Error(`Document analysis failed: ${result.error?.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Analysis timed out after 2 minutes');
};

/**
 * Extract text from PDF using Azure Document Intelligence
 * Falls back to pdf-parse if Azure is not configured or fails
 */
export const extractTextFromPDF = async (pdfBuffer: Buffer): Promise<string> => {
  try {
    // Try Azure Document Intelligence first if configured
    if (AZURE_DOCUMENT_API_KEY) {
      console.log('📤 Using Azure Document Intelligence for PDF extraction...');
      const operationLocation = await submitDocumentToAzure(pdfBuffer);
      const analyzeResult = await pollAzureResults(operationLocation);
      
      // Extract raw text from Azure results
      if (analyzeResult.content) {
        console.log('✅ Successfully extracted text using Azure Document Intelligence');
        return analyzeResult.content;
      }
    }
  } catch (azureError: any) {
    console.warn('⚠️ Azure Document Intelligence failed, falling back to pdf-parse:', azureError.message);
  }

  // Fallback to pdf-parse
  try {
    console.log('📄 Using pdf-parse for PDF extraction...');
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error: any) {
    throw new AppError(`Failed to extract text from PDF: ${error.message}`, 400);
  }
};

// Extract PDF text in chunks with minimal overlap to ensure no data is missed
export const extractTextFromPDFChunks = async (pdfBuffer: Buffer, pagesPerChunk: number = 3): Promise<Array<{ chunkIndex: number; text: string; pageRange: string }>> => {
  try {
    // Try Azure Document Intelligence first if configured
    let totalText: string;
    let totalPages: number;

    if (AZURE_DOCUMENT_API_KEY) {
      try {
        console.log('📤 Using Azure Document Intelligence for PDF extraction in chunks...');
        const operationLocation = await submitDocumentToAzure(pdfBuffer);
        const analyzeResult = await pollAzureResults(operationLocation);
        
        // Extract raw text from Azure results
        if (analyzeResult.content) {
          totalText = analyzeResult.content;
          totalPages = analyzeResult.pages?.length || 1;
          console.log('✅ Successfully extracted text using Azure Document Intelligence');
        } else {
          throw new Error('No content in Azure analysis result');
        }
      } catch (azureError: any) {
        console.warn('⚠️ Azure Document Intelligence failed, falling back to pdf-parse:', azureError.message);
        // Fallback to pdf-parse
        const data = await pdf(pdfBuffer);
        totalText = data.text;
        totalPages = data.numpages;
      }
    } else {
      // Use pdf-parse if Azure is not configured
      console.log('📄 Using pdf-parse for PDF extraction...');
      const data = await pdf(pdfBuffer);
      totalText = data.text;
      totalPages = data.numpages;
    }
    const chunks: Array<{ chunkIndex: number; text: string; pageRange: string }> = [];
    
    // Estimate characters per page
    const estimatedCharsPerPage = totalPages > 0 ? Math.ceil(totalText.length / totalPages) : 2500;
    const charsPerChunk = estimatedCharsPerPage * pagesPerChunk;
    // Minimal overlap: only 2% or max 200 chars to minimize duplicate data across chunks
    // This ensures chunks are mostly distinct while still catching items that span boundaries
    const overlapSize = Math.min(200, Math.floor(charsPerChunk * 0.02)); // 2% overlap or max 200 chars
    const estimatedTotalPages = totalPages || Math.ceil(totalText.length / estimatedCharsPerPage);
    
    // Helper function to find the best break point (prefer table row boundaries, item boundaries)
    const findBestBreakPoint = (startIndex: number, targetEndIndex: number): number => {
      const searchWindow = Math.min(3000, targetEndIndex - startIndex); // Search up to 3000 chars back
      const searchStart = Math.max(startIndex, targetEndIndex - searchWindow);
      
      // Priority 1: Look for patterns that indicate item boundaries (NDC codes, table rows)
      // Pattern: newline followed by NDC-like pattern (digits-dashes) or clear item separators
      const itemBoundaryPattern = /\n\s*(\d{4,5}-\d{3,5}-\d{2,3}|\d{8,11})/;
      let bestMatch = -1;
      
      // Search backwards from target end for item boundaries
      for (let i = targetEndIndex; i >= searchStart; i--) {
        const remaining = totalText.substring(i, Math.min(i + 100, totalText.length));
        if (itemBoundaryPattern.test(remaining)) {
          bestMatch = i;
          break;
        }
      }
      
      // Priority 2: Look for double newlines (paragraph breaks)
      if (bestMatch === -1) {
        const doubleNewlineIndex = totalText.lastIndexOf('\n\n', targetEndIndex);
        if (doubleNewlineIndex > searchStart) {
          bestMatch = doubleNewlineIndex + 2;
        }
      }
      
      // Priority 3: Look for single newline followed by whitespace (likely table row)
      if (bestMatch === -1) {
        const newlineIndex = totalText.lastIndexOf('\n', targetEndIndex);
        if (newlineIndex > searchStart && newlineIndex < targetEndIndex - 50) {
          // Check if next 50 chars look like a table row (has multiple spaces or tabs)
          const nextChars = totalText.substring(newlineIndex, Math.min(newlineIndex + 50, totalText.length));
          if (/\s{3,}/.test(nextChars)) {
            bestMatch = newlineIndex + 1;
          }
        }
      }
      
      // If no good break point found, use target end (but try to avoid cutting mid-word)
      if (bestMatch === -1) {
        // Try to break at word boundary (space or punctuation)
        for (let i = targetEndIndex; i >= searchStart && i >= targetEndIndex - 200; i--) {
          const char = totalText[i];
          if (char === ' ' || char === '\t' || char === '\n' || /[.,;:]/.test(char)) {
            bestMatch = i + 1;
            break;
          }
        }
        if (bestMatch === -1) {
          bestMatch = targetEndIndex;
        }
      }
      
      return bestMatch;
    };
    
    // Split text into chunks with overlap
    let currentIndex = 0;
    let chunkIndex = 0;
    
    while (currentIndex < totalText.length) {
      const targetChunkEnd = Math.min(currentIndex + charsPerChunk, totalText.length);
      
      // Find the best break point near the target end
      let actualChunkEnd = findBestBreakPoint(currentIndex, targetChunkEnd);
      
      // Ensure we don't go past the end
      actualChunkEnd = Math.min(actualChunkEnd, totalText.length);
      
      // Extract chunk text
      const chunkText = totalText.substring(currentIndex, actualChunkEnd);
      
      // Calculate page range
      const estimatedStartPage = Math.floor(currentIndex / estimatedCharsPerPage) + 1;
      const estimatedEndPage = Math.min(Math.ceil(actualChunkEnd / estimatedCharsPerPage), estimatedTotalPages);
      
      chunks.push({
        chunkIndex: chunkIndex,
        text: chunkText,
        pageRange: `Pages ${estimatedStartPage}-${estimatedEndPage} (chunk ${chunkIndex + 1})`,
      });
      
      // Move to next chunk with minimal overlap (go back by overlap size to ensure nothing is missed)
      if (actualChunkEnd >= totalText.length) {
        break; // Last chunk
      }
      
      // Start next chunk with minimal overlap - ensure we make at least 95% progress to minimize duplication
      // Only use overlap if we're near the end of the document or if we need to catch boundary items
      const minProgress = Math.floor(charsPerChunk * 0.95); // Must make at least 95% progress
      const overlapStart = actualChunkEnd - overlapSize;
      // Use the maximum of: (end - small overlap) or (start + 95% of chunk size) to ensure progress
      const nextChunkStart = Math.max(overlapStart, currentIndex + minProgress);
      currentIndex = Math.floor(nextChunkStart);
      chunkIndex++;
    }
    
    console.log(`📄 PDF split into ${chunks.length} chunks (${pagesPerChunk} pages per chunk, ${totalPages || estimatedTotalPages} total pages, ~${Math.round(estimatedCharsPerPage)} chars/page, ${Math.round(overlapSize)} chars overlap)`);
    return chunks;
  } catch (error: any) {
    throw new AppError(`Failed to extract text from PDF in chunks: ${error.message}`, 400);
  }
};

// Helper function to remove empty arrays and objects from chunk results
const cleanChunkResult = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (Array.isArray(data)) {
    const filtered = data.map(cleanChunkResult).filter(item => item !== null && item !== undefined);
    return filtered.length > 0 ? filtered : null;
  }
  
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(data)) {
      const cleanedValue = cleanChunkResult(data[key]);
      // Only keep non-null, non-empty values
      if (cleanedValue !== null && cleanedValue !== undefined) {
        if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
          continue; // Skip empty arrays
        }
        if (typeof cleanedValue === 'object' && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0) {
          continue; // Skip empty objects
        }
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }
  
  // Return primitive values as-is
  return data;
};

// Comprehensive JSON repair function (shared between extraction functions)
const repairJson = (jsonString: string): string => {
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  // Step 1: Escape unescaped newlines and special characters in strings
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const prevChar = i > 0 ? jsonString[i - 1] : '';
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString && (char === '\n' || char === '\r')) {
      if (char === '\r' && jsonString[i + 1] === '\n') {
        result += '\\r\\n';
        i++;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      }
    } else {
      result += char;
    }
  }
  
  // Step 2: Remove trailing commas before closing braces/brackets
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  // Step 3: Remove any whitespace between key structural elements
  // This helps with cases where there's unexpected whitespace
  result = result.replace(/,\s*([}\]])/g, '$1');
  
  // Step 4: Try to fix incomplete arrays/objects at the end
  // Count opening and closing braces/brackets
  let openBraces = (result.match(/\{/g) || []).length;
  let closeBraces = (result.match(/\}/g) || []).length;
  let openBrackets = (result.match(/\[/g) || []).length;
  let closeBrackets = (result.match(/\]/g) || []).length;
  
  // Add missing closing brackets/braces if needed
  while (closeBrackets < openBrackets) {
    result += ']';
    closeBrackets++;
  }
  while (closeBraces < openBraces) {
    result += '}';
    closeBraces++;
  }
  
  return result;
};

// Extract structured data from a single chunk (returns JSON only, no explanations)
export const extractStructuredDataFromChunk = async (
  pdfText: string,
  chunkIndex: number,
  isFirstChunk: boolean = false
): Promise<Partial<ReturnReportData>> => {
  try {
    // Increased max tokens to 40000 to ensure all items can be extracted from large chunks
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '40000', 10);

    const systemPrompt = `You are a JSON extraction expert for pharmacy credit reports. You MUST extract EVERY item you see - do not skip any.

CRITICAL: Extract ALL items from this chunk. Even if an item is partially visible or at the chunk boundary, extract it. Do NOT skip items.

Return data in this EXACT structure:

{
  "reverseDistributor": null,
  "reverseDistributorInfo": {
    "name": null,
    "contactEmail": null,
    "contactPhone": null,
    "address": {
      "street": null,
      "city": null,
      "state": null,
      "zipCode": null,
      "country": null
    },
    "portalUrl": null,
    "supportedFormats": null,
    "serviceFee": {
      "percentage": null,
      "paymentPeriodDays": null
    }
  },
  "pharmacy": null,
  "reportDate": null,
  "creditReportNumber": null,
  "items": [
    {
      "ndcCode": null,
      "itemName": null,
      "manufacturer": null,
      "lotNumber": null,
      "expirationDate": null,
      "quantity": null,
      "creditAmount": null,
      "pricePerUnit": null,
      "full": null,
      "partial": null,
      "pkgSz": null,
      "caseSz": null
    }
  ],
  "totalCreditAmount": null,
  "totalItems": null
}

EXTRACTION RULES:
1. Extract EVERY item you see in the chunk - do not skip any
2. If an item is partially visible (e.g., cut off at chunk boundary), extract what you can see
3. Only include items with manufacturer, pricePerUnit, and expirationDate (all three required)
4. Calculate pricePerUnit = creditAmount / quantity if needed
5. Convert dates to YYYY-MM-DD format
6. NDC format: XXXXX-XXXX-XX

7. *** SERVICE FEE EXTRACTION - CRITICAL ***
   Look for the ACTUAL service fee/rate information in the document (NOT examples):
   
   EXTRACT FROM text like:
   - "Base service rate: X%. You elected to have your check issued within Y days from the above date."
   - This is typically near the top of the document, describing YOUR actual terms
   
   Pattern to extract:
   - "Base service rate: X%" → extract X as percentage (e.g., 9.4, 13.4, 15.0)
   - "elected to have your check issued within Y days" → extract Y as paymentPeriodDays (30, 60, or 90)
   
   *** DO NOT EXTRACT FROM EXAMPLES ***
   IGNORE any text that contains:
   - "Example of how the program works"
   - "for demonstration purposes"
   - "used for demonstration purposes only"
   - "Here's how it works" followed by example calculations
   - Text that shows hypothetical scenarios like "$10,000 of product"
   
   The REAL rate is typically stated clearly near the beginning:
   "Base service rate: 9.4%. You elected to have your check issued within 90 days from the above date."
   → percentage: 9.4, paymentPeriodDays: 90
   
   If you can't find the actual rate (only examples), set both to null

7. *** CRITICAL - FULL AND PARTIAL EXTRACTION ***
   
   Look at the PDF table columns. Find columns that indicate package counts:
   - "Full" / "FULL" / "Full Pkg" / "Full Packages" / "Full Units" / "Qty Full"
   - "Partial" / "PARTIAL" / "Part" / "Partial Pkg" / "Partial Units" / "Qty Partial"
   
   These columns contain NUMBERS showing how many full/partial packages for each item.
   
   STEP 1: Identify the column positions from the header row
   STEP 2: For EACH item row, read the NUMBER in those columns
   
   Example PDF table structure:
   | NDC | Description | Full | Partial | Pkg Sz | Credit |
   |-----|-------------|------|---------|--------|--------|
   | xxx | Item A      |  5   |    2    |  100   | $50.00 |
   | xxx | Item B      |  0   |   10    |   50   | $75.00 |
   | xxx | Item C      |  3   |    0    |  200   | $30.00 |
   
   From above: Item A has full=5, partial=2; Item B has full=0, partial=10; etc.
   
   *** DO NOT return full=1, partial=0 for every row - that's WRONG ***
   If columns not found, use null.
   - pkgSz: string or number (Package Size - extract as found, can be text like "100", "50ml", etc.)
   - caseSz: string or number (Case Size - extract as found, can be text like "12", "24", etc.)
   - quantity: Will be calculated as full + partial automatically, but you can also extract it directly if shown
8. Use null for missing values (literal null, not string "null")
9. If running out of tokens, complete the current item properly, then close arrays/objects with ] and }

CRITICAL - JSON VALIDITY:
- You MUST return ONLY valid JSON - no text before or after
- NO trailing commas (e.g., {"field": "value",} is INVALID)
- NO unescaped quotes or newlines in strings
- Test mentally: your response must be parseable by JSON.parse() with ZERO modifications

REMEMBER: Extract ALL items - completeness is more important than perfection.`;

    const userPrompt = `Extract all data from this chunk (chunk ${chunkIndex + 1}) of a pharmacy return report and return as JSON:\n\n${pdfText}`;

    const response = await client.chat.completions.create({
      model: deployment as string,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.0, // Zero temperature for most deterministic/consistent JSON output
      response_format: { type: 'json_object' } as any,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError('No response from Azure OpenAI', 500);
    }

    // Check if response was truncated (finish_reason === 'length' means max_tokens was reached)
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === 'length') {
      console.warn(`⚠️  WARNING: Chunk ${chunkIndex + 1} response was truncated (max_tokens reached). Some items may be missing. Consider increasing max_tokens.`);
    }

    // Parse JSON - Azure OpenAI with response_format json_object should return valid JSON
    let jsonData: Partial<ReturnReportData>;
    try {
      // Simply parse the content - it should already be valid JSON from Azure OpenAI
      jsonData = JSON.parse(content);
    } catch (parseError: any) {
      // If parsing fails, log detailed error information
      console.error(`❌ JSON Parse Error in chunk ${chunkIndex + 1}:`, parseError.message);
      console.error(`❌ Raw content length:`, content.length);
      console.error(`❌ Content (first 300 chars):`, content.substring(0, 300));
      
      const errorPosition = parseError.message.match(/position (\d+)/)?.[1];
      if (errorPosition) {
        const pos = parseInt(errorPosition);
        const start = Math.max(0, pos - 150);
        const end = Math.min(content.length, pos + 150);
        console.error(`❌ Content around error position ${pos}:`, content.substring(start, end));
      }
      
      // Last resort: try to repair only if absolutely necessary
      try {
        console.log(`⚠️  Attempting minimal repair for chunk ${chunkIndex + 1}...`);
        const repaired = repairJson(content);
        jsonData = JSON.parse(repaired);
        console.log(`✅ Chunk ${chunkIndex + 1} repaired successfully`);
      } catch (repairError: any) {
        throw new AppError(
          `Chunk ${chunkIndex + 1}: Azure OpenAI returned invalid JSON. Original error: ${parseError.message}. Repair failed: ${repairError.message}`,
          500
        );
      }
    }

    return jsonData;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract structured data from chunk: ${error.message}`, 500);
  }
};

/**
 * Normalize item fields to match the expected interface structure
 * Handles variations like "ndc" vs "ndcCode", "productDescription" vs "itemName"
 * Converts null values to undefined to match the interface
 */
const normalizeItem = (item: any): {
  ndcCode?: string;
  itemName?: string;
  manufacturer?: string;
  lotNumber?: string;
  expirationDate?: string;
  quantity?: number;
  creditAmount?: number;
  pricePerUnit?: number;
  full?: number;
  partial?: number;
  pkgSz?: string | number;
  caseSz?: string | number;
} => {
  // Extract full and partial as numbers - preserve actual values from PDF
  // If AI couldn't find values, they will be null/undefined
  const fullValue = item.full !== undefined && item.full !== null 
    ? (typeof item.full === 'number' ? item.full : Number(item.full))
    : null;
  const partialValue = item.partial !== undefined && item.partial !== null 
    ? (typeof item.partial === 'number' ? item.partial : Number(item.partial))
    : null;

  // Log extracted values for debugging
  if (item.ndcCode || item.ndc) {
    console.log(`📊 Item ${item.ndcCode || item.ndc}: Full=${fullValue}, Partial=${partialValue}`);
  }

  // Calculate quantity as full + partial (only if both are valid numbers)
  const calculatedQuantity = (fullValue !== null ? fullValue : 0) + (partialValue !== null ? partialValue : 0);

  const normalized: {
    ndcCode?: string;
    itemName?: string;
    manufacturer?: string;
    lotNumber?: string;
    expirationDate?: string;
    quantity?: number;
    creditAmount?: number;
    pricePerUnit?: number;
    full?: number;
    partial?: number;
    pkgSz?: string | number;
    caseSz?: string | number;
  } = {
    ndcCode: item.ndcCode || item.ndc || undefined,
    itemName: item.itemName || item.productDescription || undefined,
    manufacturer: item.manufacturer || undefined,
    lotNumber: item.lotNumber || undefined,
    expirationDate: item.expirationDate || undefined,
    // Use calculated quantity (full + partial) if available, otherwise use extracted quantity
    quantity: calculatedQuantity > 0 ? calculatedQuantity : (item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : undefined),
    creditAmount: item.creditAmount !== undefined && item.creditAmount !== null ? Number(item.creditAmount) : undefined,
    pricePerUnit: item.pricePerUnit !== undefined && item.pricePerUnit !== null ? Number(item.pricePerUnit) : undefined,
    full: fullValue !== null && !isNaN(fullValue) ? fullValue : undefined,
    partial: partialValue !== null && !isNaN(partialValue) ? partialValue : undefined,
    pkgSz: item.pkgSz !== undefined && item.pkgSz !== null ? (typeof item.pkgSz === 'number' ? item.pkgSz : item.pkgSz) : undefined,
    caseSz: item.caseSz !== undefined && item.caseSz !== null ? (typeof item.caseSz === 'number' ? item.caseSz : item.caseSz) : undefined,
  };
  
  // Calculate pricePerUnit using the formula: pricePerUnit = creditAmount / quantity
  // Where quantity = full + partial (already calculated above)
  // Always recalculate to ensure accuracy with calculated quantity
  if (normalized.creditAmount && normalized.quantity && normalized.quantity > 0) {
    normalized.pricePerUnit = Math.round((normalized.creditAmount / normalized.quantity) * 100) / 100;
  } else if (normalized.creditAmount && calculatedQuantity > 0) {
    // Fallback: use calculated quantity if normalized.quantity is not set
    normalized.pricePerUnit = Math.round((normalized.creditAmount / calculatedQuantity) * 100) / 100;
    normalized.quantity = calculatedQuantity;
  }
  
  return normalized;
};

// Merge all chunk results programmatically (no AI - more reliable and faster)
// Custom TypeScript function that handles all merge rules and field normalization
export const mergeChunkResults = (chunkResults: Array<Partial<ReturnReportData>>): ReturnReportData => {
  console.log(`🔀 Programmatically merging ${chunkResults.length} chunks (custom TS function, no AI)...`);
  
  // Track statistics for logging
  let totalItemsBeforeMerge = 0;
  let totalItemsAfterFilter = 0;
  let totalItemsAfterDedup = 0;
  
  // Initialize merged data with empty values
  const mergedData: ReturnReportData = {
    reverseDistributor: undefined,
    reverseDistributorInfo: undefined,
    pharmacy: undefined,
    reportDate: undefined,
    creditReportNumber: undefined,
    items: [],
    totalCreditAmount: 0,
    totalItems: 0,
  };
  
  // Merge all chunks
  for (let chunkIdx = 0; chunkIdx < chunkResults.length; chunkIdx++) {
    const chunk = chunkResults[chunkIdx];
    if (!chunk) {
      console.warn(`⚠️  Chunk ${chunkIdx + 1} is null or undefined, skipping...`);
      continue;
    }
    
    const chunkItemCount = chunk.items?.length || 0;
    totalItemsBeforeMerge += chunkItemCount;
    
    if (chunkItemCount > 0) {
      console.log(`  📦 Chunk ${chunkIdx + 1}: Adding ${chunkItemCount} items to merge pool`);
    }
    
    // Merge distributor info (use first non-null value found, but prefer more complete data)
    if (chunk.reverseDistributor) {
      if (!mergedData.reverseDistributor) {
        mergedData.reverseDistributor = chunk.reverseDistributor;
      } else if (chunk.reverseDistributor.length > mergedData.reverseDistributor.length) {
        // Prefer longer/more complete distributor name
        mergedData.reverseDistributor = chunk.reverseDistributor;
      }
    }
    
    // Merge distributor info object (merge fields from all chunks, prefer more complete data)
    if (chunk.reverseDistributorInfo) {
      if (!mergedData.reverseDistributorInfo) {
        mergedData.reverseDistributorInfo = { ...chunk.reverseDistributorInfo };
      } else {
        // Merge individual fields - prefer non-null values, and longer/more complete values
        const info = mergedData.reverseDistributorInfo;
        const chunkInfo = chunk.reverseDistributorInfo;
        
        if (chunkInfo.name && (!info.name || chunkInfo.name.length > info.name.length)) {
          info.name = chunkInfo.name;
        }
        if (chunkInfo.contactEmail && (!info.contactEmail || chunkInfo.contactEmail.length > info.contactEmail.length)) {
          info.contactEmail = chunkInfo.contactEmail;
        }
        if (chunkInfo.contactPhone && (!info.contactPhone || chunkInfo.contactPhone.length > info.contactPhone.length)) {
          info.contactPhone = chunkInfo.contactPhone;
        }
        if (chunkInfo.portalUrl && (!info.portalUrl || chunkInfo.portalUrl.length > info.portalUrl.length)) {
          info.portalUrl = chunkInfo.portalUrl;
        }
        if (chunkInfo.supportedFormats && (!info.supportedFormats || chunkInfo.supportedFormats.length > info.supportedFormats.length)) {
          info.supportedFormats = chunkInfo.supportedFormats;
        }
        
        // Merge serviceFee - prefer non-null values
        if (chunkInfo.serviceFee) {
          if (!info.serviceFee) {
            info.serviceFee = { ...chunkInfo.serviceFee };
          } else {
            // Merge individual fields, prefer non-null values
            if (chunkInfo.serviceFee.percentage !== null && chunkInfo.serviceFee.percentage !== undefined) {
              info.serviceFee.percentage = chunkInfo.serviceFee.percentage;
            }
            if (chunkInfo.serviceFee.paymentPeriodDays !== null && chunkInfo.serviceFee.paymentPeriodDays !== undefined) {
              info.serviceFee.paymentPeriodDays = chunkInfo.serviceFee.paymentPeriodDays;
            }
          }
        }
        
        // Merge address - prefer more complete addresses
        if (chunkInfo.address) {
          if (!info.address) {
            info.address = { ...chunkInfo.address };
          } else {
            // Count non-null fields to determine which address is more complete
            const existingFields = Object.values(info.address).filter(v => v !== null && v !== undefined).length;
            const newFields = Object.values(chunkInfo.address).filter(v => v !== null && v !== undefined).length;
            
            if (newFields > existingFields) {
              // New address is more complete, merge it
              info.address = { ...info.address, ...chunkInfo.address };
            } else {
              // Merge individual fields, prefer non-null values
              if (!info.address.street && chunkInfo.address.street) info.address.street = chunkInfo.address.street;
              if (!info.address.city && chunkInfo.address.city) info.address.city = chunkInfo.address.city;
              if (!info.address.state && chunkInfo.address.state) info.address.state = chunkInfo.address.state;
              if (!info.address.zipCode && chunkInfo.address.zipCode) info.address.zipCode = chunkInfo.address.zipCode;
              if (!info.address.country && chunkInfo.address.country) info.address.country = chunkInfo.address.country;
            }
          }
        }
      }
    }
    
    // Merge pharmacy name (use first non-null value, prefer longer/more complete)
    if (chunk.pharmacy) {
      if (!mergedData.pharmacy) {
        mergedData.pharmacy = chunk.pharmacy;
      } else if (chunk.pharmacy.length > mergedData.pharmacy.length) {
        mergedData.pharmacy = chunk.pharmacy;
      }
    }
    
    // Merge report date (use first non-null value)
    if (!mergedData.reportDate && chunk.reportDate) {
      mergedData.reportDate = chunk.reportDate;
    }
    
    // Merge credit report number (use first non-null value)
    if (!mergedData.creditReportNumber && chunk.creditReportNumber) {
      mergedData.creditReportNumber = chunk.creditReportNumber;
    }
    
    // Normalize and merge items array (normalize field names first, then concatenate - duplicates will be removed later)
    if (chunk.items && chunk.items.length > 0) {
      // Normalize all items in this chunk to ensure consistent field names
      const normalizedItems = chunk.items.map(item => normalizeItem(item));
      mergedData.items = [...(mergedData.items || []), ...normalizedItems];
    }
  }
  
  console.log(`📊 Merge statistics: ${totalItemsBeforeMerge} total items collected from all chunks`);
  
  // Filter out items with null manufacturer, pricePerUnit, or expirationDate
  if (mergedData.items && mergedData.items.length > 0) {
    const originalCount = mergedData.items.length;
    const filteredItems = mergedData.items.filter(item => {
      return item.manufacturer !== null && 
             item.manufacturer !== undefined && 
             item.pricePerUnit !== null && 
             item.pricePerUnit !== undefined &&
             item.expirationDate !== null && 
             item.expirationDate !== undefined;
    });
    
    totalItemsAfterFilter = filteredItems.length;
    
    if (originalCount !== filteredItems.length) {
      console.log(`🧹 Filtered out ${originalCount - filteredItems.length} items with null manufacturer, pricePerUnit, or expirationDate`);
      console.log(`   📊 Items after filter: ${filteredItems.length} (from ${originalCount} total)`);
    }
    
    // Deduplicate items (due to chunk overlap, same item might appear in multiple chunks)
    // Use NDC + lotNumber + expirationDate as unique key
    // Improved: Also consider quantity and creditAmount to better identify duplicates
    const itemMap = new Map<string, typeof mergedData.items[0]>();
    let duplicatesRemoved = 0;
    
    for (const item of filteredItems) {
      // Create unique key: NDC + lotNumber + expirationDate
      // Normalize NDC code (remove dashes/spaces for comparison)
      // Handle both ndcCode and ndc field names
      const ndcValue = item.ndcCode || (item as any).ndc || 'NO_NDC';
      const normalizedNdc = String(ndcValue).replace(/[-\s]/g, '').toUpperCase();
      const normalizedLot = (item.lotNumber || 'NO_LOT').trim().toUpperCase();
      const normalizedExp = (item.expirationDate || 'NO_EXP').trim();
      const key = `${normalizedNdc}_${normalizedLot}_${normalizedExp}`;
      
      if (itemMap.has(key)) {
        // Item already exists - keep the one with more complete data
        const existing = itemMap.get(key)!;
        
        // Calculate completeness score (number of non-null fields)
        const existingCompleteness = Object.values(existing).filter(v => v !== null && v !== undefined && v !== '').length;
        const newCompleteness = Object.values(item).filter(v => v !== null && v !== undefined && v !== '').length;
        
        // Also check if quantities/amounts match (if they differ significantly, might be different items)
        const existingQty = existing.quantity || 0;
        const newQty = item.quantity || 0;
        const existingCredit = existing.creditAmount || 0;
        const newCredit = item.creditAmount || 0;
        
        // If quantities/credits are very different, might be different items - keep both by modifying key
        if (Math.abs(existingQty - newQty) > 0.01 || Math.abs(existingCredit - newCredit) > 0.01) {
          // Different quantities/amounts - might be different items, use quantity in key
          const uniqueKey = `${key}_QTY${newQty}_CREDIT${newCredit}`;
          itemMap.set(uniqueKey, item);
          console.log(`  ⚠️  Item with same NDC/Lot/Exp but different qty/credit - treating as separate: ${ndcValue}`);
        } else if (newCompleteness > existingCompleteness) {
          // New item is more complete, replace existing
          itemMap.set(key, item);
          duplicatesRemoved++;
        } else {
          // Existing item is more complete or equal, keep existing
          duplicatesRemoved++;
        }
      } else {
        itemMap.set(key, item);
      }
    }
    
    totalItemsAfterDedup = itemMap.size;
    
    if (duplicatesRemoved > 0) {
      console.log(`🔄 Removed ${duplicatesRemoved} duplicate items (from chunk overlap)`);
      console.log(`   📊 Items after deduplication: ${totalItemsAfterDedup} (from ${totalItemsAfterFilter} after filter)`);
    }
    
    mergedData.items = Array.from(itemMap.values());
  }
  
  // Calculate totals
  if (mergedData.items && mergedData.items.length > 0) {
    mergedData.totalItems = mergedData.items.length;
    mergedData.totalCreditAmount = mergedData.items.reduce((sum, item) => {
      return sum + (item.creditAmount || 0);
    }, 0);
    mergedData.totalCreditAmount = Math.round(mergedData.totalCreditAmount * 100) / 100;
  }
  
  // Final merge summary
  console.log(`✅ Merge complete:`);
  console.log(`   📊 Items: ${totalItemsBeforeMerge} collected → ${totalItemsAfterFilter} after filter → ${totalItemsAfterDedup} after deduplication`);
  console.log(`   💰 Total credit: $${mergedData.totalCreditAmount}`);
  console.log(`   📋 Final item count: ${mergedData.items?.length || 0}`);
  
  // Warn if significant data loss occurred
  if (totalItemsBeforeMerge > 0) {
    const dataLossPercent = ((totalItemsBeforeMerge - (mergedData.items?.length || 0)) / totalItemsBeforeMerge) * 100;
    if (dataLossPercent > 10) {
      console.warn(`⚠️  WARNING: ${dataLossPercent.toFixed(1)}% of items were filtered/removed during merge. This might indicate data quality issues.`);
    }
  }
  
  return mergedData;
};

// Helper function to add delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Process chunks in parallel batches
export const processChunksInParallel = async (
  chunks: Array<{ chunkIndex: number; text: string; pageRange: string }>,
  batchSize: number = 5
): Promise<Array<Partial<ReturnReportData>>> => {
  const results: Array<Partial<ReturnReportData>> = [];
  
  // Process in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    
    console.log(`⚡ Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks in parallel)...`);
    
    // Process all chunks in this batch in parallel
    const batchPromises = batch.map(async (chunk, indexInBatch) => {
      const globalIndex = batchStartIndex + indexInBatch;
      const isFirstChunk = globalIndex === 0;
      
      console.log(`  🔄 Chunk ${globalIndex + 1}/${chunks.length} (${chunk.pageRange})...`);
      
      try {
        const chunkData = await extractStructuredDataFromChunk(chunk.text, globalIndex, isFirstChunk);
        console.log(`  📦 Chunk ${globalIndex + 1} JSON Response:`, JSON.stringify(chunkData, null, 2));
        console.log(`  ✅ Chunk ${globalIndex + 1}: ${chunkData.items?.length || 0} items`);
        return { index: globalIndex, data: chunkData };
      } catch (error: any) {
        console.error(`  ❌ Chunk ${globalIndex + 1} failed: ${error.message}`);
        throw new AppError(`Failed to process chunk ${globalIndex + 1}: ${error.message}`, 500);
      }
    });
    
    // Wait for all chunks in this batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Sort by index and add to results
    batchResults.sort((a, b) => a.index - b.index);
    for (const result of batchResults) {
      results.push(result.data);
    }
    
    // Add 5 second delay after each batch (except after the last batch)
    if (batchNumber < totalBatches) {
      console.log(`⏳ Waiting 5 seconds before processing next batch...`);
      await delay(5000);
    }
  }
  
  return results;
};

export const extractStructuredData = async (pdfText: string): Promise<ReturnReportData> => {
  try {
    // Increased max tokens to 40000 to ensure all items can be extracted
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '40000', 10);

    const systemPrompt = `You are an expert at extracting structured data from pharmacy credit reports (return reports) from reverse distributors. 
Your PRIMARY task is to extract comprehensive distributor information AND product/item details from the PDF text.

═══════════════════════════════════════════════════════════════
DISTRIBUTOR INFORMATION - EXTRACT EVERYTHING YOU CAN FIND:
═══════════════════════════════════════════════════════════════

1. DISTRIBUTOR NAME (REQUIRED):
   - Look for company name in headers, footers, letterhead, or "From:" sections
   - Common locations: Top of page, return address, company letterhead
   - Examples: "ABC Pharmaceutical Returns", "XYZ Distributors Inc.", "MedReturn Solutions"

2. CONTACT EMAIL:
   - Search for email patterns: text@domain.com
   - Look in headers, footers, contact sections, or signature blocks
   - Common labels: "Email:", "E-mail:", "Contact:", "support@", "info@", "sales@"

3. CONTACT PHONE:
   - Search for phone number patterns: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX
   - Look in headers, footers, contact sections
   - Common labels: "Phone:", "Tel:", "Call:", "Contact:", "Phone Number:"

4. ADDRESS (Extract all components):
   - Look for complete mailing addresses in headers, footers, or contact sections
   - Extract separately:
     * street: Street address and number (e.g., "123 Main Street", "456 Oak Ave")
     * city: City name
     * state: State abbreviation or full name (e.g., "CA", "California")
     * zipCode: ZIP/Postal code (e.g., "12345", "90210-1234")
     * country: Country name (e.g., "USA", "United States")

5. PORTAL/WEBSITE URL:
   - Look for URLs: http://, https://, www.
   - Common locations: Headers, footers, contact sections, "Visit us at:", "Portal:"
   - Examples: "https://portal.example.com", "www.distributor.com/returns"

6. SUPPORTED FORMATS:
   - Look for mentions of file formats: "PDF", "CSV", "Excel", "XML", "EDI"
   - Common phrases: "Accepts:", "Formats:", "File types:", "We accept"

7. SERVICE FEE INFORMATION (CRITICAL - EXTRACT ACTUAL RATE ONLY):
   
   Look for YOUR ACTUAL service fee rate, typically stated as:
   "Base service rate: X%. You elected to have your check issued within Y days from the above date."
   
   This is usually near the top of the document, NOT in example sections.
   
   Extract:
   - "Base service rate: X%" → percentage (e.g., 9.4, 13.4, 15.0)
   - "elected to have your check issued within Y days" → paymentPeriodDays (30, 60, or 90)
   
   *** IMPORTANT: DO NOT EXTRACT FROM EXAMPLES ***
   IGNORE any text containing:
   - "Example of how the program works"
   - "for demonstration purposes"
   - "used for demonstration purposes only"  
   - "Here's how it works" followed by hypothetical calculations
   - Scenarios showing "$10,000 of product" or similar hypothetical amounts
   
   REAL example to extract:
   "Base service rate: 9.4%. You elected to have your check issued within 90 days from the above date."
   → serviceFee: { percentage: 9.4, paymentPeriodDays: 90 }
   
   If only example rates are found (no actual rate), set both fields to null

═══════════════════════════════════════════════════════════════
PRODUCT/ITEM INFORMATION - EXTRACT FOR EACH ITEM:
═══════════════════════════════════════════════════════════════

1. NDC CODE (CRITICAL - REQUIRED):
   - National Drug Code in formats: XXXXX-XXXX-XX, XXXXXXXX-XX, XXXXX-XXXXX-XX
   - Look in product tables, item listings, or product columns
   - MUST extract accurately - this is critical for matching

2. ITEM NAME:
   - Product name/description from the item listing

3. MANUFACTURER:
   - Manufacturer name for the product

4. LOT NUMBER:
   - Batch/lot number (may be labeled as "Lot", "Batch", "Lot #", "Batch #")

5. EXPIRATION DATE:
   - Expiration date in any format, convert to YYYY-MM-DD
   - Look for "Exp", "Expiry", "Exp Date", "Expiration"

6. QUANTITY:
   - Number of units returned (numeric value)

7. CREDIT AMOUNT:
   - Payment/credit amount for this item (numeric, may have $ sign)

8. PRICE PER UNIT:
   - Calculate: creditAmount / quantity
   - If already provided, use that value

9. FULL - EXTRACT FROM PDF (NEVER DEFAULT TO 1):
   - Locate the "Full" column in the PDF table
   - Read the ACTUAL numeric value for each row
   - Values vary per row: could be 0, 2, 5, 10, 25, 100, etc.
   - If column not found, use null
   - WRONG: Always returning 1 for every row
   - RIGHT: Reading 5 from row 1, 0 from row 2, 12 from row 3, etc.

10. PARTIAL - EXTRACT FROM PDF (NEVER DEFAULT TO 0):
   - Locate the "Partial" column in the PDF table
   - Read the ACTUAL numeric value for each row
   - Values vary per row: could be 0, 1, 3, 7, 15, etc.
   - If column not found, use null
   - WRONG: Always returning 0 for every row
   - RIGHT: Reading 2 from row 1, 5 from row 2, 0 from row 3, etc.

*** STOP: If you're returning full=1, partial=0 for every single row, you're doing it WRONG ***
Each row in the PDF has DIFFERENT numbers. Read them individually!

11. PKG SZ (Package Size):
   - Package size information
   - Can be numeric (e.g., 100) or text (e.g., "50ml", "100 tablets")
   - Extract exactly as shown in the PDF
   - null if not found

12. CASE SZ (Case Size):
   - Case size information
   - Can be numeric (e.g., 12, 24) or text
   - Extract exactly as shown in the PDF
   - null if not found

═══════════════════════════════════════════════════════════════
REPORT INFORMATION:
═══════════════════════════════════════════════════════════════

1. REPORT DATE:
   - Date of the credit report (convert to YYYY-MM-DD format)
   - Look for "Date:", "Report Date:", "Credit Date:", "As of:"

2. CREDIT REPORT NUMBER:
   - Reference number, credit number, report number
   - Look for "Credit #", "Report #", "Reference #", "Credit Number:"

3. PHARMACY NAME:
   - Pharmacy name if mentioned (may be in "To:", "Pharmacy:", or header)

4. TOTAL CREDIT AMOUNT:
   - Total amount for entire report (usually at bottom of report)

5. TOTAL ITEMS:
   - Total number of items in the report

═══════════════════════════════════════════════════════════════
CRITICAL EXTRACTION RULES:
═══════════════════════════════════════════════════════════════

1. DISTRIBUTOR INFO IS PRIORITY: Search the ENTIRE PDF text for distributor information
   - Check headers, footers, letterhead, contact sections, signature blocks
   - Look for company information sections
   - Extract EVERY piece of distributor contact information you find

2. BE THOROUGH: Read through ALL text, not just tables
   - Distributor info is often in headers/footers that might be missed
   - Contact information may be in small print or sidebars

3. FORMAT HANDLING:
   - Phone numbers: Normalize to format like "123-456-7890" or "(123) 456-7890"
   - Dates: Always convert to YYYY-MM-DD format
   - Address: Break into components (street, city, state, zipCode, country)

4. NULL HANDLING:
   - If a field is not found, use null (for optional fields) or omit it
   - DO NOT make up information - only extract what's actually in the PDF

5. JSON STRUCTURE: Return data in this EXACT structure:

{
  "reverseDistributor": "Full Company Name Here",
  "reverseDistributorInfo": {
    "name": "Full Company Name Here",
    "contactEmail": "email@example.com" or null,
    "contactPhone": "123-456-7890" or null,
    "address": {
      "street": "123 Main Street" or null,
      "city": "City Name" or null,
      "state": "CA" or null,
      "zipCode": "12345" or null,
      "country": "USA" or null
    } or null,
    "portalUrl": "https://portal.example.com" or null,
    "supportedFormats": ["PDF", "CSV"] or null,
    "serviceFee": {
      "percentage": 13.4 or null,
      "paymentPeriodDays": 30 or null
    } or null
  },
  "pharmacy": "Pharmacy Name" or null,
  "reportDate": "YYYY-MM-DD",
  "creditReportNumber": "REF-12345" or null,
  "items": [
    {
      "ndcCode": "12345-678-90",
      "itemName": "Product Name",
      "manufacturer": "Manufacturer Name" or null,
      "lotNumber": "LOT123" or null,
      "expirationDate": "YYYY-MM-DD" or null,
      "quantity": 10,
      "creditAmount": 125.50,
      "pricePerUnit": 12.55,
      "full": 2,
      "partial": 1,
      "pkgSz": "100" or 100 or null,
      "caseSz": "12" or 12 or null
    }
  ],
  "totalCreditAmount": 125.50,
  "totalItems": 1
}

IMPORTANT: Always extract both "full" and "partial" as numbers for each item.
Even if the value is 0, you must include it in the JSON.

═══════════════════════════════════════════════════════════════
CRITICAL JSON FORMATTING - THIS IS MANDATORY:
═══════════════════════════════════════════════════════════════

Your response will be directly parsed with JSON.parse(). It MUST be 100% valid JSON.

REQUIREMENTS:
1. Return ONLY a JSON object - no text before or after
2. NO trailing commas (e.g., {"field": "value",} is INVALID)
3. NO unescaped quotes or newlines in strings
4. Use literal null for missing values (not string "null")
5. Properly escape special characters: \n for newlines, \" for quotes, \\ for backslashes
6. NO markdown code blocks, NO comments, NO explanations
7. All strings in double quotes, all objects/arrays properly closed

If running out of tokens, complete the current item properly, then close all arrays and objects with ] and }.

REMEMBER: Extract ALL distributor information from headers, footers, and contact sections. Be thorough.`;

    const userPrompt = `Extract structured data from the following pharmacy return report:\n\n${pdfText}`;

    const response = await client.chat.completions.create({
      model: deployment as string,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.0, // Zero temperature for most deterministic/consistent JSON output
      response_format: { type: 'json_object' } as any, // Force JSON response format
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError('No response from Azure OpenAI', 500);
    }

    // Parse JSON - Azure OpenAI with response_format json_object should return valid JSON
    let jsonData: ReturnReportData;
    try {
      // Simply parse the content - it should already be valid JSON from Azure OpenAI
      jsonData = JSON.parse(content);
    } catch (parseError: any) {
      // If parsing fails, log detailed error information
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('❌ Raw content length:', content.length);
      console.error('❌ Content (first 500 chars):', content.substring(0, 500));
      
      const errorPosition = parseError.message.match(/position (\d+)/)?.[1];
      if (errorPosition) {
        const pos = parseInt(errorPosition);
        const start = Math.max(0, pos - 150);
        const end = Math.min(content.length, pos + 150);
        console.error('❌ Content around error position:', content.substring(start, end));
      }
      
      // Last resort: try to repair only if absolutely necessary
      try {
        console.log('⚠️  Attempting minimal repair...');
        const repaired = repairJson(content);
        jsonData = JSON.parse(repaired);
        console.log('✅ JSON repaired successfully');
      } catch (repairError: any) {
        throw new AppError(
          `Azure OpenAI returned invalid JSON. Original error: ${parseError.message}. Repair failed: ${repairError.message}`,
          500
        );
      }
    }

    // Log extracted distributor information for debugging
    if (jsonData.reverseDistributorInfo) {
      console.log('📋 Extracted Distributor Info:');
      console.log('   Name:', jsonData.reverseDistributorInfo.name);
      console.log('   Email:', jsonData.reverseDistributorInfo.contactEmail || 'Not found');
      console.log('   Phone:', jsonData.reverseDistributorInfo.contactPhone || 'Not found');
      console.log('   Address:', jsonData.reverseDistributorInfo.address || 'Not found');
      console.log('   Portal URL:', jsonData.reverseDistributorInfo.portalUrl || 'Not found');
      console.log('   Supported Formats:', jsonData.reverseDistributorInfo.supportedFormats || 'Not found');
      if (jsonData.reverseDistributorInfo.serviceFee) {
        console.log('   💰 Service Fee:');
        console.log('      Percentage:', jsonData.reverseDistributorInfo.serviceFee.percentage !== null && jsonData.reverseDistributorInfo.serviceFee.percentage !== undefined ? `${jsonData.reverseDistributorInfo.serviceFee.percentage}%` : 'Not found');
        console.log('      Payment Period:', jsonData.reverseDistributorInfo.serviceFee.paymentPeriodDays !== null && jsonData.reverseDistributorInfo.serviceFee.paymentPeriodDays !== undefined ? `${jsonData.reverseDistributorInfo.serviceFee.paymentPeriodDays} days` : 'Not found');
      } else {
        console.log('   💰 Service Fee: Not found');
      }
    } else if (jsonData.reverseDistributor) {
      console.log('📋 Extracted Distributor Name only:', jsonData.reverseDistributor);
      console.log('⚠️ No detailed distributor info extracted');
    } else {
      console.log('⚠️ No distributor information extracted from PDF');
    }

    return jsonData;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to extract structured data: ${error.message}`, 500);
  }
};

// Generate fake distributor names
const generateFakeDistributorName = (): string => {
  const distributors = [
    'MedReturn Solutions Inc.',
    'PharmaCredit Distributors',
    'RxReturn Services LLC',
    'Healthcare Returns Group',
    'Pharmacy Credit Solutions',
    'MedSupply Returns Co.',
    'RxCredit Distributors',
    'PharmaReturn Network',
    'Healthcare Credit Services',
    'MedReturn Partners',
  ];
  return distributors[Math.floor(Math.random() * distributors.length)];
};

// Generate fake price per unit (realistic range for pharmacy returns: $0.10 to $50.00)
const generateFakePricePerUnit = (): number => {
  // Generate price between $0.10 and $50.00 with 2 decimal places
  const min = 0.10;
  const max = 50.00;
  const price = Math.random() * (max - min) + min;
  return Math.round(price * 100) / 100;
};

// Generate fake email address
const generateFakeEmail = (companyName: string): string => {
  const domains = ['returns.com', 'pharma.com', 'distributors.com', 'services.com', 'solutions.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const companySlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  const prefixes = ['info', 'support', 'contact', 'sales', 'returns'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}@${companySlug}${domain}`;
};

// Generate fake phone number
const generateFakePhone = (): string => {
  const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
  const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${areaCode}-${exchange}-${number}`;
};

// Generate fake address
const generateFakeAddress = (): { street: string; city: string; state: string; zipCode: string; country: string } => {
  const streets = [
    '123 Commerce Drive',
    '456 Business Park Blvd',
    '789 Industrial Way',
    '321 Distribution Center Rd',
    '654 Warehouse Avenue',
    '987 Supply Chain Street',
    '147 Logistics Lane',
    '258 Trade Center Drive',
  ];
  const cities = [
    'Atlanta', 'Chicago', 'Dallas', 'Denver', 'Houston', 'Los Angeles',
    'Miami', 'New York', 'Phoenix', 'Seattle', 'Boston', 'Philadelphia',
  ];
  const states = [
    'AL', 'AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'MA', 'NY', 'PA', 'TX', 'WA',
  ];
  
  const street = streets[Math.floor(Math.random() * streets.length)];
  const streetNumber = Math.floor(Math.random() * 9000) + 100;
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const zipCode = Math.floor(Math.random() * 90000) + 10000;
  const country = 'USA';
  
  return {
    street: `${streetNumber} ${street}`,
    city,
    state,
    zipCode: zipCode.toString(),
    country,
  };
};

// Generate fake portal URL
const generateFakePortalUrl = (companyName: string): string => {
  const protocols = ['https://', 'http://'];
  const subdomains = ['portal', 'returns', 'portal.returns', 'www', 'secure'];
  const tlds = ['.com', '.net', '.org'];
  
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
  const companySlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  const tld = tlds[Math.floor(Math.random() * tlds.length)];
  
  return `${protocol}${subdomain}.${companySlug}${tld}`;
};

// Generate fake supported formats
const generateFakeSupportedFormats = (): string[] => {
  const allFormats = ['PDF', 'CSV', 'Excel', 'XML', 'EDI', 'JSON'];
  const numFormats = Math.floor(Math.random() * 3) + 1; // 1-3 formats
  const formats: string[] = [];
  
  // Always include PDF
  formats.push('PDF');
  
  // Add random other formats
  const otherFormats = allFormats.filter(f => f !== 'PDF');
  for (let i = 0; i < numFormats - 1 && i < otherFormats.length; i++) {
    const randomFormat = otherFormats[Math.floor(Math.random() * otherFormats.length)];
    if (!formats.includes(randomFormat)) {
      formats.push(randomFormat);
    }
  }
  
  return formats;
};

// Replace real prices and distributor name with fake ones
const fakePricesAndDistributor = (data: ReturnReportData): ReturnReportData => {
  // Generate a fake distributor name
  const fakeDistributorName = generateFakeDistributorName();
  
  // Replace distributor name (for backward compatibility)
  data.reverseDistributor = fakeDistributorName;
  
  // Generate fake distributor information
  const fakeEmail = generateFakeEmail(fakeDistributorName);
  const fakePhone = generateFakePhone();
  const fakeAddress = generateFakeAddress();
  const fakePortalUrl = generateFakePortalUrl(fakeDistributorName);
  const fakeSupportedFormats = generateFakeSupportedFormats();
  
  // Replace distributor info with fake data
  if (data.reverseDistributorInfo) {
    data.reverseDistributorInfo.name = fakeDistributorName;
    data.reverseDistributorInfo.contactEmail = fakeEmail;
    data.reverseDistributorInfo.contactPhone = fakePhone;
    data.reverseDistributorInfo.address = fakeAddress;
    data.reverseDistributorInfo.portalUrl = fakePortalUrl;
    data.reverseDistributorInfo.supportedFormats = fakeSupportedFormats;
  } else {
    // Create distributor info structure with fake data
    data.reverseDistributorInfo = {
      name: fakeDistributorName,
      contactEmail: fakeEmail,
      contactPhone: fakePhone,
      address: fakeAddress,
      portalUrl: fakePortalUrl,
      supportedFormats: fakeSupportedFormats,
    };
  }
  
  // Replace prices for each item
  let totalCreditAmount = 0;
  
  if (data.items && data.items.length > 0) {
    data.items = data.items.map((item) => {
      // Generate fake price per unit
      const fakePricePerUnit = generateFakePricePerUnit();
      
      // Calculate fake credit amount based on quantity
      const quantity = item.quantity || 1;
      const fakeCreditAmount = Math.round(fakePricePerUnit * quantity * 100) / 100;
      
      // Update item with fake prices
      const fakeItem = {
        ...item,
        pricePerUnit: fakePricePerUnit,
        creditAmount: fakeCreditAmount,
        reverseDistributor: fakeDistributorName, // Also update in item if present
      };
      
      totalCreditAmount += fakeCreditAmount;
      
      return fakeItem;
    });
    
    // Update total credit amount
    data.totalCreditAmount = Math.round(totalCreditAmount * 100) / 100;
  }
  
  return data;
};

export const processReturnReport = async (pdfBuffer: Buffer): Promise<ReturnReportData> => {
  // Step 1: Extract text from PDF in chunks (3 pages per chunk with minimal overlap to ensure nothing is missed)
  const chunks = await extractTextFromPDFChunks(pdfBuffer, 3);
  
  if (chunks.length === 0) {
    throw new AppError('No text could be extracted from the PDF', 400);
  }

  // Combine all chunk texts for logging
  const fullPdfText = chunks.map(chunk => chunk.text).join('\n\n--- Chunk Boundary ---\n\n');

  console.log(`📦 Processing ${chunks.length} chunks (5 chunks in parallel with overlap protection)...`);

  // Step 2: Process chunks in parallel (5 at a time)
  const chunkResults = await processChunksInParallel(chunks, 5);

  // Step 3: Merge all chunk results programmatically (fast and reliable)
  const structuredData = mergeChunkResults(chunkResults);

  // Ensure backward compatibility: set reverseDistributor from reverseDistributorInfo if needed
  if (structuredData.reverseDistributorInfo?.name && !structuredData.reverseDistributor) {
    structuredData.reverseDistributor = structuredData.reverseDistributorInfo.name;
  } else if (structuredData.reverseDistributor && !structuredData.reverseDistributorInfo) {
    // Create basic distributor info from name if not provided
    structuredData.reverseDistributorInfo = {
      name: structuredData.reverseDistributor,
    };
  }

  // Step 3: Toggle between fake and real data
  // Set USE_FAKE_DATA=true in .env to enable fake prices and distributor names
  // Set USE_FAKE_DATA=false or omit it to use real extracted data
  const useFakeData = process.env.USE_FAKE_DATA === 'true' || process.env.USE_FAKE_DATA === '1';
  
  let finalData: ReturnReportData;
  if (useFakeData) {
    // Replace real prices and distributor name with fake ones
    finalData = fakePricesAndDistributor(structuredData);
    console.log('🔧 Faked prices and distributor name for processed report');
  } else {
    console.log('✅ Using real extracted data (no faking)');
    finalData = structuredData;
  }

  // Console log the full PDF text at the end
  console.log('\n' + '='.repeat(80));
  console.log('📄 FULL PDF TEXT EXTRACTED:');
  console.log('='.repeat(80));
  console.log(fullPdfText);
  console.log('='.repeat(80) + '\n');

  return finalData;
};

export interface SaveReturnReportInput {
  document_id: string;
  pharmacy_id: string;
  data: ReturnReportData;
}

export interface ReturnReportRecord {
  id: string;
  document_id: string;
  pharmacy_id: string;
  data: any; // Single item object stored as JSONB
  created_at: string;
  updated_at: string;
}

export const saveReturnReport = async (
  input: SaveReturnReportInput
): Promise<ReturnReportRecord[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted
  await verifyPharmacyStatus(input.pharmacy_id);

  const db = supabaseAdmin;

  // Extract items array from the data
  let items = input.data.items || [];
  
  // Filter out items with null manufacturer, pricePerUnit, or expirationDate
  items = items.filter(item => {
    return item.manufacturer !== null && 
           item.manufacturer !== undefined && 
           item.pricePerUnit !== null && 
           item.pricePerUnit !== undefined &&
           item.expirationDate !== null && 
           item.expirationDate !== undefined;
  });
  
  if (items.length === 0) {
    throw new AppError('No items to save in return report (all items filtered out due to missing manufacturer, pricePerUnit, or expirationDate)', 400);
  }

  // Check if NDC validation is enabled via environment variable
  // Default to true if not set (maintains current behavior)
  const enableNdcValidation = process.env.ENABLE_NDC_VALIDATION !== 'false' && 
                               process.env.ENABLE_NDC_VALIDATION !== '0';

  // Validate NDC codes before inserting (if enabled)
  const validatedItems: any[] = [];
  const invalidItems: any[] = [];

  if (enableNdcValidation) {
    console.log('🔍 NDC validation is ENABLED - validating against RxNav API (https://rxnav.nlm.nih.gov/REST/ndcstatus.json)');
    
    // Helper function to normalize NDC code (remove dashes, ensure 11 digits)
    const normalizeNdc = (ndc: string): string => {
      // Remove all non-digit characters
      const digits = ndc.replace(/\D/g, '');
      // Return as 11-digit string (pad with zeros if needed, or truncate if too long)
      if (digits.length === 10) {
        // 10-digit NDC: add leading zero
        return '0' + digits;
      } else if (digits.length === 11) {
        return digits;
      } else if (digits.length > 11) {
        // Take first 11 digits
        return digits.substring(0, 11);
      } else {
        // Pad with zeros to make 11 digits
        return digits.padStart(11, '0');
      }
    };

    // Collect all unique NDC codes from items
    const ndcMap = new Map<string, any[]>(); // Map NDC -> items with that NDC
    items.forEach(item => {
      const ndcCode = item.ndcCode || (item as any).ndc;
      if (!ndcCode) {
        invalidItems.push({ ...item, reason: 'Missing NDC code' });
        return;
      }
      const normalizedNdc = normalizeNdc(String(ndcCode));
      if (!ndcMap.has(normalizedNdc)) {
        ndcMap.set(normalizedNdc, []);
      }
      ndcMap.get(normalizedNdc)!.push(item);
    });

    const uniqueNdcs = Array.from(ndcMap.keys());
    console.log(`📋 Found ${uniqueNdcs.length} unique NDC codes to validate`);

    // Validate all NDCs using RxNav API with Promise.allSettled
    const validationPromises = uniqueNdcs.map(async (normalizedNdc) => {
      try {
        const apiUrl = `https://rxnav.nlm.nih.gov/REST/ndcstatus.json?ndc=${normalizedNdc}`;
        const response = await fetch(apiUrl);
        const data = await response.json() as { ndcStatus?: { status?: string; active?: string; conceptName?: string } };
        
        return {
          ndc: normalizedNdc,
          success: true,
          data: data,
          status: 'fulfilled' as const
        };
      } catch (error: any) {
        return {
          ndc: normalizedNdc,
          success: false,
          error: error.message,
          status: 'rejected' as const
        };
      }
    });

    const validationResults = await Promise.allSettled(validationPromises);

    // Process validation results
    console.log('\n📊 RxNav API Validation Results:');
    console.log('═══════════════════════════════════════════════════════════');
    
    validationResults.forEach((result, index) => {
      const ndc = uniqueNdcs[index];
      const itemsForNdc = ndcMap.get(ndc) || [];
      
      if (result.status === 'fulfilled') {
        const validationResult = result.value;
        
        if (validationResult.success && validationResult.data) {
          const ndcStatus = validationResult.data.ndcStatus;
          
          // Log the full API response
          console.log(`\n🔍 NDC: ${ndc}`);
          console.log(`   API Response:`, JSON.stringify(validationResult.data, null, 2));
          
          // Check if NDC is valid (status: "ACTIVE" and active: "YES")
          if (ndcStatus && ndcStatus.status === 'ACTIVE' && ndcStatus.active === 'YES') {
            console.log(`   ✅ VALID - Status: ${ndcStatus.status}, Active: ${ndcStatus.active}`);
            if (ndcStatus.conceptName) {
              console.log(`   📦 Product: ${ndcStatus.conceptName}`);
            }
            // Add all items with this NDC to validated items
            validatedItems.push(...itemsForNdc);
          } else {
            const status = ndcStatus?.status || 'UNKNOWN';
            const active = ndcStatus?.active || 'UNKNOWN';
            console.log(`   ❌ INVALID - Status: ${status}, Active: ${active}`);
            itemsForNdc.forEach(item => {
              invalidItems.push({ 
                ...item, 
                reason: `NDC status: ${status}, active: ${active}` 
              });
            });
          }
        } else {
          console.log(`\n🔍 NDC: ${ndc}`);
          console.log(`   ❌ API call failed: ${validationResult.error || 'Unknown error'}`);
          itemsForNdc.forEach(item => {
            invalidItems.push({ 
              ...item, 
              reason: `API validation failed: ${validationResult.error || 'Unknown error'}` 
            });
          });
        }
      } else {
        console.log(`\n🔍 NDC: ${ndc}`);
        console.log(`   ❌ Promise rejected: ${result.reason || 'Unknown error'}`);
        itemsForNdc.forEach(item => {
          invalidItems.push({ 
            ...item, 
            reason: `Promise rejected: ${result.reason || 'Unknown error'}` 
          });
        });
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📊 Validation Summary:`);
    console.log(`   ✅ Valid NDCs: ${validatedItems.length} items`);
    console.log(`   ❌ Invalid NDCs: ${invalidItems.length} items`);

    // Log invalid items details
    if (invalidItems.length > 0) {
      console.log(`\n⚠️  ${invalidItems.length} items skipped due to invalid/missing NDC codes`);
      console.log(`📋 Invalid NDC Codes List:`);
      invalidItems.forEach((item, index) => {
        const ndc = item.ndcCode || item.ndc || 'MISSING';
        console.log(`   ${index + 1}. NDC: "${ndc}" - ${item.itemName || item.productDescription || 'Unknown'} - Reason: ${item.reason}`);
      });
    }

    if (validatedItems.length === 0) {
      throw new AppError('No items with valid NDC codes to save (all NDCs failed RxNav API validation)', 400);
    }
    
    console.log(`\n✅ ${validatedItems.length} items with valid NDC codes will be inserted`);
  } else {
    console.log('⚠️  NDC validation is DISABLED - accepting all items without validation');
    // If validation is disabled, accept all items
    validatedItems.push(...items);
    console.log(`\n✅ ${validatedItems.length} items will be inserted (NDC validation skipped)`);
  }

  // Create one record per validated item
  const recordsToInsert = validatedItems.map((item: any) => ({
    document_id: input.document_id,
    pharmacy_id: input.pharmacy_id,
    data: item, // Store each item object as JSONB
  }));

  // Check for existing records to prevent duplicates
  // Get all existing records for this document_id and pharmacy_id
  const { data: existingRecords, error: fetchError } = await db
    .from('return_reports')
    .select('*')
    .eq('document_id', input.document_id)
    .eq('pharmacy_id', input.pharmacy_id);

  if (fetchError) {
    console.warn(`⚠️  Failed to fetch existing records for duplicate check: ${fetchError.message}`);
    // Continue with insert even if fetch fails
  }

  // Create a set of existing item keys for fast lookup
  const existingItemKeys = new Set<string>();
  if (existingRecords && existingRecords.length > 0) {
    existingRecords.forEach((record: any) => {
      const item = record.data;
      if (item) {
        // Create unique key: NDC + lotNumber + expirationDate + quantity + creditAmount
        const normalizedNdc = (item.ndcCode || item.ndc || 'NO_NDC').replace(/[-\s]/g, '').toUpperCase();
        const normalizedLot = (item.lotNumber || 'NO_LOT').trim().toUpperCase();
        const normalizedExp = (item.expirationDate || 'NO_EXP').trim();
        const qty = item.quantity || 0;
        const credit = item.creditAmount || 0;
        const key = `${normalizedNdc}_${normalizedLot}_${normalizedExp}_QTY${qty}_CREDIT${credit}`;
        existingItemKeys.add(key);
      }
    });
    console.log(`🔍 Found ${existingRecords.length} existing records for document ${input.document_id}`);
  }

  // Filter out duplicates before inserting
  const uniqueRecordsToInsert: typeof recordsToInsert = [];
  const duplicateCount = { count: 0 };

  recordsToInsert.forEach((record) => {
    const item = record.data;
    if (item) {
      // Create unique key: NDC + lotNumber + expirationDate + quantity + creditAmount
      const normalizedNdc = (item.ndcCode || item.ndc || 'NO_NDC').replace(/[-\s]/g, '').toUpperCase();
      const normalizedLot = (item.lotNumber || 'NO_LOT').trim().toUpperCase();
      const normalizedExp = (item.expirationDate || 'NO_EXP').trim();
      const qty = item.quantity || 0;
      const credit = item.creditAmount || 0;
      const key = `${normalizedNdc}_${normalizedLot}_${normalizedExp}_QTY${qty}_CREDIT${credit}`;

      if (existingItemKeys.has(key)) {
        duplicateCount.count++;
        console.log(`  ⚠️  Duplicate item skipped: ${item.ndcCode || item.ndc || 'NO_NDC'} - ${item.itemName || item.productDescription || 'Unknown'}`);
      } else {
        uniqueRecordsToInsert.push(record);
        // Add to set to prevent duplicates within the same batch
        existingItemKeys.add(key);
      }
    }
  });

  if (duplicateCount.count > 0) {
    console.log(`🔄 Removed ${duplicateCount.count} duplicate records before insert`);
  }

  if (uniqueRecordsToInsert.length === 0) {
    console.log('ℹ️  All items are duplicates - nothing to insert');
    // Return existing records that match the ReturnReportRecord interface
    if (existingRecords && existingRecords.length > 0) {
      return existingRecords as ReturnReportRecord[];
    }
    return [];
  }

  console.log(`📝 Inserting ${uniqueRecordsToInsert.length} unique records (${recordsToInsert.length - uniqueRecordsToInsert.length} duplicates removed)`);

  // Insert only unique records
  const { data, error } = await db
    .from('return_reports')
    .insert(uniqueRecordsToInsert)
    .select();

  if (error) {
    throw new AppError(`Failed to save return report items: ${error.message}`, 400);
  }

  return data || [];
};

export interface ReturnReportMatchResult {
  reportDate: string | null;
  ndcCode: string;
  count: number;
  records: Array<{
    id: string;
    document_id: string;
    pharmacy_id: string;
    data: any;
    report_date: string | null;
    created_at: string;
  }>;
}

export interface GraphDataPoint {
  date: string;
  pricePerUnit: number;
  quantity: number;
  creditAmount: number;
  recordId: string;
  itemName?: string;
  expirationDate?: string;
  lotNumber?: string;
}

export interface ReturnReportGraphResponse {
  ndcCode: string;
  itemName?: string;
  dataPoints: GraphDataPoint[];
  summary: {
    totalRecords: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
    priceStats: {
      min: number | null;
      max: number | null;
      average: number | null;
    };
    totalQuantity: number;
    totalCreditAmount: number;
  };
}

/**
 * Get matching return report records by distributor ID and NDC code
 * Groups results by report date and returns count of matched codes
 * NOTE: Searches ALL documents for the distributor (shared pricing data across all pharmacies)
 * @param distributorId - Reverse distributor ID
 * @param ndcCode - NDC code to search for
 * @param pharmacyId - Optional pharmacy ID (used for status verification only, not for filtering)
 * @param type - Optional type filter: 'full' to match records with full > 0, 'partial' to match records with partial > 0
 */
export const getReturnReportsByDistributorAndNdc = async (
  distributorId: string,
  ndcCode: string,
  pharmacyId?: string,
  type?: 'full' | 'partial'
): Promise<ReturnReportMatchResult[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Verify pharmacy is not suspended/blacklisted (if pharmacyId is provided)
  if (pharmacyId) {
    await verifyPharmacyStatus(pharmacyId);
  }

  const db = supabaseAdmin;

  // Step 1: Get ALL document IDs for the specified distributor
  // NOTE: All pharmacies can access all documents for shared pricing data
  console.log(`🔍 Searching ALL documents for distributor: ${distributorId}`);
  
  const { data: documents, error: documentsError } = await db
    .from('uploaded_documents')
    .select('id, report_date')
    .eq('reverse_distributor_id', distributorId);

  if (documentsError) {
    throw new AppError(`Failed to fetch documents: ${documentsError.message}`, 400);
  }

  console.log(`📄 Found ${documents?.length || 0} total documents for this distributor`);

  if (!documents || documents.length === 0) {
    console.log(`❌ No documents found for distributor: ${distributorId}`);
    return [];
  }

  const documentIds = documents.map((doc: any) => doc.id);
  const documentMap = new Map<string, string | null>();
  documents.forEach((doc: any) => {
    documentMap.set(doc.id, doc.report_date || null);
  });

  // Step 2: Query return_reports for matching NDC codes and document IDs
  // Use flexible NDC matching (similar to optimizationService.ts)
  const normalized = String(ndcCode).replace(/-/g, '').trim();
  const withDashes = String(ndcCode).trim();
  
  // Helper function to format NDC with dashes (5-4-2 format, most common)
  const formatNdcWithDashes = (ndc: string): string => {
    const clean = ndc.replace(/-/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
    }
    return ndc;
  };
  
  // Generate dashed version if the input is without dashes
  const dashedFormat = formatNdcWithDashes(normalized);
  
  // Build OR conditions for flexible NDC matching
  const orConditions: string[] = [];
  
  // Match ndcCode field with various formats
  orConditions.push(`data->>ndcCode.ilike.%${withDashes}%`);
  if (normalized !== withDashes) {
    orConditions.push(`data->>ndcCode.ilike.%${normalized}%`);
  }
  if (dashedFormat !== withDashes && dashedFormat !== normalized) {
    orConditions.push(`data->>ndcCode.ilike.%${dashedFormat}%`);
  }
  
  // Also match 'ndc' field if it exists (some records may use 'ndc' instead of 'ndcCode')
  orConditions.push(`data->>ndc.ilike.%${withDashes}%`);
  if (normalized !== withDashes) {
    orConditions.push(`data->>ndc.ilike.%${normalized}%`);
  }
  if (dashedFormat !== withDashes && dashedFormat !== normalized) {
    orConditions.push(`data->>ndc.ilike.%${dashedFormat}%`);
  }
  
  console.log(`🔍 Searching return_reports with flexible NDC matching:`);
  console.log(`   Input NDC: ${ndcCode}`);
  console.log(`   Searching in ${documentIds.length} documents (all pharmacies)`);
  
  // Query ALL return reports for matching documents (no pharmacy_id filter - shared data)
  const { data: returnReports, error } = await db
    .from('return_reports')
    .select('id, document_id, pharmacy_id, data, created_at')
    .in('document_id', documentIds)
    .or(orConditions.join(','));

  console.log(`📊 Found ${returnReports?.length || 0} matching return reports for NDC: ${ndcCode}`);

  if (error) {
    throw new AppError(`Failed to fetch return reports: ${error.message}`, 400);
  }

  if (!returnReports || returnReports.length === 0) {
    return [];
  }

  // Step 3: Filter by type (full/partial) if specified
  let filteredReports = returnReports;
  if (type) {
    filteredReports = returnReports.filter((report: any) => {
      const reportData = report.data || {};
      const full = Number(reportData.full) || 0;
      const partial = Number(reportData.partial) || 0;

      if (type === 'full') {
        // Match records where full > 0
        return full > 0;
      } else if (type === 'partial') {
        // Match records where partial > 0
        return partial > 0;
      }
      return true;
    });

    if (filteredReports.length === 0) {
      return [];
    }
  }

  // Group records by report_date
  const groupedByDate = new Map<string, ReturnReportMatchResult>();

  filteredReports.forEach((report: any) => {
    const reportDate = documentMap.get(report.document_id) || null;
    const dateKey = reportDate || 'no-date';
    const reportData = report.data || {};
    const ndc = reportData.ndcCode || ndcCode;

    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, {
        reportDate: reportDate,
        ndcCode: ndc,
        count: 0,
        records: [],
      });
    }

    const group = groupedByDate.get(dateKey)!;
    group.count++;
    group.records.push({
      id: report.id,
      document_id: report.document_id,
      pharmacy_id: report.pharmacy_id,
      data: reportData,
      report_date: reportDate,
      created_at: report.created_at,
    });
  });

  // For each date group, keep only the record with the highest value
  // If type is specified, use max full/partial value; otherwise use max pricePerUnit
  groupedByDate.forEach((group, dateKey) => {
    if (group.records.length > 1) {
      let bestRecord = group.records[0];
      
      if (type === 'full') {
        // Find the record with the maximum full value
        let maxFull = -Infinity;
        group.records.forEach((record) => {
          const full = Number(record.data?.full) || 0;
          if (full > maxFull) {
            maxFull = full;
            bestRecord = record;
          }
        });
      } else if (type === 'partial') {
        // Find the record with the maximum partial value
        let maxPartial = -Infinity;
        group.records.forEach((record) => {
          const partial = Number(record.data?.partial) || 0;
          if (partial > maxPartial) {
            maxPartial = partial;
            bestRecord = record;
          }
        });
      } else {
        // Default: Find the record with the maximum pricePerUnit
        let maxPricePerUnit = -Infinity;
        group.records.forEach((record) => {
          const pricePerUnit = Number(record.data?.pricePerUnit) || 0;
          if (pricePerUnit > maxPricePerUnit) {
            maxPricePerUnit = pricePerUnit;
            bestRecord = record;
          }
        });
      }

      // Keep only the best record
      group.records = [bestRecord];
      group.count = 1;
    } else if (group.records.length === 1) {
      // Only one record, keep count as 1
      group.count = 1;
    }
  });

  // Convert map to array and sort by report date (most recent first, null dates last)
  const results = Array.from(groupedByDate.values()).sort((a, b) => {
    if (a.reportDate === null && b.reportDate === null) return 0;
    if (a.reportDate === null) return 1;
    if (b.reportDate === null) return -1;
    return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
  });

  return results;
};

/**
 * Transform return report match results into graph-friendly format
 * Groups data by report date and unit price for charting
 */
export const transformToGraphFormat = (
  results: ReturnReportMatchResult[]
): ReturnReportGraphResponse => {
  if (results.length === 0) {
    return {
      ndcCode: '',
      dataPoints: [],
      summary: {
        totalRecords: 0,
        dateRange: {
          earliest: null,
          latest: null,
        },
        priceStats: {
          min: null,
          max: null,
          average: null,
        },
        totalQuantity: 0,
        totalCreditAmount: 0,
      },
    };
  }

  // Extract all data points from records
  const dataPoints: GraphDataPoint[] = [];
  const prices: number[] = [];
  let totalQuantity = 0;
  let totalCreditAmount = 0;
  const dates: string[] = [];

  results.forEach((group) => {
    group.records.forEach((record) => {
      const data = record.data || {};
      const pricePerUnit = data.pricePerUnit || 0;
      const quantity = data.quantity || 0;
      const creditAmount = data.creditAmount || 0;

      if (record.report_date) {
        dates.push(record.report_date);
      }

      if (pricePerUnit > 0) {
        prices.push(pricePerUnit);
      }

      totalQuantity += quantity;
      totalCreditAmount += creditAmount;

      dataPoints.push({
        date: record.report_date || '',
        pricePerUnit: pricePerUnit,
        quantity: quantity,
        creditAmount: creditAmount,
        recordId: record.id,
        itemName: data.itemName,
        expirationDate: data.expirationDate,
        lotNumber: data.lotNumber,
      });
    });
  });

  // Sort data points by date (chronologically)
  dataPoints.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate summary statistics
  const sortedDates = dates.filter(Boolean).sort();
  const earliestDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const avgPrice = prices.length > 0 
    ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
    : null;

  // Get NDC code and item name from first record
  const firstRecord = results[0]?.records[0]?.data;
  const ndcCode = results[0]?.ndcCode || firstRecord?.ndcCode || '';
  const itemName = firstRecord?.itemName;

  return {
    ndcCode,
    itemName,
    dataPoints,
    summary: {
      totalRecords: dataPoints.length,
      dateRange: {
        earliest: earliestDate,
        latest: latestDate,
      },
      priceStats: {
        min: minPrice,
        max: maxPrice,
        average: avgPrice ? Math.round(avgPrice * 100) / 100 : null,
      },
      totalQuantity,
      totalCreditAmount: Math.round(totalCreditAmount * 100) / 100,
    },
  };
};

