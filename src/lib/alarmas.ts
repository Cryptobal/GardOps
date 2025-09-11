import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';

export interface AlarmaData {
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: any;
}

export interface CrearAlarmaParams {
  tenantId: string;
  usuarioId: string;
  alarma: AlarmaData;
}

// Función para crear una alarma/notificación
export async function crearAlarma({ tenantId, usuarioId, alarma }: CrearAlarmaParams) {
  const client = await getClient();
  
  try {
    const insertQuery = `
      INSERT INTO notificaciones (
        tenant_id, usuario_id, tipo, titulo, mensaje, datos
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;

    const result = await client.query(insertQuery, [
      tenantId,
      usuarioId,
      alarma.tipo,
      alarma.titulo,
      alarma.mensaje,
      JSON.stringify(alarma.datos || {})
    ]);

    const notificacion = result.rows[0];
    
    devLogger.success(`🔔 Alarma creada: ${alarma.tipo} - ${notificacion.id}`);

    return {
      success: true,
      notificacion: {
        id: notificacion.id,
        created_at: notificacion.created_at
      }
    };

  } catch (error: any) {
    logger.error('❌ Error creando alarma:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release?.();
  }
}

// Función específica para alarmas de nuevos guardias
export async function crearAlarmaNuevoGuardia(
  tenantId: string, 
  usuarioId: string, 
  guardiaData: { id: string; nombre: string; apellido: string; email?: string }
) {
  return await crearAlarma({
    tenantId,
    usuarioId,
    alarma: {
      tipo: 'nuevo_guardia_manual',
      titulo: 'Nuevo Guardia Registrado',
      mensaje: `Se ha registrado ${guardiaData.nombre} ${guardiaData.apellido} como nuevo guardia${guardiaData.email ? ` (${guardiaData.email})` : ''}`,
      datos: {
        guardia_id: guardiaData.id,
        urls: {
          ficha_guardia: `/guardias/${guardiaData.id}`
        }
      }
    }
  });
}

// Función específica para alarmas de postulaciones
export async function crearAlarmaNuevaPostulacion(
  tenantId: string, 
  usuarioId: string, 
  guardiaData: { id: string; nombre: string; apellido: string; email?: string }
) {
  return await crearAlarma({
    tenantId,
    usuarioId,
    alarma: {
      tipo: 'nueva_postulacion',
      titulo: 'Nueva Postulación Recibida',
      mensaje: `Nueva postulación de ${guardiaData.nombre} ${guardiaData.apellido}${guardiaData.email ? ` (${guardiaData.email})` : ''}`,
      datos: {
        guardia_id: guardiaData.id,
        urls: {
          ficha_guardia: `/guardias/${guardiaData.id}`
        }
      }
    }
  });
}

// Función específica para alarmas de guardias actualizados
export async function crearAlarmaGuardiaActualizado(
  tenantId: string, 
  usuarioId: string, 
  guardiaData: { id: string; nombre: string; apellido: string; cambios: string[] }
) {
  return await crearAlarma({
    tenantId,
    usuarioId,
    alarma: {
      tipo: 'guardia_actualizado',
      titulo: 'Guardia Actualizado',
      mensaje: `Se actualizó la información de ${guardiaData.nombre} ${guardiaData.apellido}. Cambios: ${guardiaData.cambios.join(', ')}`,
      datos: {
        guardia_id: guardiaData.id,
        cambios: guardiaData.cambios,
        urls: {
          ficha_guardia: `/guardias/${guardiaData.id}`
        }
      }
    }
  });
}
