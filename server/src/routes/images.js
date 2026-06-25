import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const imagesRouter = Router();

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.png'}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// Ensure the trade belongs to the signed-in user.
async function ownTrade(tradeId, userId) {
  const { rows } = await pool.query('SELECT id FROM trades WHERE id = $1 AND user_id = $2', [tradeId, userId]);
  if (!rows.length) throw httpError(404, 'Trade not found.');
}

imagesRouter.post(
  '/trade/:tradeId',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    await ownTrade(req.params.tradeId, req.user.id);
    const { category = 'before', title, comment } = req.body || {};
    if (!req.file) throw httpError(400, 'An image file is required.');
    const url = `/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO trade_images (trade_id, category, title, comment, url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.tradeId, category, title || null, comment || null, url]
    );
    res.status(201).json(rows[0]);
  })
);

imagesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `DELETE FROM trade_images i USING trades t
       WHERE i.id = $1 AND i.trade_id = t.id AND t.user_id = $2 RETURNING i.url`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) throw httpError(404, 'Image not found.');
    // Best-effort removal of the file on disk.
    const file = join(config.uploadDir, rows[0].url.replace('/uploads/', ''));
    await unlink(file).catch(() => {});
    res.json({ ok: true });
  })
);
