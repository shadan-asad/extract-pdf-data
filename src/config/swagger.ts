import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PDF Receipt Extraction API',
      version,
      description: 'API for extracting and managing data from PDF receipts using OCR/AI techniques',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            type: {
              type: 'string',
              enum: [
                'VALIDATION_ERROR',
                'NOT_FOUND_ERROR',
                'FILE_ERROR',
                'DATABASE_ERROR',
                'PROCESSING_ERROR',
                'OCR_ERROR',
                'UNAUTHORIZED_ERROR',
                'RATE_LIMIT_ERROR',
              ],
            },
            message: {
              type: 'string',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                  value: {
                    type: 'any',
                  },
                },
              },
            },
          },
        },
        Receipt: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            merchant_name: {
              type: 'string',
              example: 'Example Store',
            },
            purchased_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-20T10:30:00Z',
            },
            total_amount: {
              type: 'number',
              format: 'float',
              example: 99.99,
            },
            file_path: {
              type: 'string',
              example: 'uploads/1234567890-receipt.pdf',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-20T10:35:00Z',
            },
          },
        },
        ReceiptFile: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            file_name: {
              type: 'string',
              example: 'receipt.pdf',
            },
            file_path: {
              type: 'string',
              example: 'uploads/1234567890-receipt.pdf',
            },
            is_valid: {
              type: 'boolean',
              example: true,
            },
            invalid_reason: {
              type: 'string',
              nullable: true,
              example: null,
            },
            is_processed: {
              type: 'boolean',
              example: false,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-20T10:30:00Z',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100,
            },
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            pages: {
              type: 'integer',
              example: 10,
            },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options); 