/**
 * Inventory Analysis Service
 * 
 * Handles pharmacy inventory file uploads (CSV/PDF/TXT), analyzes products,
 * and provides recommendations on which products to return to which distributors.
 * Also manages scheduled reminders for follow-ups.
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { parse as parseCSV } from 'csv-parse/sync';
import pdf from 'pdf-parse';
import { client } from '../config/azureOpenAI';
import { getPricingForNDCs as getSharedPricing, PricingRequest, NDCPricingResult } from './pricingService';

// ============================================================
// Types
// ============================================================

export interface InventoryItem {
  ndcCode: string;
  ndcNormalized?: string;
  productName?: string;
  manufacturer?: string;
  quantity: number;
  fullUnits?: number;
  partialUnits?: number;
  expirationDate?: string;
  lotNumber?: string;
  acquisitionCost?: number;
}

export interface ParsedInventory {
  items: InventoryItem[];
  totalItems: number;
  errors: string[];
}

export interface DistributorPricing {
  distributorId?: string;
  distributorName: string;
  fullPrice: number;
  partialPrice: number;
  email?: string;
  phone?: string;
  location?: string;
  reportDate?: string;
}

export interface ItemRecommendation {
  id?: string;
  ndcCode: string;
  ndcNormalized: string;
  productName: string;
  manufacturer?: string;
  quantity: number;
  fullUnits: number;
  partialUnits: number;
  expirationDate?: string;
  lotNumber?: string;
  recommendationType: 'return_now' | 'keep' | 'monitor' | 'no_data';
  recommendedDistributor?: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  estimatedReturnValue: number;
  bestFullPrice: number;
  bestPartialPrice: number;
  confidenceScore: number;
  reason: string;
  alternativeDistributors?: DistributorPricing[];
}

export interface AnalysisResult {
  uploadId: string;
  totalItems: number;
  itemsToReturn: ItemRecommendation[];
  itemsToKeep: ItemRecommendation[];
  itemsNoData: ItemRecommendation[];
  totalPotentialValue: number;
  summary: {
    returnNow: number;
    keep: number;
    monitor: number;
    noData: number;
  };
  generatedAt: string;
}

export interface InventorySummary {
  totalItems: number;
  itemsToReturn: number;
  itemsToKeep: number;
  totalPotentialValue: number;
  itemsByRecommendation: Record<string, number>;
  topReturnItems: Array<{
    id: string;
    ndcCode: string;
    productName: string;
    quantity: number;
    estimatedReturnValue: number;
    recommendedDistributor: string;
    expirationDate?: string;
  }>;
  upcomingExpirations: number;
}

export interface ReminderData {
  id: string;
  pharmacyId: string;
  reminderType: string;
  title: string;
  message: string;
  totalItems: number;
  totalPotentialValue: number;
  itemsSummary: any[];
  scheduledFor: string;
  status: string;
}

// ============================================================
// File Parsing Functions
// ============================================================

/**
 * Parse CSV file and extract inventory items
 */
const parseCSVFile = (buffer: Buffer): ParsedInventory => {
  const errors: string[] = [];
  const items: InventoryItem[] = [];

  try {
    const content = buffer.toString('utf-8');
    const records = parseCSV(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    for (let i = 0; i < records.length; i++) {
      const row: Record<string, string> = records[i];
      
      // Try to find NDC column (case-insensitive)
      const ndcKey = Object.keys(row).find(k => 
        /^ndc|ndc.?code|product.?code|item.?code/i.test(k)
      );
      
      if (!ndcKey || !row[ndcKey]) {
        errors.push(`Row ${i + 2}: Missing NDC code`);
        continue;
      }

      const ndcCode = String(row[ndcKey]).trim();
      
      // Find other columns
      const productNameKey = Object.keys(row).find(k => 
        /^(product|item|drug|name|description)/i.test(k)
      );
      const quantityKey = Object.keys(row).find(k => 
        /^(qty|quantity|count|units)/i.test(k)
      );
      const fullUnitsKey = Object.keys(row).find(k => 
        /^full/i.test(k)
      );
      const partialUnitsKey = Object.keys(row).find(k => 
        /^partial/i.test(k)
      );
      const expirationKey = Object.keys(row).find(k => 
        /^(exp|expir|expiration|expiry)/i.test(k)
      );
      const lotKey = Object.keys(row).find(k => 
        /^(lot|batch)/i.test(k)
      );
      const manufacturerKey = Object.keys(row).find(k => 
        /^(mfr|manufacturer|mfg|vendor)/i.test(k)
      );
      const costKey = Object.keys(row).find(k => 
        /^(cost|price|acquisition|acq)/i.test(k)
      );

      // Parse quantity - default to 1 if not found
      let quantity = 1;
      let fullUnits = 0;
      let partialUnits = 0;
      
      if (fullUnitsKey && row[fullUnitsKey]) {
        fullUnits = parseInt(row[fullUnitsKey], 10) || 0;
      }
      if (partialUnitsKey && row[partialUnitsKey]) {
        partialUnits = parseInt(row[partialUnitsKey], 10) || 0;
      }
      
      // If full/partial not specified, use quantity
      if (quantityKey && row[quantityKey]) {
        quantity = parseInt(row[quantityKey], 10) || 1;
        if (fullUnits === 0 && partialUnits === 0) {
          fullUnits = quantity; // Default to full units
        }
      } else {
        quantity = fullUnits + partialUnits || 1;
      }

      const item: InventoryItem = {
        ndcCode,
        ndcNormalized: ndcCode.replace(/-/g, ''),
        productName: productNameKey ? row[productNameKey] : undefined,
        manufacturer: manufacturerKey ? row[manufacturerKey] : undefined,
        quantity,
        fullUnits: fullUnits || quantity,
        partialUnits,
        expirationDate: expirationKey ? row[expirationKey] : undefined,
        lotNumber: lotKey ? row[lotKey] : undefined,
        acquisitionCost: costKey ? parseFloat(row[costKey]) || undefined : undefined,
      };

      items.push(item);
    }
  } catch (error: any) {
    errors.push(`CSV parsing error: ${error.message}`);
  }

  return {
    items,
    totalItems: items.length,
    errors,
  };
};

/**
 * Parse TXT file (tab/space delimited) and extract inventory items
 */
const parseTXTFile = (buffer: Buffer): ParsedInventory => {
  const errors: string[] = [];
  const items: InventoryItem[] = [];

  try {
    const content = buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    // NDC pattern: 5-4-2, 5-3-2, 10 digits, 11 digits
    const ndcPattern = /\b(\d{5}-\d{4}-\d{2}|\d{5}-\d{3}-\d{2}|\d{10,11})\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ndcMatch = line.match(ndcPattern);

      if (ndcMatch) {
        const ndcCode = ndcMatch[1];
        
        // Try to extract quantity (look for numbers after NDC)
        const quantityMatch = line.match(/(?:qty|quantity|units?)[:\s]*(\d+)/i) ||
                              line.match(/(\d+)\s*(?:units?|ea|each)/i);
        const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

        // Try to extract product name (text before or after NDC)
        const parts = line.split(ndcMatch[0]);
        const productName = (parts[0] || parts[1] || '').trim().substring(0, 200);

        items.push({
          ndcCode,
          ndcNormalized: ndcCode.replace(/-/g, ''),
          productName: productName || undefined,
          quantity,
          fullUnits: quantity,
          partialUnits: 0,
        });
      }
    }

    if (items.length === 0) {
      errors.push('No valid NDC codes found in the file');
    }
  } catch (error: any) {
    errors.push(`TXT parsing error: ${error.message}`);
  }

  return {
    items,
    totalItems: items.length,
    errors,
  };
};

/**
 * Parse PDF file using Azure OpenAI to extract inventory items
 */
const parsePDFFile = async (buffer: Buffer): Promise<ParsedInventory> => {
  const errors: string[] = [];
  const items: InventoryItem[] = [];

  try {
    // Extract text from PDF
    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 10) {
      return {
        items: [],
        totalItems: 0,
        errors: ['PDF appears to be empty or contains no extractable text'],
      };
    }

    // Use Azure OpenAI to extract structured inventory data
    const systemPrompt = `You are an expert at extracting inventory data from pharmacy documents.
Extract ALL inventory items from the provided text and return them as a JSON array.

For each item, extract:
- ndcCode: The NDC code (National Drug Code) - REQUIRED
- productName: Product/drug name
- manufacturer: Manufacturer name if available
- quantity: Total quantity/units
- fullUnits: Number of full units (if mentioned separately)
- partialUnits: Number of partial units (if mentioned)
- expirationDate: Expiration date in YYYY-MM-DD format
- lotNumber: Lot/batch number

Return ONLY a valid JSON array like:
[
  {"ndcCode": "12345-678-90", "productName": "Drug Name", "quantity": 10},
  ...
]

If no valid inventory items are found, return an empty array: []`;

    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract inventory items from this text:\n\n${text.substring(0, 15000)}` },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      for (const item of parsed) {
        if (item.ndcCode) {
          items.push({
            ndcCode: String(item.ndcCode),
            ndcNormalized: String(item.ndcCode).replace(/-/g, ''),
            productName: item.productName,
            manufacturer: item.manufacturer,
            quantity: parseInt(item.quantity, 10) || 1,
            fullUnits: parseInt(item.fullUnits, 10) || parseInt(item.quantity, 10) || 1,
            partialUnits: parseInt(item.partialUnits, 10) || 0,
            expirationDate: item.expirationDate,
            lotNumber: item.lotNumber,
            acquisitionCost: item.acquisitionCost ? parseFloat(item.acquisitionCost) : undefined,
          });
        }
      }
    }

    if (items.length === 0) {
      errors.push('No valid inventory items could be extracted from the PDF');
    }
  } catch (error: any) {
    errors.push(`PDF processing error: ${error.message}`);
  }

  return {
    items,
    totalItems: items.length,
    errors,
  };
};

/**
 * Parse uploaded file based on type
 */
export const parseInventoryFile = async (
  buffer: Buffer,
  fileType: string
): Promise<ParsedInventory> => {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType === 'csv' || normalizedType === 'text/csv') {
    return parseCSVFile(buffer);
  } else if (normalizedType === 'txt' || normalizedType === 'text/plain') {
    return parseTXTFile(buffer);
  } else if (normalizedType === 'pdf' || normalizedType === 'application/pdf') {
    return await parsePDFFile(buffer);
  } else {
    throw new AppError(`Unsupported file type: ${fileType}. Supported types: CSV, TXT, PDF`, 400);
  }
};

// ============================================================
// Pricing & Recommendation Functions
// ============================================================

/**
 * Get pricing data for NDC codes from return_reports
 * Uses the SHARED pricingService - SAME code as optimization service
 */
const getPricingForNDCs = async (items: InventoryItem[]): Promise<Map<string, NDCPricingResult>> => {
  // Build pricing requests with full/partial counts
  const requests: PricingRequest[] = items.map(item => ({
    ndc: item.ndcCode,
    fullCount: item.fullUnits || item.quantity,
    partialCount: item.partialUnits || 0,
  }));

  // Use the shared pricing service (SAME code as optimization service)
  return getSharedPricing(requests);
};

/**
 * Generate recommendation for an inventory item
 * 
 * SIMPLE LOGIC:
 * - RETURN: expiration date is in the past OR less than 1 month remaining
 * - KEEP: expiration date is more than 1 month remaining (or no expiration date)
 */
const generateRecommendation = (
  item: InventoryItem,
  pricingResult: NDCPricingResult | null
): ItemRecommendation => {
  const ndcNormalized = item.ndcNormalized || item.ndcCode.replace(/-/g, '');
  
  // Calculate days until expiration
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  
  const expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
  let daysUntilExpiration: number | null = null;
  
  if (expirationDate) {
    expirationDate.setHours(0, 0, 0, 0);
    daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // No pricing data available
  if (!pricingResult || pricingResult.distributors.length === 0) {
    // Still categorize based on expiration
    const recommendationType = daysUntilExpiration !== null && daysUntilExpiration <= 30 
      ? 'return_now' 
      : 'no_data';
    
    return {
      ndcCode: item.ndcCode,
      ndcNormalized,
      productName: pricingResult?.productName || item.productName || 'Unknown Product',
      manufacturer: item.manufacturer,
      quantity: item.quantity,
      fullUnits: item.fullUnits || item.quantity,
      partialUnits: item.partialUnits || 0,
      expirationDate: item.expirationDate,
      lotNumber: item.lotNumber,
      recommendationType,
      estimatedReturnValue: 0,
      bestFullPrice: 0,
      bestPartialPrice: 0,
      confidenceScore: 0,
      reason: daysUntilExpiration !== null && daysUntilExpiration <= 30
        ? `Product expires in ${daysUntilExpiration} days - should return but no pricing data available`
        : 'No pricing data available from any distributor for this NDC',
    };
  }

  // Calculate best return value
  const fullUnits = item.fullUnits || item.quantity || 0;
  const partialUnits = item.partialUnits || 0;
  
  let bestDistributor = pricingResult.distributors[0]; // Already sorted by best price
  let bestValue = 0;

  for (const dist of pricingResult.distributors) {
    const fullValue = fullUnits * (dist.fullPrice || 0);
    const partialValue = partialUnits * (dist.partialPrice || 0);
    const totalValue = fullValue + partialValue;

    if (totalValue > bestValue) {
      bestValue = totalValue;
      bestDistributor = dist;
    }
  }

  // SIMPLE DECISION LOGIC (as requested by user):
  // - RETURN: expiration <= 30 days (1 month) OR already expired
  // - KEEP: expiration > 30 days OR no expiration date
  let recommendationType: 'return_now' | 'keep' | 'monitor' | 'no_data';
  let reason = '';
  let confidenceScore = 0;

  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  if (isExpired) {
    // Already expired - RETURN NOW
    recommendationType = 'return_now';
    confidenceScore = 99;
    reason = `Product EXPIRED ${Math.abs(daysUntilExpiration!)} days ago! Return immediately for $${bestValue.toFixed(2)} from ${bestDistributor.distributorName}`;
  } else if (isExpiringSoon) {
    // Less than 1 month remaining - RETURN NOW
    recommendationType = 'return_now';
    confidenceScore = 95;
    reason = `Product expires in ${daysUntilExpiration} days - Return now for $${bestValue.toFixed(2)} from ${bestDistributor.distributorName}`;
  } else {
    // More than 1 month remaining OR no expiration - KEEP
    recommendationType = 'keep';
    confidenceScore = 70;
    
    if (daysUntilExpiration !== null) {
      reason = `Product expires in ${daysUntilExpiration} days (${Math.floor(daysUntilExpiration / 30)} months). Keep for now. Potential return value: $${bestValue.toFixed(2)}`;
    } else {
      reason = `No expiration date. Keep in inventory. Potential return value: $${bestValue.toFixed(2)} from ${bestDistributor.distributorName}`;
    }
  }

  // Build alternative distributors list
  const alternativeDistributors = pricingResult.distributors
    .filter(d => d.distributorName !== bestDistributor.distributorName)
    .map(d => ({
      distributorId: d.distributorId,
      distributorName: d.distributorName,
      fullPrice: d.fullPrice,
      partialPrice: d.partialPrice,
      email: d.email,
      phone: d.phone,
      location: d.location,
      reportDate: d.reportDate,
    }));

  return {
    ndcCode: item.ndcCode,
    ndcNormalized,
    productName: pricingResult.productName || item.productName || 'Unknown Product',
    manufacturer: item.manufacturer,
    quantity: item.quantity,
    fullUnits,
    partialUnits,
    expirationDate: item.expirationDate,
    lotNumber: item.lotNumber,
    recommendationType,
    recommendedDistributor: {
      id: bestDistributor.distributorId,
      name: bestDistributor.distributorName,
      email: bestDistributor.email,
      phone: bestDistributor.phone,
      location: bestDistributor.location,
    },
    estimatedReturnValue: Math.round(bestValue * 100) / 100,
    bestFullPrice: Math.round(pricingResult.bestFullPrice * 100) / 100,
    bestPartialPrice: Math.round(pricingResult.bestPartialPrice * 100) / 100,
    confidenceScore,
    reason,
    alternativeDistributors,
  };
};

// ============================================================
// Main Service Functions
// ============================================================

/**
 * Analyze uploaded inventory file and generate recommendations
 */
export const analyzeInventoryFile = async (
  pharmacyId: string,
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<AnalysisResult> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // 1. Create upload record
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from('pharmacy_inventory_uploads')
    .insert({
      pharmacy_id: pharmacyId,
      file_name: fileName,
      file_type: fileType.toLowerCase().replace('application/', '').replace('text/', ''),
      file_size: buffer.length,
      status: 'processing',
    })
    .select()
    .single();

  if (uploadError || !upload) {
    throw new AppError(`Failed to create upload record: ${uploadError?.message}`, 500);
  }

  try {
    // 2. Parse the file
    const parsed = await parseInventoryFile(buffer, fileType);

    if (parsed.items.length === 0) {
      // Update upload as failed
      await supabaseAdmin
        .from('pharmacy_inventory_uploads')
        .update({
          status: 'failed',
          error_message: parsed.errors.join('; ') || 'No items found in file',
        })
        .eq('id', upload.id);

      throw new AppError(
        parsed.errors.join('; ') || 'No valid inventory items found in the file',
        400
      );
    }

    // 3. Get pricing data for all NDCs using SHARED pricing service
    const pricingMap = await getPricingForNDCs(parsed.items);

    // 4. Generate recommendations for each item
    const recommendations: ItemRecommendation[] = [];
    const itemsToInsert: any[] = [];

    for (const item of parsed.items) {
      const ndcNormalized = item.ndcNormalized || item.ndcCode.replace(/-/g, '');
      const pricingResult = pricingMap.get(ndcNormalized) || null;
      const recommendation = generateRecommendation(item, pricingResult);
      recommendations.push(recommendation);

      // Prepare for database insert
      itemsToInsert.push({
        pharmacy_id: pharmacyId,
        upload_id: upload.id,
        ndc_code: item.ndcCode,
        ndc_normalized: ndcNormalized,
        product_name: recommendation.productName,
        manufacturer: item.manufacturer,
        quantity: item.quantity,
        full_units: recommendation.fullUnits,
        partial_units: recommendation.partialUnits,
        expiration_date: item.expirationDate || null,
        lot_number: item.lotNumber,
        acquisition_cost: item.acquisitionCost,
        recommendation_type: recommendation.recommendationType,
        recommended_distributor_id: recommendation.recommendedDistributor?.id || null,
        recommended_distributor_name: recommendation.recommendedDistributor?.name || null,
        estimated_return_value: recommendation.estimatedReturnValue,
        best_full_price: recommendation.bestFullPrice,
        best_partial_price: recommendation.bestPartialPrice,
        confidence_score: recommendation.confidenceScore,
        recommendation_reason: recommendation.reason,
        status: 'active',
      });
    }

    // 5. Insert all items into database
    const { error: insertError } = await supabaseAdmin
      .from('pharmacy_inventory_items')
      .insert(itemsToInsert);

    if (insertError) {
      console.error('Error inserting inventory items:', insertError);
    }

    // 6. Calculate summary
    const itemsToReturn = recommendations.filter(r => r.recommendationType === 'return_now');
    const itemsToKeep = recommendations.filter(r => r.recommendationType === 'keep' || r.recommendationType === 'monitor');
    const itemsNoData = recommendations.filter(r => r.recommendationType === 'no_data');
    const totalPotentialValue = itemsToReturn.reduce((sum, r) => sum + r.estimatedReturnValue, 0);

    // 7. Update upload record with summary
    await supabaseAdmin
      .from('pharmacy_inventory_uploads')
      .update({
        status: 'completed',
        total_items: recommendations.length,
        total_value: totalPotentialValue,
        items_to_return: itemsToReturn.length,
        items_to_keep: itemsToKeep.length,
      })
      .eq('id', upload.id);

    // 8. Schedule a monthly reminder
    await scheduleMonthlyReminder(pharmacyId, itemsToReturn, totalPotentialValue);

    return {
      uploadId: upload.id,
      totalItems: recommendations.length,
      itemsToReturn,
      itemsToKeep,
      itemsNoData,
      totalPotentialValue: Math.round(totalPotentialValue * 100) / 100,
      summary: {
        returnNow: itemsToReturn.length,
        keep: itemsToKeep.filter(r => r.recommendationType === 'keep').length,
        monitor: itemsToKeep.filter(r => r.recommendationType === 'monitor').length,
        noData: itemsNoData.length,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    // Update upload as failed
    await supabaseAdmin
      .from('pharmacy_inventory_uploads')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', upload.id);

    throw error;
  }
};

/**
 * Schedule a monthly reminder for inventory follow-up
 */
const scheduleMonthlyReminder = async (
  pharmacyId: string,
  itemsToReturn: ItemRecommendation[],
  totalValue: number
): Promise<void> => {
  if (!supabaseAdmin || itemsToReturn.length === 0) return;

  // Schedule reminder for 30 days from now
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 30);

  // Create summary of top items
  const topItems = itemsToReturn
    .sort((a, b) => b.estimatedReturnValue - a.estimatedReturnValue)
    .slice(0, 5)
    .map(item => ({
      ndcCode: item.ndcCode,
      productName: item.productName,
      estimatedValue: item.estimatedReturnValue,
      distributor: item.recommendedDistributor?.name,
    }));

  const title = `Inventory Return Reminder - $${totalValue.toFixed(2)} Potential Value`;
  const message = `You have ${itemsToReturn.length} products that could be returned for an estimated total of $${totalValue.toFixed(2)}. Review your inventory and send these products to the recommended distributors to maximize your returns.`;

  await supabaseAdmin
    .from('inventory_reminders')
    .insert({
      pharmacy_id: pharmacyId,
      reminder_type: 'monthly_review',
      title,
      message,
      scheduled_for: scheduledFor.toISOString(),
      total_items: itemsToReturn.length,
      total_potential_value: totalValue,
      items_summary: topItems,
      status: 'pending',
    });
};

/**
 * Get inventory summary for a pharmacy - SAME FORMAT as upload API response
 * Based on ALL pharmacy inventory data across all uploads
 */
export const getInventorySummary = async (pharmacyId: string): Promise<AnalysisResult> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Get all active inventory items for this pharmacy
  const { data: allItems, error } = await supabaseAdmin
    .from('pharmacy_inventory_items')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('status', 'active');

  if (error) {
    console.error('Error getting inventory items:', error);
    throw new AppError(`Failed to get inventory summary: ${error.message}`, 500);
  }

  if (!allItems || allItems.length === 0) {
    return {
      uploadId: 'summary', // Special ID for summary
      totalItems: 0,
      itemsToReturn: [],
      itemsToKeep: [],
      itemsNoData: [],
      totalPotentialValue: 0,
      summary: {
        returnNow: 0,
        keep: 0,
        monitor: 0,
        noData: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // Convert database items to ItemRecommendation format
  const recommendations: ItemRecommendation[] = allItems.map(item => ({
    id: item.id,
    ndcCode: item.ndc_code,
    ndcNormalized: item.ndc_normalized,
    productName: item.product_name || 'Unknown Product',
    manufacturer: item.manufacturer,
    quantity: item.quantity,
    fullUnits: item.full_units || 0,
    partialUnits: item.partial_units || 0,
    expirationDate: item.expiration_date,
    lotNumber: item.lot_number,
    recommendationType: item.recommendation_type as 'return_now' | 'keep' | 'monitor' | 'no_data',
    recommendedDistributor: item.recommended_distributor_name ? {
      id: item.recommended_distributor_id,
      name: item.recommended_distributor_name,
    } : undefined,
    estimatedReturnValue: item.estimated_return_value || 0,
    bestFullPrice: item.best_full_price || 0,
    bestPartialPrice: item.best_partial_price || 0,
    confidenceScore: item.confidence_score || 0,
    reason: item.recommendation_reason || '',
  }));

  // Categorize items - SAME LOGIC as upload API
  const itemsToReturn = recommendations.filter(r => r.recommendationType === 'return_now');
  const itemsToKeep = recommendations.filter(r => r.recommendationType === 'keep' || r.recommendationType === 'monitor');
  const itemsNoData = recommendations.filter(r => r.recommendationType === 'no_data');
  const totalPotentialValue = itemsToReturn.reduce((sum, r) => sum + r.estimatedReturnValue, 0);

  // Return SAME FORMAT as upload API
  return {
    uploadId: 'summary', // Special ID to indicate this is a summary
    totalItems: recommendations.length,
    itemsToReturn,
    itemsToKeep,
    itemsNoData,
    totalPotentialValue: Math.round(totalPotentialValue * 100) / 100,
    summary: {
      returnNow: itemsToReturn.length,
      keep: itemsToKeep.filter(r => r.recommendationType === 'keep').length,
      monitor: itemsToKeep.filter(r => r.recommendationType === 'monitor').length,
      noData: itemsNoData.length,
    },
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Get inventory items for a pharmacy with filters
 */
export const getInventoryItems = async (
  pharmacyId: string,
  options: {
    status?: string;
    recommendationType?: string;
    uploadId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ items: any[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const {
    status = 'active',
    recommendationType,
    uploadId,
    search,
    limit = 50,
    offset = 0,
    sortBy = 'estimated_return_value',
    sortOrder = 'desc',
  } = options;

  let query = supabaseAdmin
    .from('pharmacy_inventory_items')
    .select('*, pharmacy_inventory_uploads(file_name, created_at)', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId);

  if (status) {
    query = query.eq('status', status);
  }

  if (recommendationType) {
    query = query.eq('recommendation_type', recommendationType);
  }

  if (uploadId) {
    query = query.eq('upload_id', uploadId);
  }

  if (search) {
    query = query.or(`ndc_code.ilike.%${search}%,product_name.ilike.%${search}%`);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to get inventory items: ${error.message}`, 500);
  }

  return {
    items: data || [],
    total: count || 0,
  };
};

/**
 * Get upload history for a pharmacy
 */
export const getUploadHistory = async (
  pharmacyId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ uploads: any[]; total: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error, count } = await supabaseAdmin
    .from('pharmacy_inventory_uploads')
    .select('*', { count: 'exact' })
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(`Failed to get upload history: ${error.message}`, 500);
  }

  return {
    uploads: data || [],
    total: count || 0,
  };
};

/**
 * Mark inventory items as returned
 */
export const markItemsAsReturned = async (
  pharmacyId: string,
  itemIds: string[],
  distributorId: string,
  actualReturnValue?: number
): Promise<{ updated: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory_items')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
      returned_to_distributor_id: distributorId,
      actual_return_value: actualReturnValue || null,
      updated_at: new Date().toISOString(),
    })
    .eq('pharmacy_id', pharmacyId)
    .in('id', itemIds)
    .select();

  if (error) {
    throw new AppError(`Failed to update items: ${error.message}`, 500);
  }

  return { updated: data?.length || 0 };
};

/**
 * Dismiss inventory items (remove from active recommendations)
 */
export const dismissItems = async (
  pharmacyId: string,
  itemIds: string[]
): Promise<{ dismissed: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('pharmacy_inventory_items')
    .update({
      status: 'dismissed',
      updated_at: new Date().toISOString(),
    })
    .eq('pharmacy_id', pharmacyId)
    .in('id', itemIds)
    .select();

  if (error) {
    throw new AppError(`Failed to dismiss items: ${error.message}`, 500);
  }

  return { dismissed: data?.length || 0 };
};

/**
 * Get reminders for a pharmacy
 */
export const getReminders = async (
  pharmacyId: string,
  status?: string
): Promise<ReminderData[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  let query = supabaseAdmin
    .from('inventory_reminders')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('scheduled_for', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to get reminders: ${error.message}`, 500);
  }

  return (data || []).map(r => ({
    id: r.id,
    pharmacyId: r.pharmacy_id,
    reminderType: r.reminder_type,
    title: r.title,
    message: r.message,
    totalItems: r.total_items,
    totalPotentialValue: r.total_potential_value,
    itemsSummary: r.items_summary || [],
    scheduledFor: r.scheduled_for,
    status: r.status,
  }));
};

/**
 * Cancel a reminder
 */
export const cancelReminder = async (
  pharmacyId: string,
  reminderId: string
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { error } = await supabaseAdmin
    .from('inventory_reminders')
    .update({ status: 'cancelled' })
    .eq('id', reminderId)
    .eq('pharmacy_id', pharmacyId)
    .eq('status', 'pending');

  if (error) {
    throw new AppError(`Failed to cancel reminder: ${error.message}`, 500);
  }
};

/**
 * Re-analyze existing inventory items to update prices
 */
export const refreshRecommendations = async (
  pharmacyId: string,
  uploadId?: string
): Promise<{ updated: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  // Get active items
  let query = supabaseAdmin
    .from('pharmacy_inventory_items')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .eq('status', 'active');

  if (uploadId) {
    query = query.eq('upload_id', uploadId);
  }

  const { data: items, error } = await query;

  if (error || !items || items.length === 0) {
    return { updated: 0 };
  }

  // Get fresh pricing using the shared pricing service
  const inventoryItems: InventoryItem[] = items.map(item => ({
    ndcCode: item.ndc_code,
    ndcNormalized: item.ndc_normalized || item.ndc_code.replace(/-/g, ''),
    productName: item.product_name,
    manufacturer: item.manufacturer,
    quantity: item.quantity,
    fullUnits: item.full_units || 0,
    partialUnits: item.partial_units || 0,
    expirationDate: item.expiration_date,
    lotNumber: item.lot_number,
  }));
  
  const pricingMap = await getPricingForNDCs(inventoryItems);

  // Update each item with new recommendations
  let updatedCount = 0;
  for (const item of items) {
    const ndcNormalized = item.ndc_normalized || item.ndc_code.replace(/-/g, '');
    const pricingResult = pricingMap.get(ndcNormalized) || null;
    
    const recommendation = generateRecommendation({
      ndcCode: item.ndc_code,
      ndcNormalized,
      productName: item.product_name,
      manufacturer: item.manufacturer,
      quantity: item.quantity,
      fullUnits: item.full_units,
      partialUnits: item.partial_units,
      expirationDate: item.expiration_date,
      lotNumber: item.lot_number,
    }, pricingResult);

    const { error: updateError } = await supabaseAdmin
      .from('pharmacy_inventory_items')
      .update({
        recommendation_type: recommendation.recommendationType,
        recommended_distributor_id: recommendation.recommendedDistributor?.id || null,
        recommended_distributor_name: recommendation.recommendedDistributor?.name || null,
        estimated_return_value: recommendation.estimatedReturnValue,
        best_full_price: recommendation.bestFullPrice,
        best_partial_price: recommendation.bestPartialPrice,
        confidence_score: recommendation.confidenceScore,
        recommendation_reason: recommendation.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (!updateError) {
      updatedCount++;
    }
  }

  return { updated: updatedCount };
};

