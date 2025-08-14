import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/pauta-diaria/turno-extra - Obtener turnos extras
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'pauta_diaria', action: 'read:list' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const soloPagados = searchParams.get('solo_pagados');
    const ctx = (request as any).ctx as { userId: string; tenantId: string } | undefined;
    const tenantId = ctx?.tenantId;
    if (!tenantId) return NextResponse.json({ success: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    
    // Adaptación a estructura actual: no existen columnas instalacion_id, fecha, pagado
    const result = await sql`
      SELECT 
        id,
        guardia_id,
        COALESCE(instalacion_destino_id, instalacion_origen_id) AS instalacion_id,
        creado_en AS fecha,
        NULL::int AS horas,
        tipo AS motivo,
        false AS pagado
      FROM turnos_extras
      WHERE tenant_id = ${tenantId}
      ORDER BY creado_en DESC
    `;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo turnos extras:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/pauta-diaria/turno-extra - Crear turno extra
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'pauta_diaria', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { guardia_id, instalacion_id, fecha, horas, motivo, pagado } = body;
    const ctx = (request as any).ctx as { userId: string; tenantId: string } | undefined;
    const tenantId = ctx?.tenantId;
    if (!tenantId) return NextResponse.json({ success: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    
    const result = await sql`
      INSERT INTO turnos_extras (tenant_id, guardia_id, instalacion_id, fecha, horas, motivo, pagado)
      VALUES (${tenantId}, ${guardia_id}, ${instalacion_id}, ${fecha}, ${horas}, ${motivo}, ${pagado})
      RETURNING id, guardia_id, instalacion_id, fecha, horas, motivo, pagado
    `;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando turno extra:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}