import { query } from '../src/lib/database';

async function verificarEstructuraTablasADO() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS ADO\n');

  // =====================================================
  // 1. ESTRUCTURA DE TABLAS NUEVAS ADO
  // =====================================================
  console.log('📋 1. ESTRUCTURA DE TABLAS NUEVAS ADO...');
  
  const tablasADO = [
    'as_turnos_ppc',
    'as_turnos_asignaciones'
  ];

  for (const tabla of tablasADO) {
    console.log(`\n🔍 Estructura de ${tabla}:`);
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tabla]);

    result.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }

  // =====================================================
  // 2. ESTRUCTURA DE TABLAS ANTIGUAS
  // =====================================================
  console.log('\n📋 2. ESTRUCTURA DE TABLAS ANTIGUAS...');
  
  const tablasAntiguas = [
    'puestos_por_cubrir',
    'asignaciones_guardias'
  ];

  for (const tabla of tablasAntiguas) {
    console.log(`\n🔍 Estructura de ${tabla}:`);
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tabla]);

    result.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }

  // =====================================================
  // 3. COMPARAR ESTRUCTURAS
  // =====================================================
  console.log('\n📋 3. COMPARANDO ESTRUCTURAS...');
  
  console.log('\n🔍 Comparación puestos_por_cubrir vs as_turnos_ppc:');
  const estructuraPPC = await query(`
    SELECT 
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_name IN ('puestos_por_cubrir', 'as_turnos_ppc')
    ORDER BY table_name, ordinal_position
  `);
  
  estructuraPPC.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type}`);
  });

  console.log('\n🔍 Comparación asignaciones_guardias vs as_turnos_asignaciones:');
  const estructuraAsignaciones = await query(`
    SELECT 
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_name IN ('asignaciones_guardias', 'as_turnos_asignaciones')
    ORDER BY table_name, ordinal_position
  `);
  
  estructuraAsignaciones.rows.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type}`);
  });

  // =====================================================
  // 4. VERIFICAR DATOS DE EJEMPLO
  // =====================================================
  console.log('\n📋 4. VERIFICANDO DATOS DE EJEMPLO...');
  
  console.log('\n🔍 Datos de ejemplo en puestos_por_cubrir:');
  const datosPPCAntiguo = await query('SELECT * FROM puestos_por_cubrir LIMIT 1');
  if (datosPPCAntiguo.rows.length > 0) {
    console.log('   Datos:', JSON.stringify(datosPPCAntiguo.rows[0], null, 2));
  }

  console.log('\n🔍 Datos de ejemplo en as_turnos_ppc:');
  const datosPPCNuevo = await query('SELECT * FROM as_turnos_ppc LIMIT 1');
  if (datosPPCNuevo.rows.length > 0) {
    console.log('   Datos:', JSON.stringify(datosPPCNuevo.rows[0], null, 2));
  }

  console.log('\n🔍 Datos de ejemplo en asignaciones_guardias:');
  const datosAsignacionesAntiguo = await query('SELECT * FROM asignaciones_guardias LIMIT 1');
  if (datosAsignacionesAntiguo.rows.length > 0) {
    console.log('   Datos:', JSON.stringify(datosAsignacionesAntiguo.rows[0], null, 2));
  }

  console.log('\n🔍 Datos de ejemplo en as_turnos_asignaciones:');
  const datosAsignacionesNuevo = await query('SELECT * FROM as_turnos_asignaciones LIMIT 1');
  if (datosAsignacionesNuevo.rows.length > 0) {
    console.log('   Datos:', JSON.stringify(datosAsignacionesNuevo.rows[0], null, 2));
  }

  console.log('\n✅ Verificación de estructura completada');
}

// Ejecutar la verificación
verificarEstructuraTablasADO().catch(console.error); 