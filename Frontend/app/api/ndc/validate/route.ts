import { NextRequest, NextResponse } from 'next/server';
import { findProductByNDC, formatNDC, isValidNDCFormat } from '@/data/mockNDCProducts';

export async function POST(request: NextRequest) {
  try {
    const { ndc } = await request.json();

    if (!ndc) {
      return NextResponse.json(
        { error: 'NDC is required' },
        { status: 400 }
      );
    }

    // Format NDC to standard format
    const formattedNDC = formatNDC(ndc);

    // Validate format
    if (!isValidNDCFormat(formattedNDC)) {
      return NextResponse.json(
        { error: 'Invalid NDC format. Expected format: XXXXX-XXXX-XX' },
        { status: 400 }
      );
    }

    // Look up in database
    const product = findProductByNDC(formattedNDC);

    if (!product) {
      // In production, would call FDA API here
      return NextResponse.json(
        {
          error: 'NDC not found in database',
          suggestion: 'This NDC may not be in our database. Please verify the code or contact support.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      product: {
        ...product,
        ndc: formattedNDC
      }
    });

  } catch (error) {
    console.error('NDC validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ndc = searchParams.get('ndc');

  if (!ndc) {
    return NextResponse.json(
      { error: 'NDC parameter is required' },
      { status: 400 }
    );
  }

  const formattedNDC = formatNDC(ndc);
  const product = findProductByNDC(formattedNDC);

  if (!product) {
    return NextResponse.json(
      { error: 'NDC not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: true,
    product
  });
}
