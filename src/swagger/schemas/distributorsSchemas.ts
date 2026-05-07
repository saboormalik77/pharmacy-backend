export const distributorsSchemas = {
  TopDistributor: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      name: {
        type: 'string',
        example: 'ABC Reverse Distributors',
      },
      code: {
        type: 'string',
        example: 'ABC',
      },
      email: {
        type: 'string',
        example: 'support@abcreverse.com',
        nullable: true,
      },
      phone: {
        type: 'string',
        example: '(555) 123-4567',
        nullable: true,
      },
      location: {
        type: 'string',
        example: 'Springfield, IL',
        description: 'City, State format',
        nullable: true,
      },
      active: {
        type: 'boolean',
        example: true,
        description: 'false if pharmacy has any document with report_date within last 30 days, true otherwise',
      },
      documentCount: {
        type: 'number',
        example: 15,
        description: 'Number of documents uploaded for this distributor',
        nullable: true,
      },
      totalCreditAmount: {
        type: 'number',
        example: 12500.50,
        description: 'Total credit amount processed for this distributor',
        nullable: true,
      },
      lastActivityDate: {
        type: 'string',
        format: 'date',
        example: '2024-01-15',
        description: 'Most recent report_date for this distributor',
        nullable: true,
      },
    },
  },
};

