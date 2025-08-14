import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'estructuras_sueldo', action: 'create' });
  if (deny) return deny;

try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const tenantId = searchParams.get('tenantId') || '1';
    const rolId = searchParams.get('rolId');

    let query = `
      SELECT 
        es.id,
        es.rol_servicio_id as rol_id,
        rs.nombre as rol_nombre,
        es.sueldo_base,
        es.activo,
        es.fecha_inactivacion,
        es.created_at,
        es.updated_at
      FROM sueldo_estructuras_servicio es
      LEFT JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      WHERE es.bono_id IS NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (activo !== null) {
      query += ` AND es.activo = $${paramIndex}`;
      params.push(activo === 'false' ? false : true);
      paramIndex++;
    }

    if (rolId) {
      query += ` AND es.rol_servicio_id = $${paramIndex}`;
      params.push(rolId);
      paramIndex++;
    }

    query += ' ORDER BY es.created_at DESC';

    const result = await sql.query(query, params);
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener estructuras de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'estructuras_sueldo', action: 'create' });
  if (deny) return deny;

try {
    const body = await request.json();
    const { 
      rol_servicio_id, 
      sueldo_base,
      bono_asistencia = 0,
      bono_responsabilidad = 0,
      bono_noche = 0,
      bono_feriado = 0,
      bono_riesgo = 0,
      otros_bonos = {},
      activo = true
    } = body;

    if (!rol_servicio_id || !sueldo_base) {
      return NextResponse.json(
        { success: false, error: 'El rol_servicio_id y sueldo_base son requeridos' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO sueldo_estructuras_roles (
        rol_servicio_id, sueldo_base, bono_asistencia, bono_responsabilidad,
        bono_noche, bono_feriado, bono_riesgo, otros_bonos, activo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    
    const params = [
      rol_servicio_id, sueldo_base, bono_asistencia, bono_responsabilidad,
      bono_noche, bono_feriado, bono_riesgo, JSON.stringify(otros_bonos), activo
    ];

    const result = await sql.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Estructura de sueldo creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
