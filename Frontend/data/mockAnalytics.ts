import type { AnalyticsSummary, OptimizationRecommendation } from '@/types'

export const mockAnalyticsSummary: AnalyticsSummary = {
  totalDocuments: 12,
  totalDistributors: 5,
  totalNDCs: 45,
  totalDataPoints: 234,
  averagePriceVariance: 8.5,
  potentialSavings: 1250.75,
  documentsThisMonth: 3,
  lastUploadDate: '2024-02-10T16:45:00Z',
}

export const mockOptimizationRecommendation: OptimizationRecommendation = {
  id: 'opt-1',
  pharmacyId: 'pharm-1',
  productListId: 'list-1',
  recommendations: [
    {
      ndc: '00093-2263-01',
      productName: 'Amoxicillin 500mg Capsule',
      recommendedDistributor: 'XYZ Pharmaceutical Returns',
      expectedPrice: 0.92,
      alternativeDistributors: [
        {
          name: 'ABC Reverse Distributors',
          price: 0.855,
          difference: -0.065,
        },
        {
          name: 'MedReturn Solutions',
          price: 0.7825,
          difference: -0.1375,
        },
      ],
      savings: 13.75,
    },
    {
      ndc: '69618-010-01',
      productName: 'Tylenol 325mg Tablet',
      recommendedDistributor: 'XYZ Pharmaceutical Returns',
      expectedPrice: 0.13,
      alternativeDistributors: [
        {
          name: 'ABC Reverse Distributors',
          price: 0.12,
          difference: -0.01,
        },
      ],
      savings: 5.00,
    },
  ],
  totalPotentialSavings: 18.75,
  generatedAt: '2024-02-15T10:00:00Z',
}

