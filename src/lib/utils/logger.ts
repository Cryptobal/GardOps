/**
 * Sistema de logging controlado por ambiente para GardOps
 * Elimina logs de debug en producción manteniendo logs críticos
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Tipos de log permitidos en producción
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configuración de logs por ambiente
const LOG_CONFIG = {
  development: {
    debug: true,
    info: true,
    warn: true,
    error: true,
  },
  production: {
    debug: false, // 🔴 ELIMINADO EN PRODUCCIÓN
    info: false,  // 🔴 ELIMINADO EN PRODUCCIÓN
    warn: true,   // ✅ MANTENIDO EN PRODUCCIÓN
    error: true,  // ✅ MANTENIDO EN PRODUCCIÓN
  }
};

const currentConfig = isProduction ? LOG_CONFIG.production : LOG_CONFIG.development;

/**
 * Logger principal - Reemplaza console.log en toda la aplicación
 */
export const logger = {
  /**
   * Logs de debug - ELIMINADOS EN PRODUCCIÓN
   * Usar para: estado de variables, flujo de aplicación, debugging
   */
  debug: (...args: any[]) => {
    if (currentConfig.debug) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Logs informativos - ELIMINADOS EN PRODUCCIÓN
   * Usar para: información general no crítica
   */
  info: (...args: any[]) => {
    if (currentConfig.info) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Advertencias - MANTENIDAS EN PRODUCCIÓN
   * Usar para: situaciones que requieren atención pero no son errores
   */
  warn: (...args: any[]) => {
    if (currentConfig.warn) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Errores - MANTENIDOS EN PRODUCCIÓN
   * Usar para: errores críticos, excepciones, fallos de sistema
   */
  error: (...args: any[]) => {
    if (currentConfig.error) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Logs de seguridad - SIEMPRE ACTIVOS
   * Para eventos de seguridad críticos
   */
  security: (...args: any[]) => {
    console.warn('[SECURITY]', ...args);
  }
};

/**
 * Funciones de conveniencia con emojis para desarrollo
 * Se eliminan automáticamente en producción
 */
export const devLogger = {
  search: (...args: any[]) => logger.debug('🔍', ...args),
  process: (...args: any[]) => logger.debug('🔄', ...args),
  success: (...args: any[]) => logger.debug('✅', ...args),
  warning: (...args: any[]) => logger.debug('⚠️', ...args),
  critical: (...args: any[]) => logger.debug('🚨', ...args),
  data: (...args: any[]) => logger.debug('📊', ...args),
  api: (...args: any[]) => logger.debug('🌐', ...args),
  db: (...args: any[]) => logger.debug('🗄️', ...args),
};

/**
 * Logger específico para APIs
 */
export const apiLogger = {
  request: (method: string, url: string, data?: any) => {
    logger.debug(`🌐 ${method} ${url}`, data);
  },
  response: (status: number, url: string, data?: any) => {
    logger.debug(`🌐 ${status} ${url}`, data);
  },
  error: (method: string, url: string, error: any) => {
    logger.error(`🌐 ${method} ${url} ERROR:`, error);
  }
};

/**
 * Función para migración gradual - reemplazar console.log existente
 * @deprecated Usar logger.debug() en su lugar
 */
export const debugLog = (...args: any[]) => {
  logger.debug(...args);
};

/**
 * Función para migración gradual - reemplazar console.error existente
 * @deprecated Usar logger.error() en su lugar
 */
export const errorLog = (...args: any[]) => {
  logger.error(...args);
};

// Exportar como default para facilitar importación
export default logger;
