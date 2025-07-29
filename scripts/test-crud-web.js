// Script de prueba para CRUD de instalaciones desde la aplicación web
// Ejecutar con: node scripts/test-crud-web.js

const API_BASE = 'http://localhost:3000/api';

async function testCRUD() {
  console.log('🧪 Iniciando pruebas de CRUD para instalaciones...\n');

  try {
    // 1. CREAR instalación
    console.log('1️⃣ Creando nueva instalación...');
    const nuevaInstalacion = {
      nombre: 'Instalación de Prueba Web',
      cliente_id: '97ae8d15-1ecb-401f-b189-3252c76354a0', // Transmat
      direccion: 'Av. Providencia 1234, Providencia, Chile',
      latitud: -33.4489,
      longitud: -70.6693,
      ciudad: 'Santiago',
      comuna: 'Providencia',
      valor_turno_extra: 50000,
      estado: 'Activo'
    };

    const createResponse = await fetch(`${API_BASE}/instalaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaInstalacion)
    });

    const createResult = await createResponse.json();
    
    if (!createResult.success) {
      throw new Error(`Error al crear: ${createResult.error}`);
    }

    const instalacionCreada = createResult.data;
    console.log('✅ Instalación creada:', instalacionCreada.nombre, 'ID:', instalacionCreada.id);

    // 2. LEER instalación creada
    console.log('\n2️⃣ Leyendo instalación creada...');
    const readResponse = await fetch(`${API_BASE}/instalaciones`);
    const readResult = await readResponse.json();
    
    if (!readResult.success) {
      throw new Error(`Error al leer: ${readResult.error}`);
    }

    const instalacionEncontrada = readResult.data.find(i => i.id === instalacionCreada.id);
    if (!instalacionEncontrada) {
      throw new Error('No se encontró la instalación creada');
    }

    console.log('✅ Instalación encontrada:', instalacionEncontrada.nombre);

    // 3. ACTUALIZAR instalación
    console.log('\n3️⃣ Actualizando instalación...');
    const datosActualizados = {
      id: instalacionCreada.id,
      nombre: 'Instalación de Prueba Web - Actualizada',
      direccion: 'Av. Las Condes 5678, Las Condes, Chile',
      ciudad: 'Santiago',
      comuna: 'Las Condes',
      valor_turno_extra: 75000
    };

    const updateResponse = await fetch(`${API_BASE}/instalaciones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosActualizados)
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      throw new Error(`Error al actualizar: ${updateResult.error}`);
    }

    console.log('✅ Instalación actualizada:', updateResult.data.nombre);

    // 4. VERIFICAR actualización
    console.log('\n4️⃣ Verificando actualización...');
    const verifyResponse = await fetch(`${API_BASE}/instalaciones`);
    const verifyResult = await verifyResponse.json();
    
    const instalacionActualizada = verifyResult.data.find(i => i.id === instalacionCreada.id);
    if (!instalacionActualizada) {
      throw new Error('No se encontró la instalación actualizada');
    }

    console.log('✅ Verificación exitosa:', instalacionActualizada.nombre, 'Valor:', instalacionActualizada.valor_turno_extra);

    // 5. ELIMINAR instalación
    console.log('\n5️⃣ Eliminando instalación...');
    const deleteResponse = await fetch(`${API_BASE}/instalaciones?id=${instalacionCreada.id}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();
    
    if (!deleteResult.success) {
      throw new Error(`Error al eliminar: ${deleteResult.error}`);
    }

    console.log('✅ Instalación eliminada correctamente');

    // 6. VERIFICAR eliminación
    console.log('\n6️⃣ Verificando eliminación...');
    const finalResponse = await fetch(`${API_BASE}/instalaciones`);
    const finalResult = await finalResponse.json();
    
    const instalacionEliminada = finalResult.data.find(i => i.id === instalacionCreada.id);
    if (instalacionEliminada) {
      throw new Error('La instalación no fue eliminada correctamente');
    }

    console.log('✅ Verificación de eliminación exitosa');

    console.log('\n🎉 ¡Todas las pruebas de CRUD pasaron exitosamente!');
    console.log('📊 Resumen:');
    console.log('   ✅ Crear instalación');
    console.log('   ✅ Leer instalación');
    console.log('   ✅ Actualizar instalación');
    console.log('   ✅ Eliminar instalación');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testCRUD(); 