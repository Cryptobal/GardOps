#!/usr/bin/env npx tsx

/**
 * Script para poblar la base de datos con permisos RBAC iniciales
 */

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

config({ path: '.env.local' });

async function populatePermissions() {
  try {
    console.log('🚀 Iniciando población de permisos RBAC...\n');

    // Lista de permisos del sistema
    const permisos = [
      // Administración
      { codigo: 'rbac.admin', nombre: 'Administrador de Seguridad', descripcion: 'Permite administrar usuarios, roles y permisos', categoria: 'Administración' },
      { codigo: 'usuarios.ver', nombre: 'Ver Usuarios', descripcion: 'Permite ver la lista de usuarios', categoria: 'Usuarios' },
      { codigo: 'usuarios.crear', nombre: 'Crear Usuarios', descripcion: 'Permite crear nuevos usuarios', categoria: 'Usuarios' },
      { codigo: 'usuarios.editar', nombre: 'Editar Usuarios', descripcion: 'Permite editar usuarios existentes', categoria: 'Usuarios' },
      { codigo: 'usuarios.eliminar', nombre: 'Eliminar Usuarios', descripcion: 'Permite eliminar usuarios', categoria: 'Usuarios' },
      
      // Guardias
      { codigo: 'guardias.ver', nombre: 'Ver Guardias', descripcion: 'Permite ver la lista de guardias', categoria: 'Guardias' },
      { codigo: 'guardias.crear', nombre: 'Crear Guardias', descripcion: 'Permite crear nuevos guardias', categoria: 'Guardias' },
      { codigo: 'guardias.editar', nombre: 'Editar Guardias', descripcion: 'Permite editar guardias existentes', categoria: 'Guardias' },
      { codigo: 'guardias.eliminar', nombre: 'Eliminar Guardias', descripcion: 'Permite eliminar guardias', categoria: 'Guardias' },
      
      // Instalaciones
      { codigo: 'instalaciones.ver', nombre: 'Ver Instalaciones', descripcion: 'Permite ver la lista de instalaciones', categoria: 'Instalaciones' },
      { codigo: 'instalaciones.crear', nombre: 'Crear Instalaciones', descripcion: 'Permite crear nuevas instalaciones', categoria: 'Instalaciones' },
      { codigo: 'instalaciones.editar', nombre: 'Editar Instalaciones', descripcion: 'Permite editar instalaciones existentes', categoria: 'Instalaciones' },
      { codigo: 'instalaciones.eliminar', nombre: 'Eliminar Instalaciones', descripcion: 'Permite eliminar instalaciones', categoria: 'Instalaciones' },
      
      // Turnos
      { codigo: 'turnos.ver', nombre: 'Ver Turnos', descripcion: 'Permite ver la pauta de turnos', categoria: 'Turnos' },
      { codigo: 'turnos.marcar_asistencia', nombre: 'Marcar Asistencia', descripcion: 'Permite marcar asistencia en turnos', categoria: 'Turnos' },
      { codigo: 'turnos.asignar', nombre: 'Asignar Turnos', descripcion: 'Permite asignar turnos a guardias', categoria: 'Turnos' },
      { codigo: 'turnos.editar', nombre: 'Editar Turnos', descripcion: 'Permite editar turnos existentes', categoria: 'Turnos' },
      { codigo: 'turnos.eliminar', nombre: 'Eliminar Turnos', descripcion: 'Permite eliminar turnos', categoria: 'Turnos' },
      { codigo: 'turnos.extras', nombre: 'Gestionar Turnos Extras', descripcion: 'Permite gestionar turnos extras', categoria: 'Turnos' },
      
      // Documentos
      { codigo: 'documentos.ver', nombre: 'Ver Documentos', descripcion: 'Permite ver documentos', categoria: 'Documentos' },
      { codigo: 'documentos.subir', nombre: 'Subir Documentos', descripcion: 'Permite subir nuevos documentos', categoria: 'Documentos' },
      { codigo: 'documentos.eliminar', nombre: 'Eliminar Documentos', descripcion: 'Permite eliminar documentos', categoria: 'Documentos' },
      
      // Sueldos
      { codigo: 'sueldos.ver', nombre: 'Ver Sueldos', descripcion: 'Permite ver información de sueldos', categoria: 'Sueldos' },
      { codigo: 'sueldos.calcular', nombre: 'Calcular Sueldos', descripcion: 'Permite calcular sueldos', categoria: 'Sueldos' },
      { codigo: 'sueldos.aprobar', nombre: 'Aprobar Sueldos', descripcion: 'Permite aprobar cálculos de sueldos', categoria: 'Sueldos' },
      { codigo: 'sueldos.exportar', nombre: 'Exportar Sueldos', descripcion: 'Permite exportar información de sueldos', categoria: 'Sueldos' },
      
      // Configuración
      { codigo: 'configuracion.ver', nombre: 'Ver Configuración', descripcion: 'Permite ver la configuración del sistema', categoria: 'Configuración' },
      { codigo: 'configuracion.editar', nombre: 'Editar Configuración', descripcion: 'Permite editar la configuración del sistema', categoria: 'Configuración' },
    ];

    // Primero, agregar la columna categoria si no existe
    await sql`
      ALTER TABLE rbac_permisos 
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(100)
    `.catch(() => {
      // Si ya existe, ignorar el error
    });

    // Insertar permisos
    for (const permiso of permisos) {
      try {
        await sql`
          INSERT INTO rbac_permisos (codigo, nombre, descripcion, categoria)
          VALUES (${permiso.codigo}, ${permiso.nombre}, ${permiso.descripcion}, ${permiso.categoria})
          ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            categoria = EXCLUDED.categoria
        `;
        console.log(`✅ Permiso creado/actualizado: ${permiso.codigo}`);
      } catch (error: any) {
        console.log(`⚠️  Error con permiso ${permiso.codigo}:`, error.message);
      }
    }

    // Crear algunos roles básicos
    const roles = [
      { codigo: 'admin-sistema', nombre: 'Administrador del Sistema', descripcion: 'Rol con todos los permisos del sistema' },
      { codigo: 'supervisor', nombre: 'Supervisor', descripcion: 'Rol con permisos de supervisión' },
      { codigo: 'operador', nombre: 'Operador', descripcion: 'Rol con permisos básicos de operación' },
      { codigo: 'guardia', nombre: 'Guardia', descripcion: 'Rol para guardias con permisos limitados' },
    ];

    // Agregar columnas faltantes a rbac_roles si no existen
    await sql`
      ALTER TABLE rbac_roles 
      ADD COLUMN IF NOT EXISTS es_sistema BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE
    `.catch(() => {
      // Si ya existen, ignorar el error
    });

    for (const rol of roles) {
      try {
        await sql`
          INSERT INTO rbac_roles (codigo, nombre, descripcion, es_sistema, activo)
          VALUES (${rol.codigo}, ${rol.nombre}, ${rol.descripcion}, ${rol.codigo === 'admin-sistema'}, true)
          ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion
        `;
        console.log(`✅ Rol creado/actualizado: ${rol.codigo}`);
      } catch (error: any) {
        console.log(`⚠️  Error con rol ${rol.codigo}:`, error.message);
      }
    }

    // Asignar todos los permisos al rol admin-sistema
    console.log('\n📝 Asignando permisos al rol admin-sistema...');
    for (const permiso of permisos) {
      try {
        await sql`
          INSERT INTO rbac_roles_permisos (rol_codigo, permiso_cod, granted)
          VALUES ('admin-sistema', ${permiso.codigo}, true)
          ON CONFLICT (rol_codigo, permiso_cod) DO UPDATE SET
            granted = true
        `;
      } catch (error: any) {
        // Intentar sin ON CONFLICT si falla
        try {
          await sql`
            DELETE FROM rbac_roles_permisos 
            WHERE rol_codigo = 'admin-sistema' AND permiso_cod = ${permiso.codigo}
          `;
          await sql`
            INSERT INTO rbac_roles_permisos (rol_codigo, permiso_cod, granted)
            VALUES ('admin-sistema', ${permiso.codigo}, true)
          `;
        } catch (e) {
          console.log(`⚠️  No se pudo asignar permiso ${permiso.codigo} al rol admin-sistema`);
        }
      }
    }
    console.log('✅ Permisos asignados al rol admin-sistema');

    // Verificar que carlos.irigoyen@gard.cl tiene el rol admin-sistema
    const usuario = await sql`
      SELECT id, email, nombre FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (usuario.rows.length > 0) {
      const userId = usuario.rows[0].id;
      
      // Verificar si ya tiene el rol
      const tieneRol = await sql`
        SELECT 1 FROM rbac_usuarios_roles 
        WHERE usuario_ref = ${userId} AND rol_codigo = 'admin-sistema'
      `;
      
      if (tieneRol.rows.length === 0) {
        await sql`
          INSERT INTO rbac_usuarios_roles (usuario_ref, rol_codigo)
          VALUES (${userId}, 'admin-sistema')
        `;
        console.log(`\n✅ Rol admin-sistema asignado a ${usuario.rows[0].email}`);
      } else {
        console.log(`\nℹ️  ${usuario.rows[0].email} ya tiene el rol admin-sistema`);
      }
      
      // Verificar que la función funciona correctamente
      const test = await sql`
        SELECT fn_usuario_tiene_permiso(${userId}::uuid, 'rbac.admin') as tiene_permiso
      `;
      console.log(`\n🔍 Verificación: ${usuario.rows[0].email} tiene permiso rbac.admin:`, test.rows[0].tiene_permiso);
    }

    console.log('\n🎉 ¡Población de permisos completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populatePermissions();
