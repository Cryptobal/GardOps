import { query } from '../src/lib/database';

async function verificarEstructuraADOCompleta() {
  console.log('🔍 VERIFICACIÓN COMPLETA DE ESTRUCTURA ADO\n');

  // =====================================================
  // 1. VERIFICAR ESTRUCTURA DE as_turnos_roles_servicio
  // =====================================================
  console.log('📋 1. ESTRUCTURA DE as_turnos_roles_servicio:');
  
  const estructuraRolesServicio = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_roles_servicio'
    ORDER BY ordinal_position
  `);

  console.log('   Campos encontrados:');
  estructuraRolesServicio.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
  });

  // Verificar campos requeridos
  const camposRequeridosRoles = ['id', 'nombre', 'dias_trabajo', 'dias_descanso', 'horas_turno', 'hora_inicio', 'hora_termino'];
  const camposEncontradosRoles = estructuraRolesServicio.rows.map((col: any) => col.column_name);
  
  console.log('\n   ✅ Campos requeridos:');
  camposRequeridosRoles.forEach(campo => {
    if (camposEncontradosRoles.includes(campo)) {
      console.log(`   ✅ ${campo}`);
    } else {
      console.log(`   ❌ ${campo} - FALTANTE`);
    }
  });

  // =====================================================
  // 2. VERIFICAR ESTRUCTURA DE as_turnos_configuracion
  // =====================================================
  console.log('\n📋 2. ESTRUCTURA DE as_turnos_configuracion:');
  
  const estructuraConfiguracion = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_configuracion'
    ORDER BY ordinal_position
  `);

  console.log('   Campos encontrados:');
  estructuraConfiguracion.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
  });

  // =====================================================
  // 3. VERIFICAR ESTRUCTURA DE as_turnos_requisitos
  // =====================================================
  console.log('\n📋 3. ESTRUCTURA DE as_turnos_requisitos:');
  
  const estructuraRequisitos = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_requisitos'
    ORDER BY ordinal_position
  `);

  console.log('   Campos encontrados:');
  estructuraRequisitos.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
  });

  // =====================================================
  // 4. VERIFICAR ESTRUCTURA DE as_turnos_ppc
  // =====================================================
  console.log('\n📋 4. ESTRUCTURA DE as_turnos_ppc:');
  
  const estructuraPPC = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_ppc'
    ORDER BY ordinal_position
  `);

  console.log('   Campos encontrados:');
  estructuraPPC.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
  });

  // Verificar campos requeridos para PPC
  const camposRequeridosPPC = ['id', 'requisito_puesto_id', 'cantidad_faltante', 'motivo', 'estado'];
  const camposEncontradosPPC = estructuraPPC.rows.map((col: any) => col.column_name);
  
  console.log('\n   ✅ Campos requeridos para PPC:');
  camposRequeridosPPC.forEach(campo => {
    if (camposEncontradosPPC.includes(campo)) {
      console.log(`   ✅ ${campo}`);
    } else {
      console.log(`   ❌ ${campo} - FALTANTE`);
    }
  });

  // =====================================================
  // 5. VERIFICAR ESTRUCTURA DE as_turnos_asignaciones
  // =====================================================
  console.log('\n📋 5. ESTRUCTURA DE as_turnos_asignaciones:');
  
  const estructuraAsignaciones = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_asignaciones'
    ORDER BY ordinal_position
  `);

  console.log('   Campos encontrados:');
  estructuraAsignaciones.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
  });

  // Verificar campos requeridos para asignaciones
  const camposRequeridosAsignaciones = ['id', 'guardia_id', 'requisito_puesto_id', 'fecha_inicio', 'fecha_termino', 'estado'];
  const camposEncontradosAsignaciones = estructuraAsignaciones.rows.map((col: any) => col.column_name);
  
  console.log('\n   ✅ Campos requeridos para asignaciones:');
  camposRequeridosAsignaciones.forEach(campo => {
    if (camposEncontradosAsignaciones.includes(campo)) {
      console.log(`   ✅ ${campo}`);
    } else {
      console.log(`   ❌ ${campo} - FALTANTE`);
    }
  });

  // =====================================================
  // 6. VERIFICAR RELACIONES FK
  // =====================================================
  console.log('\n🔗 6. VERIFICANDO RELACIONES FK:');
  
  const relaciones = await query(`
    SELECT 
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name LIKE 'as_turnos_%'
    ORDER BY tc.table_name, kcu.column_name
  `);

  relaciones.rows.forEach((rel: any) => {
    console.log(`   ✅ ${rel.table_name}.${rel.column_name} → ${rel.foreign_table_name}.${rel.foreign_column_name}`);
  });

  // =====================================================
  // 7. VERIFICAR DATOS DE EJEMPLO
  // =====================================================
  console.log('\n📊 7. VERIFICANDO DATOS DE EJEMPLO:');
  
  // Verificar roles de servicio
  const rolesCount = await query('SELECT COUNT(*) as total FROM as_turnos_roles_servicio');
  console.log(`   📈 Roles de servicio: ${rolesCount.rows[0].total} registros`);
  
  if (rolesCount.rows[0].total > 0) {
    const rolesEjemplo = await query('SELECT nombre, dias_trabajo, dias_descanso, horas_turno FROM as_turnos_roles_servicio LIMIT 3');
    console.log('   Ejemplos de roles:');
    rolesEjemplo.rows.forEach((rol: any) => {
      console.log(`   - ${rol.nombre}: ${rol.dias_trabajo}x${rol.dias_descanso}, ${rol.horas_turno}h`);
    });
  }

  // Verificar configuraciones
  const configCount = await query('SELECT COUNT(*) as total FROM as_turnos_configuracion');
  console.log(`   📈 Configuraciones: ${configCount.rows[0].total} registros`);

  // Verificar requisitos
  const requisitosCount = await query('SELECT COUNT(*) as total FROM as_turnos_requisitos');
  console.log(`   📈 Requisitos: ${requisitosCount.rows[0].total} registros`);

  // Verificar PPCs
  const ppcCount = await query('SELECT COUNT(*) as total FROM as_turnos_ppc');
  console.log(`   📈 PPCs: ${ppcCount.rows[0].total} registros`);

  // Verificar asignaciones
  const asignacionesCount = await query('SELECT COUNT(*) as total FROM as_turnos_asignaciones');
  console.log(`   📈 Asignaciones: ${asignacionesCount.rows[0].total} registros`);

  // =====================================================
  // 8. VERIFICAR ESTADOS VÁLIDOS
  // =====================================================
  console.log('\n🎯 8. VERIFICANDO ESTADOS VÁLIDOS:');
  
  // Estados en PPC
  const estadosPPC = await query('SELECT DISTINCT estado FROM as_turnos_ppc WHERE estado IS NOT NULL');
  console.log('   Estados en PPCs:');
  estadosPPC.rows.forEach((estado: any) => {
    console.log(`   - ${estado.estado}`);
  });

  // Estados en asignaciones
  const estadosAsignaciones = await query('SELECT DISTINCT estado FROM as_turnos_asignaciones WHERE estado IS NOT NULL');
  console.log('   Estados en asignaciones:');
  estadosAsignaciones.rows.forEach((estado: any) => {
    console.log(`   - ${estado.estado}`);
  });

  // =====================================================
  // 9. RESUMEN FINAL
  // =====================================================
  console.log('\n📋 9. RESUMEN DE VERIFICACIÓN:');
  
  const totalTablas = 5;
  const tablasVerificadas = ['as_turnos_roles_servicio', 'as_turnos_configuracion', 'as_turnos_requisitos', 'as_turnos_ppc', 'as_turnos_asignaciones'];
  
  console.log(`✅ Tablas verificadas: ${tablasVerificadas.length}/${totalTablas}`);
  console.log(`🔗 Relaciones FK encontradas: ${relaciones.rows.length}`);
  
  // Verificar si faltan campos críticos
  const camposFaltantesRoles = camposRequeridosRoles.filter(campo => !camposEncontradosRoles.includes(campo));
  const camposFaltantesPPC = camposRequeridosPPC.filter(campo => !camposEncontradosPPC.includes(campo));
  const camposFaltantesAsignaciones = camposRequeridosAsignaciones.filter(campo => !camposEncontradosAsignaciones.includes(campo));
  
  if (camposFaltantesRoles.length > 0) {
    console.log(`❌ Campos faltantes en roles_servicio: ${camposFaltantesRoles.join(', ')}`);
  }
  
  if (camposFaltantesPPC.length > 0) {
    console.log(`❌ Campos faltantes en ppc: ${camposFaltantesPPC.join(', ')}`);
  }
  
  if (camposFaltantesAsignaciones.length > 0) {
    console.log(`❌ Campos faltantes en asignaciones: ${camposFaltantesAsignaciones.join(', ')}`);
  }

  console.log('\n🎯 RECOMENDACIONES:');
  
  if (camposFaltantesRoles.length === 0 && camposFaltantesPPC.length === 0 && camposFaltantesAsignaciones.length === 0) {
    console.log('✅ La estructura ADO está completa y correcta');
  } else {
    console.log('⚠️ Se encontraron campos faltantes en la estructura ADO');
  }
  
  console.log('2. Verificar que los endpoints usen las tablas ADO correctas');
  console.log('3. Migrar datos de tablas antiguas si aún existen');
  console.log('4. Actualizar documentación del módulo ADO');

  console.log('\n✅ Verificación de estructura ADO completada');
}

// Ejecutar la verificación
verificarEstructuraADOCompleta().catch(console.error); 