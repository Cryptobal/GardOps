#!/usr/bin/env npx tsx

/**
 * Script para asignar el permiso rbac.admin a un usuario
 * Uso: npx tsx scripts/grant-rbac-admin.ts [email]
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function grantRbacAdmin(email?: string) {
  try {
    console.log('🔐 Iniciando asignación de permiso rbac.admin...');
    
    // Si no se proporciona email, usar el primer usuario activo (para pruebas)
    let targetEmail = email;
    
    if (!targetEmail) {
      const result = await sql`
        SELECT email 
        FROM usuarios 
        WHERE activo = true 
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        console.error('❌ No se encontraron usuarios activos');
        process.exit(1);
      }
      
      targetEmail = result.rows[0].email;
      console.log(`📧 Usando el primer usuario activo: ${targetEmail}`);
    }
    
    // Verificar que el usuario existe
    const usuarioResult = await sql`
      SELECT id, email, nombre, apellido 
      FROM usuarios 
      WHERE email = ${targetEmail}
    `;
    
    const usuario = usuarioResult.rows[0];
    
    if (!usuario) {
      console.error(`❌ Usuario con email ${targetEmail} no encontrado`);
      process.exit(1);
    }
    
    console.log(`👤 Usuario encontrado: ${usuario.nombre} ${usuario.apellido} (${usuario.email})`);
    
    // Verificar si las tablas RBAC existen
    const tablesCheck = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rbac_permisos', 'rbac_roles', 'rbac_usuario_rol', 'rbac_rol_permiso')
    `;
    
    if (Number(tablesCheck.rows[0].count) < 4) {
      console.log('⚠️  Las tablas RBAC no existen. Creándolas...');
      
      // Crear tabla de permisos
      await sql`
        CREATE TABLE IF NOT EXISTS rbac_permisos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          codigo VARCHAR(100) UNIQUE NOT NULL,
          nombre VARCHAR(200) NOT NULL,
          descripcion TEXT,
          categoria VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Crear tabla de roles
      await sql`
        CREATE TABLE IF NOT EXISTS rbac_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre VARCHAR(100) UNIQUE NOT NULL,
          descripcion TEXT,
          es_sistema BOOLEAN DEFAULT false,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Crear tabla de relación usuario-rol
      await sql`
        CREATE TABLE IF NOT EXISTS rbac_usuario_rol (
          usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          rol_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (usuario_id, rol_id)
        )
      `;

      // Crear tabla de relación rol-permiso
      await sql`
        CREATE TABLE IF NOT EXISTS rbac_rol_permiso (
          rol_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
          permiso_id UUID NOT NULL REFERENCES rbac_permisos(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (rol_id, permiso_id)
        )
      `;
      
      console.log('✅ Tablas RBAC creadas');
    }
    
    // Verificar si el permiso rbac.admin existe
    let permisoResult = await sql`
      SELECT id FROM rbac_permisos WHERE codigo = 'rbac.admin'
    `;
    let permiso = permisoResult.rows[0];
    
    if (!permiso) {
      console.log('📝 Creando permiso rbac.admin...');
      const insertResult = await sql`
        INSERT INTO rbac_permisos (codigo, nombre, descripcion, categoria)
        VALUES ('rbac.admin', 'Administrador de Seguridad', 'Permite administrar usuarios, roles y permisos del sistema', 'Seguridad')
        RETURNING id
      `;
      permiso = insertResult.rows[0];
      console.log('✅ Permiso rbac.admin creado');
    }
    
    // Verificar si existe el rol de Administrador
    let rolResult = await sql`
      SELECT id FROM rbac_roles WHERE nombre = 'Administrador del Sistema'
    `;
    let rol = rolResult.rows[0];
    
    if (!rol) {
      console.log('📝 Creando rol de Administrador del Sistema...');
      const insertRolResult = await sql`
        INSERT INTO rbac_roles (nombre, descripcion, es_sistema, activo)
        VALUES ('Administrador del Sistema', 'Rol con todos los permisos del sistema', true, true)
        RETURNING id
      `;
      rol = insertRolResult.rows[0];
      console.log('✅ Rol de Administrador creado');
    }
    
    // Asignar el permiso al rol si no lo tiene
    const permisoEnRol = await sql`
      SELECT 1 FROM rbac_rol_permiso 
      WHERE rol_id = ${rol.id} AND permiso_id = ${permiso.id}
    `;
    
    if (permisoEnRol.rows.length === 0) {
      await sql`
        INSERT INTO rbac_rol_permiso (rol_id, permiso_id)
        VALUES (${rol.id}, ${permiso.id})
      `;
      console.log('✅ Permiso rbac.admin asignado al rol Administrador');
    }
    
    // Asignar el rol al usuario si no lo tiene
    const usuarioConRol = await sql`
      SELECT 1 FROM rbac_usuario_rol 
      WHERE usuario_id = ${usuario.id} AND rol_id = ${rol.id}
    `;
    
    if (usuarioConRol.rows.length === 0) {
      await sql`
        INSERT INTO rbac_usuario_rol (usuario_id, rol_id)
        VALUES (${usuario.id}, ${rol.id})
      `;
      console.log('✅ Rol de Administrador asignado al usuario');
    } else {
      console.log('ℹ️  El usuario ya tiene el rol de Administrador');
    }
    
    // Crear función si no existe
    await sql`
      CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso(
        p_usuario_id UUID,
        p_permiso_codigo VARCHAR
      ) RETURNS BOOLEAN AS $$
      BEGIN
        -- Verificar si el usuario tiene el permiso a través de sus roles
        RETURN EXISTS (
          SELECT 1
          FROM rbac_usuario_rol ur
          JOIN rbac_rol_permiso rp ON ur.rol_id = rp.rol_id
          JOIN rbac_permisos p ON rp.permiso_id = p.id
          JOIN rbac_roles r ON ur.rol_id = r.id
          WHERE ur.usuario_id = p_usuario_id
            AND p.codigo = p_permiso_codigo
            AND r.activo = true
        );
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Función fn_usuario_tiene_permiso creada/actualizada');
    
    // Verificar que funciona
    const verificacionResult = await sql`
      SELECT fn_usuario_tiene_permiso(${usuario.id}::uuid, 'rbac.admin') as tiene_permiso
    `;
    const verificacion = verificacionResult.rows[0];
    
    if (verificacion.tiene_permiso) {
      console.log(`\n🎉 ¡Éxito! El usuario ${usuario.email} ahora tiene el permiso rbac.admin`);
      console.log('📌 Ahora puedes acceder a /configuracion/seguridad');
    } else {
      console.error('❌ Hubo un problema al asignar el permiso');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
const email = process.argv[2];
grantRbacAdmin(email).then(() => process.exit(0));
