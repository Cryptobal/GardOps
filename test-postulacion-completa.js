require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3000';
const TENANT_ID = '1397e653-a702-4020-9702-3ae4f3f8b337';

async function testPostulacion() {
  console.log('\n🧪 PRUEBA COMPLETA DE POSTULACIÓN\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. Crear guardia
    console.log('\n📝 PASO 1: Creando guardia...');
    const guardiaData = {
      rut: '13807744-6',
      nombre: 'Test',
      apellido_paterno: 'Postulacion',
      apellido_materno: 'Webhook',
      sexo: 'Hombre',
      fecha_nacimiento: '1990-01-15',
      nacionalidad: 'Chilena',
      email: 'test.postulacion@test.cl',
      celular: '987654321',
      direccion: 'Av. Las Condes 6765, Las Condes, Santiago',
      comuna: 'Las Condes',
      ciudad: 'Santiago',
      afp: 'Cuprum',
      descuento_afp: '0%',
      prevision_salud: 'FONASA',
      cotiza_sobre_7: 'No',
      es_pensionado: 'No',
      asignacion_familiar: 'No',
      banco_id: 'd8f390a2-2466-4bc8-9032-903a0e84e85b',
      tipo_cuenta: 'CTE',
      numero_cuenta: '1234567890',
      talla_camisa: 'L',
      talla_pantalon: '42',
      talla_zapato: 42,
      altura_cm: 175,
      peso_kg: 75,
      tenant_id: TENANT_ID,
      ip_postulacion: '127.0.0.1',
      user_agent_postulacion: 'Test Script'
    };

    const guardiaResponse = await fetch(`${API_BASE_URL}/api/postulacion/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guardiaData)
    });

    if (!guardiaResponse.ok) {
      const error = await guardiaResponse.json();
      throw new Error(`Error creando guardia: ${error.error || guardiaResponse.statusText}`);
    }

    const guardiaResult = await guardiaResponse.json();
    console.log('✅ Guardia creada:', guardiaResult.guardia_id);

    // 2. Crear un documento de prueba (imagen pequeña)
    console.log('\n📄 PASO 2: Creando archivo de prueba...');
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, 'Este es un documento de prueba para la postulación');
    
    // 3. Subir documento
    console.log('\n📤 PASO 3: Subiendo documento...');
    const formData = new FormData();
    formData.append('guardia_id', guardiaResult.guardia_id);
    formData.append('tipo_documento', 'Carnet Identidad Frontal');
    formData.append('archivo', fs.createReadStream(testFilePath), {
      filename: 'test-carnet.txt',
      contentType: 'text/plain'
    });

    const docResponse = await fetch(`${API_BASE_URL}/api/postulacion/documento`, {
      method: 'POST',
      body: formData
    });

    if (!docResponse.ok) {
      const error = await docResponse.json();
      console.error('❌ Error subiendo documento:', error);
    } else {
      const docResult = await docResponse.json();
      console.log('✅ Documento subido:', docResult);
    }

    // Limpiar archivo de prueba
    fs.unlinkSync(testFilePath);

    console.log('\n═'.repeat(60));
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('\n📋 RESUMEN:');
    console.log(`   Guardia ID: ${guardiaResult.guardia_id}`);
    console.log(`   RUT: ${guardiaData.rut}`);
    console.log(`   Email: ${guardiaData.email}`);
    console.log('\n💡 Verifica en el webhook si llegó la notificación.');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
    process.exit(1);
  }
}

testPostulacion();

