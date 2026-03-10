import { NextRequest, NextResponse } from 'next/server';
import { findProductByNDC } from '@/data/mockNDCProducts';

interface CreditEstimationItem {
  ndc: string;
  quantity: number;
  expirationDate: string;
  lotNumber: string;
  condition: 'UNOPENED' | 'OPENED' | 'DAMAGED';
}

export async function POST(request: NextRequest) {
  try {
    const { items, clientId } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    const creditEstimates = await Promise.all(
      items.map(async (item: CreditEstimationItem) => {
        const product = findProductByNDC(item.ndc);

        if (!product) {
          return {
            ...item,
            error: 'Product not found',
            eligible: false,
            estimatedCredit: 0,
          };
        }

        const daysToExpiration = calculateDaysToExpiration(item.expirationDate);
        const creditPercentage = calculateCreditPercentage(
          daysToExpiration,
          product.returnEligibility.returnWindow,
          product.returnEligibility.creditPercentage,
          item.condition
        );

        const baseCredit = product.wac * item.quantity * (creditPercentage / 100);
        const estimatedCredit = baseCredit;

        return {
          ...item,
          productName: product.proprietaryName || product.nonProprietaryName,
          manufacturer: product.manufacturerName,
          strength: product.strength,
          dosageForm: product.dosageForm,
          wacPrice: product.wac,
          creditPercentage,
          estimatedCredit,
          eligible: daysToExpiration <= product.returnEligibility.returnWindow,
          daysToExpiration,
          deaSchedule: product.deaSchedule,
          requiresDEAForm: product.returnEligibility.requiresDEAForm,
          requiresDestruction: product.returnEligibility.destructionRequired,
        };
      })
    );

    const eligibleItems = creditEstimates.filter((item) => item.eligible);
    const totalEstimatedCredit = eligibleItems.reduce(
      (sum, item) => sum + (item.estimatedCredit || 0),
      0
    );

    const serviceFees = calculateServiceFees(totalEstimatedCredit, clientId);
    const transportationFees = calculateTransportationFees(items.length);

    return NextResponse.json({
      items: creditEstimates,
      summary: {
        totalItems: items.length,
        eligibleItems: eligibleItems.length,
        ineligibleItems: items.length - eligibleItems.length,
        totalEstimatedCredit,
        serviceFees,
        transportationFees,
        netCredit: totalEstimatedCredit - serviceFees - transportationFees,
      },
    });

  } catch (error) {
    console.error('Credit estimation error:', error);
    return NextResponse.json(
      { error: 'Credit estimation failed' },
      { status: 500 }
    );
  }
}

function calculateDaysToExpiration(expirationDate: string): number {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateCreditPercentage(
  daysToExpiration: number,
  returnWindow: number,
  baseCreditPercentage: number,
  condition: string
): number {
  // If expired, no credit
  if (daysToExpiration < 0) return 0;

  // If beyond return window, no credit
  if (daysToExpiration > returnWindow) return 0;

  // Adjust based on condition
  let conditionAdjustment = 1.0;
  if (condition === 'OPENED') {
    conditionAdjustment = 0.7; // 70% of credit
  } else if (condition === 'DAMAGED') {
    conditionAdjustment = 0.3; // 30% of credit
  }

  // Calculate credit based on days to expiration
  let creditPercentage = baseCreditPercentage;

  if (daysToExpiration <= 30) {
    creditPercentage = baseCreditPercentage * 0.25; // 25% of base
  } else if (daysToExpiration <= 90) {
    creditPercentage = baseCreditPercentage * 0.50; // 50% of base
  } else if (daysToExpiration <= 180) {
    creditPercentage = baseCreditPercentage * 0.85; // 85% of base
  }

  return Math.round(creditPercentage * conditionAdjustment);
}

function calculateServiceFees(totalCredit: number, clientId?: string): number {
  // In production, would check client contract for negotiated rates
  const feePercentage = 3; // 3% of credit value
  const minimumFee = 25;
  const maximumFee = 500;

  const calculatedFee = totalCredit * (feePercentage / 100);
  return Math.min(Math.max(calculatedFee, minimumFee), maximumFee);
}

function calculateTransportationFees(itemCount: number): number {
  // Base shipping fee plus per-item handling
  const baseShippingFee = 15;
  const perItemFee = 0.50;

  return baseShippingFee + (itemCount * perItemFee);
}
