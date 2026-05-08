import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import { findProductByNDC } from './productsService';

export interface CreditEstimateItem {
  ndc: string;
  quantity: number;
  expiration_date: string;
  lot_number: string;
  condition?: 'UNOPENED' | 'OPENED' | 'DAMAGED';
}

export interface CreditEstimate {
  ndc: string;
  product_name?: string;
  manufacturer?: string;
  quantity: number;
  unit_price?: number;
  credit_percentage: number;
  estimated_credit: number;
  eligible: boolean;
  expiration_warning?: string;
  requires_dea_form?: boolean;
  dea_schedule?: string;
  destruction_required?: boolean;
  return_window?: number;
  days_to_expiration?: number;
}

const calculateDaysToExpiration = (expirationDate: string): number => {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const calculateCreditPercentage = (
  daysToExpiration: number,
  returnWindow: number,
  baseCreditPercentage: number,
  condition?: string
): number => {
  if (daysToExpiration < 0) return 0;
  if (daysToExpiration > returnWindow) return 0;

  let conditionAdjustment = 1.0;
  if (condition === 'OPENED') {
    conditionAdjustment = 0.7;
  } else if (condition === 'DAMAGED') {
    conditionAdjustment = 0.3;
  }

  let creditPercentage = baseCreditPercentage;

  if (daysToExpiration <= 30) {
    creditPercentage = baseCreditPercentage * 0.25;
  } else if (daysToExpiration <= 90) {
    creditPercentage = baseCreditPercentage * 0.50;
  } else if (daysToExpiration <= 180) {
    creditPercentage = baseCreditPercentage * 0.85;
  }

  return Math.round(creditPercentage * conditionAdjustment);
};

export const estimateCredits = async (
  items: CreditEstimateItem[]
): Promise<{
  items: CreditEstimate[];
  summary: {
    totalItems: number;
    eligibleItems: number;
    ineligibleItems: number;
    totalEstimatedCredit: number;
    serviceFees: number;
    transportationFees: number;
    netCredit: number;
  };
}> => {
  if (!items || items.length === 0) {
    throw new AppError('Items array is required', 400);
  }

  const estimates: CreditEstimate[] = [];

  for (const item of items) {
    const product = await findProductByNDC(item.ndc);

    if (!product) {
      estimates.push({
        ndc: item.ndc,
        quantity: item.quantity,
        credit_percentage: 0,
        estimated_credit: 0,
        eligible: false,
      });
      continue;
    }

    const daysToExpiration = calculateDaysToExpiration(item.expiration_date);
    const returnEligibility = product.return_eligibility || {};
    const returnWindow = returnEligibility.returnWindow || 365;
    const baseCreditPercentage = returnEligibility.creditPercentage || 0;

    const creditPercentage = calculateCreditPercentage(
      daysToExpiration,
      returnWindow,
      baseCreditPercentage,
      item.condition
    );

    const unitPrice = product.wac || 0;
    const estimatedCredit = unitPrice * item.quantity * (creditPercentage / 100);

    estimates.push({
      ndc: item.ndc,
      product_name: product.product_name,
      manufacturer: product.manufacturer,
      quantity: item.quantity,
      unit_price: unitPrice,
      credit_percentage: creditPercentage,
      estimated_credit: estimatedCredit,
      eligible: daysToExpiration <= returnWindow && daysToExpiration >= 0,
      expiration_warning:
        daysToExpiration < 0
          ? 'Product has expired'
          : daysToExpiration < returnWindow
          ? `Expires in ${daysToExpiration} days (within return window)`
          : undefined,
      requires_dea_form: product.dea_schedule === 'CII' || returnEligibility.requiresDEAForm,
      dea_schedule: product.dea_schedule,
      destruction_required: returnEligibility.destructionRequired,
      return_window: returnWindow,
      days_to_expiration: daysToExpiration,
    });
  }

  const eligibleItems = estimates.filter((item) => item.eligible);
  const totalEstimatedCredit = eligibleItems.reduce((sum, item) => sum + item.estimated_credit, 0);

  // Calculate fees
  const serviceFees = calculateServiceFees(totalEstimatedCredit);
  const transportationFees = calculateTransportationFees(items.length);
  const netCredit = totalEstimatedCredit - serviceFees - transportationFees;

  return {
    items: estimates,
    summary: {
      totalItems: items.length,
      eligibleItems: eligibleItems.length,
      ineligibleItems: items.length - eligibleItems.length,
      totalEstimatedCredit,
      serviceFees,
      transportationFees,
      netCredit,
    },
  };
};

const calculateServiceFees = (totalCredit: number): number => {
  const feePercentage = 3; // 3% of credit value
  const minimumFee = 25;
  const maximumFee = 500;

  const calculatedFee = totalCredit * (feePercentage / 100);
  return Math.min(Math.max(calculatedFee, minimumFee), maximumFee);
};

const calculateTransportationFees = (itemCount: number): number => {
  const baseShippingFee = 15;
  const perItemFee = 0.5;
  return baseShippingFee + itemCount * perItemFee;
};

