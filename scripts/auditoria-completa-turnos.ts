import { query } from '../src/lib/database';

async function auditoriaCompletaTurnos() {
  console.log('🔍 AUDITORÍA COMPLETA DE TURNOS Y PPCs\n');
  console.log('==========================================\n');

  try {
    // 1. AUDITORÍA DE LA INSTALACIÓN ESPECÍFICA
    console.log('1️⃣ AUDITORÍA DE LA INSTALACIÓN: 15631bd6-03a9-459d-ae60-fc480f7f3e84\n');
    
    const instalacion = await query(`
      SELECT id, nombre, cliente_id, estado
      FROM instalaciones 
      WHERE id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    if (instalacion.rows.length > 0) {
      console.log('📋 Instalación encontrada:', instalacion.rows[0]);
    } else {
      console.log('❌ Instalación no encontrada');
      return;
    }

    // 2. AUDITORÍA DE CONFIGURACIÓN DE TURNOS
    console.log('\n2️⃣ AUDITORÍA DE as_turnos_configuracion:\n');
    
    const configuracion = await query(`
      SELECT 
        tc.id,
        tc.instalacion_id,
        tc.rol_servicio_id,
        tc.cantidad_guardias,
        tc.estado,
        tc.created_at,
        tc.updated_at,
        rs.nombre as rol_nombre
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Configuraciones de turnos encontradas:', configuracion.rows.length);
    configuracion.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad guardias: ${row.cantidad_guardias}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}`);
      console.log(`      Actualizado: ${row.updated_at}\n`);
    });

    // 3. AUDITORÍA DE REQUISITOS DE PUESTOS
    console.log('3️⃣ AUDITORÍA DE as_turnos_requisitos:\n');
    
    const requisitos = await query(`
      SELECT 
        tr.id,
        tr.instalacion_id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        tr.estado,
        tr.created_at,
        tr.updated_at,
        rs.nombre as rol_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Requisitos de puestos encontrados:', requisitos.rows.length);
    requisitos.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad guardias: ${row.cantidad_guardias}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 4. AUDITORÍA DE PPCs
    console.log('4️⃣ AUDITORÍA DE as_turnos_ppc:\n');
    
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
        rs.nombre as rol_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 PPCs encontrados:', ppcs.rows.length);
    ppcs.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Requisito ID: ${row.requisito_puesto_id}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Cantidad faltante: ${row.cantidad_faltante}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Guardia asignado: ${row.guardia_asignado_id || 'Ninguno'}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 5. AUDITORÍA DE ASIGNACIONES
    console.log('5️⃣ AUDITORÍA DE as_turnos_asignaciones:\n');
    
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
        rs.nombre as rol_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN guardias g ON ta.guardia_id = g.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
    `);
    
    console.log('📊 Asignaciones encontradas:', asignaciones.rows.length);
    asignaciones.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Guardia: ${row.guardia_nombre}`);
      console.log(`      Requisito ID: ${row.requisito_puesto_id}`);
      console.log(`      Rol: ${row.rol_nombre}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 6. AUDITORÍA DE PUESTOS OPERATIVOS
    console.log('6️⃣ AUDITORÍA DE as_turnos_puestos_operativos:\n');
    
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
    
    console.log('📊 Puestos operativos encontrados:', puestos.rows.length);
    puestos.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. ID: ${row.id}`);
      console.log(`      Nombre: ${row.nombre}`);
      console.log(`      Descripción: ${row.descripcion}`);
      console.log(`      Estado: ${row.estado}`);
      console.log(`      Creado: ${row.created_at}\n`);
    });

    // 7. ANÁLISIS DE CONTRADICCIONES
    console.log('7️⃣ ANÁLISIS DE CONTRADICCIONES:\n');
    
    // Contar PPCs por estado
    const ppcsPorEstado = await query(`
      SELECT 
        ppc.estado,
        COUNT(*) as cantidad,
        SUM(ppc.cantidad_faltante) as total_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
      GROUP BY ppc.estado
    `);
    
    console.log('📊 PPCs por estado:');
    ppcsPorEstado.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} registros, ${row.total_faltante} faltantes total`);
    });

    // Contar asignaciones por estado
    const asignacionesPorEstado = await query(`
      SELECT 
        ta.estado,
        COUNT(*) as cantidad
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'
      GROUP BY ta.estado
    `);
    
    console.log('\n📊 Asignaciones por estado:');
    asignacionesPorEstado.rows.forEach((row: any) => {
      console.log(`   - ${row.estado}: ${row.cantidad} registros`);
    });

    // 8. RESUMEN FINAL
    console.log('\n8️⃣ RESUMEN FINAL:\n');
    
    const totalPuestos = puestos.rows.length;
    const totalPPCs = ppcs.rows.length;
    const totalAsignaciones = asignaciones.rows.length;
    const configuracionGuardias = configuracion.rows.reduce((sum: number, row: any) => sum + row.cantidad_guardias, 0);
    
    console.log(`📊 Números finales:`);
    console.log(`   - Puestos operativos: ${totalPuestos}`);
    console.log(`   - PPCs totales: ${totalPPCs}`);
    console.log(`   - Asignaciones totales: ${totalAsignaciones}`);
    console.log(`   - Cantidad guardias en configuración: ${configuracionGuardias}`);
    
    console.log('\n🔍 ANÁLISIS:');
    console.log(`   - La página principal muestra "9 puestos" (probablemente de puestos_operativos)`);
    console.log(`   - La página principal muestra "8 PPCs" (probablemente contando registros de as_turnos_ppc)`);
    console.log(`   - La página de instalación muestra "0 total puestos" (probablemente de cantidad_guardias en configuración)`);
    console.log(`   - La página de instalación muestra "1 asignado" (probablemente de as_turnos_asignaciones)`);
    console.log(`   - La página de instalación muestra "0 pendientes" (probablemente PPCs con estado 'Pendiente')`);

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  auditoriaCompletaTurnos()
    .then(() => {
      console.log('\n🎉 Auditoría completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en auditoría:', error);
      process.exit(1);
    });
}

export { auditoriaCompletaTurnos }; 