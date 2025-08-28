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

    console.log('📅 Generando agenda directa para fecha:', fechaStr);

    // Obtener contactos disponibles (usando la misma lógica que contactos-disponibles)
    const contactosQuery = await sql`
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
        AND rs.nombre ILIKE '%monitoreo%'
      ORDER BY i.nombre ASC
    `;

    console.log('📊 Contactos encontrados:', contactosQuery.rows.length);
    console.log('📋 Datos de contactos:', JSON.stringify(contactosQuery.rows, null, 2));

    const llamadosGenerados: any[] = [];

    for (const contacto of contactosQuery.rows) {
      console.log(`🏢 Procesando: ${contacto.instalacion_nombre}`);
      
      // Generar horarios basados en la ventana de tiempo
      const horaInicio = contacto.hora_inicio.split(':')[0]; // Extraer solo la hora
      const horaTermino = contacto.hora_termino.split(':')[0];
      
      const horarios = [];
      let hora = parseInt(horaInicio);
      const horaFin = parseInt(horaTermino);
      
      // Si la ventana cruza la medianoche
      if (horaFin < hora) {
        // Desde hora_inicio hasta 23:59
        while (hora <= 23) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
          hora++;
        }
        // Desde 00:00 hasta hora_termino
        hora = 0;
        while (hora <= horaFin) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
          hora++;
        }
      } else {
        // Ventana normal
        while (hora <= horaFin) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
          hora++;
        }
      }
      
      console.log(`   Horarios generados: ${horarios.join(', ')}`);
      
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
              ${contacto.instalacion_id},
              ${programadoPara}::timestamptz,
              'pendiente',
              'Monitoreo de ${contacto.instalacion_nombre} a las ${horario}'
            ) RETURNING id
          `;

          llamadosGenerados.push({
            id: insertResult.rows[0].id,
            instalacion_id: contacto.instalacion_id,
            instalacion_nombre: contacto.instalacion_nombre,
            programado_para: programadoPara,
            estado: 'pendiente',
            observaciones: `Monitoreo de ${contacto.instalacion_nombre} a las ${horario}`
          });

          console.log(`✅ Llamado creado: ${contacto.instalacion_nombre} - ${horario}`);
        } catch (insertError) {
          console.error(`❌ Error insertando llamado para ${contacto.instalacion_nombre} - ${horario}:`, insertError);
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
