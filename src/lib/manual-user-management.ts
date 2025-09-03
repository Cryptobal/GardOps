/**
 * SISTEMA MANUAL DE GESTIÓN DE USUARIOS
 * Sin automatismos, sin scripts que se ejecuten solos
 * Solo funciones simples para gestión manual
 */

import { sql } from '@vercel/postgres';

export interface UserData {
  email: string;
  nombre: string;
  apellido: string;
  password: string;
  roleName: string;
}

export interface ManualResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Crear usuario manualmente (solo cuando se llama explícitamente)
 */
export async function createUserManually(userData: UserData, tenantId: string): Promise<ManualResult> {
  try {
    const salt = 'gardops-salt-2024';
    const hashedPassword = Buffer.from(userData.password + salt).toString('base64');
    
    // 1. Crear usuario
    const userResult = await sql`
      INSERT INTO usuarios (id, email, nombre, apellido, password, activo, tenant_id, fecha_creacion)
      VALUES (
        gen_random_uuid(),
        ${userData.email},
        ${userData.nombre},
        ${userData.apellido},
        ${hashedPassword},
        true,
        ${tenantId},
        NOW()
      )
      RETURNING id, email
    `;
    
    const userId = userResult.rows[0].id;
    
    // 2. Asignar rol si se especifica
    if (userData.roleName) {
      const roleResult = await sql`
        SELECT id FROM roles 
        WHERE nombre = ${userData.roleName} AND tenant_id = ${tenantId}
      `;
      
      if (roleResult.rows.length > 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${userId}, ${roleResult.rows[0].id})
        `;
      }
    }
    
    return {
      success: true,
      message: `Usuario ${userData.email} creado exitosamente`,
      data: { userId, email: userData.email, rol: userData.roleName }
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Error creando usuario',
      error: error.message
    };
  }
}

/**
 * Obtener estado actual de usuarios (solo lectura)
 */
export async function getCurrentUsersState(): Promise<ManualResult> {
  try {
    const users = await sql`
      SELECT 
        u.email, 
        u.nombre, 
        u.apellido,
        u.activo,
        r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      ORDER BY u.email
    `;
    
    return {
      success: true,
      message: `${users.rows.length} usuarios encontrados`,
      data: users.rows
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Error consultando usuarios',
      error: error.message
    };
  }
}

/**
 * Limpiar relaciones huérfanas (solo cuando se llama explícitamente)
 */
export async function cleanOrphansManually(): Promise<ManualResult> {
  try {
    // Solo eliminar relaciones huérfanas, no usuarios
    const orphans = await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id NOT IN (SELECT id FROM usuarios)
      OR rol_id NOT IN (SELECT id FROM roles)
      RETURNING usuario_id
    `;
    
    return {
      success: true,
      message: `${orphans.rows.length} relaciones huérfanas eliminadas`,
      data: { orphansRemoved: orphans.rows.length }
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Error limpiando relaciones huérfanas',
      error: error.message
    };
  }
}
