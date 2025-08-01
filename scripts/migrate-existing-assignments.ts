import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function migrateExistingAssignments() {
  console.log('🔄 Migrando asignaciones existentes...\n');

  try {
    // Obtener todas las asignaciones existentes en puestos_por_cubrir
    const existingAssignments = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.guardia_asignado_id,
        ppc.fecha_asignacion,
        ppc.estado,
        ppc.observaciones,
        ppc.requisito_puesto_id,
        rp.instalacion_id
      FROM puestos_por_cubrir ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      WHERE ppc.estado = 'Asignado' 
      AND ppc.guardia_asignado_id IS NOT NULL
      ORDER BY ppc.fecha_asignacion DESC
    `);

    console.log(`📊 Encontradas ${existingAssignments.rows.length} asignaciones para migrar`);

    if (existingAssignments.rows.length === 0) {
      console.log('✅ No hay asignaciones para migrar');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const assignment of existingAssignments.rows) {
      try {
        // Verificar si ya existe en asignaciones_guardias
        const existingCheck = await query(`
          SELECT id FROM asignaciones_guardias 
          WHERE guardia_id = $1 AND requisito_puesto_id = $2
        `, [assignment.guardia_asignado_id, assignment.requisito_puesto_id]);

        if (existingCheck.rows.length > 0) {
          console.log(`⚠️ Asignación ya existe para guardia ${assignment.guardia_asignado_id}`);
          continue;
        }

        // Insertar en asignaciones_guardias
        await query(`
          INSERT INTO asignaciones_guardias (
            guardia_id,
            requisito_puesto_id,
            tipo_asignacion,
            fecha_inicio,
            estado,
            observaciones
          ) VALUES ($1, $2, 'PPC', $3::date, 'Activa', $4)
        `, [
          assignment.guardia_asignado_id,
          assignment.requisito_puesto_id,
          assignment.fecha_asignacion,
          assignment.observaciones || 'Migración automática desde PPC'
        ]);

        console.log(`✅ Migrada asignación PPC ${assignment.ppc_id} para guardia ${assignment.guardia_asignado_id}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrando asignación ${assignment.ppc_id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log('='.repeat(50));
    console.log(`✅ Asignaciones migradas: ${migratedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📋 Total procesadas: ${existingAssignments.rows.length}`);

    // Verificar resultado final
    const finalCount = await query(`
      SELECT COUNT(*) as total FROM asignaciones_guardias
    `);

    console.log(`\n📊 Total de registros en asignaciones_guardias: ${finalCount.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar la migración
migrateExistingAssignments()
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 