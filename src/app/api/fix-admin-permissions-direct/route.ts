import { NextRequest, NextResponse } from 'next/server';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: NextRequest) {
  try {
    logger.debug('🔧 Asignando permisos DIRECTAMENTE al admin...');
    
    const { sql } = await import('@vercel/postgres');
    
    // 1. Obtener el usuario admin
    const adminUser = await sql`
      SELECT id, email, rol FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1
    `;
    
    if (adminUser.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Usuario admin no encontrado'
      });
    }
    
    const admin = adminUser.rows[0];
    devLogger.success(' Usuario admin encontrado:', admin);
    
    // 2. Crear permisos básicos si no existen
    const permisosBasicos = [
      'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
      'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
      'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete'
    ];
    
    logger.debug('🔑 Creando permisos básicos...');
    for (const permiso of permisosBasicos) {
      try {
        // Verificar si el permiso existe
        const permExists = await sql`
          SELECT id FROM permisos WHERE clave = ${permiso} LIMIT 1
        `;
        
        if (permExists.rows.length === 0) {
          // Crear el permiso
          await sql`
            INSERT INTO permisos (clave, descripcion) VALUES (${permiso}, ${`Permiso para ${permiso}`})
          `;
          logger.debug(`✅ Permiso ${permiso} creado`);
        }
      } catch (error) {
        logger.debug(`⚠️ Error con permiso ${permiso}:`, error);
      }
    }
    
    // 3. Crear rol admin si no existe
    let adminRoleId;
    const adminRole = await sql`
      SELECT * FROM roles WHERE nombre = 'admin' OR nombre = 'Administrador' LIMIT 1
    `;
    
    if (adminRole.rows.length === 0) {
      // Crear rol admin
      const newRole = await sql`
        INSERT INTO roles (nombre, descripcion) VALUES ('admin', 'Administrador del sistema')
        RETURNING id
      `;
      adminRoleId = newRole.rows[0].id;
      devLogger.success(' Rol admin creado con ID:', adminRoleId);
    } else {
      adminRoleId = adminRole.rows[0].id;
      devLogger.success(' Rol admin existente con ID:', adminRoleId);
    }
    
    // 4. Asignar rol admin al usuario si no lo tiene
    const userRole = await sql`
      SELECT * FROM usuarios_roles WHERE usuario_id = ${admin.id} AND rol_id = ${adminRoleId} LIMIT 1
    `;
    
    if (userRole.rows.length === 0) {
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (${admin.id}, ${adminRoleId})
      `;
      logger.debug('✅ Rol admin asignado al usuario');
    } else {
      logger.debug('✅ Rol admin ya estaba asignado al usuario');
    }
    
    // 5. Asignar TODOS los permisos al rol admin
    logger.debug('🔗 Asignando TODOS los permisos al rol admin...');
    const allPermisos = await sql`SELECT * FROM permisos`;
    
    for (const perm of allPermisos.rows) {
      try {
        // Verificar si ya está asignado
        const alreadyAssigned = await sql`
          SELECT * FROM roles_permisos WHERE rol_id = ${adminRoleId} AND permiso_id = ${perm.id} LIMIT 1
        `;
        
        if (alreadyAssigned.rows.length === 0) {
          // Asignar el permiso
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${adminRoleId}, ${perm.id})
          `;
          logger.debug(`✅ Permiso ${perm.clave} asignado al rol admin`);
        } else {
          logger.debug(`✅ Permiso ${perm.clave} ya estaba asignado`);
        }
      } catch (error) {
        logger.debug(`⚠️ Error asignando permiso ${perm.clave}:`, error);
      }
    }
    
    // 6. Verificar que el usuario tenga el permiso clientes.view
    logger.debug('🔍 Verificando permiso clientes.view...');
    const permCheck = await sql`
      SELECT 
        u.email,
        p.clave,
        CASE WHEN rp.id IS NOT NULL THEN true ELSE false END as tiene_permiso
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles_permisos rp ON rp.rol_id = ur.rol_id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.email = 'carlos.irigoyen@gard.cl' AND p.clave = 'clientes.view'
    `;
    
    devLogger.search(' Resultado de verificación:', permCheck.rows);
    
    // 7. Crear función simple de verificación de permisos
    logger.debug('🔧 Creando función simple de verificación...');
    try {
      await sql`
        CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso_simple(user_email TEXT, permiso_clave TEXT)
        RETURNS BOOLEAN AS $$
        DECLARE
          tiene_permiso BOOLEAN := FALSE;
        BEGIN
          SELECT EXISTS(
            SELECT 1 FROM usuarios u
            JOIN usuarios_roles ur ON ur.usuario_id = u.id
            JOIN roles_permisos rp ON rp.rol_id = ur.rol_id
            JOIN permisos p ON p.id = rp.permiso_id
            WHERE u.email = user_email AND p.clave = permiso_clave
          ) INTO tiene_permiso;
          
          RETURN tiene_permiso;
        END;
        $$ LANGUAGE plpgsql;
      `;
      logger.debug('✅ Función simple de verificación creada');
    } catch (error) {
      logger.warn(' Error creando función simple:', error);
    }
    
    logger.debug('✅ Permisos del admin asignados DIRECTAMENTE');
    
    return NextResponse.json({
      success: true,
      message: 'Permisos del admin asignados DIRECTAMENTE',
      admin: {
        id: admin.id,
        email: admin.email,
        rol: admin.rol
      },
      role_id: adminRoleId,
      permisos_asignados: allPermisos.rows.length,
      verification: permCheck.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error asignando permisos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error asignando permisos',
      details: error.message
    }, { status: 500 });
  }
}
