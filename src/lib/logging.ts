// Función de logging centralizada para cualquier módulo
import { query } from '@/lib/database';

export type OperacionCRUD = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
export type TipoLog = 'manual' | 'api' | 'sistema';

export interface LogContext {
  operacion: OperacionCRUD;
  datos_anteriores?: any;
  datos_nuevos?: any;
  timestamp: string;
  endpoint?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Función centralizada para registrar logs de operaciones CRUD
 * @param modulo - Nombre del módulo (ej: 'guardias', 'pauta_mensual')
 * @param entidadId - ID de la entidad afectada
 * @param operacion - Tipo de operación (CREATE, READ, UPDATE, DELETE)
 * @param usuario - Usuario que realiza la acción
 * @param datosAnteriores - Datos anteriores (para UPDATE/DELETE)
 * @param datosNuevos - Datos nuevos (para CREATE/UPDATE)
 * @param tenantId - ID del tenant (opcional)
 * @param tipo - Tipo de log (manual, api, sistema)
 * @param contextoAdicional - Contexto adicional opcional
 */
export async function logCRUD(
  modulo: string,
  entidadId: string,
  operacion: OperacionCRUD,
  usuario: string,
  datosAnteriores?: any,
  datosNuevos?: any,
  tenantId?: string,
  tipo: TipoLog = 'api',
  contextoAdicional?: Record<string, any>
) {
  try {
    const accion = `${operacion} ${modulo}`;
    const contexto: LogContext = {
      operacion,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datosNuevos,
      timestamp: new Date().toISOString(),
      ...contextoAdicional
    };

    const tabla = `logs_${modulo}`;
    // Mapear el nombre del módulo al nombre correcto de la columna ID
    const idCampoMap: { [key: string]: string } = {
      'guardias': 'guardia_id',
      'instalaciones': 'instalacion_id',
      'clientes': 'cliente_id',
      'pauta_mensual': 'pauta_mensual_id',
      'pauta_diaria': 'pauta_diaria_id',
      'turnos_extras': 'turno_extra_id',
      'puestos_operativos': 'puesto_operativo_id',
      'documentos': 'documento_id',
      'usuarios': 'usuario_id'
    };
    const idCampo = idCampoMap[modulo] || `${modulo}_id`;

    await query(
      `
      INSERT INTO ${tabla} (${idCampo}, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
    `,
      [
        entidadId,
        accion,
        usuario,
        tipo,
        JSON.stringify(contexto),
        datosAnteriores ? JSON.stringify(datosAnteriores) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
        tenantId,
      ]
    );

    console.log(`📝 Log registrado: ${accion} por ${usuario} en ${tabla}`);
  } catch (error) {
    console.error('❌ Error al registrar log:', error);
    // No lanzamos el error para no interrumpir la operación principal
  }
}

/**
 * Función específica para logs de creación
 */
export async function logCreate(
  modulo: string,
  entidadId: string,
  usuario: string,
  datosNuevos: any,
  tenantId?: string,
  tipo: TipoLog = 'api'
) {
  return logCRUD(modulo, entidadId, 'CREATE', usuario, undefined, datosNuevos, tenantId, tipo);
}

/**
 * Función específica para logs de lectura
 */
export async function logRead(
  modulo: string,
  entidadId: string,
  usuario: string,
  tenantId?: string,
  tipo: TipoLog = 'api'
) {
  return logCRUD(modulo, entidadId, 'READ', usuario, undefined, undefined, tenantId, tipo);
}

/**
 * Función específica para logs de actualización
 */
export async function logUpdate(
  modulo: string,
  entidadId: string,
  usuario: string,
  datosAnteriores: any,
  datosNuevos: any,
  tenantId?: string,
  tipo: TipoLog = 'api'
) {
  return logCRUD(modulo, entidadId, 'UPDATE', usuario, datosAnteriores, datosNuevos, tenantId, tipo);
}

/**
 * Función específica para logs de eliminación
 */
export async function logDelete(
  modulo: string,
  entidadId: string,
  usuario: string,
  datosAnteriores: any,
  tenantId?: string,
  tipo: TipoLog = 'api'
) {
  return logCRUD(modulo, entidadId, 'DELETE', usuario, datosAnteriores, undefined, tenantId, tipo);
}

/**
 * Función para logs de sistema (automáticos)
 */
export async function logSistema(
  modulo: string,
  entidadId: string,
  accion: string,
  contexto: any,
  tenantId?: string
) {
  try {
    const tabla = `logs_${modulo}`;
    const idCampo = `${modulo}_id`;

    await query(
      `
      INSERT INTO ${tabla} (${idCampo}, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
    `,
      [
        entidadId,
        accion,
        'SISTEMA',
        'sistema',
        JSON.stringify(contexto),
        null,
        null,
        tenantId,
      ]
    );

    console.log(`🤖 Log de sistema: ${accion} en ${tabla}`);
  } catch (error) {
    console.error('❌ Error al registrar log de sistema:', error);
  }
}

/**
 * Función para logs de errores
 */
export async function logError(
  modulo: string,
  entidadId: string,
  usuario: string,
  error: any,
  contexto?: any,
  tenantId?: string
) {
  try {
    const tabla = `logs_${modulo}`;
    const idCampo = `${modulo}_id`;

    const contextoError = {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...contexto
    };

    await query(
      `
      INSERT INTO ${tabla} (${idCampo}, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
    `,
      [
        entidadId,
        'ERROR',
        usuario,
        'sistema',
        JSON.stringify(contextoError),
        null,
        null,
        tenantId,
      ]
    );

    console.log(`🚨 Log de error registrado en ${tabla}`);
  } catch (logError) {
    console.error('❌ Error al registrar log de error:', logError);
  }
} 