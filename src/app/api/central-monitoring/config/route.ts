import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacionId');

    if (instalacionId) {
      // Obtener configuración específica de una instalación
      const result = await sql`
        SELECT 
          cci.*,
          i.nombre as instalacion_nombre
        FROM central_config_instalacion cci
        INNER JOIN instalaciones i ON cci.instalacion_id = i.id
        WHERE cci.instalacion_id = ${instalacionId}
        ORDER BY cci.created_at DESC
        LIMIT 1
      `;

      return NextResponse.json({
        success: true,
        data: result.rows[0] || null
      });
    } else {
      // Obtener todas las configuraciones
      const result = await sql`
        SELECT 
          cci.*,
          i.nombre as instalacion_nombre
        FROM central_config_instalacion cci
        INNER JOIN instalaciones i ON cci.instalacion_id = i.id
        ORDER BY i.nombre ASC
      `;

      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }

  } catch (error) {
    console.error('Error obteniendo configuración de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const {
      instalacion_id,
      habilitado,
      intervalo_minutos,
      ventana_inicio,
      ventana_fin,
      modo,
      mensaje_template
    } = body;

    // Validaciones
    if (!instalacion_id) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }

    if (intervalo_minutos && (intervalo_minutos < 15 || intervalo_minutos > 480)) {
      return NextResponse.json(
        { success: false, error: 'Intervalo debe estar entre 15 y 480 minutos' },
        { status: 400 }
      );
    }

    // Verificar si existe configuración previa
    const existing = await sql`
      SELECT id FROM central_config_instalacion
      WHERE instalacion_id = ${instalacion_id}
      LIMIT 1
    `;

    let result;
    if (existing.rows.length > 0) {
      // Actualizar configuración existente
      result = await sql`
        UPDATE central_config_instalacion SET
          habilitado = ${habilitado},
          intervalo_minutos = ${intervalo_minutos || 60},
          ventana_inicio = ${ventana_inicio || '21:00'},
          ventana_fin = ${ventana_fin || '07:00'},
          modo = ${modo || 'whatsapp'},
          mensaje_template = ${mensaje_template || 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'},
          updated_at = now()
        WHERE instalacion_id = ${instalacion_id}
        RETURNING *
      `;
    } else {
      // Crear nueva configuración
      result = await sql`
        INSERT INTO central_config_instalacion (
          instalacion_id, habilitado, intervalo_minutos, ventana_inicio,
          ventana_fin, modo, mensaje_template
        )
        VALUES (
          ${instalacion_id}, ${habilitado}, ${intervalo_minutos || 60},
          ${ventana_inicio || '21:00'}, ${ventana_fin || '07:00'}, ${modo || 'whatsapp'},
          ${mensaje_template || 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?'}
        )
        RETURNING *
      `;
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error guardando configuración de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
