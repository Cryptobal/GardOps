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

    // 2. Verificar cuáles tienen asignaciones activas
    console.log('\n📊 2. Guardias con asignaciones activas:');
    const conAsignaciones = await query(`
      SELECT 
        g.id,
        g.nombre_completo,
        ta.estado,
        ta.fecha_inicio,
        ta.fecha_termino,
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
        console.log(`     Estado: ${g.estado}, Inicio: ${g.fecha_inicio}, Término: ${g.fecha_termino}`);
      });
    } else {
      console.log('No se encontraron guardias con asignaciones activas');
    }

    // 3. Ejecutar la query exacta del endpoint disponibles
    console.log('\n📊 3. Resultado del endpoint /api/guardias/disponibles (solo test):');
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

    // 4. Verificar todas las asignaciones de guardias test (cualquier estado)
    console.log('\n📊 4. Todas las asignaciones de guardias test (cualquier estado):');
    const todasAsignaciones = await query(`
      SELECT 
        g.nombre_completo,
        ta.estado,
        ta.fecha_inicio,
        ta.fecha_termino,
        ta.tipo_asignacion,
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
      ORDER BY g.nombre_completo, ta.fecha_inicio DESC
    `);

    if (todasAsignaciones.rows.length > 0) {
      console.log(`Total de asignaciones: ${todasAsignaciones.rows.length}`);
      todasAsignaciones.rows.forEach((a, i) => {
        console.log(`  ${i+1}. ${a.nombre_completo} - Estado: ${a.estado} - Tipo: ${a.tipo_asignacion}`);
        console.log(`     ${a.rol_nombre} en ${a.instalacion_nombre}`);
        console.log(`     Fechas: ${a.fecha_inicio} → ${a.fecha_termino}`);
      });
    } else {
      console.log('No se encontraron asignaciones para guardias test');
    }

    // 5. Resumen
    console.log('\n📋 RESUMEN:');
    console.log(`- Total guardias con "test": ${todosTest.rows.length}`);
    console.log(`- Activos: ${todosTest.rows.filter(g => g.activo).length}`);
    console.log(`- Con asignaciones activas: ${conAsignaciones.rows.length}`);
    console.log(`- Disponibles según endpoint: ${disponibles.rows.length}`);
    console.log(`- Esperados disponibles: ${todosTest.rows.filter(g => g.activo).length - conAsignaciones.rows.length}`);

    // 6. Verificar si hay problemas de estado
    const activosNoActivos = todosTest.rows.filter(g => !g.activo);
    if (activosNoActivos.length > 0) {
      console.log('\n⚠️  Guardias inactivos que no aparecerán:');
      activosNoActivos.forEach(g => {
        console.log(`  - ${g.nombre_completo} (${g.rut})`);
      });
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticarGuardiasTest().then(() => {
  console.log('\n✅ Diagnóstico completado');
  process.exit(0);
}).catch(console.error);