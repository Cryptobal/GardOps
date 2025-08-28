import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET - Listar todas las estructuras de una instalación y rol
export async function GET(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    const rolServicioId = searchParams.get('rol_servicio_id');

    if (!instalacionId || !rolServicioId) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id y rol_servicio_id son requeridos' },
        { status: 400 }
      );
    }

    // Obtener todas las estructuras (activas e inactivas) para esta instalación y rol
    const estructurasResult = await sql`
      SELECT 
        sei.id,
        sei.instalacion_id,
        i.nombre as instalacion_nombre,
        sei.rol_servicio_id,
        r.nombre as rol_nombre,
        sei.version,
        sei.vigencia_desde,
        sei.vigencia_hasta,
        sei.activo,
        sei.created_at,
        sei.updated_at
      FROM sueldo_estructura_instalacion sei
      INNER JOIN instalaciones i ON sei.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio r ON sei.rol_servicio_id = r.id
      WHERE sei.instalacion_id = ${instalacionId}
        AND sei.rol_servicio_id = ${rolServicioId}
      ORDER BY sei.vigencia_desde DESC, sei.version DESC
    `;

    const estructuras = estructurasResult.rows;

    return NextResponse.json({
      success: true,
      data: {
        estructuras: estructuras,
        total: estructuras.length,
        activas: estructuras.filter(e => e.activo).length,
        inactivas: estructuras.filter(e => !e.activo).length
      }
    });
  } catch (error) {
    console.error('Error listando estructuras de instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
