import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

/**
 * SISTEMA DE PROTECCIÓN RBAC
 * Previene inconsistencias y limpia relaciones huérfanas automáticamente
 */

import { sql } from '@vercel/postgres';

export interface RBACProtectionResult {
  success: boolean;
  orphansRemoved: number;
  inconsistenciesFixed: number;
  warnings: string[];
}

/**
 * Limpia relaciones huérfanas en usuarios_roles
 * Se ejecuta automáticamente antes de operaciones críticas
 */
export async function cleanOrphanedRelations(): Promise<RBACProtectionResult> {
  const result: RBACProtectionResult = {
    success: false,
    orphansRemoved: 0,
    inconsistenciesFixed: 0,
    warnings: []
  };

  try {
    logger.debug('🛡️ [RBAC Protection] Iniciando limpieza de relaciones huérfanas...');

    // 1. Eliminar relaciones donde el usuario no existe
    const orphanedUsers = await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id NOT IN (
        SELECT id FROM usuarios
      )
      RETURNING usuario_id
    `;

    result.orphansRemoved = orphanedUsers.rows.length;
    if (result.orphansRemoved > 0) {
      console.log(`🛡️ [RBAC Protection] Eliminadas ${result.orphansRemoved} relaciones huérfanas (usuarios inexistentes)`);
      result.warnings.push(`Eliminadas ${result.orphansRemoved} relaciones huérfanas de usuarios inexistentes`);
    }

    // 2. Eliminar relaciones donde el rol no existe
    const orphanedRoles = await sql`
      DELETE FROM usuarios_roles 
      WHERE rol_id NOT IN (
        SELECT id FROM roles
      )
      RETURNING rol_id
    `;

    if (orphanedRoles.rows.length > 0) {
      logger.debug(`🛡️ [RBAC Protection] Eliminadas ${orphanedRoles.rows.length} relaciones con roles inexistentes`);
      result.warnings.push(`Eliminadas ${orphanedRoles.rows.length} relaciones con roles inexistentes`);
      result.orphansRemoved += orphanedRoles.rows.length;
    }

    // 3. Verificar usuarios sin rol que deberían tenerlo
    const usersWithoutRole = await sql`
      SELECT u.id, u.email, u.nombre
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      WHERE ur.usuario_id IS NULL
    `;

    if (usersWithoutRole.rows.length > 0) {
      result.warnings.push(`${usersWithoutRole.rows.length} usuarios sin rol asignado`);
      logger.debug(`🛡️ [RBAC Protection] Advertencia: ${usersWithoutRole.rows.length} usuarios sin rol:`);
      usersWithoutRole.rows.forEach(u => {
        console.log(`   - ${u.email} (${u.nombre})`);
      });
    }

    result.success = true;
    logger.debug('🛡️ [RBAC Protection] Limpieza completada exitosamente');

  } catch (error) {
    console.error('🛡️ [RBAC Protection] Error durante la limpieza:', error);
    result.warnings.push(`Error durante la limpieza: ${error}`);
  }

  return result;
}

/**
 * Valida la consistencia del sistema RBAC
 */
export async function validateRBACConsistency(): Promise<RBACProtectionResult> {
  const result: RBACProtectionResult = {
    success: false,
    orphansRemoved: 0,
    inconsistenciesFixed: 0,
    warnings: []
  };

  try {
    logger.debug('🛡️ [RBAC Protection] Validando consistencia del sistema...');

    // 1. Verificar integridad referencial
    const integridadUsuarios = await sql`
      SELECT COUNT(*) as count
      FROM usuarios_roles ur
      WHERE ur.usuario_id NOT IN (SELECT id FROM usuarios)
    `;

    const integridadRoles = await sql`
      SELECT COUNT(*) as count
      FROM usuarios_roles ur
      WHERE ur.rol_id NOT IN (SELECT id FROM roles)
    `;

    if (integridadUsuarios.rows[0].count > 0) {
      result.warnings.push(`${integridadUsuarios.rows[0].count} relaciones con usuarios inexistentes`);
    }

    if (integridadRoles.rows[0].count > 0) {
      result.warnings.push(`${integridadRoles.rows[0].count} relaciones con roles inexistentes`);
    }

    // 2. Verificar duplicados
    const duplicados = await sql`
      SELECT usuario_id, rol_id, COUNT(*) as count
      FROM usuarios_roles
      GROUP BY usuario_id, rol_id
      HAVING COUNT(*) > 1
    `;

    if (duplicados.rows.length > 0) {
      result.warnings.push(`${duplicados.rows.length} relaciones duplicadas encontradas`);
      
      // Eliminar duplicados
      await sql`
        DELETE FROM usuarios_roles 
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM usuarios_roles
          GROUP BY usuario_id, rol_id
        )
      `;
      result.inconsistenciesFixed += duplicados.rows.length;
    }

    result.success = result.warnings.length === 0;
    logger.debug(`🛡️ [RBAC Protection] Validación completada. Inconsistencias: ${result.warnings.length}`);

  } catch (error) {
    console.error('🛡️ [RBAC Protection] Error durante la validación:', error);
    result.warnings.push(`Error durante la validación: ${error}`);
  }

  return result;
}

/**
 * Protección automática que se ejecuta antes de operaciones críticas
 */
export async function autoProtectRBAC(): Promise<void> {
  try {
    const cleanResult = await cleanOrphanedRelations();
    const validateResult = await validateRBACConsistency();

    if (!cleanResult.success || !validateResult.success) {
      logger.warn('🛡️ [RBAC Protection] Se encontraron inconsistencias que requieren atención manual');
    }
  } catch (error) {
    console.error('🛡️ [RBAC Protection] Error en protección automática:', error);
  }
}
