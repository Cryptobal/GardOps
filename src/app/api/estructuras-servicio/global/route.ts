import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener vista global de estructuras de servicio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacionId');
    const rolId = searchParams.get('rolId');
    const activo = searchParams.get('activo');

    let sqlQuery = `
      SELECT 
        es.id,
        es.instalacion_id,
        i.nombre as instalacion_nombre,
        es.rol_servicio_id,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso, 'x', rs.horas_turno, ' / ', 
               rs.hora_inicio, '-', rs.hora_termino) as rol_completo,
        es.sueldo_base,
        es.bono_id,
        bg.nombre as bono_nombre,
        bg.imponible as bono_imponible,
        es.monto,
        es.activo,
        es.fecha_inactivacion,
        es.created_at,
        es.updated_at
      FROM sueldo_estructuras_servicio es
      INNER JOIN instalaciones i ON es.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
      LEFT JOIN sueldo_bonos_globales bg ON es.bono_id = bg.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (instalacionId) {
      sqlQuery += ` AND es.instalacion_id = $${paramIndex}`;
      params.push(instalacionId);
      paramIndex++;
    }

    if (rolId) {
      sqlQuery += ` AND es.rol_servicio_id = $${paramIndex}`;
      params.push(rolId);
      paramIndex++;
    }

    if (activo !== null) {
      sqlQuery += ` AND es.activo = $${paramIndex}`;
      params.push(activo === 'false' ? false : true);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY i.nombre, rs.nombre, bg.nombre`;

    const result = await query(sqlQuery, params);
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    // Agrupar por instalación y rol para mostrar mejor la información
    const estructurasAgrupadas = rows.reduce((acc: any, row: any) => {
      const key = `${row.instalacion_id}-${row.rol_servicio_id}`;
      
      if (!acc[key]) {
        acc[key] = {
          instalacion_id: row.instalacion_id,
          instalacion_nombre: row.instalacion_nombre,
          rol_servicio_id: row.rol_servicio_id,
          rol_nombre: row.rol_nombre,
          rol_completo: row.rol_completo,
          sueldo_base: row.sueldo_base,
          activo: row.activo,
          fecha_inactivacion: row.fecha_inactivacion,
          created_at: row.created_at,
          updated_at: row.updated_at,
          bonos: []
        };
      }
      
      if (row.bono_id) {
        acc[key].bonos.push({
          id: row.bono_id,
          nombre: row.bono_nombre,
          monto: row.monto,
          imponible: row.bono_imponible
        });
      }
      
      return acc;
    }, {});

    const estructuras = Object.values(estructurasAgrupadas);
    
    return NextResponse.json({
      success: true,
      data: estructuras,
      count: estructuras.length
    });
  } catch (error) {
    console.error('Error obteniendo estructuras de servicio global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estructuras de servicio' },
      { status: 500 }
    );
  }
}

// PUT - Activar/Inactivar una estructura (por instalación y rol)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, rol_servicio_id, activo } = body as {
      instalacion_id: string;
      rol_servicio_id: string;
      activo: boolean;
    };

    if (!instalacion_id || !rol_servicio_id || typeof activo !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE sueldo_estructuras_servicio
      SET activo = $1,
          fecha_inactivacion = CASE WHEN $1 = false THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE instalacion_id = $2 AND rol_servicio_id = $3
      RETURNING id
    `;
    const result = await query(sql, [activo, instalacion_id, rol_servicio_id]);
    const rows = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({
      success: true,
      updated: rows.length,
    });
  } catch (error) {
    console.error('Error actualizando estado de estructura global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar estado de estructura' },
      { status: 500 }
    );
  }
}
