import { query } from '../src/lib/database';

async function verificarDuplicadosPautaDiaria() {
  console.log('🔍 Verificando duplicados en pauta diaria...');
  
  try {
    // Verificar duplicados en turnos_extras para la misma pauta
    const duplicadosTurnosExtras = await query(`
      SELECT 
        pauta_id,
        COUNT(*) as cantidad_duplicados,
        array_agg(guardia_id) as guardias_duplicados,
        array_agg(created_at) as fechas_creacion
      FROM turnos_extras 
      GROUP BY pauta_id 
      HAVING COUNT(*) > 1
      ORDER BY cantidad_duplicados DESC
    `);

    if (duplicadosTurnosExtras.rows.length > 0) {
      console.log('⚠️  Encontrados duplicados en turnos_extras:');
      duplicadosTurnosExtras.rows.forEach((row: any) => {
        console.log(`   Pauta ID: ${row.pauta_id}, Duplicados: ${row.cantidad_duplicados}`);
      });

      // Limpiar duplicados manteniendo solo el más reciente
      console.log('🧹 Limpiando duplicados...');
      
      for (const duplicado of duplicadosTurnosExtras.rows) {
        const pautaId = duplicado.pauta_id;
        
        // Mantener solo el registro más reciente
        await query(`
          DELETE FROM turnos_extras 
          WHERE pauta_id = $1 
          AND id NOT IN (
            SELECT id FROM turnos_extras 
            WHERE pauta_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
          )
        `, [pautaId]);
        
        console.log(`   ✅ Limpiados duplicados para pauta ${pautaId}`);
      }
    } else {
      console.log('✅ No se encontraron duplicados en turnos_extras');
    }

    // Verificar que no haya puestos duplicados en la pauta mensual
    const duplicadosPautaMensual = await query(`
      SELECT 
        puesto_id,
        anio,
        mes,
        dia,
        COUNT(*) as cantidad_duplicados
      FROM as_turnos_pauta_mensual 
      GROUP BY puesto_id, anio, mes, dia
      HAVING COUNT(*) > 1
      ORDER BY cantidad_duplicados DESC
    `);

    if (duplicadosPautaMensual.rows.length > 0) {
      console.log('⚠️  Encontrados duplicados en as_turnos_pauta_mensual:');
      duplicadosPautaMensual.rows.forEach((row: any) => {
        console.log(`   Puesto: ${row.puesto_id}, Fecha: ${row.anio}-${row.mes}-${row.dia}, Duplicados: ${row.cantidad_duplicados}`);
      });
    } else {
      console.log('✅ No se encontraron duplicados en as_turnos_pauta_mensual');
    }

    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando duplicados:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarDuplicadosPautaDiaria()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

export { verificarDuplicadosPautaDiaria }; 