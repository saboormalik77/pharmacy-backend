export const optimizationSchemas = {
  AlternativeDistributor: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        example: 'ABC Reverse Distributors',
      },
      price: {
        type: 'number',
        example: 0.855,
      },
      difference: {
        type: 'number',
        example: -0.065,
        description: 'Price difference from recommended distributor (negative means cheaper)',
      },
      available: {
        type: 'boolean',
        example: true,
        description: 'Whether this distributor has recent data (within last 30 days)',
      },
      email: {
        type: 'string',
        example: 'support@abcreverse.com',
        nullable: true,
        description: 'Contact email for this distributor',
      },
      phone: {
        type: 'string',
        example: '(555) 123-4567',
        nullable: true,
        description: 'Contact phone for this distributor',
      },
      location: {
        type: 'string',
        example: '123 Main St, Springfield, IL, 62701, USA',
        nullable: true,
        description: 'Location/address of this distributor',
      },
    },
  },
  OptimizationRecommendation: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Product list item ID',
      },
      ndc: {
        type: 'string',
        example: '00093-2263-01',
      },
      productName: {
        type: 'string',
        example: 'Amoxicillin 500mg Capsule',
      },
      quantity: {
        type: 'number',
        example: 13,
        description: 'Quantity of the product in the pharmacy list',
      },
      full: {
        type: 'number',
        nullable: true,
        example: 1,
        description: 'Full units from return reports data',
      },
      partial: {
        type: 'number',
        nullable: true,
        example: 0,
        description: 'Partial units from return reports data',
      },
      lotNumber: {
        type: 'string',
        nullable: true,
        example: 'LOT123456',
        description: 'Lot number of the product',
      },
      expirationDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2025-12-31',
        description: 'Expiration date of the product',
      },
      recommendedDistributor: {
        type: 'string',
        example: 'XYZ Pharmaceutical Returns',
      },
      recommendedDistributorContact: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            example: 'support@xyzpharma.com',
            nullable: true,
            description: 'Contact email for the recommended distributor',
          },
          phone: {
            type: 'string',
            example: '(555) 987-6543',
            nullable: true,
            description: 'Contact phone for the recommended distributor',
          },
          location: {
            type: 'string',
            example: '456 Oak Ave, Chicago, IL, 60601, USA',
            nullable: true,
            description: 'Location/address of the recommended distributor',
          },
        },
        nullable: true,
        description: 'Contact information for the recommended distributor',
      },
      expectedPrice: {
        type: 'number',
        example: 0.92,
        description: 'Best price per unit from recommended distributor',
      },
      worstPrice: {
        type: 'number',
        example: 0.855,
        description: 'Worst (lowest) price per unit among all distributors',
      },
      available: {
        type: 'boolean',
        example: true,
        description: 'Whether the recommended distributor has recent data (within last 30 days)',
      },
      alternativeDistributors: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/AlternativeDistributor',
        },
      },
      savings: {
        type: 'number',
        example: 13.75,
        description: 'Potential savings by using recommended distributor',
      },
    },
  },
  OptimizationResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/OptimizationRecommendation',
            },
          },
          totalPotentialSavings: {
            type: 'number',
            example: 18.75,
            description: 'Total potential savings across all recommendations',
          },
          generatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-15T10:00:00Z',
          },
          distributorUsage: {
            type: 'object',
            properties: {
              usedThisMonth: {
                type: 'number',
                example: 2,
                description: 'Number of distributors used this month',
              },
              totalDistributors: {
                type: 'number',
                example: 5,
                description: 'Total number of active distributors',
              },
              stillAvailable: {
                type: 'number',
                example: 3,
                description: 'Number of distributors still available this month',
              },
            },
          },
          earningsComparison: {
            type: 'object',
            properties: {
              singleDistributorStrategy: {
                type: 'number',
                example: 80.32,
                description: 'Earnings using only the best recommended distributor',
              },
              multipleDistributorsStrategy: {
                type: 'number',
                example: 108.43,
                description: 'Earnings using all available distributors this month',
              },
              potentialAdditionalEarnings: {
                type: 'number',
                example: 28.11,
                description: 'Potential additional earnings by using multiple distributors',
              },
            },
          },
        },
      },
    },
  },
  PackageProduct: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Item ID (returned from database for created packages)',
      },
      ndc: {
        type: 'string',
        example: '00093-2263-01',
        description: 'NDC code of the product',
      },
      productId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        description: 'Product ID from product_list_items (used for tracking)',
      },
      productName: {
        type: 'string',
        example: 'Amoxicillin 500mg Capsule',
        description: 'Name of the product',
      },
      full: {
        type: 'number',
        example: 5,
        description: 'Number of full units',
      },
      partial: {
        type: 'number',
        example: 0,
        description: 'Number of partial units',
      },
      pricePerUnit: {
        type: 'number',
        example: 0.92,
        description: 'Price per unit from the distributor',
      },
      totalValue: {
        type: 'number',
        example: 11.96,
        description: 'Total estimated value (pricePerUnit * (full + partial))',
      },
    },
  },
  DistributorPackage: {
    type: 'object',
    properties: {
      distributorName: {
        type: 'string',
        example: 'XYZ Pharmaceutical Returns',
        description: 'Name of the distributor',
      },
      distributorId: {
        type: 'string',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
        description: 'ID of the distributor',
      },
      distributorContact: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            example: 'support@xyzpharma.com',
            nullable: true,
            description: 'Contact email for the distributor',
          },
          phone: {
            type: 'string',
            example: '(555) 987-6543',
            nullable: true,
            description: 'Contact phone for the distributor',
          },
          location: {
            type: 'string',
            example: '456 Oak Ave, Chicago, IL, 60601, USA',
            nullable: true,
            description: 'Location/address of the distributor',
          },
          feeRates: {
            type: 'object',
            nullable: true,
            description: 'Fee rates for different payment periods (30, 60, 90 days)',
            additionalProperties: {
              type: 'object',
              properties: {
                percentage: {
                  type: 'number',
                  example: 13.4,
                },
                reportDate: {
                  type: 'string',
                  example: '2025-01-10',
                },
              },
            },
            example: {
              '30': { percentage: 13.4, reportDate: '2025-01-10' },
              '60': { percentage: 15.0, reportDate: '2025-01-10' },
              '90': { percentage: 18.0, reportDate: '2025-01-10' },
            },
          },
        },
        nullable: true,
        description: 'Contact information for the distributor including fee rates',
      },
      products: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/PackageProduct',
        },
        description: 'List of products in this package',
      },
      totalItems: {
        type: 'number',
        example: 45,
        description: 'Total number of items (sum of all full + partial units)',
      },
      totalEstimatedValue: {
        type: 'number',
        example: 125.50,
        description: 'Total estimated value of all products in this package',
      },
      averagePricePerUnit: {
        type: 'number',
        example: 2.79,
        description: 'Average price per unit across all products in this package',
      },
    },
  },
  PackageRecommendationResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'object',
        properties: {
          packages: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/DistributorPackage',
            },
            description: 'List of packages grouped by distributor',
          },
          totalProducts: {
            type: 'number',
            example: 20,
            description: 'Total number of products in the pharmacy list',
          },
          totalPackages: {
            type: 'number',
            example: 3,
            description: 'Total number of packages (distributors)',
          },
          totalEstimatedValue: {
            type: 'number',
            example: 350.75,
            description: 'Total estimated value across all packages',
          },
          generatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-15T10:00:00Z',
            description: 'Timestamp when recommendations were generated',
          },
          summary: {
            type: 'object',
            properties: {
              productsWithPricing: {
                type: 'number',
                example: 18,
                description: 'Number of products with pricing data available',
              },
              productsWithoutPricing: {
                type: 'number',
                example: 2,
                description: 'Number of products without pricing data',
              },
              distributorsUsed: {
                type: 'number',
                example: 3,
                description: 'Number of distributors used in the packages',
              },
            },
            description: 'Summary statistics',
          },
        },
      },
    },
  },
};

