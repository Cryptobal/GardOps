#!/usr/bin/env ts-node

import { query } from '../src/lib/database';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function backfillInstalacionIdGlobal() {
  console.log('🔧 BACKFILL GLOBAL instalacion_id en as_turnos_pauta_mensual');
  try {
    // Índices para rendimiento
    console.log('1️⃣ Creando índices si no existen...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pm_estado_fecha ON as_turnos_pauta_mensual(estado, anio, mes, dia);
      CREATE INDEX IF NOT EXISTS idx_pm_puesto ON as_turnos_pauta_mensual(puesto_id);
      CREATE INDEX IF NOT EXISTS idx_po_instalacion_activo ON as_turnos_puestos_operativos(instalacion_id, activo);
      CREATE INDEX IF NOT EXISTS idx_cci_instalacion_habilitado ON central_config_instalacion(instalacion_id, habilitado);
    `);

    // Backfill de instalacion_id desde puestos
    console.log('2️⃣ Actualizando instalacion_id donde está NULL...');
    const res = await query(`
      UPDATE as_turnos_pauta_mensual pm
      SET instalacion_id = po.instalacion_id,
          updated_at = NOW()
      FROM as_turnos_puestos_operativos po
      WHERE pm.puesto_id = po.id
        AND pm.instalacion_id IS NULL;
    `);
    console.log(`   ✅ Filas actualizadas: ${res.rowCount}`);

    // Crear función y trigger para mantener consistencia
    console.log('3️⃣ Creando función y trigger para fijar instalacion_id...');
    await query(`
      CREATE OR REPLACE FUNCTION set_instalacion_id_from_puesto() RETURNS trigger AS $$
      BEGIN
        IF NEW.puesto_id IS NOT NULL THEN
          SELECT po.instalacion_id INTO NEW.instalacion_id FROM as_turnos_puestos_operativos po WHERE po.id = NEW.puesto_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_as_turnos_pm_set_instalacion ON as_turnos_pauta_mensual;
      CREATE TRIGGER trg_as_turnos_pm_set_instalacion
      BEFORE INSERT OR UPDATE OF puesto_id ON as_turnos_pauta_mensual
      FOR EACH ROW EXECUTE PROCEDURE set_instalacion_id_from_puesto();
    `);

    console.log('✅ Backfill y trigger completados');
  } catch (error) {
    console.error('❌ Error en backfill global:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

backfillInstalacionIdGlobal();
