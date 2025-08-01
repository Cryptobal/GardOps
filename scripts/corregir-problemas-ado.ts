import { query } from '../src/lib/database';

async function corregirProblemasADO() {
  console.log('🔧 INICIANDO CORRECCIÓN DE PROBLEMAS DEL MÓDULO ADO\n');

  // =====================================================
  // 1. CREAR TABLA FALTANTE as_turnos_puestos_op
  // =====================================================
  console.log('📋 1. CREANDO TABLA FALTANTE as_turnos_puestos_op...');
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS as_turnos_puestos_op (
        id SERIAL PRIMARY KEY,
        instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado VARCHAR(50) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
        tenant_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla as_turnos_puestos_op creada');
  } catch (error) {
    console.log(`❌ Error creando as_turnos_puestos_op: ${error}`);
  }

  // =====================================================
  // 2. AGREGAR FOREIGN KEY FALTANTE EN as_turnos_requisitos
  // =====================================================
  console.log('\n🔗 2. AGREGANDO FOREIGN KEY FALTANTE...');
  
  try {
    await query(`
      ALTER TABLE as_turnos_requisitos 
      ADD CONSTRAINT as_turnos_requisitos_puesto_operativo_id_fkey 
      FOREIGN KEY (puesto_operativo_id) REFERENCES as_turnos_puestos_op(id)
    `);
    console.log('✅ FK as_turnos_requisitos.puesto_operativo_id agregada');
  } catch (error) {
    console.log(`ℹ️ FK ya existe o error: ${error}`);
  }

  // =====================================================
  // 3. AGREGAR FOREIGN KEY FALTANTE EN as_turnos_asignaciones
  // =====================================================
  try {
    await query(`
      ALTER TABLE as_turnos_asignaciones 
      ADD CONSTRAINT as_turnos_asignaciones_guardia_id_fkey 
      FOREIGN KEY (guardia_id) REFERENCES guardias(id)
    `);
    console.log('✅ FK as_turnos_asignaciones.guardia_id agregada');
  } catch (error) {
    console.log(`ℹ️ FK ya existe o error: ${error}`);
  }

  // =====================================================
  // 4. MIGRAR DATOS DE TABLAS ANTIGUAS
  // =====================================================
  console.log('\n🔄 4. MIGRANDO DATOS DE TABLAS ANTIGUAS...');

  // Verificar si existen tablas antiguas
  const tablasAntiguas = ['puestos_por_cubrir', 'asignaciones_guardias'];
  
  for (const tabla of tablasAntiguas) {
    const existe = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);

    if (existe.rows[0].existe) {
      console.log(`⚠️ Tabla antigua ${tabla} existe - verificando datos...`);
      
      const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
      console.log(`   - ${tabla}: ${count.rows[0].total} registros`);
      
      if (count.rows[0].total > 0) {
        console.log(`   ⚠️ La tabla ${tabla} tiene datos - debe migrarse manualmente`);
      } else {
        console.log(`   ✅ La tabla ${tabla} está vacía - puede eliminarse`);
      }
    } else {
      console.log(`✅ Tabla antigua ${tabla} no existe`);
    }
  }

  // =====================================================
  // 5. CREAR ÍNDICES FALTANTES
  // =====================================================
  console.log('\n🔍 5. CREANDO ÍNDICES FALTANTES...');

  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_puestos_op_instalacion ON as_turnos_puestos_op(instalacion_id)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_puestos_op_estado ON as_turnos_puestos_op(estado)',
    'CREATE INDEX IF NOT EXISTS idx_as_turnos_puestos_op_tenant ON as_turnos_puestos_op(tenant_id)'
  ];

  for (const indice of indices) {
    try {
      await query(indice);
      console.log(`✅ Índice creado: ${indice.split('ON ')[1]}`);
    } catch (error) {
      console.log(`ℹ️ Índice ya existe o error: ${error}`);
    }
  }

  // =====================================================
  // 6. VERIFICAR ESTRUCTURA FINAL
  // =====================================================
  console.log('\n✅ 6. VERIFICANDO ESTRUCTURA FINAL...');

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

  console.log('\n🎯 CORRECCIONES COMPLETADAS');
  console.log('✅ Análisis ADO completado');
}

// Ejecutar las correcciones
corregirProblemasADO().catch(console.error); 