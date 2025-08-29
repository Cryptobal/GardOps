#!/usr/bin/env node

/**
 * Script para probar el sistema de recuperación de contraseña
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testPasswordRecovery() {
  console.log('🧪 Probando sistema de recuperación de contraseña...\n');

  // 1. Solicitar recuperación de contraseña
  console.log('1️⃣ Solicitando recuperación de contraseña...');
  try {
    const recoveryResponse = await fetch(`${BASE_URL}/api/auth/recuperar-contrasena`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: 'carlos.irigoyen@gard.cl' 
      }),
    });

    if (recoveryResponse.ok) {
      const data = await recoveryResponse.json();
      console.log('✅ Solicitud de recuperación enviada:', data.message);
    } else {
      const error = await recoveryResponse.json();
      console.log('❌ Error en solicitud de recuperación:', error.error);
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }

  // 2. Verificar tokens en la base de datos
  console.log('\n2️⃣ Verificando tokens en la base de datos...');
  try {
    const { sql } = require('@vercel/postgres');
    
    const tokensResult = await sql`
      SELECT prt.id, prt.token, prt.expires_at, prt.used, prt.created_at,
             u.nombre, u.email
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      ORDER BY prt.created_at DESC
      LIMIT 5
    `;

    if (tokensResult.rows.length > 0) {
      console.log(`✅ Encontrados ${tokensResult.rows.length} tokens:`);
      tokensResult.rows.forEach((token, index) => {
        const expiresAt = new Date(token.expires_at).toLocaleString('es-CL');
        const createdAt = new Date(token.created_at).toLocaleString('es-CL');
        console.log(`  ${index + 1}. Token: ${token.token.substring(0, 16)}...`);
        console.log(`     Usuario: ${token.nombre} (${token.email})`);
        console.log(`     Creado: ${createdAt} | Expira: ${expiresAt} | Usado: ${token.used ? 'Sí' : 'No'}`);
      });
    } else {
      console.log('❌ No se encontraron tokens para el usuario');
    }
  } catch (error) {
    console.log('❌ Error verificando tokens:', error.message);
  }

  // 3. Probar verificación de token (si existe uno válido)
  console.log('\n3️⃣ Probando verificación de token...');
  try {
    const { sql } = require('@vercel/postgres');
    
    const validTokenResult = await sql`
      SELECT token FROM password_reset_tokens
      WHERE expires_at > NOW() AND used = false
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (validTokenResult.rows.length > 0) {
      const token = validTokenResult.rows[0].token;
      console.log('🔍 Probando token válido:', token.substring(0, 16) + '...');
      
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verificar-token?token=${token}`);
      const verifyData = await verifyResponse.json();
      
      if (verifyResponse.ok && verifyData.valid) {
        console.log('✅ Token verificado correctamente');
        console.log('👤 Usuario:', verifyData.user.nombre, `(${verifyData.user.email})`);
      } else {
        console.log('❌ Error verificando token:', verifyData.error);
      }
    } else {
      console.log('⚠️ No hay tokens válidos para probar');
    }
  } catch (error) {
    console.log('❌ Error probando verificación:', error.message);
  }

  console.log('\n🎉 Prueba del sistema completada');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPasswordRecovery();
}

module.exports = { testPasswordRecovery };
