import { query } from '../src/lib/database';

async function validacionFinalPuestos() {
  console.log('✅ VALIDACIÓN FINAL DE PUESTOS OPERATIVOS');
  console.log('==========================================\n');

  try {
    // 1. Verificar estructura de datos
    console.log('📋 1. VERIFICANDO ESTRUCTURA DE DATOS...');
    
    const estructura = await query(`
      SELECT 
        (SELECT COUNT(*) FROM as_turnos_puestos_operativos) as total_puestos,
        (SELECT COUNT(*) FROM as_turnos_requisitos WHERE estado = 'Activo') as total_requisitos,
        (SELECT COUNT(*) FROM as_turnos_ppc WHERE estado = 'Pendiente') as ppcs_pendientes,
        (SELECT COUNT(*) FROM as_turnos_asignaciones WHERE estado = 'Activa') as asignaciones_activas
    `);
    
    const datos = estructura.rows[0];
    console.log(`✅ Total puestos operativos: ${datos.total_puestos}`);
    console.log(`✅ Total requisitos activos: ${datos.total_requisitos}`);
    console.log(`✅ PPCs pendientes: ${datos.ppcs_pendientes}`);
    console.log(`✅ Asignaciones activas: ${datos.asignaciones_activas}`);

    // 2. Verificar numeración secuencial
    console.log('\n📋 2. VERIFICANDO NUMERACIÓN SECUENCIAL...');
    
    const numeracion = await query(`
      SELECT 
        instalacion_id,
        nombre,
        CASE 
          WHEN nombre ~ '^Puesto #([0-9]+)$' THEN 
            CAST(SUBSTRING(nombre FROM 'Puesto #([0-9]+)') AS INTEGER)
          ELSE NULL
        END as numero_puesto
      FROM as_turnos_puestos_operativos
      ORDER BY instalacion_id, numero_puesto
    `);
    
    const puestosConNumeracion = numeracion.rows.filter((p: any) => p.numero_puesto !== null);
    const puestosSinNumeracion = numeracion.rows.filter((p: any) => p.numero_puesto === null);
    
    console.log(`✅ Puestos con numeración secuencial: ${puestosConNumeracion.length}`);
    if (puestosSinNumeracion.length > 0) {
      console.log(`⚠️ Puestos sin numeración secuencial: ${puestosSinNumeracion.length}`);
      puestosSinNumeracion.forEach((p: any) => {
        console.log(`  - ${p.nombre} (Instalación: ${p.instalacion_id})`);
      });
    }

    // 3. Verificar duplicados
    console.log('\n📋 3. VERIFICANDO DUPLICADOS...');
    
    const duplicados = await query(`
      SELECT 
        instalacion_id,
        nombre,
        COUNT(*) as cantidad
      FROM as_turnos_puestos_operativos
      GROUP BY instalacion_id, nombre
      HAVING COUNT(*) > 1
      ORDER BY instalacion_id, nombre
    `);
    
    if (duplicados.rows.length > 0) {
      console.log(`❌ DUPLICADOS ENCONTRADOS: ${duplicados.rows.length}`);
      duplicados.rows.forEach((dup: any) => {
        console.log(`  - Instalación: ${dup.instalacion_id}, Nombre: ${dup.nombre}, Cantidad: ${dup.cantidad}`);
      });
    } else {
      console.log('✅ No se encontraron duplicados');
    }

    // 4. Verificar inconsistencias PPCs vs Asignaciones
    console.log('\n📋 4. VERIFICANDO INCONSISTENCIAS PPCs vs ASIGNACIONES...');
    
    const inconsistencias = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.requisito_puesto_id,
        ppc.estado as ppc_estado,
        ppc.guardia_asignado_id,
        asig.id as asignacion_id,
        asig.estado as asignacion_estado
      FROM as_turnos_ppc ppc
      LEFT JOIN as_turnos_asignaciones asig ON ppc.requisito_puesto_id = asig.requisito_puesto_id
      WHERE (ppc.estado = 'Pendiente' AND asig.estado = 'Activa')
         OR (ppc.estado = 'Asignado' AND asig.estado IS NULL)
      ORDER BY ppc.requisito_puesto_id
    `);
    
    if (inconsistencias.rows.length > 0) {
      console.log(`❌ INCONSISTENCIAS ENCONTRADAS: ${inconsistencias.rows.length}`);
      inconsistencias.rows.forEach((inc: any) => {
        console.log(`  - PPC ID: ${inc.ppc_id}, Estado PPC: ${inc.ppc_estado}, Asignación: ${inc.asignacion_id || 'N/A'}`);
      });
    } else {
      console.log('✅ No se encontraron inconsistencias entre PPCs y asignaciones');
    }

    // 5. Verificar asignaciones duplicadas
    console.log('\n📋 5. VERIFICANDO ASIGNACIONES DUPLICADAS...');
    
    const asignacionesDuplicadas = await query(`
      SELECT 
        guardia_id,
        COUNT(*) as cantidad
      FROM as_turnos_asignaciones
      WHERE estado = 'Activa'
      GROUP BY guardia_id
      HAVING COUNT(*) > 1
      ORDER BY guardia_id
    `);
    
    if (asignacionesDuplicadas.rows.length > 0) {
      console.log(`❌ ASIGNACIONES DUPLICADAS ENCONTRADAS: ${asignacionesDuplicadas.rows.length}`);
      asignacionesDuplicadas.rows.forEach((dup: any) => {
        console.log(`  - Guardia: ${dup.guardia_id}, Cantidad asignaciones: ${dup.cantidad}`);
      });
    } else {
      console.log('✅ No se encontraron asignaciones duplicadas');
    }

    // 6. Verificar cobertura de requisitos
    console.log('\n📋 6. VERIFICANDO COBERTURA DE REQUISITOS...');
    
    const cobertura = await query(`
      SELECT 
        tr.id as requisito_id,
        tr.instalacion_id,
        tr.cantidad_guardias,
        COALESCE(ppcs_pendientes.count, 0) as ppcs_pendientes,
        COALESCE(asignaciones_activas.count, 0) as asignaciones_activas,
        (COALESCE(ppcs_pendientes.count, 0) + COALESCE(asignaciones_activas.count, 0)) as total_cobertura
      FROM as_turnos_requisitos tr
      LEFT JOIN (
        SELECT 
          requisito_puesto_id,
          COUNT(*) as count
        FROM as_turnos_ppc
        WHERE estado = 'Pendiente'
        GROUP BY requisito_puesto_id
      ) ppcs_pendientes ON ppcs_pendientes.requisito_puesto_id = tr.id
      LEFT JOIN (
        SELECT 
          requisito_puesto_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones
        WHERE estado = 'Activa'
        GROUP BY requisito_puesto_id
      ) asignaciones_activas ON asignaciones_activas.requisito_puesto_id = tr.id
      WHERE tr.estado = 'Activo'
      ORDER BY tr.instalacion_id
    `);
    
    const requisitosIncompletos = cobertura.rows.filter((req: any) => req.total_cobertura < req.cantidad_guardias);
    const requisitosCompletos = cobertura.rows.filter((req: any) => req.total_cobertura >= req.cantidad_guardias);
    
    console.log(`✅ Requisitos completos: ${requisitosCompletos.length}`);
    console.log(`⚠️ Requisitos incompletos: ${requisitosIncompletos.length}`);
    
    if (requisitosIncompletos.length > 0) {
      console.log('Detalle de requisitos incompletos:');
      requisitosIncompletos.forEach((req: any) => {
        console.log(`  - Requisito ${req.requisito_id}: ${req.asignaciones_activas} asignados + ${req.ppcs_pendientes} PPCs = ${req.total_cobertura}/${req.cantidad_guardias}`);
      });
    }

    // 7. Resumen final
    console.log('\n📊 RESUMEN FINAL DE VALIDACIÓN');
    console.log('===============================');
    
    const errores = [
      duplicados.rows.length > 0 ? 'Duplicados en puestos' : null,
      inconsistencias.rows.length > 0 ? 'Inconsistencias PPCs vs Asignaciones' : null,
      asignacionesDuplicadas.rows.length > 0 ? 'Asignaciones duplicadas' : null,
      puestosSinNumeracion.length > 0 ? 'Puestos sin numeración secuencial' : null,
      requisitosIncompletos.length > 0 ? 'Requisitos incompletos' : null
    ].filter(Boolean);
    
    if (errores.length > 0) {
      console.log('❌ PROBLEMAS ENCONTRADOS:');
      errores.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ TODOS LOS CHECKS PASARON EXITOSAMENTE');
      console.log('🎉 La lógica de puestos operativos está funcionando correctamente');
    }

    console.log('\n📈 ESTADÍSTICAS FINALES:');
    console.log(`  - Puestos operativos: ${datos.total_puestos}`);
    console.log(`  - Requisitos activos: ${datos.total_requisitos}`);
    console.log(`  - PPCs pendientes: ${datos.ppcs_pendientes}`);
    console.log(`  - Asignaciones activas: ${datos.asignaciones_activas}`);
    console.log(`  - Puestos con numeración correcta: ${puestosConNumeracion.length}/${numeracion.rows.length}`);
    console.log(`  - Requisitos completos: ${requisitosCompletos.length}/${cobertura.rows.length}`);

    console.log('\n✅ Validación final completada');

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
  }
}

// Ejecutar validación
validacionFinalPuestos().then(() => {
  console.log('\n🏁 Validación finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 