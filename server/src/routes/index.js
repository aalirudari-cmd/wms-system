import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authRouter } from './auth.js';
import { checklistRouter } from './checklist.js';
import { tradesRouter } from './trades.js';
import { imagesRouter } from './images.js';
import { analyticsRouter, exportRouter } from './analytics.js';
import { notesRouter } from './notes.js';

export const api = Router();

// Public.
api.use('/auth', authRouter);

// Everything below requires a valid session.
api.use(authenticate);
api.use('/checklist', checklistRouter);
api.use('/trades', tradesRouter);
api.use('/images', imagesRouter);
api.use('/analytics', analyticsRouter);
api.use('/export', exportRouter);
api.use('/notes', notesRouter);
