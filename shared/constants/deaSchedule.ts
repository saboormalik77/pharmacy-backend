/**
 * DEA Schedule Options for controlled substances
 * 
 * CI = Schedule I (not typically used in pharmacy)
 * CII = Schedule II (requires DEA Form 222)
 * CIII = Schedule III
 * CIV = Schedule IV  
 * CV = Schedule V
 * Non-Controlled = Not a controlled substance
 */
export const DEA_SCHEDULE_OPTIONS = [
  '', 'CI', 'CII', 'CIII', 'CIV', 'CV', 'Non-Controlled'
] as const;

/**
 * Check if a DEA schedule indicates Schedule II (requires DEA Form 222)
 */
export function isScheduleII(deaSchedule: string | null | undefined): boolean {
  if (!deaSchedule) return false;
  
  const schedule = deaSchedule.trim().toUpperCase();
  return schedule === 'CII' ||      // Primary value from dropdown
         schedule === 'C-II' ||     // Legacy format
         schedule === 'C2' ||
         schedule === 'II' ||
         schedule === '2' ||
         schedule.includes('SCHEDULE II');
}

/**
 * Check if a DEA schedule indicates any controlled substance (CI-CV)
 */
export function isControlledSubstance(deaSchedule: string | null | undefined): boolean {
  if (!deaSchedule) return false;
  
  const schedule = deaSchedule.trim().toLowerCase();
  return schedule !== 'non-controlled' && 
         schedule !== '' &&
         (schedule.includes('c') || 
          schedule.match(/^[1-5iv]+$/) ||
          schedule.includes('schedule'));
}