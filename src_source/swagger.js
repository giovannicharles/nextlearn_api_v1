// src/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Options pour swagger-jsdoc
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextLearn API',
      version: '1.0.0',
      description: 'Documentation API pour LearnMap'
    },
    servers: [
      {
        url: 'https://nextlearn-api.onrender.com',
        description: 'Serveur de production'
      },
      {
        url: 'http://localhost:5000',
        description: 'Serveur de développement local'
      }
    ],
  },
  apis: ['./src/modules/**/*.js'], // chemins des fichiers où on met les commentaires Swagger
};

const specs = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
}

module.exports = setupSwagger;