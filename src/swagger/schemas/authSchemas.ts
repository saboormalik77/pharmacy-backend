export const authSchemas = {
  SignupRequest: {
    type: 'object',
    required: ['email', 'password', 'name', 'pharmacyName'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'pharmacy@example.com',
        description: 'User email address',
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        example: 'Password123',
        description: 'User password (minimum 8 characters)',
      },
      name: {
        type: 'string',
        example: 'John Doe',
        description: 'User full name',
      },
      pharmacyName: {
        type: 'string',
        example: 'City Pharmacy',
        description: 'Name of the pharmacy',
      },
      phone: {
        type: 'string',
        example: '+1234567890',
        description: 'Contact phone number (optional)',
      },
      physicalAddress: {
        type: 'object',
        description: 'Physical address of the pharmacy (optional)',
        properties: {
          street: {
            type: 'string',
            example: '123 Main Street',
            description: 'Street address',
          },
          city: {
            type: 'string',
            example: 'New York',
            description: 'City',
          },
          state: {
            type: 'string',
            example: 'NY',
            description: 'State (2-letter code)',
          },
          zip: {
            type: 'string',
            example: '10001',
            description: 'ZIP code',
          },
        },
      },
      npiNumber: {
        type: 'string',
        example: '1234567890',
        description: 'National Provider Identifier (NPI) number (optional)',
      },
      deaNumber: {
        type: 'string',
        example: 'AB1234567',
        description: 'Drug Enforcement Administration (DEA) number (optional)',
      },
    },
  },
  SigninRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'pharmacy@example.com',
        description: 'User email address',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'Password123',
        description: 'User password',
      },
    },
  },
  RefreshTokenRequest: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: {
        type: 'string',
        example: 'prt_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz...',
        description: 'Custom refresh token obtained from signin or signup response. Prefix "prt_" indicates pharmacy refresh token.',
      },
    },
  },
  LogoutRequest: {
    type: 'object',
    properties: {
      refreshToken: {
        type: 'string',
        example: 'prt_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz...',
        description: 'Refresh token to revoke (optional - if not provided, only client-side logout)',
      },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      data: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000',
                description: 'User ID (linked to Supabase Auth user)',
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'pharmacy@example.com',
                description: 'User email address',
              },
              name: {
                type: 'string',
                example: 'John Doe',
                description: 'User full name',
              },
              pharmacy_name: {
                type: 'string',
                example: 'City Pharmacy',
                description: 'Name of the pharmacy',
              },
              phone: {
                type: 'string',
                example: '+1234567890',
                nullable: true,
                description: 'Contact phone number',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00Z',
                description: 'Account creation timestamp',
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00Z',
                description: 'Last update timestamp',
              },
            },
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA1MzI0MDAwfQ...',
            description: 'Access token (JWT) for authentication. Use this token in Authorization header as "Bearer {token}". This token expires after 1 hour.',
          },
          refreshToken: {
            type: 'string',
            example: 'prt_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz...',
            description: 'Custom refresh token to obtain new access tokens. Valid for 30 days. Use with /api/auth/refresh endpoint. Token is rotated on each refresh for security.',
          },
          expiresIn: {
            type: 'number',
            example: 3600,
            description: 'Access token expiration time in seconds (typically 1 hour)',
          },
          expiresAt: {
            type: 'number',
            example: 1705324000,
            description: 'Access token expiration as Unix timestamp',
          },
        },
      },
    },
  },
  LogoutResponse: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'success',
      },
      message: {
        type: 'string',
        example: 'Logged out successfully',
      },
    },
  },
};
