import { query } from '../src/lib/database';

async function debugClientesForm() {
  try {
    console.log('🔍 Debuggeando formulario de clientes...');
    
    // 1. Verificar que la tabla tiene la estructura correcta
    console.log('\n📊 Verificando estructura de la tabla...');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura actual:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });
    
    // 2. Verificar restricciones de la tabla
    console.log('\n🔒 Verificando restricciones...');
    const constraints = await query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'clientes'
    `);
    
    console.log('📋 Restricciones:');
    constraints.rows.forEach(constraint => {
      console.log(`  - ${constraint.constraint_type}: ${constraint.constraint_name} (${constraint.column_name})`);
    });
    
    // 3. Verificar índices
    console.log('\n📈 Verificando índices...');
    const indexes = await query(`
      SELECT 
        indexname, 
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'clientes'
    `);
    
    console.log('📋 Índices:');
    indexes.rows.forEach(index => {
      console.log(`  - ${index.indexname}: ${index.indexdef}`);
    });
    
    // 4. Probar inserción con datos mínimos
    console.log('\n➕ Probando inserción con datos mínimos...');
    const datosMinimos = {
      nombre: "Test Mínimo",
      rut: "99999999-9"
    };
    
    try {
      const result = await query(`
        INSERT INTO clientes (nombre, rut)
        VALUES ($1, $2)
        RETURNING id, nombre, rut, estado
      `, [datosMinimos.nombre, datosMinimos.rut]);
      
      console.log('✅ Inserción mínima exitosa:', result.rows[0]);
      
      // Limpiar
      await query('DELETE FROM clientes WHERE id = $1', [result.rows[0].id]);
      console.log('✅ Cliente de prueba eliminado');
      
    } catch (error) {
      console.log('❌ Error en inserción mínima:', error);
    }
    
    // 5. Probar inserción con datos completos
    console.log('\n➕ Probando inserción con datos completos...');
    const datosCompletos = {
      nombre: "Test Completo",
      rut: "88888888-8",
      representante_legal: "Juan Test",
      rut_representante: "77777777-7",
      email: "test@test.cl",
      telefono: "+56 9 1234 5678",
      direccion: "Av. Test 123",
      latitud: -33.4569,
      longitud: -70.6483,
      ciudad: "Santiago",
      comuna: "Providencia",
      razon_social: "Test Completo SpA",
      estado: "Activo"
    };
    
    try {
      const result = await query(`
        INSERT INTO clientes (
          nombre, rut, representante_legal, rut_representante, email, telefono,
          direccion, latitud, longitud, ciudad, comuna, razon_social, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, nombre, rut, estado, email, telefono
      `, [
        datosCompletos.nombre, datosCompletos.rut, datosCompletos.representante_legal,
        datosCompletos.rut_representante, datosCompletos.email, datosCompletos.telefono,
        datosCompletos.direccion, datosCompletos.latitud, datosCompletos.longitud,
        datosCompletos.ciudad, datosCompletos.comuna, datosCompletos.razon_social, datosCompletos.estado
      ]);
      
      console.log('✅ Inserción completa exitosa:', result.rows[0]);
      
      // Limpiar
      await query('DELETE FROM clientes WHERE id = $1', [result.rows[0].id]);
      console.log('✅ Cliente de prueba eliminado');
      
    } catch (error) {
      console.log('❌ Error en inserción completa:', error);
    }
    
    // 6. Verificar que no hay triggers problemáticos
    console.log('\n🔧 Verificando triggers...');
    const triggers = await query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'clientes'
    `);
    
    if (triggers.rows.length > 0) {
      console.log('📋 Triggers encontrados:');
      triggers.rows.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
      });
    } else {
      console.log('✅ No hay triggers en la tabla clientes');
    }
    
    // 7. Verificar que no hay funciones problemáticas
    console.log('\n⚙️ Verificando funciones...');
    const functions = await query(`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%cliente%'
    `);
    
    if (functions.rows.length > 0) {
      console.log('📋 Funciones relacionadas con clientes:');
      functions.rows.forEach(func => {
        console.log(`  - ${func.routine_name}: ${func.routine_type}`);
      });
    } else {
      console.log('✅ No hay funciones específicas para clientes');
    }
    
    // 8. Verificar permisos de la tabla
    console.log('\n🔐 Verificando permisos...');
    const permissions = await query(`
      SELECT 
        grantee,
        privilege_type
      FROM information_schema.role_table_grants 
      WHERE table_name = 'clientes'
    `);
    
    console.log('📋 Permisos:');
    permissions.rows.forEach(perm => {
      console.log(`  - ${perm.grantee}: ${perm.privilege_type}`);
    });
    
    console.log('\n🎉 Debug del formulario completado');
    
  } catch (error) {
    console.error('❌ Error en debug del formulario:', error);
    
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugClientesForm()
    .then(() => {
      console.log('\n🎯 Script de debug completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal en script:', error);
      process.exit(1);
    });
}

export { debugClientesForm }; 