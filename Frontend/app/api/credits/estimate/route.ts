import { NextRequest, NextResponse } from 'next/server';
import { findProductByNDC } from '@/data/mockNDCProducts';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    const estimates = items.map((item: any) => {
      const { ndc, quantity, lotNumber, expirationDate } = item;

      if (!ndc || !quantity) {
        return {
          error: 'NDC and quantity are required',
          item,
        };
      }

      const product = findProductByNDC(ndc);

      if (!product) {
        return {
          error: 'Product not found',
          ndc,
          estimatedCredit: 0,
        };
      }

      // Check expiration eligibility
      let eligible = product.returnEligibility.eligible;
      let expirationWarning = null;

      if (expirationDate) {
        const expDate = new Date(expirationDate);
        const today = new Date();
        const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
          eligible = false;
          expirationWarning = 'Product has expired';
        } else if (daysUntilExpiration < product.returnEligibility.returnWindow) {
          expirationWarning = `Expires in ${daysUntilExpiration} days (within return window)`;
        }
      }

      // Calculate credit
      const unitPrice = product.wac || 0;
      const creditPercentage = eligible ? (product.returnEligibility.creditPercentage || 0) : 0;
      const estimatedCredit = unitPrice * quantity * (creditPercentage / 100);

      // Determine if DEA form is required
      const requiresDEAForm = product.deaSchedule === 'CII' || product.returnEligibility.requiresDEAForm;

      return {
        ndc,
        productName: product.proprietaryName || product.nonProprietaryName,
        quantity,
        unitPrice,
        creditPercentage,
        estimatedCredit,
        eligible,
        expirationWarning,
        requiresDEAForm,
        deaSchedule: product.deaSchedule,
        destructionRequired: product.returnEligibility.destructionRequired,
        returnWindow: product.returnEligibility.returnWindow,
      };
    });

    const totalEstimatedCredit = estimates.reduce((sum, est) => {
      return sum + (est.estimatedCredit || 0);
    }, 0);

    const hasDEAItems = estimates.some(est => est.requiresDEAForm);

    return NextResponse.json({
      success: true,
      estimates,
      summary: {
        totalItems: items.length,
        totalEstimatedCredit,
        eligibleItems: estimates.filter(est => est.eligible).length,
        hasDEAItems,
        requiresDEAForm: hasDEAItems,
      },
    });

  } catch (error) {
    console.error('Credit estimation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

