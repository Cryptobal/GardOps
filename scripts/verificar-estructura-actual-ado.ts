import { config } from 'dotenv';
import path from 'path';
import { query } from '../src/lib/database';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function verificarEstructuraActual() {
  console.log('🔍 VERIFICANDO ESTRUCTURA ACTUAL DEL SISTEMA ADO\n');

  try {
    // Listar todas las tablas relacionadas con turnos
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%turno%' 
      OR table_name LIKE '%ppc%' 
      OR table_name LIKE '%asignacion%'
      OR table_name LIKE '%requisito%'
      OR table_name LIKE '%rol%'
      ORDER BY table_name
    `);

    console.log('📋 TABLAS ENCONTRADAS:');
    result.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });

    // Verificar datos en cada tabla
    console.log('\n📊 DATOS EN CADA TABLA:');
    
    const tablasADO = [
      'as_turnos_roles_servicio',
      'as_turnos_configuracion',
      'as_turnos_requisitos',
      'as_turnos_ppc',
      'as_turnos_asignaciones',
      'asignaciones_guardias',
      'puestos_por_cubrir'
    ];
    
    for (const tableName of tablasADO) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;
        console.log(`${tableName}: ${count} registros`);
      } catch (error) {
        console.log(`${tableName}: No existe`);
      }
    }

    // Verificar estructura de as_turnos_requisitos
    console.log('\n📋 ESTRUCTURA DE as_turnos_requisitos:');
    const requisitosStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_requisitos'
      ORDER BY ordinal_position
    `);
    
    requisitosStructure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Verificar datos de ejemplo en as_turnos_requisitos
    console.log('\n📋 DATOS DE EJEMPLO EN as_turnos_requisitos:');
    const requisitosData = await query(`
      SELECT id, instalacion_id, rol_servicio_id, cantidad_guardias, estado
      FROM as_turnos_requisitos
      LIMIT 3
    `);
    
    requisitosData.rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ID: ${row.id}, Instalación: ${row.instalacion_id}, Rol: ${row.rol_servicio_id}, Cantidad: ${row.cantidad_guardias}, Estado: ${row.estado}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarEstructuraActual()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }); 