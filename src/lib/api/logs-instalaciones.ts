import { query } from '../database';

// Interfaz para logs de instalaciones
export interface LogInstalacion {
  id: string;
  instalacion_id: string;
  tipo_evento: string;
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id?: string;
  usuario_nombre?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

// Obtener usuario actual (simulado para este ejemplo)
export async function obtenerUsuarioActual(): Promise<{ id: string; nombre: string }> {
  // En una aplicación real, esto vendría del contexto de autenticación
  return {
    id: "sistema",
    nombre: "Sistema"
  };
}

// Función auxiliar para registrar eventos en logs
async function registrarLog(
  instalacionId: string,
  tipoEvento: string,
  descripcion: string,
  datosAnteriores?: any,
  datosNuevos?: any
): Promise<void> {
  try {
    const usuario = await obtenerUsuarioActual();
    
    await query(`
      INSERT INTO logs_instalaciones (
        instalacion_id,
        tipo_evento,
        descripcion,
        datos_anteriores,
        datos_nuevos,
        usuario_id,
        usuario_nombre,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      instalacionId,
      tipoEvento,
      descripcion,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
      usuario.id,
      usuario.nombre
    ]);
  } catch (error) {
    console.error('❌ Error registrando log de instalación:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
}

// Obtener logs de una instalación
export async function obtenerLogsInstalacion(instalacionId: string): Promise<LogInstalacion[]> {
  try {
    const result = await query(`
      SELECT 
        id,
        instalacion_id,
        tipo_evento,
        descripcion,
        datos_anteriores,
        datos_nuevos,
        usuario_id,
        usuario_nombre,
        ip_address,
        user_agent,
        timestamp
      FROM logs_instalaciones
      WHERE instalacion_id = $1
      ORDER BY timestamp DESC
      LIMIT 100
    `, [instalacionId]);
    
    return result.rows.map((row: any) => ({
      ...row,
      datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
      datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
    }));
  } catch (error) {
    console.error('❌ Error obteniendo logs de instalación:', error);
    throw new Error('Error al obtener logs de instalación');
  }
}

// Logs específicos para eventos de instalaciones

export async function logInstalacionCreada(instalacionId: string, nombre: string): Promise<void> {
  await registrarLog(
    instalacionId,
    'INSTALACION_CREADA',
    `Instalación "${nombre}" creada correctamente`,
    null,
    { nombre, estado: 'Activo' }
  );
}

export async function logEdicionDatos(
  instalacionId: string,
  descripcion: string,
  datosAnteriores?: any,
  datosNuevos?: any
): Promise<void> {
  await registrarLog(
    instalacionId,
    'DATOS_EDITADOS',
    descripcion,
    datosAnteriores,
    datosNuevos
  );
}

export async function logCambioEstado(
  instalacionId: string,
  nuevoEstado: string,
  estadoAnterior: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'CAMBIO_ESTADO',
    `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}"`,
    { estado: estadoAnterior },
    { estado: nuevoEstado }
  );
}

export async function logDocumentoSubido(
  instalacionId: string,
  nombreDocumento: string,
  tipoDocumento: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'DOCUMENTO_SUBIDO',
    `Documento "${nombreDocumento}" de tipo "${tipoDocumento}" subido`,
    null,
    { nombre_documento: nombreDocumento, tipo_documento: tipoDocumento }
  );
}

export async function logDocumentoEliminado(
  instalacionId: string,
  nombreDocumento: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'DOCUMENTO_ELIMINADO',
    `Documento "${nombreDocumento}" eliminado`,
    null,
    { nombre_documento: nombreDocumento }
  );
}

export async function logGuardiaAsignado(
  instalacionId: string,
  nombreGuardia: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'GUARDIA_ASIGNADO',
    `Guardia "${nombreGuardia}" asignado a la instalación`,
    null,
    { nombre_guardia: nombreGuardia }
  );
}

export async function logGuardiaRemovido(
  instalacionId: string,
  nombreGuardia: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'GUARDIA_REMOVIDO',
    `Guardia "${nombreGuardia}" removido de la instalación`,
    null,
    { nombre_guardia: nombreGuardia }
  );
}

export async function logPuestoCreado(
  instalacionId: string,
  nombrePuesto: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'PUESTO_CREADO',
    `Puesto operativo "${nombrePuesto}" creado`,
    null,
    { nombre_puesto: nombrePuesto }
  );
}

export async function logPuestoActualizado(
  instalacionId: string,
  nombrePuesto: string,
  cambios: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'PUESTO_ACTUALIZADO',
    `Puesto "${nombrePuesto}" actualizado: ${cambios}`,
    null,
    { nombre_puesto: nombrePuesto, cambios }
  );
}

export async function logAlertaGenerada(
  instalacionId: string,
  tipoAlerta: string,
  descripcion: string
): Promise<void> {
  await registrarLog(
    instalacionId,
    'ALERTA_GENERADA',
    `Alerta generada: ${descripcion}`,
    null,
    { tipo_alerta: tipoAlerta, descripcion }
  );
}