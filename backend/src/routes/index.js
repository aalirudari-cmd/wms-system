import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authRouter } from './auth.js';
import { usersRouter } from './users.js';
import { productsRouter } from './products.js';
import { locationsRouter } from './locations.js';
import { inventoryRouter } from './inventory.js';
import { receivingRouter } from './receiving.js';
import { shippingRouter } from './shipping.js';
import { movementsRouter } from './movements.js';
import { dashboardRouter } from './dashboard.js';
import { reportsRouter } from './reports.js';

export const api = Router();

// Public.
api.use('/auth', authRouter);

// Everything below requires a valid session.
api.use(authenticate);
api.use('/users', usersRouter);
api.use('/products', productsRouter);
api.use('/locations', locationsRouter);
api.use('/inventory', inventoryRouter);
api.use('/receiving', receivingRouter);
api.use('/shipping', shippingRouter);
api.use('/movements', movementsRouter);
api.use('/dashboard', dashboardRouter);
api.use('/reports', reportsRouter);
