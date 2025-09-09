import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'record' });
  if (deny) return deny;

  try {
    const llamadoId = params.id;
    const body = await request.json();
    const { 
      estado, 
      observaciones, 
      canal, 
      contacto_tipo, 
      contacto_id, 
      contacto_nombre, 
      contacto_telefono 
    } = body;

    // Validar estado
    const estadosValidos = ['exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Validar contacto_tipo
    const tiposValidos = ['instalacion', 'guardia'];
    if (contacto_tipo && !tiposValidos.includes(contacto_tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de contacto inválido' },
        { status: 400 }
      );
    }

    // Obtener la llamada actual
    const llamadaActual = await sql`
      SELECT 
        cl.programado_para,
        cl.estado,
        cl.instalacion_id,
        cci.intervalo_minutos
      FROM central_llamados cl
      LEFT JOIN central_config_instalacion cci ON cl.instalacion_id = cci.instalacion_id
      WHERE cl.id = ${llamadoId}
    `;

    if (llamadaActual.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Llamada no encontrada' },
        { status: 404 }
      );
    }

    const llamada = llamadaActual.rows[0];
    const ahora = new Date();
    const programadoPara = new Date(llamada.programado_para);
    const intervaloMinutos = llamada.intervalo_minutos || 60;

    // En desarrollo, ser más flexible con la validación de tiempo
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      // Calcular ventana de tiempo válida (1 hora antes y después de la hora programada)
      const ventanaInicio = new Date(programadoPara);
      ventanaInicio.setHours(ventanaInicio.getHours() - 1);
      
      const ventanaFin = new Date(programadoPara);
      ventanaFin.setHours(ventanaFin.getHours() + 1);

      // Verificar si estamos en la ventana de tiempo válida
      if (ahora < ventanaInicio || ahora > ventanaFin) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Solo se pueden registrar llamadas en su ventana de tiempo correspondiente',
            ventana: {
              inicio: ventanaInicio.toISOString(),
              fin: ventanaFin.toISOString(),
              actual: ahora.toISOString()
            }
          },
          { status: 400 }
        );
      }
    } else {
      // En desarrollo, solo verificar que la llamada no sea del futuro
      if (ahora < programadoPara) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No se pueden registrar llamadas del futuro',
            programado: programadoPara.toISOString(),
            actual: ahora.toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Verificar que la llamada no esté ya registrada
    if (llamada.estado !== 'pendiente' && llamada.estado !== 'no_registrado') {
      return NextResponse.json(
        { success: false, error: 'Esta llamada ya fue registrada' },
        { status: 400 }
      );
    }

    // Calcular SLA (tiempo de respuesta)
    const slaSegundos = Math.floor((ahora.getTime() - programadoPara.getTime()) / 1000);

    // Actualizar la llamada
    const result = await sql`
      UPDATE central_llamados SET
        estado = ${estado},
        observaciones = ${observaciones || null},
        canal = ${canal || 'whatsapp'},
        contacto_tipo = ${contacto_tipo || null},
        contacto_id = ${contacto_id || null},
        contacto_nombre = ${contacto_nombre || null},
        contacto_telefono = ${contacto_telefono || null},
        ejecutado_en = ${ahora.toISOString()},
        sla_segundos = ${slaSegundos},
        operador_id = (SELECT id FROM usuarios WHERE email = ${request.headers.get('x-user-email')}),
        updated_at = now()
      WHERE id = ${llamadoId}
      RETURNING *
    `;

    // Si es un incidente, crear registro de incidente
    if (estado === 'incidente') {
      await sql`
        INSERT INTO central_incidentes (
          llamado_id, tipo, severidad, detalle, tenant_id
        ) VALUES (
          ${llamadoId},
          'Llamada fallida',
          'media',
          ${observaciones || 'Incidente reportado durante monitoreo'},
          (SELECT tenant_id FROM central_llamados WHERE id = ${llamadoId})
        )
      `;
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error actualizando llamada::', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
