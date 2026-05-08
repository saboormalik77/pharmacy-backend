// Commission calculation utilities

export interface CommissionConfig {
  rate: number; // Commission percentage (e.g., 5 for 5%)
  minimumCommission?: number; // Minimum commission amount
  maximumCommission?: number; // Maximum commission amount
}

// Default commission rate: 5%
export const DEFAULT_COMMISSION_RATE = 5;

/**
 * Calculate commission for a payment amount
 */
export function calculateCommission(
  amount: number,
  config: CommissionConfig = { rate: DEFAULT_COMMISSION_RATE }
): { rate: number; amount: number; netAmount: number } {
  const commissionAmount = (amount * config.rate) / 100;
  
  let finalCommission = commissionAmount;
  
  if (config.minimumCommission && commissionAmount < config.minimumCommission) {
    finalCommission = config.minimumCommission;
  }
  
  if (config.maximumCommission && commissionAmount > config.maximumCommission) {
    finalCommission = config.maximumCommission;
  }
  
  return {
    rate: config.rate,
    amount: finalCommission,
    netAmount: amount - finalCommission,
  };
}

/**
 * Calculate commission for multiple items
 */
export function calculateCommissionForItems(
  items: Array<{ amount: number }>,
  config: CommissionConfig = { rate: DEFAULT_COMMISSION_RATE }
): { rate: number; totalCommission: number; totalNetAmount: number; itemCommissions: Array<{ amount: number; commission: number; netAmount: number }> } {
  const itemCommissions = items.map(item => {
    const commission = calculateCommission(item.amount, config);
    return {
      amount: item.amount,
      commission: commission.amount,
      netAmount: commission.netAmount,
    };
  });
  
  const totalCommission = itemCommissions.reduce((sum, item) => sum + item.commission, 0);
  const totalNetAmount = itemCommissions.reduce((sum, item) => sum + item.netAmount, 0);
  
  return {
    rate: config.rate,
    totalCommission,
    totalNetAmount,
    itemCommissions,
  };
}

/**
 * Format commission for display
 */
export function formatCommission(commission: { rate: number; amount: number; netAmount: number }): string {
  return `${commission.rate}% (${commission.amount.toFixed(2)})`;
}

