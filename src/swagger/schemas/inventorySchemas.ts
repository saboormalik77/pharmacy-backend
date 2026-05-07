export const inventorySchemas = {
  InventoryItem: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      pharmacy_id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      product_name: {
        type: 'string',
        example: 'Medication Name 10mg',
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
      location: {
        type: 'string',
        example: 'Main Warehouse',
      },
      boxes: {
        type: 'integer',
        example: 10,
      },
      tablets_per_box: {
        type: 'integer',
        example: 100,
      },
      status: {
        type: 'string',
        enum: ['active', 'expiring_soon', 'expired'],
        example: 'active',
      },
      days_until_expiration: {
        type: 'integer',
        example: 180,
      },
      added_date: {
        type: 'string',
        format: 'date-time',
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
  CreateInventoryItemRequest: {
    type: 'object',
    required: ['ndc', 'product_name', 'lot_number', 'expiration_date', 'quantity'],
    properties: {
      pharmacy_id: {
        type: 'string',
        format: 'uuid',
        description: 'Pharmacy ID (can be in query params)',
      },
      ndc: {
        type: 'string',
        example: '12345-678-90',
      },
      product_name: {
        type: 'string',
        example: 'Medication Name 10mg',
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
      location: {
        type: 'string',
        example: 'Main Warehouse',
      },
      boxes: {
        type: 'integer',
        example: 10,
      },
      tablets_per_box: {
        type: 'integer',
        example: 100,
      },
    },
  },
  UpdateInventoryItemRequest: {
    type: 'object',
    properties: {
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
      location: {
        type: 'string',
        example: 'Main Warehouse',
      },
      boxes: {
        type: 'integer',
        example: 10,
      },
      tablets_per_box: {
        type: 'integer',
        example: 100,
      },
    },
  },
  InventoryMetrics: {
    type: 'object',
    properties: {
      totalItems: {
        type: 'integer',
        example: 150,
      },
      active: {
        type: 'integer',
        example: 120,
      },
      expiringSoon: {
        type: 'integer',
        example: 20,
      },
      expired: {
        type: 'integer',
        example: 10,
      },
    },
  },
  InventoryListResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/InventoryItem',
        },
      },
      total: {
        type: 'integer',
        example: 150,
      },
    },
  },
};

