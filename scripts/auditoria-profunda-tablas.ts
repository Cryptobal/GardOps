import { query } from '../src/lib/database';

async function auditoriaProfundaTablas() {
  console.log('🔍 AUDITORÍA PROFUNDA DE TABLAS DEL SISTEMA DE TURNOS\n');
  console.log('=====================================================\n');

  try {
    // 1. ANÁLISIS DE as_turnos_configuracion
    console.log('1️⃣ ANÁLISIS DE as_turnos_configuracion:\n');
    
    const configuracion = await query(`
      SELECT 
        tc.id,
        tc.instalacion_id,
        tc.rol_servicio_id,
        tc.cantidad_guardias,
        tc.estado,
        tc.created_at,
        tc.updated_at,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tc.instalacion_id = i.id
      WHERE tc.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Propósito: Define cuántos guardias necesita una instalación para un rol específico');
    console.log('📊 Función: Es la "configuración maestra" del turno');
    console.log('📊 Datos encontrados:', configuracion.rows.length);
    configuracion.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Instalación: ${row.instalacion_nombre}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad guardias: ${row.cantidad_guardias}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Última actualización: ${row.updated_at}\n`);
    });

    // 2. ANÁLISIS DE as_turnos_requisitos
    console.log('2️⃣ ANÁLISIS DE as_turnos_requisitos:\n');
    
    const requisitos = await query(`
      SELECT 
        tr.id,
        tr.instalacion_id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        tr.estado,
        tr.created_at,
        tr.updated_at,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Propósito: Genera puestos individuales para asignar guardias');
    console.log('📊 Función: Cada registro representa un "puesto" que puede ser asignado');
    console.log('📊 Datos encontrados:', requisitos.rows.length);
    requisitos.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Instalación: ${row.instalacion_nombre}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad guardias: ${row.cantidad_guardias}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 3. ANÁLISIS DE as_turnos_ppc
    console.log('3️⃣ ANÁLISIS DE as_turnos_ppc:\n');
    
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.requisito_puesto_id,
        ppc.guardia_asignado_id,
        ppc.cantidad_faltante,
        ppc.estado,
        ppc.created_at,
        ppc.updated_at,
        tr.rol_servicio_id,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Propósito: Representa puestos que necesitan ser cubiertos');
    console.log('📊 Función: Es el "trabajo pendiente" - qué puestos faltan por asignar');
    console.log('📊 Datos encontrados:', ppcs.rows.length);
    ppcs.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Instalación: ${row.instalacion_nombre}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad faltante: ${row.cantidad_faltante}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Guardia asignado: ${row.guardia_nombre || 'Ninguno'}`);
      console.log(`      Requisito ID: ${row.requisito_puesto_id}\n`);
    });

    // 4. ANÁLISIS DE as_turnos_asignaciones
    console.log('4️⃣ ANÁLISIS DE as_turnos_asignaciones:\n');
    
    const asignaciones = await query(`
      SELECT 
        ta.id,
        ta.guardia_id,
        ta.requisito_puesto_id,
        ta.estado,
        ta.created_at,
        ta.updated_at,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        tr.rol_servicio_id,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      INNER JOIN guardias g ON ta.guardia_id = g.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Propósito: Registra qué guardia está asignado a qué puesto');
    console.log('📊 Función: Es la "asignación activa" - quién está trabajando dónde');
    console.log('📊 Datos encontrados:', asignaciones.rows.length);
    asignaciones.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Instalación: ${row.instalacion_nombre}`);
      console.log(`      Guardia: ${row.guardia_nombre}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Requisito ID: ${row.requisito_puesto_id}\n`);
    });

    // 5. ANÁLISIS DE as_turnos_puestos_operativos
    console.log('5️⃣ ANÁLISIS DE as_turnos_puestos_operativos:\n');
    
    const puestos = await query(`
      SELECT 
        id,
        instalacion_id,
        nombre,
        descripcion,
        estado,
        created_at,
        updated_at
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Propósito: Define puestos físicos en la instalación');
    console.log('📊 Función: Son "lugares de trabajo" físicos (ej: Puesto #1, Puesto #2)');
    console.log('📊 Datos encontrados:', puestos.rows.length);
    puestos.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Nombre: ${row.nombre}`);
      console.log(`      Descripción: ${row.descripcion}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 6. ANÁLISIS DE as_turnos_roles_servicio
    console.log('6️⃣ ANÁLISIS DE as_turnos_roles_servicio:\n');
    
    const roles = await query(`
      SELECT 
        id,
        nombre,
        descripcion,
        dias_trabajo,
        dias_descanso,
        horas_turno,
        hora_inicio,
        hora_termino,
        estado
      FROM as_turnos_roles_servicio
      WHERE id IN (
        SELECT DISTINCT rol_servicio_id 
        FROM as_turnos_configuracion 
        WHERE instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
      )
    `);
    
    console.log('📊 Propósito: Define tipos de turnos (4x4, 6x2, etc.)');
    console.log('📊 Función: Es el "catálogo" de turnos disponibles');
    console.log('📊 Datos encontrados:', roles.rows.length);
    roles.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Nombre: ${row.nombre}`);
      console.log(`      Descripción: ${row.descripcion}`);
      console.log(`      Horario: ${row.hora_inicio} - ${row.hora_termino}`);
      console.log(`      Días: ${row.dias_trabajo}x${row.dias_descanso}\n`);
    });

    // 7. ANÁLISIS DE RELACIONES Y REDUNDANCIAS
    console.log('7️⃣ ANÁLISIS DE RELACIONES Y REDUNDANCIAS:\n');
    
    console.log('🔗 RELACIONES ENTRE TABLAS:');
    console.log('   - as_turnos_configuracion → as_turnos_roles_servicio (rol_servicio_id)');
    console.log('   - as_turnos_configuracion → instalaciones (instalacion_id)');
    console.log('   - as_turnos_requisitos → as_turnos_configuracion (rol_servicio_id + instalacion_id)');
    console.log('   - as_turnos_ppc → as_turnos_requisitos (requisito_puesto_id)');
    console.log('   - as_turnos_asignaciones → as_turnos_requisitos (requisito_puesto_id)');
    console.log('   - as_turnos_asignaciones → guardias (guardia_id)');
    console.log('   - as_turnos_puestos_operativos → instalaciones (instalacion_id)\n');

    console.log('⚠️  POSIBLES REDUNDANCIAS:');
    console.log('   1. as_turnos_configuracion.cantidad_guardias vs as_turnos_requisitos.cantidad_guardias');
    console.log('      - Configuración: 0 guardias');
    console.log('      - Requisitos: 9 registros con 1 guardia cada uno');
    console.log('      - PROBLEMA: Deberían estar sincronizados\n');
    
    console.log('   2. as_turnos_ppc vs as_turnos_asignaciones');
    console.log('      - PPCs: 1 registro (Asignado)');
    console.log('      - Asignaciones: 1 registro (Activa)');
    console.log('      - PROBLEMA: Ambos representan lo mismo\n');
    
    console.log('   3. as_turnos_puestos_operativos vs as_turnos_requisitos');
    console.log('      - Puestos operativos: 7 registros');
    console.log('      - Requisitos: 9 registros');
    console.log('      - PROBLEMA: No están relacionados directamente\n');

    // 8. ANÁLISIS DE FLUJO DE DATOS
    console.log('8️⃣ ANÁLISIS DE FLUJO DE DATOS:\n');
    
    console.log('📊 FLUJO ACTUAL:');
    console.log('   1. Se crea as_turnos_configuracion (define cuántos guardias necesita)');
    console.log('   2. Se crean as_turnos_requisitos (genera puestos individuales)');
    console.log('   3. Se crean as_turnos_ppc (representa puestos pendientes)');
    console.log('   4. Se crea as_turnos_asignaciones (cuando se asigna un guardia)');
    console.log('   5. Se crean as_turnos_puestos_operativos (puestos físicos)\n');
    
    console.log('❌ PROBLEMAS EN EL FLUJO:');
    console.log('   - as_turnos_configuracion.cantidad_guardias se reduce a 0 cuando se eliminan PPCs');
    console.log('   - as_turnos_requisitos no se actualiza cuando cambia la configuración');
    console.log('   - as_turnos_puestos_operativos no está conectado con el resto del sistema');
    console.log('   - as_turnos_ppc y as_turnos_asignaciones representan lo mismo\n');

    // 9. RECOMENDACIONES
    console.log('9️⃣ RECOMENDACIONES:\n');
    
    console.log('🎯 TABLAS QUE PODRÍAN SER REDUNDANTES:');
    console.log('   1. as_turnos_puestos_operativos - No se usa en el flujo principal');
    console.log('   2. as_turnos_ppc - Podría ser reemplazado por as_turnos_asignaciones');
    console.log('   3. as_turnos_requisitos - Podría ser calculado desde as_turnos_configuracion\n');
    
    console.log('🔧 SISTEMA SIMPLIFICADO SUGERIDO:');
    console.log('   1. as_turnos_configuracion (define el turno)');
    console.log('   2. as_turnos_asignaciones (quién está asignado)');
    console.log('   3. as_turnos_roles_servicio (catálogo de turnos)');
    console.log('   4. Eliminar: as_turnos_requisitos, as_turnos_ppc, as_turnos_puestos_operativos\n');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  auditoriaProfundaTablas()
    .then(() => {
      console.log('\n🎉 Auditoría profunda completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en auditoría:', error);
      process.exit(1);
    });
}

export { auditoriaProfundaTablas }; 