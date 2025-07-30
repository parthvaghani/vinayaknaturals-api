const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

// Your existing code - keep it as is
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, {
    explorer: false,
    customCss: '.swagger-ui .topbar { display: none }',
  }),
);

// Just add this single route for JSON access
router.get('/json', (req, res) => {
  res.json(specs);
});

module.exports = router;
