import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    
    console.log('🔍 Cargando pauta completa del día:', fecha);

    // Obtener todos los datos del día actual desde la vista unificada
    const pautaCompleta = await query(`
      SELECT 
        pd.pauta_id,
        pd.puesto_id,
        pd.instalacion_id,
        pd.instalacion_nombre,
        pd.rol_id,
        pd.rol_nombre,
        pd.hora_inicio,
        pd.hora_fin,
        pd.estado_ui,
        pd.guardia_titular_id,
        pd.guardia_titular_nombre,
        pd.guardia_trabajo_id,
        pd.guardia_trabajo_nombre,
        pd.es_ppc,
        pd.fecha
      FROM as_turnos_v_pauta_diaria_dedup_fixed pd
      WHERE pd.fecha = $1
      ORDER BY pd.instalacion_nombre, pd.rol_nombre, pd.hora_inicio
    `, [fecha]);

    const datos = pautaCompleta.rows;

    // Separar en PPCs y turnos asignados
    const ppcs = datos.filter(item => item.es_ppc === true && !item.guardia_trabajo_id);
    const turnosAsignados = datos.filter(item => !item.es_ppc && item.guardia_titular_id);

    console.log(`✅ PPCs encontrados: ${ppcs.length}`);
    console.log(`✅ Turnos asignados: ${turnosAsignados.length}`);

    return NextResponse.json({
      fecha,
      ppcs: ppcs.map(ppc => ({
        id: ppc.puesto_id,
        tipo: 'ppc',
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        rol_id: ppc.rol_id,
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_fin || '20:00'}`,
        estado: 'Pendiente'
      })),
      turnos_asignados: turnosAsignados.map(turno => ({
        id: turno.pauta_id,
        puesto_id: turno.puesto_id,
        tipo: 'turno_asignado',
        instalacion: turno.instalacion_nombre,
        instalacion_id: turno.instalacion_id,
        rol: turno.rol_nombre,
        rol_id: turno.rol_id,
        horario: `${turno.hora_inicio || '08:00'} - ${turno.hora_fin || '20:00'}`,
        guardia_asignado: {
          id: turno.guardia_titular_id,
          nombre: turno.guardia_titular_nombre
        },
        estado: 'Asignado'
      }))
    });

  } catch (error) {
    console.error('Error obteniendo pauta del día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
