import { query } from '../src/lib/database';

async function validarModuloADO() {
  console.log('🔍 VALIDACIÓN FINAL DEL MÓDULO ADO\n');

  // =====================================================
  // 1. VERIFICAR ESTRUCTURA COMPLETA
  // =====================================================
  console.log('📋 1. VERIFICANDO ESTRUCTURA COMPLETA...');
  
  const tablasADO = [
    'as_turnos_roles_servicio',
    'as_turnos_configuracion',
    'as_turnos_requisitos',
    'as_turnos_ppc',
    'as_turnos_asignaciones'
  ];

  let estructuraCorrecta = true;
  
  for (const tabla of tablasADO) {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (result.rows[0].existe) {
      console.log(`✅ ${tabla} - EXISTE`);
    } else {
      console.log(`❌ ${tabla} - NO EXISTE`);
      estructuraCorrecta = false;
    }
  }

  // =====================================================
  // 2. VERIFICAR DATOS DE EJEMPLO
  // =====================================================
  console.log('\n📋 2. VERIFICANDO DATOS DE EJEMPLO...');
  
  const datosEjemplo = await query(`
    SELECT 
      (SELECT COUNT(*) FROM as_turnos_roles_servicio) as roles_count,
      (SELECT COUNT(*) FROM as_turnos_configuracion) as config_count,
      (SELECT COUNT(*) FROM as_turnos_requisitos) as requisitos_count,
      (SELECT COUNT(*) FROM as_turnos_ppc) as ppc_count,
      (SELECT COUNT(*) FROM as_turnos_asignaciones) as asignaciones_count
  `);

  const datos = datosEjemplo.rows[0];
  console.log(`📊 Roles de servicio: ${datos.roles_count}`);
  console.log(`📊 Configuraciones: ${datos.config_count}`);
  console.log(`📊 Requisitos: ${datos.requisitos_count}`);
  console.log(`📊 PPCs: ${datos.ppc_count}`);
  console.log(`📊 Asignaciones: ${datos.asignaciones_count}`);

  // =====================================================
  // 3. VERIFICAR RELACIONES INTEGRIDAD
  // =====================================================
  console.log('\n📋 3. VERIFICANDO INTEGRIDAD DE RELACIONES...');
  
  // Verificar que las configuraciones tienen roles válidos
  const configuracionesValidas = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_configuracion tc
    INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
  `);
  console.log(`✅ Configuraciones con roles válidos: ${configuracionesValidas.rows[0].total}`);

  // Verificar que los requisitos tienen configuraciones válidas
  const requisitosValidos = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_requisitos req
    INNER JOIN as_turnos_roles_servicio rs ON req.rol_servicio_id = rs.id
  `);
  console.log(`✅ Requisitos con roles válidos: ${requisitosValidos.rows[0].total}`);

  // Verificar que los PPCs tienen requisitos válidos
  const ppcsValidos = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_ppc ppc
    INNER JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
  `);
  console.log(`✅ PPCs con requisitos válidos: ${ppcsValidos.rows[0].total}`);

  // Verificar que las asignaciones tienen requisitos válidos
  const asignacionesValidas = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_asignaciones asig
    INNER JOIN as_turnos_requisitos req ON asig.requisito_puesto_id = req.id
  `);
  console.log(`✅ Asignaciones con requisitos válidos: ${asignacionesValidas.rows[0].total}`);

  // =====================================================
  // 4. VERIFICAR FLUJO COMPLETO
  // =====================================================
  console.log('\n📋 4. VERIFICANDO FLUJO COMPLETO...');
  
  // Verificar flujo: Instalación → Configuración → Requisitos → PPC → Asignación
  const flujoCompleto = await query(`
    SELECT 
      i.nombre as instalacion,
      rs.nombre as rol_servicio,
      tc.cantidad_guardias,
      req.cantidad_guardias as requisito_guardias,
      ppc.cantidad_faltante,
      COUNT(asig.id) as asignaciones_activas
    FROM instalaciones i
    INNER JOIN as_turnos_configuracion tc ON i.id = tc.instalacion_id
    INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
    INNER JOIN as_turnos_requisitos req ON tc.instalacion_id = req.instalacion_id 
      AND tc.rol_servicio_id = req.rol_servicio_id
    LEFT JOIN as_turnos_ppc ppc ON req.id = ppc.requisito_puesto_id
    LEFT JOIN as_turnos_asignaciones asig ON req.id = asig.requisito_puesto_id 
      AND asig.estado = 'Activa'
    WHERE tc.estado = 'Activo'
    GROUP BY i.nombre, rs.nombre, tc.cantidad_guardias, req.cantidad_guardias, ppc.cantidad_faltante
    ORDER BY i.nombre, rs.nombre
  `);

  console.log('📊 Flujo completo de asignación:');
  flujoCompleto.rows.forEach((row: any) => {
    console.log(`   - ${row.instalacion} | ${row.rol_servicio} | Config: ${row.cantidad_guardias} | Req: ${row.requisito_guardias} | PPC: ${row.cantidad_faltante || 0} | Asign: ${row.asignaciones_activas}`);
  });

  // =====================================================
  // 5. VERIFICAR ESTADOS VÁLIDOS
  // =====================================================
  console.log('\n📋 5. VERIFICANDO ESTADOS VÁLIDOS...');
  
  // Estados en PPCs
  const estadosPPC = await query('SELECT DISTINCT estado FROM as_turnos_ppc WHERE estado IS NOT NULL');
  console.log('📊 Estados en PPCs:');
  estadosPPC.rows.forEach((estado: any) => {
    console.log(`   - ${estado.estado}`);
  });

  // Estados en asignaciones
  const estadosAsignaciones = await query('SELECT DISTINCT estado FROM as_turnos_asignaciones WHERE estado IS NOT NULL');
  console.log('📊 Estados en asignaciones:');
  estadosAsignaciones.rows.forEach((estado: any) => {
    console.log(`   - ${estado.estado}`);
  });

  // =====================================================
  // 6. VERIFICAR CONSISTENCIA DE DATOS
  // =====================================================
  console.log('\n📋 6. VERIFICANDO CONSISTENCIA DE DATOS...');
  
  // Verificar que no hay PPCs sin requisitos
  const ppcsSinRequisitos = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_ppc ppc
    LEFT JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
    WHERE req.id IS NULL
  `);
  console.log(`⚠️ PPCs sin requisitos: ${ppcsSinRequisitos.rows[0].total}`);

  // Verificar que no hay asignaciones sin requisitos
  const asignacionesSinRequisitos = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_asignaciones asig
    LEFT JOIN as_turnos_requisitos req ON asig.requisito_puesto_id = req.id
    WHERE req.id IS NULL
  `);
  console.log(`⚠️ Asignaciones sin requisitos: ${asignacionesSinRequisitos.rows[0].total}`);

  // Verificar que no hay requisitos sin configuraciones
  const requisitosSinConfig = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_requisitos req
    LEFT JOIN as_turnos_configuracion tc ON req.instalacion_id = tc.instalacion_id 
      AND req.rol_servicio_id = tc.rol_servicio_id
    WHERE tc.id IS NULL
  `);
  console.log(`⚠️ Requisitos sin configuraciones: ${requisitosSinConfig.rows[0].total}`);

  // =====================================================
  // 7. VERIFICAR RENDIMIENTO
  // =====================================================
  console.log('\n📋 7. VERIFICANDO RENDIMIENTO...');
  
  // Verificar índices
  const indices = await query(`
    SELECT 
      tablename,
      COUNT(*) as indices_count
    FROM pg_indexes
    WHERE tablename LIKE 'as_turnos_%'
    GROUP BY tablename
    ORDER BY tablename
  `);

  console.log('📊 Índices por tabla:');
  indices.rows.forEach((idx: any) => {
    console.log(`   - ${idx.tablename}: ${idx.indices_count} índices`);
  });

  // =====================================================
  // 8. RESUMEN DE VALIDACIÓN
  // =====================================================
  console.log('\n📋 8. RESUMEN DE VALIDACIÓN:');
  
  const problemas = [];
  
  if (!estructuraCorrecta) {
    problemas.push('Estructura de tablas incompleta');
  }
  
  if (ppcsSinRequisitos.rows[0].total > 0) {
    problemas.push(`${ppcsSinRequisitos.rows[0].total} PPCs sin requisitos`);
  }
  
  if (asignacionesSinRequisitos.rows[0].total > 0) {
    problemas.push(`${asignacionesSinRequisitos.rows[0].total} asignaciones sin requisitos`);
  }
  
  if (requisitosSinConfig.rows[0].total > 0) {
    problemas.push(`${requisitosSinConfig.rows[0].total} requisitos sin configuraciones`);
  }

  if (problemas.length === 0) {
    console.log('✅ MÓDULO ADO VALIDADO CORRECTAMENTE');
    console.log('✅ Todas las validaciones pasaron exitosamente');
    console.log('✅ El módulo está listo para producción');
  } else {
    console.log('❌ PROBLEMAS DETECTADOS:');
    problemas.forEach(problema => {
      console.log(`   - ${problema}`);
    });
    console.log('⚠️ Se recomienda corregir estos problemas antes de usar en producción');
  }

  // =====================================================
  // 9. MÉTRICAS FINALES
  // =====================================================
  console.log('\n📊 MÉTRICAS FINALES:');
  
  const metricas = {
    tablas: tablasADO.length,
    roles: datos.roles_count,
    configuraciones: datos.config_count,
    requisitos: datos.requisitos_count,
    ppcs: datos.ppc_count,
    asignaciones: datos.asignaciones_count,
    flujosCompletos: flujoCompleto.rows.length,
    problemas: problemas.length
  };

  console.log(`📈 Tablas ADO: ${metricas.tablas}/5`);
  console.log(`📈 Roles de servicio: ${metricas.roles}`);
  console.log(`📈 Configuraciones: ${metricas.configuraciones}`);
  console.log(`📈 Requisitos: ${metricas.requisitos}`);
  console.log(`📈 PPCs: ${metricas.ppcs}`);
  console.log(`📈 Asignaciones: ${metricas.asignaciones}`);
  console.log(`📈 Flujos completos: ${metricas.flujosCompletos}`);
  console.log(`📈 Problemas detectados: ${metricas.problemas}`);

  const puntuacion = ((5 - metricas.problemas) / 5) * 100;
  console.log(`\n🎯 PUNTUACIÓN FINAL: ${puntuacion}%`);

  if (puntuacion >= 90) {
    console.log('🏆 EXCELENTE - Módulo ADO completamente funcional');
  } else if (puntuacion >= 70) {
    console.log('✅ BUENO - Módulo ADO funcional con mejoras menores');
  } else if (puntuacion >= 50) {
    console.log('⚠️ REGULAR - Módulo ADO requiere correcciones');
  } else {
    console.log('❌ CRÍTICO - Módulo ADO requiere correcciones urgentes');
  }

  console.log('\n✅ Validación del módulo ADO completada');
}

// Ejecutar la validación
validarModuloADO().catch(console.error); 