/**
 * OpenAPI/Swagger configuration
 * Provides interactive API documentation
 */

import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rubylith Component Registry API',
      version: '1.0.0',
      description: 'Contract-Driven Component Registry API for managing reusable UI components',
      contact: {
        name: 'API Support',
        email: 'support@rubylith.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.rubylith.dev',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
                code: {
                  type: 'string',
                },
                details: {
                  type: 'object',
                },
              },
              required: ['message', 'code'],
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
            },
            offset: {
              type: 'integer',
              minimum: 0,
            },
            total: {
              type: 'integer',
              minimum: 0,
            },
            hasMore: {
              type: 'boolean',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['OWNER', 'MAINTAINER', 'CONTRIBUTOR', 'CONSUMER', 'AUDITOR'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Component: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            version: {
              type: 'string',
              pattern: '^\\d+\\.\\d+\\.\\d+$',
            },
            description: {
              type: 'string',
            },
            author: {
              type: 'string',
            },
            keywords: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            contractId: {
              type: 'string',
            },
            sourceCode: {
              type: 'string',
            },
            buildArtifacts: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Contract: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            version: {
              type: 'string',
              pattern: '^\\d+\\.\\d+\\.\\d+$',
            },
            schemaVersion: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            author: {
              type: 'string',
            },
            keywords: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            schemaProps: {
              type: 'object',
            },
            schemaEvents: {
              type: 'object',
            },
            schemaMethods: {
              type: 'object',
            },
            validationRequired: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            validationOptional: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            validationRules: {
              type: 'object',
            },
            runtimeFramework: {
              type: 'string',
            },
            runtimeVersion: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Environment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            version: {
              type: 'string',
              pattern: '^\\d+\\.\\d+\\.\\d+$',
            },
            description: {
              type: 'string',
            },
            environmentType: {
              type: 'string',
              enum: ['production', 'staging', 'development', 'testing'],
            },
            runtimeFramework: {
              type: 'string',
            },
            runtimeVersion: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy', 'maintenance'],
            },
            serverSpecs: {
              type: 'object',
              properties: {
                cpu: {
                  type: 'string',
                },
                memory: {
                  type: 'string',
                },
                storage: {
                  type: 'string',
                },
                network: {
                  type: 'string',
                },
              },
            },
            networkConfig: {
              type: 'object',
              properties: {
                publicUrls: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uri',
                  },
                },
                internalUrls: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uri',
                  },
                },
                ports: {
                  type: 'array',
                  items: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 65535,
                  },
                },
                ssl: {
                  type: 'boolean',
                },
                cdn: {
                  type: 'string',
                },
              },
            },
            capabilities: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            supportedContracts: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              minLength: 8,
            },
          },
          required: ['email', 'password'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              minLength: 8,
            },
            name: {
              type: 'string',
              minLength: 1,
            },
          },
          required: ['email', 'password', 'name'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: {
                      type: 'string',
                    },
                    refreshToken: {
                      type: 'string',
                    },
                    expiresIn: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Components',
        description: 'Component management operations',
      },
      {
        name: 'Contracts',
        description: 'Contract definition and management',
      },
      {
        name: 'Environments',
        description: 'Execution environment management',
      },
      {
        name: 'Admin - Users',
        description: 'User administration (admin only)',
      },
      {
        name: 'Admin - Audit',
        description: 'Audit logging and monitoring (admin only)',
      },
      {
        name: 'Admin - System',
        description: 'System administration (admin only)',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/api/routes/*.ts',
    './src/api/routes/admin/*.ts',
    './src/api/docs/paths/*.yaml',
  ],
};

export const specs = swaggerJSDoc(options);