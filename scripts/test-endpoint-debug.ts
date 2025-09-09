#!/usr/bin/env npx tsx

/**
 * Script para debuggear el endpoint RBAC
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

async function debug() {
  try {
    // Leer la cookie del archivo
    const cookies = readFileSync('cookies.txt', 'utf-8');
    const lines = cookies.split('\n');
    let token = '';
    
    // Buscar la línea que contiene auth_token
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('auth_token')) {
        // El token está en la última columna
        const parts = lines[i].split('\t');
        token = parts[parts.length - 1];
        // Si el token continúa en la siguiente línea
        while (i + 1 < lines.length && !lines[i + 1].startsWith('#') && !lines[i + 1].includes('\t')) {
          token += lines[++i];
        }
        break;
      }
    }
    
    if (!token) {
      console.log('❌ No se encontró token en cookies.txt');
      return;
    }
    console.log('🔑 Token encontrado');
    
    // Decodificar el token manualmente (JWT)
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('👤 Token decodificado:', payload);
    
    if (payload && payload.user_id) {
      // Probar la función directamente con el user_id del token
      const result = await sql`
        SELECT fn_usuario_tiene_permiso(${payload.user_id}::uuid, 'rbac.admin') as tiene_permiso
      `;
      
      console.log('\n✅ Resultado de la función con user_id del token:', result.rows[0]);
      
      // También verificar los datos en las tablas
      const userRoles = await sql`
        SELECT * FROM rbac_usuarios_roles WHERE usuario_ref = ${payload.user_id}
      `;
      console.log('\n📋 Roles del usuario:', userRoles.rows);
      
      const rolePerms = await sql`
        SELECT * FROM rbac_roles_permisos WHERE rol_codigo = 'admin-sistema'
      `;
      console.log('\n🔐 Permisos del rol admin-sistema:', rolePerms.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debug();
