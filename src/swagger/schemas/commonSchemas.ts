export const commonSchemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'fail',
      },
      message: {
        type: 'string',
        example: 'Error message description',
      },
    },
  },
  HealthResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      message: {
        type: 'string',
        example: 'Server is running',
      },
    },
  },
};

