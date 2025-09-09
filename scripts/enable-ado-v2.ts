import { config } from 'dotenv';
import * as path from 'path';
import { query } from '../src/lib/database';

// Cargar variables de entorno desde .env.local
config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  try {
    console.log('🚩 Habilitando flag ado_v2 (idempotente)...');

    // 1) Crear tabla de flags si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS app_feature_flags (
        code TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false
      );
    `);

    // 2) Crear vista unificada usada por /api/flags
    // Nota: si la vista existe con columnas distintas, hay que dropearla primero
    await query(`DROP VIEW IF EXISTS app_v_flags CASCADE;`);
    await query(`CREATE VIEW app_v_flags AS SELECT code, enabled FROM app_feature_flags;`);

    // 3) Habilitar ado_v2
    await query(
      `INSERT INTO app_feature_flags(code, enabled)
       VALUES ('ado_v2', true)
       ON CONFLICT (code) DO UPDATE SET enabled = EXCLUDED.enabled`
    );

    console.log('✅ ado_v2 habilitado en app_feature_flags y app_v_flags disponible');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error habilitando ado_v2:', err);
    process.exit(1);
  }
}

main();


