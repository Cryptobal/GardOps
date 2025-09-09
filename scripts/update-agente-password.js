#!/usr/bin/env node

/**
 * Script para actualizar la contraseña de agente@gard.cl
 * Uso: node scripts/update-agente-password.js
 */

const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function updateAgentePassword() {
  try {
    console.log('🔑 ACTUALIZANDO CONTRASEÑA DE AGENTE...\n');
    
    // 1. Generar hash de la nueva contraseña
    const newPassword = 'agente123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔐 Nueva contraseña:', newPassword);
    console.log('🔐 Hash generado:', hashedPassword.substring(0, 20) + '...');
    
    // 2. Verificar que el usuario existe
    const existingUser = await sql`
      SELECT email, nombre, apellido, rol, activo
      FROM usuarios 
      WHERE email = 'agente@gard.cl'
    `;
    
    if (existingUser.rows.length === 0) {
      console.log('❌ Usuario agente@gard.cl no encontrado. Creando...');
      
      // Crear usuario si no existe
      const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337'; // Tenant Gard
      const newUser = await sql`
        INSERT INTO usuarios (
          email, password, nombre, apellido, rol, activo, tenant_id
        )
        VALUES (
          'agente@gard.cl', ${hashedPassword}, 'Agente', 'Operativo',
          'guardia', true, ${tenantId}
        )
        RETURNING id, email, nombre, apellido
      `;
      
      console.log('✅ Usuario creado:', newUser.rows[0]);
      
      // Asignar rol Operador
      const rolOperador = await sql`
        SELECT id FROM roles 
        WHERE nombre = 'Operador' AND tenant_id = ${tenantId}
      `;
      
      if (rolOperador.rows.length > 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${newUser.rows[0].id}, ${rolOperador.rows[0].id})
        `;
        console.log('✅ Rol Operador asignado');
      }
    } else {
      // 3. Actualizar la contraseña existente
      const result = await sql`
        UPDATE usuarios 
        SET password = ${hashedPassword}
        WHERE email = 'agente@gard.cl'
        RETURNING email, nombre, apellido
      `;
      
      const user = result.rows[0];
      console.log(`✅ Contraseña actualizada para: ${user.nombre} ${user.apellido} (${user.email})`);
    }
    
    // 4. Verificar resultado final
    const finalCheck = await sql`
      SELECT email, nombre, apellido, rol, activo
      FROM usuarios 
      WHERE email = 'agente@gard.cl'
    `;
    
    if (finalCheck.rows.length > 0) {
      const user = finalCheck.rows[0];
      console.log('\n🔑 CREDENCIALES FINALES:');
      console.log('• Email:', user.email);
      console.log('• Password: agente123');
      console.log('• Nombre:', user.nombre, user.apellido);
      console.log('• Rol:', user.rol);
      console.log('• Estado:', user.activo ? 'Activo' : 'Inactivo');
      console.log('\n✅ Usuario listo para usar');
    }
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateAgentePassword();
}

module.exports = { updateAgentePassword };
