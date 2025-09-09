#!/usr/bin/env npx tsx

/**
 * Script simplificado para asignar el permiso rbac.admin a un usuario
 * Asume que las tablas RBAC ya existen
 * Uso: npx tsx scripts/grant-rbac-admin-simple.ts [email]
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: '.env.local' });
config({ path: '.env' });

async function grantRbacAdmin(email?: string) {
  try {
    console.log('🔐 Iniciando asignación de permiso rbac.admin...');
    
    // Si no se proporciona email, usar el primer usuario activo
    let targetEmail = email;
    
    if (!targetEmail) {
      const result = await sql`
        SELECT id, email 
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
    
    // Obtener el usuario
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
    
    // Verificar si el permiso rbac.admin existe
    let permisoResult = await sql`
      SELECT id FROM rbac_permisos WHERE codigo = 'rbac.admin'
    `;
    let permiso = permisoResult.rows[0];
    
    if (!permiso) {
      console.log('📝 Creando permiso rbac.admin...');
      const insertResult = await sql`
        INSERT INTO rbac_permisos (codigo, nombre, descripcion)
        VALUES ('rbac.admin', 'Administrador de Seguridad', 'Permite administrar usuarios, roles y permisos del sistema')
        RETURNING id
      `;
      permiso = insertResult.rows[0];
      console.log('✅ Permiso rbac.admin creado con ID:', permiso.id);
    } else {
      console.log('ℹ️  Permiso rbac.admin ya existe con ID:', permiso.id);
    }
    
    // Verificar si existe el rol de Administrador
    let rolResult = await sql`
      SELECT id FROM rbac_roles WHERE codigo = 'admin-sistema'
    `;
    let rol = rolResult.rows[0];
    
    if (!rol) {
      console.log('📝 Creando rol de Administrador del Sistema...');
      const insertRolResult = await sql`
        INSERT INTO rbac_roles (codigo, nombre, descripcion)
        VALUES ('admin-sistema', 'Administrador del Sistema', 'Rol con todos los permisos del sistema')
        RETURNING id
      `;
      rol = insertRolResult.rows[0];
      console.log('✅ Rol de Administrador creado con ID:', rol.id);
    } else {
      console.log('ℹ️  Rol de Administrador ya existe con ID:', rol.id);
    }
    
    // Asignar el permiso al rol si no lo tiene
    const permisoEnRol = await sql`
      SELECT 1 FROM rbac_roles_permisos 
      WHERE rol_codigo = 'admin-sistema' AND permiso_cod = 'rbac.admin'
    `;
    
    if (permisoEnRol.rows.length === 0) {
      await sql`
        INSERT INTO rbac_roles_permisos (rol_codigo, permiso_cod, granted)
        VALUES ('admin-sistema', 'rbac.admin', true)
      `;
      console.log('✅ Permiso rbac.admin asignado al rol Administrador');
    } else {
      console.log('ℹ️  El rol ya tiene el permiso rbac.admin');
    }
    
    // Asignar el rol al usuario si no lo tiene
    const usuarioConRol = await sql`
      SELECT 1 FROM rbac_usuarios_roles 
      WHERE usuario_ref = ${usuario.id} AND rol_codigo = 'admin-sistema'
    `;
    
    if (usuarioConRol.rows.length === 0) {
      await sql`
        INSERT INTO rbac_usuarios_roles (usuario_ref, rol_codigo)
        VALUES (${usuario.id}, 'admin-sistema')
      `;
      console.log('✅ Rol de Administrador asignado al usuario');
    } else {
      console.log('ℹ️  El usuario ya tiene el rol de Administrador');
    }
    
    // Crear o actualizar la función si no existe
    await sql`
      CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso(
        p_usuario_id UUID,
        p_permiso_codigo VARCHAR
      ) RETURNS BOOLEAN AS $$
      BEGIN
        -- Verificar si el usuario tiene el permiso a través de sus roles
        RETURN EXISTS (
          SELECT 1
          FROM rbac_usuarios_roles ur
          JOIN rbac_roles_permisos rp ON ur.rol_codigo = rp.rol_codigo
          WHERE ur.usuario_ref = p_usuario_id::text
            AND rp.permiso_cod = p_permiso_codigo
            AND rp.granted = true
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
    
    if (verificacion && verificacion.tiene_permiso) {
      console.log(`\n🎉 ¡Éxito! El usuario ${usuario.email} ahora tiene el permiso rbac.admin`);
      console.log('📌 Ahora puedes acceder a /configuracion/seguridad');
      console.log('📌 Recarga la página para ver los cambios');
    } else {
      console.error('❌ Hubo un problema al asignar el permiso');
      console.log('Verificación devolvió:', verificacion);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el script
const email = process.argv[2];
grantRbacAdmin(email).then(() => process.exit(0));
