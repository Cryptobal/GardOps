// Script para probar la actualización de instalaciones
// Ejecutar con: node scripts/test-update-instalacion.js

const API_BASE = 'http://localhost:3000/api';

async function testUpdate() {
  console.log('🧪 Probando actualización de instalaciones...\n');

  try {
    // 1. Obtener una instalación existente
    console.log('1️⃣ Obteniendo instalaciones existentes...');
    const getResponse = await fetch(`${API_BASE}/instalaciones`);
    const getData = await getResponse.json();
    
    if (!getData.success || getData.data.length === 0) {
      console.log('❌ No hay instalaciones para actualizar');
      return;
    }
    
    const instalacion = getData.data[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre}`);
    
    // 2. Actualizar la instalación
    console.log('2️⃣ Actualizando instalación...');
    const updateData = {
      id: instalacion.id,
      nombre: `${instalacion.nombre} - Actualizado ${new Date().toLocaleTimeString()}`,
      valor_turno_extra: 75000, // Número como string para probar coerción
      estado: 'Activo'
    };
    
    console.log('📤 Datos a enviar:', updateData);
    
    const updateResponse = await fetch(`${API_BASE}/instalaciones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    const updateResult = await updateResponse.json();
    
    if (updateResult.success) {
      console.log('✅ Actualización exitosa:', updateResult.message);
      console.log('📊 Datos actualizados:', updateResult.data);
    } else {
      console.log('❌ Error en actualización:', updateResult.error);
      if (updateResult.details) {
        console.log('🔍 Detalles del error:', updateResult.details);
      }
    }
    
    // 3. Verificar que se actualizó
    console.log('3️⃣ Verificando actualización...');
    const verifyResponse = await fetch(`${API_BASE}/instalaciones`);
    const verifyData = await verifyResponse.json();
    
    const updatedInstalacion = verifyData.data.find(inst => inst.id === instalacion.id);
    if (updatedInstalacion) {
      console.log('✅ Verificación exitosa');
      console.log('📊 Nombre actualizado:', updatedInstalacion.nombre);
      console.log('📊 Valor turno extra:', updatedInstalacion.valor_turno_extra);
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar prueba
testUpdate().catch(console.error); 