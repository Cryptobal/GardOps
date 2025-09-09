import { query } from '../src/lib/database';

/**
 * Script para verificar y corregir datos de pauta mensual
 * Específicamente para la instalación que está teniendo problemas
 */

async function verificarPautaEspecifica(instalacion_id: string, anio: number, mes: number) {
  console.log(`🔍 Verificando pauta para instalación ${instalacion_id} en ${mes}/${anio}...`);
  
  try {
    // Verificar registros existentes
    const registros = await query(`
      SELECT 
        guardia_id,
        dia,
        estado,
        created_at,
        updated_at
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
      ORDER BY guardia_id, dia
    `, [instalacion_id, anio, mes]);
    
    console.log(`📊 Registros encontrados: ${registros.rows.length}`);
    
    if (registros.rows.length > 0) {
      console.log('📋 Detalle de registros:');
      registros.rows.forEach((row: any) => {
        console.log(`   - Guardia: ${row.guardia_id}, Día: ${row.dia}, Estado: ${row.estado}`);
      });
    }
    
    // Verificar guardias asignados a la instalación
    const guardias = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        CONCAT(g.nombre, ' ', g.apellido_paterno) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true
        AND ta.estado = 'Activa'
    `, [instalacion_id]);
    
    console.log(`👥 Guardias asignados: ${guardias.rows.length}`);
    guardias.rows.forEach((guardia: any) => {
      console.log(`   - ${guardia.nombre_completo} (${guardia.id})`);
    });
    
    // Verificar PPCs pendientes
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND ppc.estado = 'Pendiente'
    `, [instalacion_id]);
    
    console.log(`📋 PPCs pendientes: ${ppcs.rows.length}`);
    ppcs.rows.forEach((ppc: any) => {
      console.log(`   - PPC ${ppc.id}: ${ppc.cantidad_faltante} faltantes`);
    });
    
    return {
      registros: registros.rows,
      guardias: guardias.rows,
      ppcs: ppcs.rows
    };
    
  } catch (error) {
    console.error('❌ Error verificando pauta:', error);
    throw error;
  }
}

async function crearPautaBase(instalacion_id: string, anio: number, mes: number) {
  console.log(`🏗️ Creando pauta base para instalación ${instalacion_id} en ${mes}/${anio}...`);
  
  try {
    // Obtener guardias asignados
    const guardias = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        CONCAT(g.nombre, ' ', g.apellido_paterno) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true
        AND ta.estado = 'Activa'
    `, [instalacion_id]);
    
    // Obtener PPCs pendientes
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND ppc.estado = 'Pendiente'
    `, [instalacion_id]);
    
    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(anio, mes, 0).getDate() }, 
      (_, i) => i + 1
    );
    
    console.log(`📅 Generando ${diasDelMes.length} días para ${guardias.rows.length} guardias y ${ppcs.rows.length} PPCs`);
    
    const insertPromises = [];
    
    // Crear registros para guardias reales
    for (const guardia of guardias.rows) {
      for (const dia of diasDelMes) {
        insertPromises.push(
          query(`
            INSERT INTO as_turnos_pauta_mensual 
            (instalacion_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (instalacion_id, guardia_id, anio, mes, dia) 
            DO NOTHING
          `, [instalacion_id, guardia.id, anio, mes, dia, 'libre'])
        );
      }
    }
    
    // Crear registros para PPCs (como guardias virtuales)
    for (const ppc of ppcs.rows) {
      for (let i = 1; i <= ppc.cantidad_faltante; i++) {
        const ppcGuardiaId = `${ppc.id}_${i}`;
        for (const dia of diasDelMes) {
          insertPromises.push(
            query(`
              INSERT INTO as_turnos_pauta_mensual 
              (instalacion_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              ON CONFLICT (instalacion_id, guardia_id, anio, mes, dia) 
              DO NOTHING
            `, [instalacion_id, ppcGuardiaId, anio, mes, dia, 'libre'])
          );
        }
      }
    }
    
    console.log(`⏳ Ejecutando ${insertPromises.length} inserciones...`);
    await Promise.all(insertPromises);
    
    console.log(`✅ Pauta base creada exitosamente`);
    
    return insertPromises.length;
    
  } catch (error) {
    console.error('❌ Error creando pauta base:', error);
    throw error;
  }
}

async function limpiarPauta(instalacion_id: string, anio: number, mes: number) {
  console.log(`🧹 Limpiando pauta para instalación ${instalacion_id} en ${mes}/${anio}...`);
  
  try {
    const result = await query(`
      DELETE FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
    `, [instalacion_id, anio, mes]);
    
    console.log(`✅ ${result.rowCount} registros eliminados`);
    return result.rowCount;
    
  } catch (error) {
    console.error('❌ Error limpiando pauta:', error);
    throw error;
  }
}

// Función principal
async function main() {
  const instalacion_id = '7e05a55d-8db6-4c20-b51c-509f09d69f74'; // A Test
  const anio = 2025;
  const mes = 8;
  
  console.log('🚀 Iniciando verificación y corrección de pauta...\n');
  
  try {
    // 1. Verificar estado actual
    console.log('=' .repeat(60));
    console.log('PASO 1: VERIFICACIÓN ACTUAL');
    console.log('=' .repeat(60));
    await verificarPautaEspecifica(instalacion_id, anio, mes);
    
    // 2. Limpiar pauta existente (opcional)
    console.log('\n' + '=' .repeat(60));
    console.log('PASO 2: LIMPIEZA (OPCIONAL)');
    console.log('=' .repeat(60));
    const registrosEliminados = await limpiarPauta(instalacion_id, anio, mes);
    
    // 3. Crear pauta base nueva
    console.log('\n' + '=' .repeat(60));
    console.log('PASO 3: CREACIÓN DE PAUTA BASE');
    console.log('=' .repeat(60));
    const registrosCreados = await crearPautaBase(instalacion_id, anio, mes);
    
    // 4. Verificar resultado final
    console.log('\n' + '=' .repeat(60));
    console.log('PASO 4: VERIFICACIÓN FINAL');
    console.log('=' .repeat(60));
    await verificarPautaEspecifica(instalacion_id, anio, mes);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ PROCESO COMPLETADO');
    console.log(`📊 Resumen:`);
    console.log(`   - Registros eliminados: ${registrosEliminados}`);
    console.log(`   - Registros creados: ${registrosCreados}`);
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en script:', error);
      process.exit(1);
    });
}

export { verificarPautaEspecifica, crearPautaBase, limpiarPauta }; 