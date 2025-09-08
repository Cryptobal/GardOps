import { NextRequest } from 'next/server';
import pool from '@/lib/database';
import { unstable_noStore as noStore } from 'next/cache';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  pauta_id: string;
  puesto_id: string;
  fecha: string;
  guardia_id: string | null;
  estado: string | null;
  meta: any | null;
  instalacion_id: string;
  instalacion_nombre: string;
  guardia_nombre: string | null;
  // Nuevos campos de la vista unificada
  instalacion_telefono: string | null;
  estado_pauta_mensual: string;
  estado_ui: string;
  guardia_trabajo_id: string | null;
  guardia_trabajo_nombre: string | null;
  guardia_trabajo_telefono: string | null;
  guardia_titular_id: string | null;
  guardia_titular_nombre: string | null;
  guardia_titular_telefono: string | null;
  puesto_nombre: string;
  es_ppc: boolean;
  es_reemplazo: boolean;
  es_sin_cobertura: boolean;
  es_falta_sin_aviso: boolean;
  necesita_cobertura: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  rol_id: string | null;
  rol_nombre: string | null;
  reemplazo_guardia_nombre: string | null;
  cobertura_guardia_nombre: string | null;
  cobertura_guardia_telefono: string | null;
};

export async function GET(req: NextRequest) {
  noStore();
  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha'); // YYYY-MM-DD
  const instalacionId = url.searchParams.get('instalacion_id');
  if (!fecha) return new Response('fecha (YYYY-MM-DD) requerida', { status: 400 });

  const params: any[] = [fecha];
  let sql = `
    SELECT 
      pauta_id, 
      puesto_id, 
      fecha, 
      guardia_trabajo_id as guardia_id, 
      estado_ui as estado, 
      meta,
      instalacion_id, 
      instalacion_nombre, 
      guardia_trabajo_nombre as guardia_nombre,
      instalacion_telefono,
      estado_pauta_mensual,
      estado_ui,
      guardia_trabajo_id,
      guardia_trabajo_nombre,
      guardia_trabajo_telefono,
      guardia_titular_id,
      guardia_titular_nombre,
      guardia_titular_telefono,
      puesto_nombre,
      es_ppc,
      es_reemplazo,
      es_sin_cobertura,
      es_falta_sin_aviso,
      necesita_cobertura,
      hora_inicio,
      hora_fin,
      rol_id,
      rol_nombre,
      reemplazo_guardia_nombre,
      cobertura_guardia_nombre,
      cobertura_guardia_telefono
    FROM as_turnos_v_pauta_diaria_unificada
    WHERE fecha = $1
  `;
  if (instalacionId) { params.push(instalacionId); sql += ` AND instalacion_id = $2`; }
  sql += ` ORDER BY instalacion_nombre, puesto_nombre`;

  const { rows } = await pool.query<Row>(sql, params);
  return Response.json({ data: rows });
}

export async function PUT(req: NextRequest) {
  noStore();
  try {
    const { turnoId, accion, guardiaId, motivo, observaciones } = await req.json();
    
    console.log('🔄 PUT /api/pauta-diaria:', { turnoId, accion, guardiaId, motivo, observaciones });
    
    if (!turnoId || !accion) {
      return new Response('turnoId y accion son requeridos', { status: 400 });
    }

    // Obtener información del turno
    const { rows: turnoInfo } = await pool.query(`
      SELECT 
        pm.id as pauta_id,
        pm.puesto_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.estado_ui,
        pm.meta,
        po.instalacion_id,
        po.nombre as puesto_nombre
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.puesto_id = $1
      ORDER BY pm.anio DESC, pm.mes DESC, pm.dia DESC
      LIMIT 1
    `, [turnoId]);

    if (turnoInfo.length === 0) {
      return new Response('Turno no encontrado', { status: 404 });
    }

    const turno = turnoInfo[0];
    console.log('📋 Información del turno:', turno);

    // Manejar diferentes acciones
    switch (accion) {
      case 'eliminar_cobertura':
        // Limpiar cobertura y liberar para pauta mensual
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'libre',
            estado_ui = 'libre',
            meta = meta - 'cobertura_guardia_id' - 'reemplazo_guardia_id',
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia]);
        
        console.log(`✅ Cobertura eliminada y registro liberado para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'asistio':
        // Marcar como asistido
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'trabajado',
            estado_ui = 'trabajado',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'asistencia'
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia]);
        
        console.log(`✅ Asistencia marcada para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'no_asistio':
        // Marcar como inasistencia
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'inasistencia',
            estado_ui = 'inasistencia',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'inasistencia',
              'motivo', $5
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia, motivo]);
        
        console.log(`✅ Inasistencia marcada para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'reemplazo':
        // Asignar reemplazo
        if (!guardiaId) {
          return new Response('guardiaId es requerido para reemplazo', { status: 400 });
        }
        
        console.log(`🔄 Asignando reemplazo: Guardia ${guardiaId} para puesto ${turno.puesto_id}`);
        
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'reemplazo',
            estado_ui = 'reemplazo',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'reemplazo_guardia_id', $5,
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'reemplazo',
              'observaciones', $6
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia, guardiaId, observaciones || '']);
        
        console.log(`✅ Reemplazo asignado para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'asignar_ppc':
        // Asignar guardia a PPC
        if (!guardiaId) {
          return new Response('guardiaId es requerido para asignar PPC', { status: 400 });
        }
        
        console.log(`🔄 Asignando PPC: Guardia ${guardiaId} para puesto ${turno.puesto_id}`);
        
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'extra',
            estado_ui = 'extra',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'cobertura_guardia_id', $5,
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'ppc_cobertura',
              'observaciones', $6
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia, guardiaId, observaciones || '']);
        
        console.log(`✅ PPC asignado para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'sin_cobertura':
        // Marcar como sin cobertura
        console.log(`🔄 Marcando sin cobertura para puesto ${turno.puesto_id}`);
        
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            estado = 'sin_cobertura',
            estado_ui = 'sin_cobertura',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'sin_cobertura',
              'observaciones', $5
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia, observaciones || '']);
        
        console.log(`✅ Marcado sin cobertura para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      case 'agregar_observaciones':
        // Agregar o actualizar observaciones
        console.log(`🔄 Actualizando observaciones para puesto ${turno.puesto_id}`);
        
        await query(`
          UPDATE as_turnos_pauta_mensual
          SET 
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
              'observaciones', $5,
              'marcado_por', 'ui:pauta-diaria',
              'marcado_ts', NOW()::text,
              'action', 'observaciones'
            ),
            updated_at = NOW()
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3 
            AND dia = $4
        `, [turno.puesto_id, turno.anio, turno.mes, turno.dia, observaciones || '']);
        
        console.log(`✅ Observaciones actualizadas para puesto ${turno.puesto_id}, día ${turno.dia}`);
        break;

      default:
        return new Response(`Acción no válida: ${accion}`, { status: 400 });
    }

    // Retornar respuesta exitosa
    return Response.json({
      success: true,
      message: `Acción ${accion} ejecutada correctamente`,
      turno_id: turnoId,
      pauta_id: turno.pauta_id
    });

  } catch (error) {
    console.error('❌ Error en PUT /api/pauta-diaria:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
}