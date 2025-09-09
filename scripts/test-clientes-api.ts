import { query } from '../src/lib/database';

async function testClientesAPI() {
  try {
    console.log('🧪 Probando API de clientes...');
    
    // 1. Verificar que la tabla existe y tiene datos
    console.log('\n📊 Verificando tabla clientes...');
    const tableCheck = await query(`
      SELECT COUNT(*) as count FROM clientes
    `);
    console.log(`✅ Total de clientes: ${tableCheck.rows[0].count}`);
    
    // 2. Verificar estructura de la tabla
    console.log('\n🔍 Verificando estructura de la tabla...');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura actual:');
    structure.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    // 3. Probar crear un cliente de prueba
    console.log('\n➕ Probando creación de cliente...');
    const testCliente = {
      nombre: "Empresa Test API",
      rut: "12345678-9",
      representante_legal: "Juan Pérez",
      rut_representante: "98765432-1",
      email: "test@empresa.cl",
      telefono: "+56 9 1234 5678",
      direccion: "Av. Test 123, Santiago",
      latitud: -33.4569,
      longitud: -70.6483,
      ciudad: "Santiago",
      comuna: "Providencia",
      razon_social: "Empresa Test API SpA",
      estado: "Activo"
    };
    
    const insertResult = await query(`
      INSERT INTO clientes (
        nombre, rut, representante_legal, rut_representante, email, telefono,
        direccion, latitud, longitud, ciudad, comuna, razon_social, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, nombre, rut, estado
    `, [
      testCliente.nombre, testCliente.rut, testCliente.representante_legal,
      testCliente.rut_representante, testCliente.email, testCliente.telefono,
      testCliente.direccion, testCliente.latitud, testCliente.longitud,
      testCliente.ciudad, testCliente.comuna, testCliente.razon_social, testCliente.estado
    ]);
    
    console.log('✅ Cliente creado:', insertResult.rows[0]);
    
    // 4. Probar actualizar el cliente
    console.log('\n✏️ Probando actualización de cliente...');
    const clienteId = insertResult.rows[0].id;
    
    const updateResult = await query(`
      UPDATE clientes 
      SET nombre = $1, estado = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, nombre, estado, updated_at
    `, ["Empresa Test API Actualizada", "Inactivo", clienteId]);
    
    console.log('✅ Cliente actualizado:', updateResult.rows[0]);
    
    // 5. Probar cambiar estado
    console.log('\n🔄 Probando cambio de estado...');
    const statusResult = await query(`
      UPDATE clientes 
      SET estado = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, estado
    `, ["Activo", clienteId]);
    
    console.log('✅ Estado cambiado:', statusResult.rows[0]);
    
    // 6. Probar obtener todos los clientes
    console.log('\n📋 Probando obtención de clientes...');
    const allClients = await query(`
      SELECT id, nombre, rut, estado, created_at, updated_at
      FROM clientes 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('✅ Últimos 5 clientes:');
    allClients.rows.forEach((cliente: any, index: number) => {
      console.log(`  ${index + 1}. ${cliente.nombre} (${cliente.rut}) - ${cliente.estado}`);
    });
    
    // 7. Limpiar cliente de prueba
    console.log('\n🧹 Limpiando cliente de prueba...');
    await query('DELETE FROM clientes WHERE nombre LIKE $1', ['%Test API%']);
    console.log('✅ Cliente de prueba eliminado');
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    
    // Mostrar más detalles del error
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testClientesAPI()
    .then(() => {
      console.log('\n🎯 Script de pruebas completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal en script:', error);
      process.exit(1);
    });
}

export { testClientesAPI }; 