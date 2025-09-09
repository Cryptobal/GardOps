import { query } from '../src/lib/database';

async function verificarPautaMensual() {
  try {
    console.log('🔍 Verificando datos de pauta mensual...');
    
    const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
    const anio = 2025;
    const mes = 8;
    
    console.log(`📋 Parámetros: instalacion_id=${instalacionId}, anio=${anio}, mes=${mes}`);
    
    // Verificar registros en la tabla
    const registrosResult = await query(`
      SELECT 
        id,
        instalacion_id,
        guardia_id,
        anio,
        mes,
        dia,
        estado,
        created_at,
        updated_at
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 AND anio = $2 AND mes = $3
      ORDER BY guardia_id, dia
      LIMIT 10
    `, [instalacionId, anio, mes]);
    
    console.log(`📊 Total de registros encontrados: ${registrosResult.rows.length}`);
    
    if (registrosResult.rows.length > 0) {
      console.log('📋 Primeros 10 registros:');
      registrosResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}, Guardia: ${row.guardia_id}, Día: ${row.dia}, Estado: ${row.estado}`);
      });
    } else {
      console.log('❌ No se encontraron registros para esta instalación/mes/año');
    }
    
    // Verificar guardias asignados
    const guardiasResult = await query(`
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
      ORDER BY g.nombre
    `, [instalacionId]);
    
    console.log(`👥 Guardias asignados encontrados: ${guardiasResult.rows.length}`);
    guardiasResult.rows.forEach((guardia, index) => {
      console.log(`  ${index + 1}. ${guardia.nombre_completo} (${guardia.id})`);
    });
    
    // Verificar PPCs
    const ppcsResult = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND ppc.estado IN ('Pendiente', 'Asignado')
      ORDER BY ppc.id
    `, [instalacionId]);
    
    console.log(`🔧 PPCs encontrados: ${ppcsResult.rows.length}`);
    ppcsResult.rows.forEach((ppc, index) => {
      console.log(`  ${index + 1}. PPC ${ppc.id.substring(0, 8)}... - Estado: ${ppc.estado} - Cantidad: ${ppc.cantidad_faltante}`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando pauta mensual:', error);
    throw error;
  }
}

// Ejecutar el script
verificarPautaMensual()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  }); 