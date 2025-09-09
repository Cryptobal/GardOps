import { query } from '../src/lib/database';

async function corregirEstadosPautaDiaria() {
  try {
    console.log('🔧 Iniciando corrección de estados en pauta diaria...');

    // 1. Ver registros actuales con estado 'trabajado'
    const registrosTrabajado = await query(`
      SELECT 
        id,
        puesto_id,
        guardia_id,
        estado,
        anio,
        mes,
        dia,
        created_at
      FROM as_turnos_pauta_mensual 
      WHERE estado = 'trabajado' 
      ORDER BY created_at DESC
    `);

    console.log(`📊 Encontrados ${registrosTrabajado.rows.length} registros con estado 'trabajado'`);

    // 2. Actualizar registros incorrectos a estado 'T' (Asignado)
    // Solo cambiar a 'T' si tienen guardia asignado y no están realmente asistidos
    const resultado = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado = 'T',
          updated_at = NOW()
      WHERE estado = 'trabajado' 
        AND guardia_id IS NOT NULL
    `);

    console.log(`✅ Actualizados ${resultado.rowCount} registros de 'trabajado' a 'T'`);

    // 3. Verificar el resultado
    const estadosFinales = await query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual 
      GROUP BY estado
      ORDER BY estado
    `);

    console.log('📊 Estados finales:');
    estadosFinales.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    // 4. Verificar que los registros con guardia asignado tengan estado correcto
    const registrosConGuardia = await query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual 
      WHERE guardia_id IS NOT NULL
      GROUP BY estado
      ORDER BY estado
    `);

    console.log('📊 Registros con guardia asignado:');
    registrosConGuardia.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    console.log('✅ Corrección de estados completada');

  } catch (error) {
    console.error('❌ Error corrigiendo estados:', error);
  } finally {
    process.exit(0);
  }
}

corregirEstadosPautaDiaria(); 