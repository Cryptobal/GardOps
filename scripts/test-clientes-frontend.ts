import { query } from '../src/lib/database';

async function testClientesFrontend() {
  try {
    console.log('🧪 Probando funcionalidad del frontend de clientes...');
    
    // 1. Verificar que hay clientes para mostrar
    console.log('\n📊 Verificando datos para el frontend...');
    const clientes = await query(`
      SELECT id, nombre, rut, representante_legal, rut_representante, 
             email, telefono, direccion, estado, created_at, updated_at
      FROM clientes 
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`✅ ${clientes.rows.length} clientes disponibles para mostrar`);
    
    // 2. Verificar que los clientes tienen los campos necesarios
    console.log('\n🔍 Verificando estructura de datos...');
    clientes.rows.forEach((cliente, index) => {
      console.log(`\nCliente ${index + 1}:`);
      console.log(`  - ID: ${cliente.id}`);
      console.log(`  - Nombre: ${cliente.nombre}`);
      console.log(`  - RUT: ${cliente.rut}`);
      console.log(`  - Estado: ${cliente.estado || 'Activo'}`);
      console.log(`  - Email: ${cliente.email || 'Sin email'}`);
      console.log(`  - Teléfono: ${cliente.telefono || 'Sin teléfono'}`);
      console.log(`  - Representante: ${cliente.representante_legal || 'Sin representante'}`);
    });
    
    // 3. Verificar que hay clientes activos e inactivos
    const estados = await query(`
      SELECT estado, COUNT(*) as count
      FROM clientes 
      GROUP BY estado
    `);
    
    console.log('\n📈 Distribución por estado:');
    estados.rows.forEach(estado => {
      console.log(`  - ${estado.estado || 'Activo'}: ${estado.count} clientes`);
    });
    
    // 4. Simular datos que el frontend enviaría para crear un cliente
    console.log('\n➕ Simulando datos de creación de cliente...');
    const datosCreacion = {
      nombre: "Empresa Frontend Test",
      rut: "11111111-1",
      representante_legal: "Ana García",
      rut_representante: "22222222-2",
      email: "ana@empresa.cl",
      telefono: "+56 9 8765 4321",
      direccion: "Av. Frontend 456, Santiago",
      latitud: -33.4569,
      longitud: -70.6483,
      ciudad: "Santiago",
      comuna: "Las Condes",
      razon_social: "Empresa Frontend Test SpA",
      estado: "Activo"
    };
    
    console.log('📋 Datos de prueba:');
    Object.entries(datosCreacion).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    
    // 5. Verificar que los datos pasan las validaciones
    console.log('\n✅ Validando datos...');
    
    // Validar nombre
    if (!datosCreacion.nombre.trim()) {
      console.log('❌ Error: Nombre es obligatorio');
    } else {
      console.log('✅ Nombre válido');
    }
    
    // Validar RUT
    const rutRegex = /^[0-9]+-[0-9kK]{1}$/;
    if (!rutRegex.test(datosCreacion.rut)) {
      console.log('❌ Error: Formato de RUT inválido');
    } else {
      console.log('✅ RUT válido');
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (datosCreacion.email && !emailRegex.test(datosCreacion.email)) {
      console.log('❌ Error: Formato de email inválido');
    } else {
      console.log('✅ Email válido');
    }
    
    // 6. Simular cambio de estado
    console.log('\n🔄 Simulando cambio de estado...');
    const clienteParaCambiar = clientes.rows[0];
    const nuevoEstado = clienteParaCambiar.estado === "Activo" ? "Inactivo" : "Activo";
    
    console.log(`Cliente: ${clienteParaCambiar.nombre}`);
    console.log(`Estado actual: ${clienteParaCambiar.estado || 'Activo'}`);
    console.log(`Nuevo estado: ${nuevoEstado}`);
    
    // 7. Verificar que el frontend puede manejar datos nulos
    console.log('\n🔍 Verificando manejo de datos nulos...');
    const clienteConNulos = clientes.rows.find(c => 
      !c.email || !c.telefono || !c.representante_legal
    );
    
    if (clienteConNulos) {
      console.log('✅ Cliente con datos nulos encontrado:');
      console.log(`  - Nombre: ${clienteConNulos.nombre}`);
      console.log(`  - Email: ${clienteConNulos.email || 'NULL'}`);
      console.log(`  - Teléfono: ${clienteConNulos.telefono || 'NULL'}`);
      console.log(`  - Representante: ${clienteConNulos.representante_legal || 'NULL'}`);
    } else {
      console.log('ℹ️ Todos los clientes tienen datos completos');
    }
    
    console.log('\n🎉 Pruebas del frontend completadas');
    
  } catch (error) {
    console.error('❌ Error en las pruebas del frontend:', error);
    
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testClientesFrontend()
    .then(() => {
      console.log('\n🎯 Script de pruebas del frontend completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal en script:', error);
      process.exit(1);
    });
}

export { testClientesFrontend }; 