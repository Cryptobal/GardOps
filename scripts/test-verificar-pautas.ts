import { query } from '../src/lib/database';

async function testVerificarPautas() {
  try {
    console.log('🔍 Probando endpoint de verificar pautas...');
    
    // Obtener un rol válido de la base de datos
    const result = await query(`
      SELECT id, nombre, estado 
      FROM as_turnos_roles_servicio 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No hay roles en la base de datos');
      return;
    }
    
    const rol = result.rows[0];
    console.log('🔍 Rol encontrado:', rol);
    
    // Probar el endpoint con el ID válido
    const response = await fetch('http://localhost:3000/api/roles-servicio/verificar-pautas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rol_id: rol.id }),
    });
    
    console.log('🔍 Status de respuesta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Respuesta exitosa:', data);
    } else {
      const error = await response.json();
      console.log('❌ Error en respuesta:', error);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar el test
testVerificarPautas()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el test:', error);
    process.exit(1);
  });
