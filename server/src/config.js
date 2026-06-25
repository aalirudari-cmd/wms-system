import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4100', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    user: process.env.POSTGRES_USER || 'journal',
    password: process.env.POSTGRES_PASSWORD || 'journal_secret',
    database: process.env.POSTGRES_DB || 'journal',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  },
  // Demo account seeded on first run for quick evaluation. Off in production.
  seedDemo: process.env.SEED_DEMO !== 'false',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};
