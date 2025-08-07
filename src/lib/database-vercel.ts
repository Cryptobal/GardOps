import { sql } from '@vercel/postgres';

// Configurar la variable de entorno que espera @vercel/postgres
if (process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

export { sql };
