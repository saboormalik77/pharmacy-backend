/**
 * Wine Cellar Cron Service
 * 
 * Runs daily to surface wine cellar items whose expected_returnable_date has passed.
 * 
 * Logic:
 * - Call check_and_surface_ready_items() RPC
 * - Updates all shelved items where expected_returnable_date <= today
 * - Changes status from 'shelved' → 'ready_to_return'
 * - These items become available for extraction into return transactions
 */

import { checkAndSurfaceReadyItems } from './wineCellarService';

// ============================================================
// Main Cron Function
// ============================================================

/**
 * Check wine cellar for items ready to be returned and surface them.
 * This function is designed to be called by a scheduled job (cron).
 * 
 * @returns Object with surfacedCount and items array
 */
export const surfaceReadyWineCellarItems = async (): Promise<{
  surfacedCount: number;
  items: any[];
}> => {
  try {
    console.log('🍷 [Wine Cellar Cron] Checking for items ready to surface...');
    
    const result = await checkAndSurfaceReadyItems();
    
    if (result.surfacedCount > 0) {
      console.log(`✅ [Wine Cellar Cron] Surfaced ${result.surfacedCount} items to ready_to_return status`);
    } else {
      console.log('ℹ️  [Wine Cellar Cron] No items ready to surface at this time');
    }
    
    return {
      surfacedCount: result.surfacedCount,
      items: result.items,
    };
  } catch (error: any) {
    console.error('❌ [Wine Cellar Cron] Error surfacing items:', error.message);
    throw error;
  }
};

/**
 * Calculate milliseconds until 2 AM tomorrow (best time to run daily check)
 */
export const getMillisecondsUntilNextRun = (): number => {
  const now = new Date();
  const tomorrow2AM = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    2, // 2 AM
    0,
    0,
    0
  );
  return tomorrow2AM.getTime() - now.getTime();
};
