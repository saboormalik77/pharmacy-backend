export const customPackagesSchemas = {
  CustomPackageItem: {
    type: 'object',
    required: ['ndc', 'full', 'partial'],
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
        description: 'Item ID (returned from database for fetched items)',
      },
      ndc: {
        type: 'string',
        example: '45963-0142-05',
        description: 'NDC code of the product',
      },
      productId: {
        type: 'string',
        format: 'uuid',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        nullable: true,
        description: 'Product ID from product_list_items (used for tracking, camelCase)',
      },
      product_id: {
        type: 'string',
        format: 'uuid',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        nullable: true,
        description: 'Product ID from product_list_items (snake_case - alternative format)',
      },
      productName: {
        type: 'string',
        example: 'Fluoxetine',
        description: 'Name of the product (camelCase)',
      },
      product_name: {
        type: 'string',
        example: 'Fluoxetine',
        description: 'Name of the product (snake_case - alternative format)',
      },
      full: {
        type: 'number',
        example: 5,
        description: 'Number of full units',
        minimum: 0,
      },
      partial: {
        type: 'number',
        example: 0,
        description: 'Number of partial units',
        minimum: 0,
      },
      pricePerUnit: {
        type: 'number',
        example: 2.50,
        description: 'Price per unit (camelCase)',
        minimum: 0,
      },
      price_per_unit: {
        type: 'number',
        example: 2.50,
        description: 'Price per unit (snake_case - alternative format)',
        minimum: 0,
      },
      totalValue: {
        type: 'number',
        example: 125.00,
        description: 'Total value ((full + partial) × pricePerUnit) (camelCase)',
        minimum: 0,
      },
      total_value: {
        type: 'number',
        example: 125.00,
        description: 'Total value ((full + partial) × pricePerUnit) (snake_case - alternative format)',
        minimum: 0,
      },
    },
    description: 'Package item with full and partial unit counts. At least one of full or partial must be greater than 0. Each item is treated separately even if NDC is same.',
  },
  CreateCustomPackageRequest: {
    type: 'object',
    required: ['distributorName', 'items'],
    properties: {
      distributorName: {
        type: 'string',
        example: 'XYZ Pharmaceutical Returns',
        description: 'Name of the distributor',
      },
      distributorId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
        description: 'ID of the distributor (optional)',
      },
      items: {
        type: 'array',
        description: 'Array of items to include in the package',
        minItems: 1,
        items: {
          $ref: '#/components/schemas/CustomPackageItem',
        },
      },
      notes: {
        type: 'string',
        example: 'Priority shipment',
        nullable: true,
        description: 'Optional notes for the package',
      },
      feeRate: {
        type: 'number',
        example: 13.4,
        nullable: true,
        description: 'Fee rate percentage for the distributor (e.g., 13.4 for 13.4%). Used to calculate fee amount and net value.',
        minimum: 0,
        maximum: 100,
      },
      feeDuration: {
        type: 'number',
        example: 30,
        nullable: true,
        description: 'Fee duration in days (e.g., 30, 60, 90 days). Indicates the payment period for the fee rate.',
        minimum: 1,
      },
    },
  },
  DistributorContact: {
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
    },
    nullable: true,
  },
  PackageDeliveryInfo: {
    type: 'object',
    required: ['deliveryDate', 'receivedBy'],
    properties: {
      deliveryDate: {
        type: 'string',
        format: 'date-time',
        example: '2025-12-05T10:30:00Z',
        description: 'Date and time when the package was delivered',
      },
      receivedBy: {
        type: 'string',
        example: 'John Doe',
        description: 'Name of the person who received the package',
      },
      deliveryCondition: {
        type: 'string',
        enum: ['good', 'damaged', 'partial', 'missing_items', 'other'],
        default: 'good',
        example: 'good',
        description: 'Condition of the package upon delivery',
      },
      deliveryNotes: {
        type: 'string',
        example: 'Package received in good condition',
        nullable: true,
        description: 'Additional notes about the delivery',
      },
      trackingNumber: {
        type: 'string',
        example: '1Z999AA10123456784',
        nullable: true,
        description: 'Shipping tracking number',
      },
      carrier: {
        type: 'string',
        enum: ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'],
        nullable: true,
        example: 'UPS',
        description: 'Shipping carrier - The shipping company that delivered the package (e.g., UPS, FedEx, USPS, DHL, or Other)',
      },
    },
    description: 'Delivery information when marking package as delivered',
  },
  CustomPackage: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      packageNumber: {
        type: 'string',
        example: 'PKG-1704123456789-1234',
        description: 'Unique package number',
      },
      pharmacyId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      distributorName: {
        type: 'string',
        example: 'XYZ Pharmaceutical Returns',
      },
      distributorId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
      },
      distributorContact: {
        $ref: '#/components/schemas/DistributorContact',
      },
      items: {
        type: 'array',
        description: 'Items in the package',
        items: {
          $ref: '#/components/schemas/CustomPackageItem',
        },
      },
      totalItems: {
        type: 'number',
        example: 50,
        description: 'Total number of items (sum of all full + partial units)',
      },
      totalEstimatedValue: {
        type: 'number',
        example: 125.00,
        description: 'Total estimated value of the package (before fee deduction)',
      },
      feeRate: {
        type: 'number',
        example: 13.4,
        nullable: true,
        description: 'Fee rate percentage applied to this package',
      },
      feeDuration: {
        type: 'number',
        example: 30,
        nullable: true,
        description: 'Fee duration in days (e.g., 30, 60, 90 days)',
      },
      feeAmount: {
        type: 'number',
        example: 16.75,
        nullable: true,
        description: 'Calculated fee amount (totalEstimatedValue * feeRate / 100)',
      },
      netEstimatedValue: {
        type: 'number',
        example: 108.25,
        nullable: true,
        description: 'Net value after fee deduction (totalEstimatedValue - feeAmount)',
      },
      notes: {
        type: 'string',
        example: 'Priority shipment',
        nullable: true,
      },
      status: {
        type: 'boolean',
        example: false,
        description: 'Status of the package (false = not delivered, true = delivered)',
      },
      deliveryInfo: {
        $ref: '#/components/schemas/PackageDeliveryInfo',
        nullable: true,
        description: 'Delivery information (only present when status is true)',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
    },
  },
  CustomPackagesListResponse: {
    type: 'object',
    properties: {
      packages: {
        type: 'array',
        description: 'Array of custom packages',
        items: {
          $ref: '#/components/schemas/CustomPackage',
        },
      },
      total: {
        type: 'number',
        example: 10,
        description: 'Total number of packages',
      },
      stats: {
        type: 'object',
        description: 'Statistics for packages',
        properties: {
          totalProducts: {
            type: 'number',
            example: 500,
            description: 'Total number of products across packages with status false',
          },
          totalValue: {
            type: 'number',
            example: 12500.50,
            description: 'Total estimated value across packages with status false',
          },
          deliveredPackages: {
            type: 'number',
            example: 5,
            description: 'Count of packages with status true (delivered)',
          },
          nonDeliveredPackages: {
            type: 'number',
            example: 5,
            description: 'Count of packages with status false (non-delivered)',
          },
        },
      },
    },
  },
  CreateCustomPackageResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        $ref: '#/components/schemas/CustomPackage',
      },
    },
  },
  GetCustomPackagesResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        $ref: '#/components/schemas/CustomPackagesListResponse',
      },
    },
  },
  GetCustomPackageResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        $ref: '#/components/schemas/CustomPackage',
      },
    },
  },
  DeleteCustomPackageResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      message: {
        type: 'string',
        example: 'Package deleted successfully',
      },
    },
  },
};

