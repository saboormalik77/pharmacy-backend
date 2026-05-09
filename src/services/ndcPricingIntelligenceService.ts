/**
 * NDC Pricing Intelligence Service (FCR-56)
 *
 * Thin RPC callers over the SQL functions defined in
 * scripts/fcr_56_ndc_pricing_intelligence.sql.
 *
 * All real logic (recompute, reliability bucketing, last-5 trail, etc.) lives
 * in PostgreSQL — this layer just wraps the calls.
 */

import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import type { CreditMemoLineItem } from './azureDocumentIntelligenceService';

function ensureAdmin() {
  if (!supabaseAdmin) throw new AppError('Supabase admin client not configured', 500);
  return supabaseAdmin;
}

function handleRpcResult(data: any, rpcError: any, label: string) {
  if (rpcError) throw new AppError(`${label}: ${rpcError.message}`, 400);
  if (!data) throw new AppError(`${label}: no data returned`, 500);
  if (data.error) throw new AppError(data.message || label, data.code || 400);
  return data;
}

// ============================================================
// Types
// ============================================================

export type ManufacturerReliability = 'excellent' | 'good' | 'average' | 'poor' | 'unknown';

export interface NDCPricingIntelligence {
  found: boolean;
  ndc: string | null;
  ndcNormalized: string | null;
  productName?: string | null;
  manufacturer?: string | null;
  currentPrice?: number | null;
  estimatedStorePrice?: number | null;
  priceSource?: string | null;
  closeOutDestination?: string | null;
  avgAskPrice?: number | null;
  avgReceivedPrice?: number | null;
  askReceivedRatio?: number | null;
  paymentSampleCount: number;
  aiConfidence?: number | null;
  manufacturerReliability: ManufacturerReliability;
  lastAskReceivedUpdate?: string | null;
  minReceivedPrice?: number | null;
  maxReceivedPrice?: number | null;
  last5Payments: any[];
}

export interface OptimalAskPriceResult {
  optimalAskPrice: number;
  expectedReceivedPrice: number;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  priceRange: { minExpected: number; maxExpected: number };
}

// ============================================================
// RPC wrappers
// ============================================================

export const getNDCPricingIntelligence = async (
  ndc: string
): Promise<NDCPricingIntelligence> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('get_ndc_pricing_intelligence', { p_ndc: ndc });
  handleRpcResult(data, error, 'Failed to get NDC pricing intelligence');
  return data.data as NDCPricingIntelligence;
};

export const resolveNDCPriceWithIntelligence = async (
  ndc: string
): Promise<NDCPricingIntelligence> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('resolve_ndc_price_with_intelligence', { p_ndc: ndc });
  if (error) throw new AppError(`Failed to resolve NDC intelligence: ${error.message}`, 400);
  return data as NDCPricingIntelligence;
};

export const recordCreditMemoAnalysis = async (input: {
  debitMemoId: string;
  creditMemoUrl?: string | null;
  status: 'completed' | 'failed' | 'manual_review' | 'pending' | 'processing';
  confidence: number | null;
  extractedTotal: number | null;
  items: CreditMemoLineItem[];
  errorMessage?: string | null;
}): Promise<{ analysisId: string; inserted: number; skipped: number; distinctNdcs: string[] }> => {
  const sb = ensureAdmin();
  const { data, error } = await sb.rpc('record_credit_memo_analysis', {
    p_debit_memo_id: input.debitMemoId,
    p_credit_memo_url: input.creditMemoUrl ?? null,
    p_ai_status: input.status,
    p_ai_confidence: input.confidence,
    p_ai_extracted_total: input.extractedTotal,
    p_ai_items: input.items as any,
    p_ai_error_message: input.errorMessage ?? null,
  });
  handleRpcResult(data, error, 'Failed to record credit memo analysis');
  const out = data.data as {
    analysisId: string;
    inserted: number;
    skipped: number;
    distinctNdcs: string[] | null;
  };
  return {
    analysisId: out.analysisId,
    inserted: out.inserted ?? 0,
    skipped: out.skipped ?? 0,
    distinctNdcs: out.distinctNdcs ?? [],
  };
};

// ============================================================
// Optimal-ask calculation (pricing formula from the design doc)
// Lives in TS rather than SQL because it's a pure calculation that
// frontend / scan flow callers want to reuse with custom targets.
// ============================================================

const RELIABILITY_ADJUSTMENT: Record<ManufacturerReliability, number> = {
  excellent: 0,
  good: 0.02,
  average: 0.05,
  poor: 0.12,
  unknown: 0.08,
};

function sampleSizeAdjustment(samples: number): number {
  if (samples >= 15) return -0.02;
  if (samples >= 5) return 0;
  if (samples >= 3) return 0.04;
  return 0.08;
}

function aiConfidenceAdjustment(confidence: number | null | undefined): number {
  if (confidence == null) return 0.06;
  if (confidence >= 80) return 0;
  if (confidence >= 70) return 0.03;
  return 0.06;
}

function classifyRisk(
  ratio: number | null | undefined,
  samples: number,
  confidence: number | null | undefined
): 'low' | 'medium' | 'high' {
  if (ratio != null && ratio >= 85 && samples >= 5 && (confidence ?? 0) >= 80) return 'low';
  if (ratio != null && ratio >= 70 && samples >= 3) return 'medium';
  return 'high';
}

export const calculateOptimalAskPrice = (
  intelligence: NDCPricingIntelligence,
  targetReceived: number
): OptimalAskPriceResult => {
  if (!Number.isFinite(targetReceived) || targetReceived <= 0) {
    return {
      optimalAskPrice: 0,
      expectedReceivedPrice: 0,
      confidence: 0,
      reasoning: 'Target received price is not set',
      riskLevel: 'high',
      priceRange: { minExpected: 0, maxExpected: 0 },
    };
  }

  const ratio = intelligence.askReceivedRatio ?? null;
  const samples = intelligence.paymentSampleCount ?? 0;
  const aiConf = intelligence.aiConfidence ?? null;
  const reliability = (intelligence.manufacturerReliability ?? 'unknown') as ManufacturerReliability;

  if (samples === 0 || ratio == null || ratio <= 0) {
    const ask = +(targetReceived * 1.15).toFixed(2);
    return {
      optimalAskPrice: ask,
      expectedReceivedPrice: targetReceived,
      confidence: 30,
      reasoning: 'No historical payment data — applying default 15% buffer',
      riskLevel: 'high',
      priceRange: {
        minExpected: +(targetReceived * 0.85).toFixed(2),
        maxExpected: +targetReceived.toFixed(2),
      },
    };
  }

  const baseAsk = targetReceived / (ratio / 100);
  const multiplier =
    1 +
    RELIABILITY_ADJUSTMENT[reliability] +
    sampleSizeAdjustment(samples) +
    aiConfidenceAdjustment(aiConf);

  const optimal = +(baseAsk * multiplier).toFixed(2);
  const expected = +((optimal * ratio) / 100).toFixed(2);

  const minRecv = intelligence.minReceivedPrice ?? expected * 0.9;
  const maxRecv = intelligence.maxReceivedPrice ?? expected * 1.1;

  return {
    optimalAskPrice: optimal,
    expectedReceivedPrice: expected,
    confidence: Math.min(100, Math.round(((aiConf ?? 70) + Math.min(samples, 20) * 1.5) / 1.3)),
    reasoning: `Based on ${ratio.toFixed(1)}% historical pay rate from ${samples} sample${
      samples === 1 ? '' : 's'
    } (${reliability} manufacturer)`,
    riskLevel: classifyRisk(ratio, samples, aiConf),
    priceRange: {
      minExpected: +Number(minRecv).toFixed(2),
      maxExpected: +Number(maxRecv).toFixed(2),
    },
  };
};
