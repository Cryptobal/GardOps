import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { activo } = body;

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'El campo activo es requerido y debe ser un booleano' },
        { status: 400 }
      );
    }

    // Actualizar el estado activo del rol
    const result = await sql.query(`
      UPDATE roles_servicio 
      SET activo = $1 
      WHERE id = $2 
      RETURNING *
    `, [activo, id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        id: rol.id,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        estado: rol.activo ? 'Activo' : 'Inactivo',
        activo: rol.activo,
        tenant_id: rol.tenant_id,
        created_at: rol.creado_en,
        updated_at: rol.creado_en,
        fecha_inactivacion: null
      },
      message: `Rol ${activo ? 'activado' : 'inactivado'} correctamente`
    });
  } catch (error) {
    logger.error('Error cambiando estado del rol::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
