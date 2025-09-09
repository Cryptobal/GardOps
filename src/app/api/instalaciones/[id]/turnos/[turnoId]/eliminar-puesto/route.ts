import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'create' });
  if (deny) return deny;

  try {
    const { id: instalacionId, turnoId } = params;
    const body = await request.json();
    const { puesto_id } = body;

    if (!puesto_id) {
      return NextResponse.json(
        { error: 'Falta campo requerido: puesto_id' },
        { status: 400 }
      );
    }

    devLogger.search(' Eliminando puesto:', { instalacionId, turnoId, puesto_id });
    
    // Verificar que el puesto existe antes de eliminar
    const checkPuesto = await sql`
      SELECT id, nombre_puesto FROM as_turnos_puestos_operativos WHERE id = ${puesto_id}
    `;
    
    devLogger.search(' Verificación previa:', { 
      encontrado: checkPuesto.rows.length > 0,
      puesto: checkPuesto.rows[0] || null
    });
    
    if (checkPuesto.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }
    
    // Eliminar directamente el puesto sin validaciones complejas
    devLogger.search(' Eliminando puesto directamente:', puesto_id);
    
    const deleteResult = await sql`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE id = ${puesto_id}
      RETURNING id, nombre_puesto
    `;

    devLogger.search(' Resultado de eliminación:', { 
      eliminados: deleteResult.rows.length,
      puesto: deleteResult.rows[0] || null
    });

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Reordenar correlativamente los puestos restantes (guardias primero)
    const restantes = await sql`
      SELECT id, nombre_puesto, guardia_id
      FROM as_turnos_puestos_operativos
      WHERE rol_id = ${turnoId} AND instalacion_id = ${instalacionId}
      ORDER BY 
        CASE WHEN guardia_id IS NOT NULL THEN 0 ELSE 1 END,
        nombre_puesto
    `;

    let index = 1;
    for (const r of restantes.rows as any[]) {
      const nuevo = `Puesto #${index}`;
      if (r.nombre_puesto !== nuevo) {
        await sql`UPDATE as_turnos_puestos_operativos SET nombre_puesto = ${nuevo} WHERE id = ${r.id}`;
      }
      index++;
    }

    return NextResponse.json({
      success: true,
      message: 'Puesto eliminado completamente y puestos reordenados',
    });

  } catch (error: any) {
    logger.error('Error eliminando puesto::', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
