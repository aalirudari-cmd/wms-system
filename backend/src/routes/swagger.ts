import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Stockhaus WMS API', version: '2.0.0', description: 'Warehouse Management System REST API' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' }, { name: 'Users' }, { name: 'Roles' }, { name: 'Master Data' },
      { name: 'Inventory' }, { name: 'Receiving' }, { name: 'Put Away' }, { name: 'Transfers' },
      { name: 'Picking' }, { name: 'Packing' }, { name: 'Controlling' }, { name: 'Dashboard' }, { name: 'Reports' },
    ],
  },
  apis: [],
});
