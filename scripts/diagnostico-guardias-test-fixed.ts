import { query } from '../src/lib/database';

async function diagnosticarGuardiasTest() {
  console.log('🔍 Diagnosticando guardias con "test"...\n');

  try {
    // 1. Obtener todos los guardias con "test" en el nombre
    console.log('📊 1. Todos los guardias con "test":');
    const todosTest = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.activo
      FROM guardias g
      WHERE (
        g.nombre ILIKE '%test%' 
        OR g.apellido_paterno ILIKE '%test%' 
        OR g.apellido_materno ILIKE '%test%'
        OR CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) ILIKE '%test%'
      )
      ORDER BY g.nombre, g.apellido_paterno
    `);
    
    console.log(`Encontrados ${todosTest.rows.length} guardias:`);
    todosTest.rows.forEach((g, i) => {
      console.log(`  ${i+1}. ${g.nombre_completo} (${g.rut}) - Activo: ${g.activo}`);
    });

    // 2. Verificar estructura de as_turnos_asignaciones
    console.log('\n📊 2. Estructura de tabla as_turnos_asignaciones:');
    const estructura = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_asignaciones'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas disponibles:');
    estructura.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 3. Verificar cuáles tienen asignaciones activas
    console.log('\n📊 3. Guardias con asignaciones activas:');
    const conAsignaciones = await query(`
      SELECT 
        g.id,
        g.nombre_completo,
        ta.estado,
        ta.fecha_asignacion,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_nombre
      FROM (
        SELECT 
          id,
          CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) as nombre_completo
        FROM guardias
        WHERE (
          nombre ILIKE '%test%' 
          OR apellido_paterno ILIKE '%test%' 
          OR apellido_materno ILIKE '%test%'
          OR CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) ILIKE '%test%'
        )
      ) g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ta.estado = 'Activa'
      ORDER BY g.nombre_completo
    `);

    if (conAsignaciones.rows.length > 0) {
      console.log(`Encontrados ${conAsignaciones.rows.length} guardias con asignaciones activas:`);
      conAsignaciones.rows.forEach((g, i) => {
        console.log(`  ${i+1}. ${g.nombre_completo} - ${g.rol_nombre} en ${g.instalacion_nombre}`);
        console.log(`     Estado: ${g.estado}, Asignación: ${g.fecha_asignacion}`);
      });
    } else {
      console.log('No se encontraron guardias con asignaciones activas');
    }

    // 4. Ejecutar la query exacta del endpoint disponibles
    console.log('\n📊 4. Resultado del endpoint /api/guardias/disponibles (solo test):');
    const disponibles = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.activo
      FROM guardias g
      WHERE g.activo = true
        AND g.id NOT IN (
          SELECT DISTINCT ta.guardia_id 
          FROM as_turnos_asignaciones ta 
          WHERE ta.estado = 'Activa'
        )
        AND (
          g.nombre ILIKE '%test%' 
          OR g.apellido_paterno ILIKE '%test%' 
          OR g.apellido_materno ILIKE '%test%'
          OR CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) ILIKE '%test%'
        )
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
    `);

    console.log(`Guardias disponibles: ${disponibles.rows.length}`);
    disponibles.rows.forEach((g, i) => {
      console.log(`  ${i+1}. ${g.nombre_completo} (${g.rut})`);
    });

    // 5. Verificar todos los guardias que están siendo excluidos
    console.log('\n📊 5. Guardias test que están siendo excluidos (tienen asignaciones activas):');
    const excluidos = await query(`
      SELECT DISTINCT 
        g.id,
        g.nombre_completo,
        ta.estado
      FROM (
        SELECT 
          id,
          CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) as nombre_completo
        FROM guardias
        WHERE (
          nombre ILIKE '%test%' 
          OR apellido_paterno ILIKE '%test%' 
          OR apellido_materno ILIKE '%test%'
          OR CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno, '')) ILIKE '%test%'
        )
        AND activo = true
      ) g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      WHERE ta.estado = 'Activa'
      ORDER BY g.nombre_completo
    `);

    if (excluidos.rows.length > 0) {
      console.log(`Guardias excluidos: ${excluidos.rows.length}`);
      excluidos.rows.forEach((g, i) => {
        console.log(`  ${i+1}. ${g.nombre_completo} - Estado: ${g.estado}`);
      });
    } else {
      console.log('No hay guardias excluidos por asignaciones activas');
    }

    // 6. Resumen
    console.log('\n📋 RESUMEN:');
    console.log(`- Total guardias con "test": ${todosTest.rows.length}`);
    console.log(`- Con asignaciones activas: ${conAsignaciones.rows.length}`);
    console.log(`- Excluidos por asignaciones: ${excluidos.rows.length}`);
    console.log(`- Disponibles según endpoint: ${disponibles.rows.length}`);
    console.log(`- Esperados disponibles: ${todosTest.rows.length - excluidos.rows.length}`);

    if (disponibles.rows.length !== (todosTest.rows.length - excluidos.rows.length)) {
      console.log('⚠️  HAY UNA DISCREPANCIA EN LOS NÚMEROS');
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticarGuardiasTest().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch(console.error);