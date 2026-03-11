/**
 * NDC Lookup Service
 *
 * Multi-source product lookup pipeline:
 *   1. openFDA Drug NDC API  (most detailed: manufacturer, packaging, DEA, dosage form)
 *   2. RxNav / RxNorm API    (concept name, active status)
 *   3. Azure OpenAI          (fallback / enrichment for anything missing)
 *
 * All external HTTP calls use native fetch (Node 18+).
 */

import { client, deployment } from '../config/azureOpenAI';

// ============================================================
// Types
// ============================================================

export interface NDCProductInfo {
  ndc: string;
  ndc11: string | null;
  proprietaryName: string | null;
  genericName: string | null;
  manufacturer: string | null;
  packageDescription: string | null;
  dosageForm: string | null;
  strength: string | null;
  route: string | null;
  deaSchedule: string | null;
  productType: string | null;
  fullPackageSize: number | null;
  activeIngredients: { name: string; strength: string }[];
  source: 'openfda' | 'rxnav' | 'openai' | 'combined';
}

// ============================================================
// openFDA
// ============================================================

const OPENFDA_BASE = 'https://api.fda.gov/drug/ndc.json';

async function lookupOpenFDA(ndc: string): Promise<NDCProductInfo | null> {
  // Try all possible product_ndc interpretations from this NDC
  const candidates = allProductNdcFormats(ndc);

  for (const productNdc of candidates) {
    try {
      const url = `${OPENFDA_BASE}?search=product_ndc:"${encodeURIComponent(productNdc)}"&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const json = await res.json() as any;
      const r = json?.results?.[0];
      if (!r) continue;

      const pkg = r.packaging?.find((p: any) =>
        p.package_ndc?.replace(/-/g, '').includes(ndc.replace(/-/g, '').slice(0, 10))
      ) || r.packaging?.[0];

      return {
        ndc,
        ndc11: null,
        proprietaryName: r.brand_name || r.generic_name || null,
        genericName: r.generic_name || null,
        manufacturer: r.labeler_name || r.openfda?.manufacturer_name?.[0] || null,
        packageDescription: pkg?.description || null,
        dosageForm: r.dosage_form || null,
        strength: r.active_ingredients?.[0]?.strength || null,
        route: Array.isArray(r.route) ? r.route.join(', ') : r.route || null,
        deaSchedule: r.dea_schedule || null,
        productType: r.product_type || null,
        fullPackageSize: extractPackageSize(pkg?.description),
        activeIngredients: (r.active_ingredients || []).map((ai: any) => ({
          name: ai.name,
          strength: ai.strength,
        })),
        source: 'openfda',
      };
    } catch {
      continue;
    }
  }

  return null;
}

// ============================================================
// RxNav / RxNorm
// ============================================================

const RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST';

async function lookupRxNav(ndc: string): Promise<NDCProductInfo | null> {
  const ndcClean = ndc.replace(/-/g, '');

  // Try multiple formats: dashed 5-3-2, dashed 5-4-1, raw digits
  const candidates = [ndc, formatNdc532(ndcClean), formatNdc541(ndcClean), ndcClean];

  for (const candidate of candidates) {
    try {
      const url = `${RXNAV_BASE}/ndcstatus.json?ndc=${encodeURIComponent(candidate)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;

      const json = await res.json() as any;
      const status = json?.ndcStatus;
      if (!status || status.status === 'UNKNOWN') continue;

      return {
        ndc,
        ndc11: status.ndc11 || null,
        proprietaryName: status.conceptName || null,
        genericName: status.conceptName || null,
        manufacturer: null,
        packageDescription: null,
        dosageForm: null,
        strength: null,
        route: null,
        deaSchedule: null,
        productType: null,
        fullPackageSize: null,
        activeIngredients: [],
        source: 'rxnav',
      };
    } catch {
      continue;
    }
  }

  return null;
}

// ============================================================
// Azure OpenAI fallback
// ============================================================

async function lookupWithAI(ndc: string, partialData?: Partial<NDCProductInfo>): Promise<NDCProductInfo | null> {
  try {
    const contextLines: string[] = [];
    if (partialData?.proprietaryName) contextLines.push(`Known name: ${partialData.proprietaryName}`);
    if (partialData?.manufacturer) contextLines.push(`Known manufacturer: ${partialData.manufacturer}`);

    const prompt = `Given the pharmaceutical NDC code "${ndc}"${contextLines.length ? ` (${contextLines.join('; ')})` : ''}, return a JSON object with these fields:
{
  "proprietaryName": "brand name of the product",
  "genericName": "generic name",
  "manufacturer": "manufacturer/labeler name",
  "dosageForm": "tablet/capsule/injection/etc",
  "strength": "e.g. 200 mg",
  "route": "oral/injection/topical/etc",
  "deaSchedule": "CII/CIII/CIV/CV or null if not controlled",
  "productType": "HUMAN PRESCRIPTION DRUG or HUMAN OTC DRUG"
}
Only return valid JSON. If you are not sure about a field, return null for it.`;

    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);

    const response = await client.chat.completions.create({
      model: deployment as string,
      messages: [
        { role: 'system', content: 'You are a pharmaceutical product database. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: 'json_object' } as any,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      ndc,
      ndc11: null,
      proprietaryName: parsed.proprietaryName || partialData?.proprietaryName || null,
      genericName: parsed.genericName || partialData?.genericName || null,
      manufacturer: parsed.manufacturer || partialData?.manufacturer || null,
      packageDescription: partialData?.packageDescription || null,
      dosageForm: parsed.dosageForm || partialData?.dosageForm || null,
      strength: parsed.strength || partialData?.strength || null,
      route: parsed.route || partialData?.route || null,
      deaSchedule: parsed.deaSchedule || partialData?.deaSchedule || null,
      productType: parsed.productType || partialData?.productType || null,
      fullPackageSize: partialData?.fullPackageSize || null,
      activeIngredients: partialData?.activeIngredients || [],
      source: partialData ? 'combined' : 'openai',
    };
  } catch {
    return null;
  }
}

// ============================================================
// Main pipeline: openFDA → RxNav → Azure OpenAI
// ============================================================

/**
 * Look up an NDC across all available sources.
 * Tries openFDA first (richest data), falls back to RxNav, then Azure OpenAI.
 * If openFDA succeeds but has gaps, merges with RxNav/AI data.
 */
export async function lookupNDC(ndc: string): Promise<NDCProductInfo | null> {
  // Try all candidates if we have multiple NDC-11 formats
  const candidates = [ndc];

  // 1. openFDA (primary — most detailed)
  let fdaResult: NDCProductInfo | null = null;
  for (const c of candidates) {
    fdaResult = await lookupOpenFDA(c);
    if (fdaResult) break;
  }

  if (fdaResult && fdaResult.proprietaryName && fdaResult.manufacturer) {
    return fdaResult;
  }

  // 2. RxNav (secondary — good for concept name & NDC-11)
  let rxResult: NDCProductInfo | null = null;
  for (const c of candidates) {
    rxResult = await lookupRxNav(c);
    if (rxResult) break;
  }

  // Merge FDA + RxNav
  if (fdaResult && rxResult) {
    return {
      ...fdaResult,
      ndc11: rxResult.ndc11 || fdaResult.ndc11,
      proprietaryName: fdaResult.proprietaryName || rxResult.proprietaryName,
      genericName: fdaResult.genericName || rxResult.genericName,
      fullPackageSize: fdaResult.fullPackageSize || rxResult.fullPackageSize,
      source: 'combined',
    };
  }

  const bestSoFar = fdaResult || rxResult;

  // 3. Azure OpenAI fallback
  if (!bestSoFar) {
    return lookupWithAI(ndc);
  }

  if (!bestSoFar.proprietaryName || !bestSoFar.manufacturer) {
    return lookupWithAI(ndc, bestSoFar);
  }

  return bestSoFar;
}

/**
 * Try multiple NDC-11 candidates (from GTIN conversion) and return the first hit.
 */
export async function lookupNDCFromCandidates(candidates: string[]): Promise<NDCProductInfo | null> {
  for (const ndc of candidates) {
    const result = await lookupNDC(ndc);
    if (result && result.proprietaryName) return result;
  }

  // If no candidate returned a name, try them all with AI
  if (candidates.length > 0) {
    return lookupWithAI(candidates[0]);
  }

  return null;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract package size (count) from FDA packaging description.
 * Examples:
 *   "100 TABLET, EXTENDED RELEASE in 1 BOTTLE (62332-745-31)" → 100
 *   "1000 TABLET, EXTENDED RELEASE in 1 BOTTLE (62332-745-91)" → 1000
 *   "30 CAPSULE in 1 BOTTLE (12345-678-30)" → 30
 *   "1 TUBE in 1 CARTON (98765-432-01)" → 1
 */
export function extractPackageSizeFromDescription(description: string | null | undefined): number | null {
  return extractPackageSize(description);
}

function extractPackageSize(description: string | null | undefined): number | null {
  if (!description) return null;
  
  // Match patterns like "100 TABLET", "1000 CAPSULE", "30 INJECTION", etc.
  // Look for number at the start followed by a space and dosage form word
  const match = description.match(/^(\d+)\s+(?:TABLET|CAPSULE|INJECTION|VIAL|AMPULE|SYRINGE|PATCH|SUPPOSITORY|CREAM|OINTMENT|GEL|LOTION|SOLUTION|SUSPENSION|POWDER|GRANULE|PELLET|LOZENGE|TROCHE|FILM|STRIP|DISC|RING|INSERT|APPLICATOR|BOTTLE|TUBE|JAR|PACKET|SACHET|POUCH|BAG|KIT|DEVICE|INHALER|PEN|CARTRIDGE|PREFILLED|UNIT|DOSE)/i);
  
  if (match) {
    const size = parseInt(match[1], 10);
    return isNaN(size) ? null : size;
  }
  
  // Fallback: try to find any number at the beginning
  const fallbackMatch = description.match(/^(\d+)/);
  if (fallbackMatch) {
    const size = parseInt(fallbackMatch[1], 10);
    return isNaN(size) ? null : size;
  }
  
  return null;
}

/**
 * Generate all possible product_ndc (labeler-product) formats for openFDA search.
 * openFDA stores product_ndc WITHOUT leading zeros, so we must strip them.
 *
 * NDC-10 `4354732506` could be interpreted as:
 *   5-4-1 → "43547-3250"
 *   5-3-2 → "43547-325"
 *   4-4-2 → "4354-7325"
 */
function allProductNdcFormats(ndc: string): string[] {
  const digits = ndc.replace(/-/g, '');
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (s: string) => {
    // Also add variant with leading-zero product segment stripped (openFDA stores "43547-325" not "43547-0325")
    const stripped = s.replace(/-0+(\d)/, '-$1');
    if (!seen.has(s)) { seen.add(s); result.push(s); }
    if (stripped !== s && !seen.has(stripped)) { seen.add(stripped); result.push(stripped); }
  };

  // If already dashed, try as-is and strip package
  if (ndc.includes('-')) {
    const parts = ndc.split('-');
    if (parts.length >= 2) add(parts.slice(0, 2).join('-'));
  }

  // Try all 3 NDC-10 interpretations from raw digits
  if (digits.length >= 10) {
    const d = digits.slice(0, 10);
    add(`${d.slice(0, 5)}-${d.slice(5, 9)}`);  // 5-4
    add(`${d.slice(0, 5)}-${d.slice(5, 8)}`);  // 5-3
    add(`${d.slice(0, 4)}-${d.slice(4, 8)}`);  // 4-4
  }

  return result;
}

function formatNdc532(digits: string): string {
  if (digits.length < 10) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}-${digits.slice(8, 10)}`;
}

function formatNdc541(digits: string): string {
  if (digits.length < 10) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9, 10)}`;
}
