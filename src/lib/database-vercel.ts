import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configurar la variable de entorno que espera @vercel/postgres
if (process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

// Log de conexión (sin credenciales)
try {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    logger.debug('[DB]', u.host, u.pathname);
  }
} catch {}

export { sql };
