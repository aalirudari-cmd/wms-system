import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  db: {
    user: process.env.POSTGRES_USER || 'wms',
    password: process.env.POSTGRES_PASSWORD || 'wms_secret',
    database: process.env.POSTGRES_DB || 'wms',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  },
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    // Demo users (manager/worker) and sample warehouse data. Off in production.
    demo: process.env.SEED_DEMO !== 'false',
  },
};
