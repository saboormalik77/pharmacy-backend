import swaggerJsdoc from 'swagger-jsdoc';
import { allSchemas } from '../swagger/schemas';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pharmacy Backend API',
      version: '1.0.0',
      description: 'API documentation for Pharmacy Backend with Supabase Auth authentication and return report processing endpoints. All authentication is handled through Supabase Auth, returning Supabase session tokens.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: allSchemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter Supabase JWT token obtained from /api/auth/signin endpoint',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/server.ts', './src/middleware/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

/** OpenAPI spec with server URL set for the request host (Azure / Swagger UI). */
export function getSwaggerSpecWithBaseUrl(baseUrl: string): ReturnType<typeof swaggerJsdoc> {
  return {
    ...swaggerSpec,
    servers: [{ url: baseUrl, description: 'Current host' }],
  };
}
