import { NextRequest, NextResponse } from 'next/server';
import { mockNDCProducts } from '@/data/mockNDCProducts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ndc = searchParams.get('ndc');
    const name = searchParams.get('name');
    const lotNumber = searchParams.get('lotNumber');
    const status = searchParams.get('status') || 'available';

    // In production, this would search actual inventory database
    // For now, we'll return mock inventory items based on NDC products
    
    let results: any[] = [];

    if (ndc) {
      const product = mockNDCProducts.find(p => p.ndc === ndc);
      if (product) {
        // Generate mock inventory items
        results = [
          {
            id: `INV-${product.ndc}-001`,
            ndc: product.ndc,
            productName: product.proprietaryName || product.nonProprietaryName,
            strength: product.strength,
            dosageForm: product.dosageForm,
            manufacturer: product.labelerName,
            lotNumber: lotNumber || `LOT-${Date.now()}`,
            expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days from now
            quantity: Math.floor(Math.random() * 500) + 50,
            packageSize: product.packageSize,
            status: status,
            wac: product.wac,
            awp: product.awp,
            location: {
              warehouse: 'WH-001',
              city: 'Springfield',
              state: 'IL',
            },
          },
        ];
      }
    } else if (name) {
      // Search by name
      const matchingProducts = mockNDCProducts.filter(p =>
        (p.proprietaryName?.toLowerCase().includes(name.toLowerCase()) ||
         p.nonProprietaryName.toLowerCase().includes(name.toLowerCase()))
      );

      results = matchingProducts.slice(0, 10).map((product, index) => ({
        id: `INV-${product.ndc}-${index + 1}`,
        ndc: product.ndc,
        productName: product.proprietaryName || product.nonProprietaryName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        manufacturer: product.labelerName,
        lotNumber: `LOT-${Date.now()}-${index}`,
        expirationDate: new Date(Date.now() + (180 + index * 30) * 24 * 60 * 60 * 1000).toISOString(),
        quantity: Math.floor(Math.random() * 500) + 50,
        packageSize: product.packageSize,
        status: status,
        wac: product.wac,
        awp: product.awp,
        location: {
          warehouse: `WH-00${index + 1}`,
          city: 'Springfield',
          state: 'IL',
        },
      }));
    } else {
      // Return all available inventory (limited)
      results = mockNDCProducts.slice(0, 20).map((product, index) => ({
        id: `INV-${product.ndc}-${index + 1}`,
        ndc: product.ndc,
        productName: product.proprietaryName || product.nonProprietaryName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        manufacturer: product.labelerName,
        lotNumber: `LOT-${Date.now()}-${index}`,
        expirationDate: new Date(Date.now() + (180 + index * 30) * 24 * 60 * 60 * 1000).toISOString(),
        quantity: Math.floor(Math.random() * 500) + 50,
        packageSize: product.packageSize,
        status: status,
        wac: product.wac,
        awp: product.awp,
        location: {
          warehouse: `WH-00${index + 1}`,
          city: 'Springfield',
          state: 'IL',
        },
      }));
    }

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Inventory search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

