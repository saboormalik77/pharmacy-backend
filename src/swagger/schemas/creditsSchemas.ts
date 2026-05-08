export const creditsSchemas = {
  CreditEstimateItem: {
    type: 'object',
    properties: {
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      product_name: {
        type: 'string',
        example: 'Medication Name 10mg',
        nullable: true,
      },
      manufacturer: {
        type: 'string',
        example: 'Manufacturer Inc.',
        nullable: true,
      },
      quantity: {
        type: 'integer',
        example: 100,
      },
      unit_price: {
        type: 'number',
        example: 45.50,
        nullable: true,
      },
      credit_percentage: {
        type: 'number',
        example: 85,
      },
      estimated_credit: {
        type: 'number',
        example: 3867.50,
      },
      eligible: {
        type: 'boolean',
        example: true,
      },
      expiration_warning: {
        type: 'string',
        example: 'Expires in 180 days (within return window)',
        nullable: true,
      },
      requires_dea_form: {
        type: 'boolean',
        example: false,
        nullable: true,
      },
      dea_schedule: {
        type: 'string',
        example: 'CII',
        nullable: true,
      },
      destruction_required: {
        type: 'boolean',
        example: false,
        nullable: true,
      },
      return_window: {
        type: 'integer',
        example: 365,
        nullable: true,
      },
      days_to_expiration: {
        type: 'integer',
        example: 180,
        nullable: true,
      },
    },
  },
  EstimateCreditsRequest: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['ndc', 'quantity', 'expiration_date', 'lot_number'],
          properties: {
            ndc: {
              type: 'string',
              example: '12345-678-90',
            },
            quantity: {
              type: 'integer',
              example: 100,
            },
            expiration_date: {
              type: 'string',
              format: 'date',
              example: '2024-12-31',
            },
            lot_number: {
              type: 'string',
              example: 'LOT123456',
            },
            condition: {
              type: 'string',
              enum: ['UNOPENED', 'OPENED', 'DAMAGED'],
              example: 'UNOPENED',
            },
          },
        },
      },
    },
  },
  EstimateCreditsResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/CreditEstimateItem',
            },
          },
          summary: {
            type: 'object',
            properties: {
              totalItems: {
                type: 'integer',
                example: 5,
              },
              eligibleItems: {
                type: 'integer',
                example: 4,
              },
              ineligibleItems: {
                type: 'integer',
                example: 1,
              },
              totalEstimatedCredit: {
                type: 'number',
                example: 5000.00,
              },
              serviceFees: {
                type: 'number',
                example: 150.00,
              },
              transportationFees: {
                type: 'number',
                example: 17.50,
              },
              netCredit: {
                type: 'number',
                example: 4832.50,
              },
            },
          },
        },
      },
    },
  },
};

