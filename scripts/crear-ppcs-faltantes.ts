import { query } from '../src/lib/database';

async function crearPPCsFaltantes() {
  const instalacionId = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
  
  try {
    console.log('🔍 Buscando requisitos sin asignaciones ni PPCs...');
    
    // Obtener requisitos que no tienen asignaciones ni PPCs
    const requisitosSinCobertura = await query(`
      SELECT tr.id, tr.cantidad_guardias, tr.rol_servicio_id
      FROM as_turnos_requisitos tr
      WHERE tr.instalacion_id = $1 
      AND tr.id NOT IN (
        SELECT DISTINCT ta.requisito_puesto_id 
        FROM as_turnos_asignaciones ta 
        WHERE ta.estado = 'Activa'
      ) 
      AND tr.id NOT IN (
        SELECT DISTINCT ppc.requisito_puesto_id 
        FROM as_turnos_ppc ppc 
        WHERE ppc.estado IN ('Pendiente', 'Asignado')
      )
    `, [instalacionId]);
    
    console.log(`📋 Encontrados ${requisitosSinCobertura.rows.length} requisitos sin cobertura`);
    
    if (requisitosSinCobertura.rows.length === 0) {
      console.log('✅ Todos los requisitos ya tienen cobertura');
      return;
    }
    
    // Crear PPCs para cada requisito sin cobertura
    console.log('🔄 Creando PPCs pendientes...');
    
    for (const requisito of requisitosSinCobertura.rows) {
      await query(`
        INSERT INTO as_turnos_ppc (
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          fecha_deteccion,
          estado,
          observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        requisito.id,
        requisito.cantidad_guardias,
        'falta_asignacion',
        'Media',
        new Date().toISOString().split('T')[0],
        'Pendiente',
        'PPC generado automáticamente para puesto sin cobertura'
      ]);
      
      console.log(`✅ PPC creado para requisito ${requisito.id}`);
    }
    
    // Verificar el resultado
    const ppcsPendientes = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_ppc ppc
      JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
    `, [instalacionId]);
    
    const asignacionesActivas = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_asignaciones ta
      JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
    `, [instalacionId]);
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`   Puestos cubiertos (asignaciones): ${asignacionesActivas.rows[0].total}`);
    console.log(`   PPCs pendientes: ${ppcsPendientes.rows[0].total}`);
    console.log(`   Total: ${parseInt(asignacionesActivas.rows[0].total) + parseInt(ppcsPendientes.rows[0].total)}`);
    
    console.log('✅ PPCs faltantes creados correctamente');
    
  } catch (error) {
    console.error('❌ Error creando PPCs faltantes:', error);
  }
}

// Ejecutar el script
crearPPCsFaltantes()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 