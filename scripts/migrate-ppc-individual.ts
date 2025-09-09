import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query, checkConnection } from '../src/lib/database';

async function migratePPCToIndividual() {
  console.log('🚀 Iniciando migración de PPCs a formato individual...\n');
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión a la base de datos...');
    const connected = await checkConnection();
    if (!connected) {
      console.error('❌ Error: No se pudo conectar a la base de datos');
      console.error('   Verifica que DATABASE_URL esté configurado correctamente');
      process.exit(1);
    }
    console.log('✅ Conexión establecida\n');

    // 2. Identificar PPCs que necesitan migración
    console.log('📋 Identificando PPCs con cantidad_faltante > 1...');
    const ppcsToMigrate = await query(`
      SELECT 
        ppc.id,
        ppc.requisito_puesto_id,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.prioridad,
        ppc.fecha_deteccion,
        ppc.estado,
        ppc.observaciones,
        ppc.created_at
      FROM puestos_por_cubrir ppc
      WHERE ppc.cantidad_faltante > 1
      ORDER BY ppc.created_at DESC
    `);

    if (ppcsToMigrate.rows.length === 0) {
      console.log('✅ No hay PPCs que necesiten migración');
      return;
    }

    console.log(`📊 Encontrados ${ppcsToMigrate.rows.length} PPCs para migrar\n`);

    // 3. Migrar cada PPC
    let totalNewPPCs = 0;
    for (const ppc of ppcsToMigrate.rows) {
      console.log(`🔄 Migrando PPC ${ppc.id} (cantidad_faltante: ${ppc.cantidad_faltante})...`);
      
      // Crear múltiples PPCs individuales
      for (let i = 0; i < ppc.cantidad_faltante; i++) {
        await query(`
          INSERT INTO puestos_por_cubrir (
            requisito_puesto_id,
            cantidad_faltante,
            motivo,
            prioridad,
            fecha_deteccion,
            estado,
            observaciones,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          ppc.requisito_puesto_id,
          1, // cantidad_faltante = 1 para cada PPC individual
          ppc.motivo,
          ppc.prioridad,
          ppc.fecha_deteccion,
          ppc.estado,
          ppc.observaciones,
          ppc.created_at
        ]);
        totalNewPPCs++;
      }

      // Eliminar el PPC original
      await query(`
        DELETE FROM puestos_por_cubrir 
        WHERE id = $1
      `, [ppc.id]);

      console.log(`   ✅ Creados ${ppc.cantidad_faltante} PPCs individuales`);
    }

    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA!');
    console.log(`✅ Total de PPCs migrados: ${ppcsToMigrate.rows.length}`);
    console.log(`✅ Total de PPCs individuales creados: ${totalNewPPCs}`);
    console.log('\n🔧 Ahora cada PPC representa un puesto individual');
    console.log('   • Mejor visualización en la interfaz');
    console.log('   • Asignación más granular de guardias');
    console.log('   • Control más preciso de puestos por cubrir');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
migratePPCToIndividual()
  .then(() => {
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 