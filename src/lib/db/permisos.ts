import { query } from '@/lib/database';
import dayjs from 'dayjs';

export async function registrarPermiso({ guardiaId, tipo, desde, hasta }: {
  guardiaId: string;
  tipo: 'licencia' | 'vacaciones' | 'permiso_con_goce' | 'permiso_sin_goce';
  desde: string;
  hasta: string;
}) {
  console.log(`🔧 Registrando permiso ${tipo} para guardia ${guardiaId} desde ${desde} hasta ${hasta}`);

  try {
    // Actualizar o insertar registros en la pauta mensual
    const result = await query(`
      INSERT INTO as_turnos_pauta_mensual (guardia_id, fecha, tipo)
      SELECT $1, generate_series($2::date, $3::date, '1 day'::interval)::date, $4
      ON CONFLICT (guardia_id, fecha) 
      DO UPDATE SET tipo = $4
    `, [guardiaId, desde, hasta, tipo]);

    const diasActualizados = dayjs(hasta).diff(dayjs(desde), 'day') + 1;
    console.log(`✅ Permiso ${tipo} registrado en ${diasActualizados} días`);
    
    return diasActualizados;
  } catch (error) {
    console.error(`❌ Error registrando permiso ${tipo}:`, error);
    throw error;
  }
}

export async function registrarFiniquito({ guardiaId, fecha_termino }: {
  guardiaId: string;
  fecha_termino: string;
}) {
  console.log(`🔧 Registrando finiquito para guardia ${guardiaId} desde ${fecha_termino}`);

  try {
    const fechaDesde = dayjs(fecha_termino).add(1, 'day').format('YYYY-MM-DD');

    // Eliminar turnos futuros de la pauta mensual
    const resultPauta = await query(`
      DELETE FROM as_turnos_pauta_mensual
      WHERE guardia_id = $1 AND fecha >= $2
    `, [guardiaId, fechaDesde]);

    console.log(`✅ Eliminados ${resultPauta.rowCount} registros de pauta mensual`);

    // Obtener turnos que se eliminaron para crear PPCs
    const turnosEliminados = await query(`
      SELECT fecha, instalacion_id, rol_servicio_id
      FROM as_turnos_requisitos
      WHERE guardia_id = $1 AND fecha >= $2
    `, [guardiaId, fechaDesde]);

    // Crear PPCs para cada turno eliminado
    let ppcsCreados = 0;
    for (const turno of turnosEliminados.rows) {
      await query(`
        INSERT INTO as_turnos_ppc (fecha, instalacion_id, rol_servicio_id, prioridad, motivo)
        VALUES ($1, $2, $3, 'alta', 'finiquito')
      `, [turno.fecha, turno.instalacion_id, turno.rol_servicio_id]);
      ppcsCreados++;
    }

    console.log(`✅ Creados ${ppcsCreados} PPCs por finiquito`);
    return ppcsCreados;
  } catch (error) {
    console.error(`❌ Error registrando finiquito:`, error);
    throw error;
  }
}

export async function obtenerPermisos({ guardiaId, tipo }: {
  guardiaId: string;
  tipo?: string;
}) {
  console.log(`🔍 Obteniendo permisos para guardia ${guardiaId}${tipo ? ` tipo ${tipo}` : ''}`);

  try {
    let sqlQuery = `
      SELECT 
        id,
        guardia_id,
        fecha,
        tipo,
        observacion
      FROM as_turnos_pauta_mensual 
      WHERE guardia_id = $1 AND tipo != 'turno'
    `;
    
    const params = [guardiaId];
    
    if (tipo) {
      sqlQuery += ` AND tipo = $2`;
      params.push(tipo);
    }
    
    sqlQuery += ` ORDER BY fecha ASC`;

    const result = await query(sqlQuery, params);
    console.log(`✅ Obtenidos ${result.rows.length} permisos`);
    
    return result.rows;
  } catch (error) {
    console.error(`❌ Error obteniendo permisos:`, error);
    throw error;
  }
} 