require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const API_BASE_URL = 'http://localhost:3000';
const TENANT_ID = '1397e653-a702-4020-9702-3ae4f3f8b337';

// URL de webhook de prueba - Usaremos webhook.site
// Ve a https://webhook.site y copia tu URL única
const WEBHOOK_TEST_URL = 'https://webhook.site/b5c8e3f0-8d4a-4c9b-9f2e-1a7c6d8e9f0a'; // TEMPORAL - Reemplazar con tu URL

async function testPostulacionWebhook() {
  console.log('\n🧪 PRUEBA COMPLETA: POSTULACIÓN → WEBHOOK\n');
  console.log('═'.repeat(70));
  
  try {
    // 1. Configurar webhook
    console.log('\n📌 PASO 1: Configurando webhook...');
    const webhookConfig = await fetch(`${API_BASE_URL}/api/configuracion/postulaciones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url_webhook: WEBHOOK_TEST_URL,
        webhook_activo: true
      })
    });

    if (!webhookConfig.ok) {
      throw new Error('Error configurando webhook');
    }
    
    console.log('✅ Webhook configurado:', WEBHOOK_TEST_URL);

    // 2. Obtener un banco válido
    console.log('\n📌 PASO 2: Obteniendo banco...');
    const bancosResult = await pool.query('SELECT id FROM bancos LIMIT 1');
    const bancoId = bancosResult.rows[0]?.id;
    
    if (!bancoId) {
      throw new Error('No hay bancos en la BD');
    }
    console.log('✅ Banco ID:', bancoId);

    // 3. Crear guardia de prueba
    console.log('\n📌 PASO 3: Creando guardia de prueba...');
    const timestamp = Date.now();
    const guardiaData = {
      rut: `${13800000 + (timestamp % 1000000)}-${Math.floor(Math.random() * 10)}`,
      nombre: 'Test',
      apellido_paterno: 'Webhook',
      apellido_materno: 'Prueba',
      sexo: 'Hombre',
      fecha_nacimiento: '1990-05-15',
      nacionalidad: 'Chilena',
      email: `test.webhook.${timestamp}@test.cl`,
      celular: '987654321',
      direccion: 'Av. Las Condes 6765, Las Condes, Santiago',
      comuna: 'Las Condes',
      ciudad: 'Santiago',
      afp: 'Cuprum',
      descuento_afp: '0%',
      prevision_salud: 'FONASA',
      cotiza_sobre_7: 'No',
      monto_pactado_uf: '',
      es_pensionado: 'No',
      asignacion_familiar: 'No',
      tramo_asignacion: '',
      banco_id: bancoId,
      tipo_cuenta: 'CTE',
      numero_cuenta: '1234567890',
      talla_camisa: 'L',
      talla_pantalon: '42',
      talla_zapato: 42,
      altura_cm: 175,
      peso_kg: 75,
      tenant_id: TENANT_ID,
      ip_postulacion: '127.0.0.1',
      user_agent_postulacion: 'Test Script - Webhook Prueba'
    };

    console.log('📋 Datos de la postulación:');
    console.log(`   RUT: ${guardiaData.rut}`);
    console.log(`   Nombre: ${guardiaData.nombre} ${guardiaData.apellido_paterno}`);
    console.log(`   Email: ${guardiaData.email}`);

    const guardiaResponse = await fetch(`${API_BASE_URL}/api/postulacion/crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guardiaData)
    });

    if (!guardiaResponse.ok) {
      const error = await guardiaResponse.json();
      throw new Error(`Error creando guardia: ${JSON.stringify(error)}`);
    }

    const guardiaResult = await guardiaResponse.json();
    console.log('✅ Guardia creada con ID:', guardiaResult.guardia_id);

    // 4. Esperar un momento para que el webhook se procese
    console.log('\n📌 PASO 4: Esperando procesamiento de webhook...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Verificar logs del webhook
    console.log('\n📌 PASO 5: Verificando logs de webhook...');
    const logsResponse = await fetch(`${API_BASE_URL}/api/configuracion/postulaciones/webhook-logs`);
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      const ultimoLog = logsData.logs?.[0];
      
      if (ultimoLog) {
        console.log('✅ Último webhook enviado:');
        console.log(`   Estado: ${ultimoLog.estado}`);
        console.log(`   Código HTTP: ${ultimoLog.codigo_http || 'N/A'}`);
        console.log(`   Fecha: ${new Date(ultimoLog.fecha_envio).toLocaleString()}`);
        console.log(`   Guardia: ${ultimoLog.guardia_nombre}`);
      } else {
        console.log('⚠️  No se encontraron logs de webhook recientes');
      }
    }

    console.log('\n═'.repeat(70));
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('\n📋 RESUMEN:');
    console.log(`   ✓ Webhook configurado: ${WEBHOOK_TEST_URL}`);
    console.log(`   ✓ Guardia creada: ${guardiaResult.guardia_id}`);
    console.log(`   ✓ RUT: ${guardiaData.rut}`);
    console.log(`   ✓ Email: ${guardiaData.email}`);
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('   1. Ve a tu webhook URL para ver la notificación recibida');
    console.log('   2. Verifica en Configuración → Postulaciones → Logs de Webhook');
    console.log('   3. Revisa la ficha del guardia en Guardias');
    
    await pool.end();

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testPostulacionWebhook();

