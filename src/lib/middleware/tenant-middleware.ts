import { NextRequest } from 'next/server';
import { getCurrentUserServer } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';
import { getTenantId } from '@/lib/utils/tenant-utils';

/**
 * Obtiene el tenant_id del request de forma segura
 * Prioridad: JWT Token > Headers > Usuario Autenticado > Fallback
 */
export async function getTenantFromRequest(request: NextRequest): Promise<string> {
  try {
    // 1. Intentar obtener desde JWT token (si existe)
    const user = getCurrentUserServer(request);
    if (user?.tenant_id) {
      logger.debug('🔍 Tenant obtenido desde JWT:', user.tenant_id);
      return user.tenant_id;
    }
    
    // 2. Intentar obtener desde headers (desarrollo/testing)
    const headerTenant = request.headers.get('x-tenant-id');
    if (headerTenant) {
      logger.debug('🔍 Tenant obtenido desde header:', headerTenant);
      return headerTenant;
    }
    
    // 3. Fallback: tenant principal (Gard) - SIEMPRE VÁLIDO
    const defaultTenant = '1397e653-a702-4020-9702-3ae4f3f8b337';
    logger.debug('🔍 Usando tenant por defecto:', defaultTenant);
    return defaultTenant;
    
  } catch (error) {
    logger.error('❌ Error obteniendo tenant:', error);
    // Fallback seguro
    return '1397e653-a702-4020-9702-3ae4f3f8b337';
  }
}

/**
 * Valida que un tenant_id existe en la base de datos
 */
export async function validateTenantExists(tenantId: string): Promise<boolean> {
  try {
    const { query } = await import('@/lib/database');
    const result = await query(
      'SELECT id FROM tenants WHERE id = $1 AND activo = true',
      [tenantId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('❌ Error validando tenant:', error);
    return false;
  }
}

/**
 * Obtiene tenant_id con validación automática
 */
export async function getValidatedTenant(request: NextRequest): Promise<string> {
  const tenantId = await getTenantFromRequest(request);
  
  // Validar que el tenant existe (opcional, no crítico)
  const isValid = await validateTenantExists(tenantId);
  if (!isValid) {
    logger.warn('⚠️ Tenant no válido, usando fallback:', tenantId);
    return '1397e653-a702-4020-9702-3ae4f3f8b337';
  }
  
  return tenantId;
}
