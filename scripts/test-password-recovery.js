#!/usr/bin/env node

/**
 * Script para probar el sistema de recuperación de contraseña
 */

const BASE_URL = 'http://localhost:3000';

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
    
    const tokens = await sql`
      SELECT 
        prt.token,
        prt.expires_at,
        prt.used,
        u.email,
        u.nombre,
        u.apellido
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      WHERE prt.expires_at > NOW() AND prt.used = FALSE
      ORDER BY prt.created_at DESC
      LIMIT 5
    `;

    if (tokens.rows.length > 0) {
      console.log('✅ Tokens activos encontrados:');
      tokens.rows.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.email} (${token.nombre} ${token.apellido})`);
        console.log(`      Token: ${token.token.substring(0, 20)}...`);
        console.log(`      Expira: ${new Date(token.expires_at).toLocaleString()}`);
        console.log(`      Usado: ${token.used ? 'Sí' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️ No se encontraron tokens activos');
    }
  } catch (error) {
    console.log('❌ Error verificando tokens:', error.message);
  }

  // 3. Probar verificación de token (si hay uno disponible)
  console.log('3️⃣ Probando verificación de token...');
  try {
    const { sql } = require('@vercel/postgres');
    
    const activeToken = await sql`
      SELECT token FROM password_reset_tokens 
      WHERE expires_at > NOW() AND used = FALSE 
      LIMIT 1
    `;

    if (activeToken.rows.length > 0) {
      const token = activeToken.rows[0].token;
      console.log(`🔑 Probando token: ${token.substring(0, 20)}...`);
      
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verificar-token?token=${token}`);
      
      if (verifyResponse.ok) {
        const data = await verifyResponse.json();
        console.log('✅ Token válido:', data);
      } else {
        const error = await verifyResponse.json();
        console.log('❌ Token inválido:', error.error);
      }
    } else {
      console.log('ℹ️ No hay tokens activos para probar');
    }
  } catch (error) {
    console.log('❌ Error verificando token:', error.message);
  }

  console.log('\n✅ Prueba completada');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPasswordRecovery()
    .then(() => {
      console.log('\n🎉 Script de prueba finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testPasswordRecovery };
