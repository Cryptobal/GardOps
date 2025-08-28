import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'configure' });
  if (deny) return deny;

  try {
    const { fecha } = await req.json();
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const fechaStr = fechaObj.toISOString().split('T')[0];

    console.log('📅 Generando agenda simple para fecha:', fechaStr);

    // Obtener instalaciones con monitoreo habilitado (usando la misma lógica que contactos-disponibles)
    const instalacionesQuery = await sql`
      SELECT DISTINCT
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        po.nombre_puesto,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        60 as intervalo_minutos
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.activo = true
        AND i.telefono IS NOT NULL 
        AND i.telefono != ''
      ORDER BY i.nombre ASC
    `;

    console.log('📊 Instalaciones encontradas:', instalacionesQuery.rows.length);

    const llamadosGenerados: any[] = [];

    for (const instalacion of instalacionesQuery.rows) {
      console.log(`🏢 Procesando: ${instalacion.instalacion_nombre}`);
      
      // Generar horarios simples: 22:00, 23:00, 00:00, 01:00, 02:00, 03:00, 04:00, 05:00
      const horarios = ['22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00'];
      
      for (const horario of horarios) {
        const programadoPara = `${fechaStr}T${horario}:00`;
        
        try {
          const insertResult = await sql`
            INSERT INTO central_llamados (
              instalacion_id,
              programado_para,
              estado,
              observaciones
            ) VALUES (
              ${instalacion.instalacion_id},
              ${programadoPara}::timestamptz,
              'pendiente',
              'Monitoreo de ${instalacion.instalacion_nombre} a las ${horario}'
            ) RETURNING id
          `;

          llamadosGenerados.push({
            id: insertResult.rows[0].id,
            instalacion_id: instalacion.instalacion_id,
            instalacion_nombre: instalacion.instalacion_nombre,
            programado_para: programadoPara,
            estado: 'pendiente',
            observaciones: `Monitoreo de ${instalacion.instalacion_nombre} a las ${horario}`
          });

          console.log(`✅ Llamado creado: ${instalacion.instalacion_nombre} - ${horario}`);
        } catch (insertError) {
          console.error(`❌ Error insertando llamado para ${instalacion.instalacion_nombre} - ${horario}:`, insertError);
        }
      }
    }

    console.log(`✅ Agenda generada: ${llamadosGenerados.length} llamados creados`);

    return NextResponse.json({ 
      success: true, 
      fecha: fechaStr,
      llamados_generados: llamadosGenerados.length,
      data: llamadosGenerados
    });

  } catch (error) {
    console.error('Error generando agenda:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
