export const returnsSchemas = {
  ReturnItem: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      return_id: {
        type: 'string',
        format: 'uuid',
      },
      inventory_item_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
      },
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      drug_name: {
        type: 'string',
        example: 'Medication Name 10mg',
      },
      manufacturer: {
        type: 'string',
        example: 'Manufacturer Inc.',
        nullable: true,
      },
      lot_number: {
        type: 'string',
        example: 'LOT123456',
      },
      expiration_date: {
        type: 'string',
        format: 'date',
        example: '2024-12-31',
      },
      quantity: {
        type: 'integer',
        example: 100,
      },
      unit: {
        type: 'string',
        example: 'tablets',
        nullable: true,
      },
      reason: {
        type: 'string',
        example: 'Expired',
        nullable: true,
      },
      estimated_credit: {
        type: 'number',
        example: 45.50,
        nullable: true,
      },
      classification: {
        type: 'string',
        enum: ['returnable', 'destruction', 'pending'],
        nullable: true,
      },
      photos: {
        type: 'array',
        items: {
          type: 'string',
        },
        nullable: true,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
  Return: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
      },
      pharmacy_id: {
        type: 'string',
        format: 'uuid',
      },
      status: {
        type: 'string',
        enum: ['draft', 'ready_to_ship', 'in_transit', 'processing', 'completed', 'cancelled'],
        example: 'draft',
      },
      total_estimated_credit: {
        type: 'number',
        example: 1250.75,
      },
      shipment_id: {
        type: 'string',
        format: 'uuid',
        nullable: true,
      },
      notes: {
        type: 'string',
        nullable: true,
      },
      created_at: {
        type: 'string',
        format: 'date-time',
      },
      updated_at: {
        type: 'string',
        format: 'date-time',
      },
      items: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ReturnItem',
        },
      },
    },
  },
  CreateReturnRequest: {
    type: 'object',
    required: ['items'],
    properties: {
      pharmacy_id: {
        type: 'string',
        format: 'uuid',
        description: 'Pharmacy ID (can be in query params)',
      },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['ndc', 'drug_name', 'lot_number', 'expiration_date', 'quantity'],
          properties: {
            inventory_item_id: {
              type: 'string',
              format: 'uuid',
            },
            ndc: {
              type: 'string',
              example: '12345-678-90',
            },
            drug_name: {
              type: 'string',
              example: 'Medication Name 10mg',
            },
            manufacturer: {
              type: 'string',
              example: 'Manufacturer Inc.',
            },
            lot_number: {
              type: 'string',
              example: 'LOT123456',
            },
            expiration_date: {
              type: 'string',
              format: 'date',
              example: '2024-12-31',
            },
            quantity: {
              type: 'integer',
              example: 100,
            },
            unit: {
              type: 'string',
              example: 'tablets',
            },
            reason: {
              type: 'string',
              example: 'Expired',
            },
            estimated_credit: {
              type: 'number',
              example: 45.50,
            },
            classification: {
              type: 'string',
              enum: ['returnable', 'destruction', 'pending'],
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
      notes: {
        type: 'string',
        example: 'Return notes',
      },
    },
  },
  UpdateReturnRequest: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['draft', 'ready_to_ship', 'in_transit', 'processing', 'completed', 'cancelled'],
      },
      notes: {
        type: 'string',
      },
      shipment_id: {
        type: 'string',
        format: 'uuid',
      },
    },
  },
  ReturnsListResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Return',
        },
      },
      total: {
        type: 'integer',
        example: 25,
      },
    },
  },
};

