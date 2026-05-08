export const productsSchemas = {
  Product: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      product_name: {
        type: 'string',
        example: 'Medication Name 10mg',
      },
      manufacturer: {
        type: 'string',
        example: 'Manufacturer Inc.',
        nullable: true,
      },
      strength: {
        type: 'string',
        example: '10mg',
        nullable: true,
      },
      dosage_form: {
        type: 'string',
        example: 'Tablet',
        nullable: true,
      },
      package_size: {
        type: 'integer',
        example: 100,
        nullable: true,
      },
      wac: {
        type: 'number',
        example: 45.50,
        nullable: true,
      },
      awp: {
        type: 'number',
        example: 50.00,
        nullable: true,
      },
      dea_schedule: {
        type: 'string',
        example: 'CII',
        nullable: true,
      },
      return_eligibility: {
        type: 'object',
        nullable: true,
        properties: {
          eligible: {
            type: 'boolean',
          },
          returnWindow: {
            type: 'integer',
          },
          creditPercentage: {
            type: 'number',
          },
          requiresDEAForm: {
            type: 'boolean',
          },
          destructionRequired: {
            type: 'boolean',
          },
        },
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  ValidateNDCRequest: {
    type: 'object',
    required: ['ndc'],
    properties: {
      ndc: {
        type: 'string',
        example: '12345-678-90',
        description: 'NDC code to validate (format: XXXXX-XXXX-XX)',
      },
    },
  },
  ValidateNDCResponse: {
    type: 'object',
    properties: {
      valid: {
        type: 'boolean',
        example: true,
      },
      product: {
        $ref: '#/components/schemas/Product',
      },
      error: {
        type: 'string',
        example: 'NDC not found in database',
      },
      suggestion: {
        type: 'string',
        example: 'This NDC may not be in our database. Please verify the code or contact support.',
      },
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
    },
  },
  CreateProductRequest: {
    type: 'object',
    required: ['ndc', 'product_name'],
    properties: {
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      product_name: {
        type: 'string',
        example: 'Medication Name 10mg',
      },
      manufacturer: {
        type: 'string',
        example: 'Manufacturer Inc.',
      },
      strength: {
        type: 'string',
        example: '10mg',
      },
      dosage_form: {
        type: 'string',
        example: 'Tablet',
      },
      package_size: {
        type: 'integer',
        example: 100,
      },
      wac: {
        type: 'number',
        example: 45.50,
      },
      awp: {
        type: 'number',
        example: 50.00,
      },
      dea_schedule: {
        type: 'string',
        example: 'CII',
      },
      return_eligibility: {
        type: 'object',
        properties: {
          eligible: {
            type: 'boolean',
          },
          returnWindow: {
            type: 'integer',
          },
          creditPercentage: {
            type: 'number',
          },
          requiresDEAForm: {
            type: 'boolean',
          },
          destructionRequired: {
            type: 'boolean',
          },
        },
      },
    },
  },
  ProductsSearchResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Product',
        },
      },
      count: {
        type: 'integer',
        example: 10,
      },
    },
  },
};

