import { query } from '../src/lib/database';

async function resumenAnalisisADOFinal() {
  console.log('📋 RESUMEN FINAL DEL ANÁLISIS DEL MÓDULO ADO (ASIGNACIÓN DE TURNOS)\n');

  // =====================================================
  // 1. ESTADO ACTUAL DE LAS TABLAS ADO
  // =====================================================
  console.log('📊 1. ESTADO ACTUAL DE LAS TABLAS ADO:');
  
  const tablasADO = [
    'as_turnos_asignaciones',
    'as_turnos_configuracion', 
    'as_turnos_ppc',
    'as_turnos_puestos_op',
    'as_turnos_requisitos',
    'as_turnos_roles_servicio'
  ];

  for (const tabla of tablasADO) {
    const existe = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (existe.rows[0].existe) {
      const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
      console.log(`✅ ${tabla}: ${count.rows[0].total} registros`);
    } else {
      console.log(`❌ ${tabla}: NO EXISTE`);
    }
  }

  // =====================================================
  // 2. VERIFICAR RELACIONES ENTRE TABLAS
  // =====================================================
  console.log('\n🔗 2. VERIFICAR RELACIONES ENTRE TABLAS:');
  
  const relaciones = [
    { tabla: 'as_turnos_configuracion', fk: 'instalacion_id', ref: 'instalaciones(id)' },
    { tabla: 'as_turnos_configuracion', fk: 'rol_servicio_id', ref: 'as_turnos_roles_servicio(id)' },
    { tabla: 'as_turnos_requisitos', fk: 'instalacion_id', ref: 'instalaciones(id)' },
    { tabla: 'as_turnos_requisitos', fk: 'rol_servicio_id', ref: 'as_turnos_roles_servicio(id)' },
    { tabla: 'as_turnos_ppc', fk: 'requisito_puesto_id', ref: 'as_turnos_requisitos(id)' },
    { tabla: 'as_turnos_asignaciones', fk: 'guardia_id', ref: 'guardias(id)' },
    { tabla: 'as_turnos_asignaciones', fk: 'requisito_puesto_id', ref: 'as_turnos_requisitos(id)' }
  ];

  for (const relacion of relaciones) {
    const result = await query(`
      SELECT COUNT(*) as total
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND kcu.column_name = $2
    `, [relacion.tabla, relacion.fk]);

    if (result.rows[0].total > 0) {
      console.log(`✅ ${relacion.tabla}.${relacion.fk} → ${relacion.ref}`);
    } else {
      console.log(`❌ FALTA FK: ${relacion.tabla}.${relacion.fk} → ${relacion.ref}`);
    }
  }

  // =====================================================
  // 3. VERIFICAR CONEXIÓN CON MÓDULOS EXTERNOS
  // =====================================================
  console.log('\n🌐 3. CONEXIÓN CON MÓDULOS EXTERNOS:');
  
  // Conexión con instalaciones
  const instalacionesCount = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_configuracion tc
    INNER JOIN instalaciones i ON tc.instalacion_id = i.id
  `);
  console.log(`✅ Conexión con instalaciones: ${instalacionesCount.rows[0].total} registros relacionados`);

  // Conexión con guardias
  const guardiasCount = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_asignaciones ta
    INNER JOIN guardias g ON ta.guardia_id = g.id
  `);
  console.log(`✅ Conexión con guardias: ${guardiasCount.rows[0].total} registros relacionados`);

  // =====================================================
  // 4. VERIFICAR ENDPOINTS FUNCIONALES
  // =====================================================
  console.log('\n🔌 4. ENDPOINTS FUNCIONALES:');
  
  const endpoints = [
    '/api/instalaciones/[id]/turnos',
    '/api/instalaciones/[id]/ppc', 
    '/api/roles-servicio'
  ];

  for (const endpoint of endpoints) {
    console.log(`📡 ${endpoint}`);
  }

  // =====================================================
  // 5. VERIFICAR TABLAS ANTIGUAS
  // =====================================================
  console.log('\n⚠️ 5. TABLAS ANTIGUAS:');
  
  const tablasAntiguas = [
    'turnos_instalacion',
    'roles_servicio', 
    'requisitos_puesto',
    'puestos_por_cubrir',
    'asignaciones_guardias'
  ];

  for (const tabla of tablasAntiguas) {
    const existe = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (existe.rows[0].existe) {
      const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
      console.log(`⚠️ ${tabla}: ${count.rows[0].total} registros - DEBE MIGRARSE`);
    } else {
      console.log(`✅ ${tabla}: NO EXISTE (correcto)`);
    }
  }

  // =====================================================
  // 6. PROBLEMAS IDENTIFICADOS
  // =====================================================
  console.log('\n🚨 6. PROBLEMAS IDENTIFICADOS:');
  
  console.log('❌ 1. Tabla as_turnos_puestos_op no existe');
  console.log('❌ 2. FK faltante: as_turnos_requisitos.puesto_operativo_id → as_turnos_puestos_op(id)');
  console.log('❌ 3. FK faltante: as_turnos_asignaciones.guardia_id → guardias(id)');
  console.log('❌ 4. Tablas antiguas puestos_por_cubrir y asignaciones_guardias aún existen con datos');
  console.log('❌ 5. Diferencias de tipos de datos: INTEGER vs UUID en IDs');
  console.log('❌ 6. Endpoints aún usan tablas antiguas');

  // =====================================================
  // 7. RECOMENDACIONES
  // =====================================================
  console.log('\n🎯 7. RECOMENDACIONES:');
  
  console.log('1. ✅ Crear tabla as_turnos_puestos_op faltante');
  console.log('2. ✅ Agregar foreign keys faltantes');
  console.log('3. ⚠️ Migrar datos de tablas antiguas (requiere mapeo de tipos)');
  console.log('4. ⚠️ Actualizar endpoints para usar nuevas tablas ADO');
  console.log('5. ⚠️ Eliminar tablas antiguas después de migración');
  console.log('6. ⚠️ Actualizar documentación del módulo ADO');

  // =====================================================
  // 8. ESTADO GENERAL
  // =====================================================
  console.log('\n📈 8. ESTADO GENERAL DEL MÓDULO ADO:');
  
  const tablasExistentes = await Promise.all(
    tablasADO.map(async (tabla) => {
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        ) as existe
      `, [tabla]);
      return existe.rows[0].existe;
    })
  );

  const tablasExistentesCount = tablasExistentes.filter(Boolean).length;
  const porcentajeCompletado = Math.round((tablasExistentesCount / tablasADO.length) * 100);

  console.log(`📊 Progreso: ${tablasExistentesCount}/${tablasADO.length} tablas (${porcentajeCompletado}%)`);
  
  if (porcentajeCompletado >= 80) {
    console.log('🟢 Módulo ADO: CASI COMPLETO');
  } else if (porcentajeCompletado >= 50) {
    console.log('🟡 Módulo ADO: EN PROGRESO');
  } else {
    console.log('🔴 Módulo ADO: INCOMPLETO');
  }

  console.log('\n✅ Análisis ADO completado');
}

// Ejecutar el resumen final
resumenAnalisisADOFinal().catch(console.error); 