import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextLearn API',
      version: '2.0.0',
      description: 'API REST pour l\'application NextLearn - Bibliothèque académique camerounaise',
      contact: {
        name: 'NextLearn Team',
        email: 'contact@nextlearn.cm',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Serveur de développement',
      },
      {
        url: 'https://api.nextlearn.app',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token (15min TTL)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
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
  },
  apis: [join(__dirname, '../**/*.ts')], // Scan tous les fichiers TS pour les annotations JSDoc
};

export const swaggerSpec = swaggerJsdoc(options) as any;
console.log(`📋 Swagger spec generated: ${Object.keys(swaggerSpec.paths || {}).length} paths found`);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup;
