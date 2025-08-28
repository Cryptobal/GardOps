import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);
    const instalacionId = searchParams.get('instalacion_id');

    let result;
    if (instalacionId) {
      result = await sql`
        SELECT 
          cci.*,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono
        FROM central_config_instalacion cci
        JOIN instalaciones i ON i.id = cci.instalacion_id
        WHERE cci.instalacion_id = ${instalacionId}
        ORDER BY cci.created_at DESC
        LIMIT 1
      `;
    } else {
      result = await sql`
        SELECT DISTINCT ON (cci.instalacion_id)
          cci.*,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono
        FROM central_config_instalacion cci
        JOIN instalaciones i ON i.id = cci.instalacion_id
        ORDER BY cci.instalacion_id, cci.created_at DESC
      `;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('Error obteniendo configuración de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'configure' });
  if (deny) return deny;

  try {
    const body = await req.json();
    const {
      instalacion_id,
      habilitado = true,
      intervalo_minutos = 60,
      ventana_inicio = '21:00',
      ventana_fin = '07:00',
      modo = 'fijo',
      mensaje_template = 'Central de Monitoreo GARD: Confirmar estado de turno en {instalacion} a las {hora}.',
      tenant_id = null
    } = body || {};

    if (!instalacion_id) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id es requerido' },
        { status: 400 }
      );
    }

    // Primero verificar si ya existe una configuración para esta instalación
    const existing = await sql`
      SELECT id FROM central_config_instalacion 
      WHERE instalacion_id = ${instalacion_id} 
      AND (tenant_id IS NULL OR tenant_id = ${tenant_id})
      LIMIT 1
    `;

    let result;
    if (existing.rows.length > 0) {
      // Actualizar configuración existente
      result = await sql`
        UPDATE central_config_instalacion SET
          habilitado = ${habilitado},
          intervalo_minutos = ${intervalo_minutos},
          ventana_inicio = ${ventana_inicio},
          ventana_fin = ${ventana_fin},
          modo = ${modo},
          mensaje_template = ${mensaje_template},
          updated_at = now()
        WHERE instalacion_id = ${instalacion_id}
        AND (tenant_id IS NULL OR tenant_id = ${tenant_id})
        RETURNING *
      `;
    } else {
      // Crear nueva configuración
      result = await sql`
        INSERT INTO central_config_instalacion (
          instalacion_id, 
          habilitado, 
          intervalo_minutos, 
          ventana_inicio, 
          ventana_fin, 
          modo, 
          mensaje_template, 
          tenant_id
        )
        VALUES (
          ${instalacion_id}, 
          ${habilitado}, 
          ${intervalo_minutos}, 
          ${ventana_inicio}, 
          ${ventana_fin}, 
          ${modo}, 
          ${mensaje_template}, 
          ${tenant_id}
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

