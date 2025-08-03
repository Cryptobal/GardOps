import { query } from '../src/lib/database';

async function auditoriaPuestosOperativos() {
  console.log('🔍 AUDITORÍA EXHAUSTIVA DE PUESTOS OPERATIVOS');
  console.log('===============================================\n');

  try {
    // 1. Verificar existencia de tablas
    console.log('📋 1. VERIFICANDO EXISTENCIA DE TABLAS...');
    
    const tablasRequeridas = [
      'as_turnos_puestos_operativos',
      'as_turnos_requisitos', 
      'as_turnos_ppc',
      'as_turnos_asignaciones',
      'as_turnos_configuracion',
      'as_turnos_roles_servicio'
    ];

    for (const tabla of tablasRequeridas) {
      const exists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);
      
      console.log(`${exists.rows[0].exists ? '✅' : '❌'} ${tabla}`);
    }

    // 2. Verificar estructura de as_turnos_puestos_operativos
    console.log('\n📋 2. ESTRUCTURA DE as_turnos_puestos_operativos...');
    
    const estructuraPuestos = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_puestos_operativos'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructuraPuestos.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 3. Verificar datos en puestos operativos
    console.log('\n📋 3. DATOS EN as_turnos_puestos_operativos...');
    
    const puestosData = await query(`
      SELECT 
        id,
        instalacion_id,
        nombre,
        estado,
        created_at
      FROM as_turnos_puestos_operativos
      ORDER BY instalacion_id, nombre
    `);
    
    console.log(`Total puestos operativos: ${puestosData.rows.length}`);
    if (puestosData.rows.length > 0) {
      console.log('Primeros 5 puestos:');
      puestosData.rows.slice(0, 5).forEach((puesto: any) => {
        console.log(`  ID: ${puesto.id}, Instalación: ${puesto.instalacion_id}, Nombre: ${puesto.nombre}, Estado: ${puesto.estado}`);
      });
    }

    // 4. Verificar requisitos de puestos
    console.log('\n📋 4. DATOS EN as_turnos_requisitos...');
    
    const requisitosData = await query(`
      SELECT 
        id,
        instalacion_id,
        puesto_operativo_id,
        rol_servicio_id,
        cantidad_guardias,
        estado
      FROM as_turnos_requisitos
      ORDER BY instalacion_id, rol_servicio_id
    `);
    
    console.log(`Total requisitos: ${requisitosData.rows.length}`);
    if (requisitosData.rows.length > 0) {
      console.log('Primeros 5 requisitos:');
      requisitosData.rows.slice(0, 5).forEach((req: any) => {
        console.log(`  ID: ${req.id}, Instalación: ${req.instalacion_id}, Rol: ${req.rol_servicio_id}, Cantidad: ${req.cantidad_guardias}`);
      });
    }

    // 5. Verificar PPCs
    console.log('\n📋 5. DATOS EN as_turnos_ppc...');
    
    const ppcsData = await query(`
      SELECT 
        id,
        requisito_puesto_id,
        cantidad_faltante,
        estado,
        guardia_asignado_id
      FROM as_turnos_ppc
      ORDER BY requisito_puesto_id
    `);
    
    console.log(`Total PPCs: ${ppcsData.rows.length}`);
    if (ppcsData.rows.length > 0) {
      console.log('Primeros 5 PPCs:');
      ppcsData.rows.slice(0, 5).forEach((ppc: any) => {
        console.log(`  ID: ${ppc.id}, Requisito: ${ppc.requisito_puesto_id}, Cantidad: ${ppc.cantidad_faltante}, Estado: ${ppc.estado}`);
      });
    }

    // 6. Verificar asignaciones
    console.log('\n📋 6. DATOS EN as_turnos_asignaciones...');
    
    const asignacionesData = await query(`
      SELECT 
        id,
        guardia_id,
        requisito_puesto_id,
        estado,
        fecha_inicio
      FROM as_turnos_asignaciones
      ORDER BY requisito_puesto_id
    `);
    
    console.log(`Total asignaciones: ${asignacionesData.rows.length}`);
    if (asignacionesData.rows.length > 0) {
      console.log('Primeros 5 asignaciones:');
      asignacionesData.rows.slice(0, 5).forEach((asig: any) => {
        console.log(`  ID: ${asig.id}, Guardia: ${asig.guardia_id}, Requisito: ${asig.requisito_puesto_id}, Estado: ${asig.estado}`);
      });
    }

    // 7. Verificar duplicados en puestos por rol
    console.log('\n📋 7. VERIFICANDO DUPLICADOS EN PUESTOS POR ROL...');
    
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
      console.log('❌ DUPLICADOS ENCONTRADOS:');
      duplicados.rows.forEach((dup: any) => {
        console.log(`  Instalación: ${dup.instalacion_id}, Nombre: ${dup.nombre}, Cantidad: ${dup.cantidad}`);
      });
    } else {
      console.log('✅ No se encontraron duplicados en puestos por rol');
    }

    // 8. Verificar inconsistencias entre PPCs y asignaciones
    console.log('\n📋 8. VERIFICANDO INCONSISTENCIAS PPCs vs ASIGNACIONES...');
    
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
      console.log('❌ INCONSISTENCIAS ENCONTRADAS:');
      inconsistencias.rows.forEach((inc: any) => {
        console.log(`  PPC ID: ${inc.ppc_id}, Estado PPC: ${inc.ppc_estado}, Asignación: ${inc.asignacion_id || 'N/A'}`);
      });
    } else {
      console.log('✅ No se encontraron inconsistencias entre PPCs y asignaciones');
    }

    // 9. Verificar numeración secuencial de puestos
    console.log('\n📋 9. VERIFICANDO NUMERACIÓN SECUENCIAL DE PUESTOS...');
    
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
      WHERE nombre ~ '^Puesto #([0-9]+)$'
      ORDER BY instalacion_id, numero_puesto
    `);
    
    console.log(`Puestos con numeración secuencial: ${numeracion.rows.length}`);
    if (numeracion.rows.length > 0) {
      console.log('Ejemplos de numeración:');
      numeracion.rows.slice(0, 10).forEach((num: any) => {
        console.log(`  Instalación: ${num.instalacion_id}, ${num.nombre} (Número: ${num.numero_puesto})`);
      });
    }

    // 10. Resumen final
    console.log('\n📊 RESUMEN FINAL');
    console.log('================');
    
    const resumen = await query(`
      SELECT 
        (SELECT COUNT(*) FROM as_turnos_puestos_operativos) as total_puestos,
        (SELECT COUNT(*) FROM as_turnos_requisitos) as total_requisitos,
        (SELECT COUNT(*) FROM as_turnos_ppc WHERE estado = 'Pendiente') as ppcs_pendientes,
        (SELECT COUNT(*) FROM as_turnos_asignaciones WHERE estado = 'Activa') as asignaciones_activas
    `);
    
    const datos = resumen.rows[0];
    console.log(`Total puestos operativos: ${datos.total_puestos}`);
    console.log(`Total requisitos: ${datos.total_requisitos}`);
    console.log(`PPCs pendientes: ${datos.ppcs_pendientes}`);
    console.log(`Asignaciones activas: ${datos.asignaciones_activas}`);

    console.log('\n✅ Auditoría completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  }
}

// Ejecutar auditoría
auditoriaPuestosOperativos().then(() => {
  console.log('\n🏁 Auditoría finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 