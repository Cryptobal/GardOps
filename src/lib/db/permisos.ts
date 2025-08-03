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
      INSERT INTO pautas_mensuales (guardia_id, dia, tipo, tenant_id, instalacion_id, rol_servicio_id)
      SELECT $1, generate_series($2::date, $3::date, '1 day'::interval)::date, $4, $5, $6, $7
      ON CONFLICT (guardia_id, dia) 
      DO UPDATE SET tipo = $4
    `, [guardiaId, desde, hasta, tipo, 'accebf8a-bacc-41fa-9601-ed39cb320a52', 'fe761cd0-320f-404a-aa26-2e81093ee12e', '64bef7f7-7d41-4ce6-a8bd-f26ed0482825']);

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
      DELETE FROM pautas_mensuales
      WHERE guardia_id = $1 AND dia >= $2
    `, [guardiaId, fechaDesde]);

    console.log(`✅ Eliminados ${resultPauta.rowCount} registros de pauta mensual`);

    // Obtener turnos que se eliminaron para crear PPCs
    const turnosEliminados = await query(`
      SELECT dia as fecha, instalacion_id, rol_servicio_id
      FROM pautas_mensuales
      WHERE guardia_id = $1 AND dia >= $2
    `, [guardiaId, fechaDesde]);

    // Crear PPCs para cada turno eliminado usando el nuevo modelo
    let ppcsCreados = 0;
    for (const turno of turnosEliminados.rows) {
      // Buscar puestos operativos disponibles para esta instalación y rol
      const puestosDisponibles = await query(`
        SELECT id, nombre_puesto
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1 
          AND rol_id = $2 
          AND guardia_id IS NULL
          AND es_ppc = true
        LIMIT 1
      `, [turno.instalacion_id, turno.rol_servicio_id]);

      if (puestosDisponibles.rows.length > 0) {
        // Marcar el puesto como PPC pendiente
        await query(`
          UPDATE as_turnos_puestos_operativos
          SET es_ppc = true, guardia_id = NULL
          WHERE id = $1
        `, [puestosDisponibles.rows[0].id]);
        
        ppcsCreados++;
        console.log(`✅ PPC creado para puesto ${puestosDisponibles.rows[0].nombre_puesto} en ${turno.fecha}`);
      } else {
        console.log(`⚠️ No se encontró puesto operativo disponible para ${turno.instalacion_id} - ${turno.rol_servicio_id}`);
      }
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
        dia as fecha,
        tipo,
        observacion
      FROM pautas_mensuales 
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