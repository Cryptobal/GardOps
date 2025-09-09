import { NextRequest, NextResponse } from 'next/server';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: NextRequest) {
  try {
    logger.debug('🔧 Restaurando sistema RBAC...');
    
    const { sql } = await import('@vercel/postgres');
    
    // 1. Crear la vista v_check_permiso que falta
    logger.debug('📋 Creando vista v_check_permiso...');
    try {
      await sql`
        CREATE OR REPLACE VIEW v_check_permiso AS
        SELECT
            u.email,
            p.clave AS permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.activo = TRUE OR u.activo IS NULL
      `;
      logger.debug('✅ Vista v_check_permiso creada/actualizada');
    } catch (error) {
      logger.debug('❌ Error creando vista v_check_permiso:', error);
    }

    // 2. Crear la vista v_usuarios_permisos
    logger.debug('📋 Creando vista v_usuarios_permisos...');
    try {
      await sql`
        CREATE OR REPLACE VIEW v_usuarios_permisos AS
        SELECT
            u.id as usuario_id,
            u.email,
            u.nombre,
            u.apellido,
            r.nombre as rol,
            p.clave as permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.activo = TRUE OR u.activo IS NULL
      `;
      logger.debug('✅ Vista v_usuarios_permisos creada/actualizada');
    } catch (error) {
      logger.debug('❌ Error creando vista v_usuarios_permisos:', error);
    }

    // 3. Verificar que el usuario admin tenga todos los permisos necesarios
    logger.debug('🔐 Verificando permisos del admin...');
    const adminUser = await sql`
      SELECT id, email, rol FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1
    `;
    
    if (adminUser.rows.length > 0) {
      const admin = adminUser.rows[0];
      devLogger.success(' Usuario admin encontrado:', admin);
      
      // 4. Asegurar que tenga el rol admin
      if (admin.rol !== 'admin') {
        logger.debug('🔄 Actualizando rol del admin...');
        await sql`
          UPDATE usuarios SET rol = 'admin' WHERE email = 'carlos.irigoyen@gard.cl'
        `;
        logger.debug('✅ Rol del admin actualizado');
      }
      
      // 5. Crear permisos básicos si no existen
      logger.debug('🔑 Creando permisos básicos...');
      const permisosBasicos = [
        'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
        'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
        'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete'
      ];
      
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
      
      // 6. Asignar todos los permisos al rol admin
      logger.debug('🔗 Asignando permisos al rol admin...');
      try {
        // Obtener el rol admin
        const adminRole = await sql`
          SELECT id FROM roles WHERE nombre = 'admin' OR nombre = 'Administrador' LIMIT 1
        `;
        
        if (adminRole.rows.length > 0) {
          const roleId = adminRole.rows[0].id;
          
          // Obtener todos los permisos
          const allPermisos = await sql`SELECT id FROM permisos`;
          
          for (const perm of allPermisos.rows) {
            try {
              // Verificar si ya está asignado
              const alreadyAssigned = await sql`
                SELECT id FROM roles_permisos WHERE rol_id = ${roleId} AND permiso_id = ${perm.id} LIMIT 1
              `;
              
              if (alreadyAssigned.rows.length === 0) {
                // Asignar el permiso
                await sql`
                  INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (${roleId}, ${perm.id})
                `;
                logger.debug(`✅ Permiso ${perm.id} asignado al rol admin`);
              }
            } catch (error) {
              logger.debug(`⚠️ Error asignando permiso ${perm.id}:`, error);
            }
          }
        }
      } catch (error) {
        logger.debug('❌ Error asignando permisos al rol:', error);
      }
    }
    
    logger.debug('✅ Sistema RBAC restaurado exitosamente');
    
    return NextResponse.json({
      success: true,
      message: 'Sistema RBAC restaurado exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error restaurando sistema RBAC:', error);
    return NextResponse.json({
      success: false,
      error: 'Error restaurando sistema RBAC',
      details: error.message
    }, { status: 500 });
  }
}
