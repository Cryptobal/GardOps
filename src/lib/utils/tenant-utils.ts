import { NextRequest } from 'next/server';
import { getTenantFromRequest } from '@/lib/middleware/tenant-middleware';
import { logger } from '@/lib/utils/logger';

/**
 * Manager centralizado para manejo de tenants
 * Patrón Singleton para mantener consistencia
 */
export class TenantManager {
  private static instance: TenantManager;
  private currentTenant: string | null = null;
  
  private constructor() {}
  
  static getInstance(): TenantManager {
    if (!TenantManager.instance) {
      TenantManager.instance = new TenantManager();
    }
    return TenantManager.instance;
  }
  
  /**
   * Obtiene el tenant actual del request
   */
  async getCurrentTenant(request?: NextRequest): Promise<string> {
    if (request) {
      const tenantId = await getTenantFromRequest(request);
      this.currentTenant = tenantId;
      return tenantId;
    }
    
    if (this.currentTenant) {
      return this.currentTenant;
    }
    
    // Fallback al tenant principal (Gard)
    const defaultTenant = '1397e653-a702-4020-9702-3ae4f3f8b337';
    this.currentTenant = defaultTenant;
    logger.debug('🔍 Usando tenant por defecto:', defaultTenant);
    return defaultTenant;
  }
  
  /**
   * Establece el tenant actual (útil para testing)
   */
  setCurrentTenant(tenantId: string): void {
    this.currentTenant = tenantId;
    logger.debug('🔍 Tenant establecido:', tenantId);
  }
  
  /**
   * Limpia el tenant actual (útil para testing)
   */
  clearCurrentTenant(): void {
    this.currentTenant = null;
    logger.debug('🔍 Tenant limpiado');
  }
  
  /**
   * Obtiene el tenant por defecto (Gard)
   */
  getDefaultTenant(): string {
    return '1397e653-a702-4020-9702-3ae4f3f8b337';
  }
}

/**
 * Función de conveniencia para obtener tenant rápidamente
 */
export async function getTenantId(request?: NextRequest): Promise<string> {
  return await TenantManager.getInstance().getCurrentTenant(request);
}

/**
 * Función de conveniencia para obtener tenant por defecto
 */
export function getDefaultTenantId(): string {
  return TenantManager.getInstance().getDefaultTenant();
}
