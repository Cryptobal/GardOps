import { query } from '../src/lib/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function ejecutarMigracionRol() {
  try {
    console.log('🚀 INICIANDO MIGRACIÓN ATÓMICA: rol_servicio_id → rol_id\n');
    
    // Leer script SQL
    const scriptPath = join(__dirname, 'migrar-columna-rol-atomica.sql');
    const sqlScript = readFileSync(scriptPath, 'utf8');
    
    console.log('📄 Script cargado, ejecutando migración...\n');
    
    // Ejecutar script completo
    await query(sqlScript);
    
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🔍 Verificando resultado...\n');
    
    // Verificación adicional
    const verificacion = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos' 
      AND column_name IN ('rol_id', 'rol_servicio_id')
      ORDER BY column_name
    `);
    
    console.log('📋 COLUMNAS ACTUALES:');
    verificacion.rows.forEach((col: any) => {
      console.log(`  ✅ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    // Probar consulta típica
    const pruebaConsulta = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
    `);
    
    console.log(`\n🧪 PRUEBA DE CONSULTA: ${pruebaConsulta.rows[0].total} registros con JOIN exitoso`);
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA - SISTEMA LISTO PARA USO');
    
  } catch (error: any) {
    console.error('❌ ERROR EN MIGRACIÓN:', error.message);
    console.error('\n🔧 POSIBLES SOLUCIONES:');
    console.error('1. Verificar conexión a base de datos');
    console.error('2. Revisar permisos de usuario');
    console.error('3. Verificar que la tabla existe');
    console.error('4. Ejecutar manualmente el SQL si es necesario');
    
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

ejecutarMigracionRol();
