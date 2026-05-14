import { bgSupabaseAdmin } from '../config/supabase';

/**
 * Fetch a map of { pharmacyId: pharmacyName } from BG Admin DB for the given IDs.
 * Returns empty object if no IDs or BG client unavailable.
 */
export async function getPharmacyNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length || !bgSupabaseAdmin) return {};

  const { data, error } = await bgSupabaseAdmin.rpc('bg_get_pharmacy_names_by_ids', {
    p_ids: ids,
  });

  if (error || !data) return {};
  return data as Record<string, string>;
}

/**
 * Search BG Admin DB for pharmacy IDs whose name matches the search term.
 * Returns null if no match (so caller can skip the filter), or an array of UUIDs.
 */
export async function getPharmacyIdsForSearch(search: string): Promise<string[] | null> {
  if (!search || !bgSupabaseAdmin) return null;

  const { data, error } = await bgSupabaseAdmin.rpc('bg_search_pharmacy_ids_by_name', {
    p_search: search,
  });

  if (error || !data) return null;
  return (data as string[]) ?? null;
}

/**
 * Inject pharmacyName into a flat array of debit memo objects.
 * Mutates items in-place and returns the same array.
 */
export function injectPharmacyNames(
  items: any[],
  namesMap: Record<string, string>
): any[] {
  for (const item of items) {
    if (item.pharmacyId) {
      item.pharmacyName = namesMap[item.pharmacyId] ?? '';
    }
  }
  return items;
}

/**
 * Inject pharmacyName into grouped results (each group has returnId/pharmacyId + nested memos[]).
 * Mutates groups in-place and returns the same array.
 */
export function injectPharmacyNamesGrouped(
  groups: any[],
  namesMap: Record<string, string>
): any[] {
  for (const group of groups) {
    if (group.pharmacyId) {
      group.pharmacyName = namesMap[group.pharmacyId] ?? '';
    }
    if (Array.isArray(group.memos)) {
      for (const memo of group.memos) {
        if (memo.pharmacyId) {
          memo.pharmacyName = namesMap[memo.pharmacyId] ?? '';
        }
      }
    }
  }
  return groups;
}

/**
 * Collect all unique pharmacy IDs from a flat list of items.
 */
export function collectPharmacyIds(items: any[]): string[] {
  return [...new Set(items.map((i) => i.pharmacyId).filter(Boolean))];
}

/**
 * Collect all unique pharmacy IDs from a grouped result set (groups + nested memos).
 */
export function collectPharmacyIdsGrouped(groups: any[]): string[] {
  const ids = new Set<string>();
  for (const group of groups) {
    if (group.pharmacyId) ids.add(group.pharmacyId);
    if (Array.isArray(group.memos)) {
      for (const memo of group.memos) {
        if (memo.pharmacyId) ids.add(memo.pharmacyId);
      }
    }
  }
  return [...ids];
}
