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

    console.log('📅 Generando agenda final para fecha:', fechaStr);

    // Obtener contactos disponibles usando la misma lógica que contactos-disponibles
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

    // Si no hay contactos, intentar sin el filtro de monitoreo
    if (contactosQuery.rows.length === 0) {
      console.log('🔍 No se encontraron contactos con monitoreo, buscando sin filtro...');
      const contactosQuery2 = await sql`
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
      
      console.log('📊 Contactos encontrados (sin filtro):', contactosQuery2.rows.length);
      contactosQuery.rows = contactosQuery2.rows;
    }

    const llamadosGenerados: any[] = [];

    for (const contacto of contactosQuery.rows) {
      console.log(`🏢 Procesando: ${contacto.instalacion_nombre}`);
      
      // Generar horarios basados en la ventana de tiempo
      const horaInicio = parseInt(contacto.hora_inicio.split(':')[0]);
      const horaTermino = parseInt(contacto.hora_termino.split(':')[0]);
      
      const horarios = [];
      
      // Si la ventana cruza la medianoche
      if (horaTermino < horaInicio) {
        // Desde hora_inicio hasta 23:59
        for (let hora = horaInicio; hora <= 23; hora++) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
        }
        // Desde 00:00 hasta hora_termino
        for (let hora = 0; hora <= horaTermino; hora++) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
        }
      } else {
        // Ventana normal
        for (let hora = horaInicio; hora <= horaTermino; hora++) {
          horarios.push(`${hora.toString().padStart(2, '0')}:00`);
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
              NULL
            ) RETURNING id
          `;

          llamadosGenerados.push({
            id: insertResult.rows[0].id,
            instalacion_id: contacto.instalacion_id,
            instalacion_nombre: contacto.instalacion_nombre,
            programado_para: programadoPara,
            estado: 'pendiente',
            observaciones: null
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
