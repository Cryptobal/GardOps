import { query } from '../src/lib/database';

async function testFiltroGuardiasDisponibles() {
  console.log('🧪 PROBANDO FILTRO DE GUARDIAS DISPONIBLES');
  console.log('='.repeat(50));

  try {
    // Fecha de prueba: 9 de agosto de 2025
    const fecha = '2025-08-09';
    const fechaObj = new Date(fecha + 'T00:00:00.000Z');
    const anio = fechaObj.getUTCFullYear();
    const mes = fechaObj.getUTCMonth() + 1;
    const dia = fechaObj.getUTCDate();

    console.log(`📅 Fecha de prueba: ${fecha} (${anio}-${mes}-${dia})`);

    // 1. Verificar guardias que están asignados como rol del puesto en esa fecha
    console.log('\n1️⃣ GUARDIAS ASIGNADOS COMO ROL DEL PUESTO:');
    const guardiasRolPuesto = await query(`
      SELECT DISTINCT 
        po.guardia_id,
        g.nombre,
        g.apellido_paterno,
        po.nombre_puesto,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_pauta_mensual pm ON po.id = pm.puesto_id
      INNER JOIN guardias g ON po.guardia_id = g.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.guardia_id IS NOT NULL
    `, [anio, mes, dia]);

    console.log(`📊 Guardias asignados como rol del puesto: ${guardiasRolPuesto.rows.length}`);
    guardiasRolPuesto.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre} ${row.apellido_paterno} (${row.nombre_puesto} en ${row.instalacion_nombre})`);
    });

    // 2. Verificar guardias que tienen turno asignado en esa fecha
    console.log('\n2️⃣ GUARDIAS CON TURNO ASIGNADO:');
    const guardiasConTurno = await query(`
      SELECT DISTINCT 
        pm.guardia_id,
        g.nombre,
        g.apellido_paterno,
        po.nombre_puesto,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN guardias g ON pm.guardia_id = g.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND pm.guardia_id IS NOT NULL
    `, [anio, mes, dia]);

    console.log(`📊 Guardias con turno asignado: ${guardiasConTurno.rows.length}`);
    guardiasConTurno.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre} ${row.apellido_paterno} (${row.nombre_puesto} en ${row.instalacion_nombre})`);
    });

    // 3. Simular el nuevo filtro de guardias disponibles
    console.log('\n3️⃣ GUARDIAS DISPONIBLES (CON NUEVO FILTRO):');
    const guardiasDisponibles = await query(`
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
          SELECT DISTINCT po.guardia_id 
          FROM as_turnos_puestos_operativos po
          INNER JOIN as_turnos_pauta_mensual pm ON po.id = pm.puesto_id
          WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
            AND po.guardia_id IS NOT NULL
        )
      ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
      LIMIT 10
    `, [anio, mes, dia]);

    console.log(`📊 Guardias disponibles: ${guardiasDisponibles.rows.length}`);
    guardiasDisponibles.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre_completo} (${row.rut})`);
    });

    // 4. Verificar que los guardias excluidos no aparecen en la lista de disponibles
    console.log('\n4️⃣ VERIFICACIÓN DE EXCLUSIÓN:');
    const guardiasExcluidos = guardiasRolPuesto.rows.map((row: any) => row.guardia_id);
    const guardiasDisponiblesIds = guardiasDisponibles.rows.map((row: any) => row.id);
    
    const conflictos = guardiasExcluidos.filter(id => guardiasDisponiblesIds.includes(id));
    
    if (conflictos.length === 0) {
      console.log('✅ Todos los guardias asignados como rol del puesto han sido excluidos correctamente');
    } else {
      console.log('❌ ERROR: Algunos guardias asignados como rol del puesto aparecen en la lista de disponibles');
      console.log('Guardias en conflicto:', conflictos);
    }

    console.log('\n🎉 PRUEBA COMPLETADA');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testFiltroGuardiasDisponibles().then(() => {
  console.log('\n✅ Script de prueba completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error ejecutando script:', error);
  process.exit(1);
});
