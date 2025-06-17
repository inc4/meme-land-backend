import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import config from '../config/index.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'memeland api',
    version: '1.0.0',
    description: 'memeland api',
  },
  components: {
    schemas: {
      "EmptyBody": {
        "description": "EmptyObject",
        "type": "object",
        "properties": {}
      },
      "Error": {
        "description": "Response errors template",
        "type": "object",
        "properties": {
          "code": {
            "type": "number",
            //"example": 401
          },
          "message": {
            "type": "string",
            //"example": "Unauthorized"
          }
        }
      }
    },
    "responses": {
      "InternalServerError": {
        "description": "Internal server error",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "InvalidInputs": {
        "description": "Input data not valid for this request",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "NotFound": {
        "description": "The specified resource was not found",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Unauthorized",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      },
      "NotImplemented": {
        "description": "Not Implemented endpoint",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Error"
            }
          }
        }
      }
    },
    securitySchemes: {
      WalletAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Wallet',
        description: 'User wallet address',
      },
    },
  },
  security: [
    {
      WalletAuth: [],
    },
  ],
  servers: [
    {
      url: config.server.url,
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/controllers/wallet.js', './src/controllers/campaign.js'],
};


export class SwaggerController {
  constructor() {
  }

  registerRoutes(router) {
    router.use('/swagger', swaggerUi.serve);
    router.get('/swagger', swaggerUi.setup(swaggerJSDoc(options)));
  }

}


