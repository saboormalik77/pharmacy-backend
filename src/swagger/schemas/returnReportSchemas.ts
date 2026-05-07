export const returnReportSchemas = {
  ReturnReportResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      message: {
        type: 'string',
        example: 'Return report processed successfully',
      },
      data: {
        type: 'object',
        properties: {
          reverseDistributor: {
            type: 'string',
            example: 'ABC Reverse Distributors',
            description: 'Name of the reverse distributor company',
            nullable: true,
          },
          pharmacy: {
            type: 'string',
            example: 'City Pharmacy',
            description: 'Pharmacy name if available',
            nullable: true,
          },
          reportDate: {
            type: 'string',
            format: 'date',
            example: '2024-01-15',
            description: 'Date of the credit report',
            nullable: true,
          },
          creditReportNumber: {
            type: 'string',
            example: 'CR-2024-001',
            description: 'Credit report reference number',
            nullable: true,
          },
          items: {
            type: 'array',
            description: 'List of returned items with pricing data',
            items: {
              type: 'object',
              properties: {
                ndcCode: {
                  type: 'string',
                  example: '12345-678-90',
                  description: 'NDC code (National Drug Code) - CRITICAL for price comparison',
                  nullable: true,
                },
                itemName: {
                  type: 'string',
                  example: 'Medication Name 10mg',
                  description: 'Product/item name',
                  nullable: true,
                },
                manufacturer: {
                  type: 'string',
                  example: 'Manufacturer Inc.',
                  description: 'Manufacturer information',
                  nullable: true,
                },
                lotNumber: {
                  type: 'string',
                  example: 'LOT123456',
                  description: 'Lot/batch number',
                  nullable: true,
                },
                expirationDate: {
                  type: 'string',
                  format: 'date',
                  example: '2024-12-31',
                  description: 'Expiration date',
                  nullable: true,
                },
                quantity: {
                  type: 'number',
                  example: 100,
                  description: 'Quantity returned',
                  nullable: true,
                },
                creditAmount: {
                  type: 'number',
                  example: 45.50,
                  description: 'Credit amount/payment for this product',
                  nullable: true,
                },
                pricePerUnit: {
                  type: 'number',
                  example: 0.455,
                  description: 'Calculated price per unit (creditAmount / quantity)',
                  nullable: true,
                },
              },
            },
            nullable: true,
          },
          totalCreditAmount: {
            type: 'number',
            example: 1250.75,
            description: 'Total credit amount for the entire report',
            nullable: true,
          },
          totalItems: {
            type: 'number',
            example: 25,
            description: 'Total number of items in the report',
            nullable: true,
          },
        },
      },
    },
  },
};

