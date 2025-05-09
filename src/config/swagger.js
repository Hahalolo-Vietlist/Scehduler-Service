const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger configuration options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scheduler Service API',
      version: '1.0.0',
      description: 'A service for scheduling and executing API calls at specified intervals',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1'
      }
    ],
    components: {
      securitySchemes: {
        clientAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-client-id',
          description: 'Client ID for authentication'
        },
        clientSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-client-secret',
          description: 'Client Secret for authentication'
        }
      }
    },
    security: [
      {
        clientAuth: [],
        clientSecret: []
      }
    ]
  },
  apis: ['./src/modules/*/**.route.js']
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = {
  swaggerUi,
  swaggerSpec
}; 