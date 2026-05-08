export const productListsSchemas = {
  ProductListItem: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      ndc: {
        type: 'string',
        example: '23433-3232-34',
      },
      product_name: {
        type: 'string',
        example: 'Product 23433-3232-34',
      },
      full_units: {
        type: 'integer',
        minimum: 0,
        example: 10,
        description: 'Number of full units. Must be 0 if partial_units > 0, or > 0 if partial_units = 0',
      },
      partial_units: {
        type: 'integer',
        minimum: 0,
        example: 0,
        description: 'Number of partial units. Must be 0 if full_units > 0, or > 0 if full_units = 0',
      },
      quantity: {
        type: 'integer',
        minimum: 0,
        example: 10,
        description: 'Total quantity calculated as full_units + partial_units',
      },
      lot_number: {
        type: 'string',
        nullable: true,
        example: 'lot-4344-55',
      },
      expiration_date: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2025-11-21',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'hello',
      },
      added_at: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00Z',
      },
      added_by: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: 'c933b13e-f9c6-4d85-a9f5-182b64cb523b',
      },
    },
  },
  AddProductListItemRequest: {
    type: 'object',
    required: ['ndc', 'product_name', 'full_units', 'partial_units'],
    properties: {
      ndc: {
        type: 'string',
        example: '23433-3232-34',
      },
      product_name: {
        type: 'string',
        example: 'Product 23433-3232-34',
      },
      full_units: {
        type: 'integer',
        minimum: 0,
        example: 10,
        description: 'Number of full units. Must be 0 if partial_units > 0, or > 0 if partial_units = 0',
      },
      partial_units: {
        type: 'integer',
        minimum: 0,
        example: 0,
        description: 'Number of partial units. Must be 0 if full_units > 0, or > 0 if full_units = 0',
      },
      lot_number: {
        type: 'string',
        nullable: true,
        example: 'lot-4344-55',
      },
      expiration_date: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2025-11-21',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'hello',
      },
    },
  },
  UpdateProductListItemRequest: {
    type: 'object',
    description: 'At least one field must be provided for update. When updating full_units or partial_units, one must be 0 and the other must be > 0',
    properties: {
      ndc: {
        type: 'string',
        example: '23433-3232-34',
      },
      product_name: {
        type: 'string',
        example: 'Product 23433-3232-34',
      },
      full_units: {
        type: 'integer',
        minimum: 0,
        example: 10,
        description: 'Number of full units. Must be 0 if partial_units > 0, or > 0 if partial_units = 0',
      },
      partial_units: {
        type: 'integer',
        minimum: 0,
        example: 0,
        description: 'Number of partial units. Must be 0 if full_units > 0, or > 0 if full_units = 0',
      },
      lot_number: {
        type: 'string',
        nullable: true,
        example: 'lot-4344-55',
      },
      expiration_date: {
        type: 'string',
        format: 'date',
        nullable: true,
        example: '2025-11-21',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'hello',
      },
    },
  },
  ProductListItemResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        $ref: '#/components/schemas/ProductListItem',
      },
    },
  },
  ProductListItemsResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ProductListItem',
        },
      },
    },
  },
  RemoveItemResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      message: {
        type: 'string',
        example: 'Item removed successfully',
      },
    },
  },
};

