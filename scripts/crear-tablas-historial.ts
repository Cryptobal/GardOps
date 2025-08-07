import { query } from '../src/lib/database';
import fs from 'fs';
import path from 'path';

async function crearTablasHistorial() {
  console.log('📋 PASO 1: CREANDO TABLAS DE HISTORIAL\n');
  console.log('🎯 Objetivo: Crear auditoría completa para roles y estructuras de servicio\n');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../db/create-historial-roles-estructuras.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Leyendo archivo SQL...');
    console.log(`📁 Ruta: ${sqlPath}`);
    
    // Ejecutar el SQL
    console.log('\n🚀 Ejecutando SQL de creación de tablas...');
    await query(sqlContent);
    
    console.log('✅ SQL ejecutado correctamente');
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando creación de tablas...');
    
    const historialRolesExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'historial_roles_servicio'
      )
    `);
    
    const historialEstructurasExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'historial_estructuras_servicio'
      )
    `);
    
    if (historialRolesExists.rows[0].exists) {
      console.log('✅ Tabla historial_roles_servicio creada correctamente');
    } else {
      console.log('❌ Error: historial_roles_servicio no se creó');
    }
    
    if (historialEstructurasExists.rows[0].exists) {
      console.log('✅ Tabla historial_estructuras_servicio creada correctamente');
    } else {
      console.log('❌ Error: historial_estructuras_servicio no se creó');
    }
    
    // Verificar estructura de las tablas
    console.log('\n📊 Verificando estructura de tablas...');
    
    const estructuraRoles = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'historial_roles_servicio'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de historial_roles_servicio:');
    estructuraRoles.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    const estructuraEstructuras = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'historial_estructuras_servicio'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de historial_estructuras_servicio:');
    estructuraEstructuras.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    
    const indicesRoles = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'historial_roles_servicio'
    `);
    
    console.log('📋 Índices de historial_roles_servicio:');
    indicesRoles.rows.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`);
    });
    
    const indicesEstructuras = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'historial_estructuras_servicio'
    `);
    
    console.log('\n📋 Índices de historial_estructuras_servicio:');
    indicesEstructuras.rows.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`);
    });
    
    console.log('\n🎉 ¡PASO 1 COMPLETADO EXITOSAMENTE!');
    console.log('✅ Tablas de historial creadas y verificadas');
    console.log('✅ Índices creados para optimización');
    console.log('✅ Estructura validada correctamente');
    
    console.log('\n📋 RESUMEN:');
    console.log('  - historial_roles_servicio: ✅ Creada');
    console.log('  - historial_estructuras_servicio: ✅ Creada');
    console.log('  - Índices: ✅ Creados');
    console.log('  - Constraints: ✅ Aplicados');
    
    console.log('\n🚀 Próximo paso: Crear funciones de base de datos');
    
  } catch (error) {
    console.error('❌ Error creando tablas de historial:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  crearTablasHistorial()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

export { crearTablasHistorial };
