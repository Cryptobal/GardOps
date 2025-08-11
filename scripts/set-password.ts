#!/usr/bin/env npx tsx

/**
 * Script para establecer una contraseña conocida al usuario carlos.irigoyen@gard.cl
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });
config({ path: '.env' });

async function setPassword() {
  try {
    const email = 'carlos.irigoyen@gard.cl';
    const newPassword = 'Admin123!';
    
    // Hashear la contraseña
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Actualizar la contraseña en la base de datos
    const result = await sql`
      UPDATE usuarios 
      SET password = ${hashedPassword}
      WHERE email = ${email}
      RETURNING id, email, nombre
    `;
    
    if (result.rows.length > 0) {
      console.log('✅ Contraseña actualizada exitosamente');
      console.log(`📧 Usuario: ${email}`);
      console.log(`🔑 Nueva contraseña: ${newPassword}`);
      console.log(`👤 Nombre: ${result.rows[0].nombre}`);
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setPassword().then(() => process.exit(0));
