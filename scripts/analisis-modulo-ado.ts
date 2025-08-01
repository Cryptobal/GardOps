import { query } from '../src/lib/database';

async function analizarModuloADO() {
  console.log('🔍 INICIANDO ANÁLISIS DEL MÓDULO ADO (ASIGNACIÓN DE TURNOS)\n');

  // =====================================================
  // 1. VERIFICAR EXISTENCIA DE TABLAS ADO
  // =====================================================
  console.log('📋 1. VERIFICANDO EXISTENCIA DE TABLAS ADO...');
  
  const tablasADO = [
    'as_turnos_asignaciones',
    'as_turnos_configuracion', 
    'as_turnos_ppc',
    'as_turnos_puestos_op',
    'as_turnos_requisitos',
    'as_turnos_roles_servicio'
  ];

  const tablasExistentes = [];
  const tablasFaltantes = [];

  for (const tabla of tablasADO) {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (result.rows[0].existe) {
      tablasExistentes.push(tabla);
      console.log(`✅ ${tabla} - EXISTE`);
    } else {
      tablasFaltantes.push(tabla);
      console.log(`❌ ${tabla} - NO EXISTE`);
    }
  }

  // =====================================================
  // 2. VERIFICAR RELACIONES ENTRE TABLAS ADO
  // =====================================================
  console.log('\n🔗 2. VERIFICANDO RELACIONES ENTRE TABLAS ADO...');

  const relacionesEsperadas = [
    {
      tabla: 'as_turnos_configuracion',
      fk: 'instalacion_id',
      referencia: 'instalaciones(id)'
    },
    {
      tabla: 'as_turnos_configuracion', 
      fk: 'rol_servicio_id',
      referencia: 'as_turnos_roles_servicio(id)'
    },
    {
      tabla: 'as_turnos_requisitos',
      fk: 'instalacion_id', 
      referencia: 'instalaciones(id)'
    },
    {
      tabla: 'as_turnos_requisitos',
      fk: 'puesto_operativo_id',
      referencia: 'as_turnos_puestos_op(id)'
    },
    {
      tabla: 'as_turnos_requisitos',
      fk: 'rol_servicio_id',
      referencia: 'as_turnos_roles_servicio(id)'
    },
    {
      tabla: 'as_turnos_ppc',
      fk: 'requisito_puesto_id',
      referencia: 'as_turnos_requisitos(id)'
    },
    {
      tabla: 'as_turnos_asignaciones',
      fk: 'guardia_id',
      referencia: 'guardias(id)'
    },
    {
      tabla: 'as_turnos_asignaciones',
      fk: 'requisito_puesto_id',
      referencia: 'as_turnos_requisitos(id)'
    }
  ];

  for (const relacion of relacionesEsperadas) {
    const result = await query(`
      SELECT 
        tc.constraint_name,
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
        AND tc.table_name = $1
        AND kcu.column_name = $2
    `, [relacion.tabla, relacion.fk]);

    if (result.rows.length > 0) {
      const fk = result.rows[0];
      console.log(`✅ ${relacion.tabla}.${relacion.fk} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    } else {
      console.log(`❌ FALTA FK: ${relacion.tabla}.${relacion.fk} → ${relacion.referencia}`);
    }
  }

  // =====================================================
  // 3. VERIFICAR CONEXIÓN CON MÓDULOS EXTERNOS
  // =====================================================
  console.log('\n🌐 3. VERIFICANDO CONEXIÓN CON MÓDULOS EXTERNOS...');

  // Verificar conexión con instalaciones
  const instalacionesCheck = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_configuracion tc
    INNER JOIN instalaciones i ON tc.instalacion_id = i.id
  `);
  console.log(`✅ Conexión con instalaciones: ${instalacionesCheck.rows[0].total} registros relacionados`);

  // Verificar conexión con guardias
  const guardiasCheck = await query(`
    SELECT COUNT(*) as total
    FROM as_turnos_asignaciones ta
    INNER JOIN guardias g ON ta.guardia_id = g.id
  `);
  console.log(`✅ Conexión con guardias: ${guardiasCheck.rows[0].total} registros relacionados`);

  // =====================================================
  // 4. VERIFICAR ENDPOINTS FUNCIONALES
  // =====================================================
  console.log('\n🔌 4. VERIFICANDO ENDPOINTS FUNCIONALES...');

  const endpointsADO = [
    '/api/instalaciones/[id]/turnos',
    '/api/instalaciones/[id]/ppc',
    '/api/roles-servicio'
  ];

  for (const endpoint of endpointsADO) {
    console.log(`📡 Endpoint: ${endpoint}`);
  }

  // =====================================================
  // 5. VERIFICAR CÓDIGO QUE USA TABLAS ANTIGUAS
  // =====================================================
  console.log('\n⚠️ 5. VERIFICANDO CÓDIGO QUE USA TABLAS ANTIGUAS...');

  const tablasAntiguas = [
    'turnos_instalacion',
    'roles_servicio', 
    'requisitos_puesto',
    'puestos_por_cubrir',
    'asignaciones_guardias'
  ];

  console.log('🔍 Buscando referencias a tablas antiguas en archivos...');
  
  // Verificar si las tablas antiguas aún existen
  for (const tabla of tablasAntiguas) {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (result.rows[0].existe) {
      console.log(`⚠️ TABLA ANTIGUA EXISTE: ${tabla} - DEBE MIGRARSE`);
    } else {
      console.log(`✅ Tabla antigua ${tabla} - NO EXISTE (correcto)`);
    }
  }

  // =====================================================
  // 6. ANÁLISIS DE DATOS
  // =====================================================
  console.log('\n📊 6. ANÁLISIS DE DATOS EN TABLAS ADO...');

  for (const tabla of tablasExistentes) {
    try {
      const result = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
      console.log(`📈 ${tabla}: ${result.rows[0].total} registros`);
    } catch (error) {
      console.log(`❌ Error contando registros en ${tabla}: ${error}`);
    }
  }

  // =====================================================
  // 7. VERIFICAR ÍNDICES
  // =====================================================
  console.log('\n🔍 7. VERIFICANDO ÍNDICES EN TABLAS ADO...');

  for (const tabla of tablasExistentes) {
    const result = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
      ORDER BY indexname
    `, [tabla]);

    console.log(`📋 Índices en ${tabla}:`);
    if (result.rows.length > 0) {
      result.rows.forEach((idx: any) => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log(`   ⚠️ No se encontraron índices`);
    }
  }

  // =====================================================
  // 8. RESUMEN FINAL
  // =====================================================
  console.log('\n📋 8. RESUMEN DEL ANÁLISIS ADO...');
  
  console.log(`✅ Tablas ADO existentes: ${tablasExistentes.length}/${tablasADO.length}`);
  console.log(`❌ Tablas ADO faltantes: ${tablasFaltantes.length}`);
  
  if (tablasFaltantes.length > 0) {
    console.log('   Tablas faltantes:');
    tablasFaltantes.forEach(tabla => console.log(`   - ${tabla}`));
  }

  console.log('\n🎯 RECOMENDACIONES:');
  
  if (tablasFaltantes.length > 0) {
    console.log('1. Crear las tablas faltantes del módulo ADO');
  }
  
  console.log('2. Verificar que todos los endpoints usen las nuevas tablas ADO');
  console.log('3. Migrar datos de tablas antiguas si aún existen');
  console.log('4. Actualizar documentación del módulo ADO');

  console.log('\n✅ Análisis ADO completado');
}

// Ejecutar el análisis
analizarModuloADO().catch(console.error); 