import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Obtener estructura de sueldo de un rol específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('id recibido:', id);
    
    const result = await sql.query(`
      SELECT * FROM sueldo_estructuras_roles WHERE rol_servicio_id = $1
    `, [id]);
    
    console.log('Resultado de la consulta:', result.rows.length);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura de sueldo no encontrada para este rol' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo estructura de sueldo:', error);
    return NextResponse.json(
      { error: 'Error al obtener estructura de sueldo' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estructura de sueldo de un rol específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      sueldo_base,
      bono_asistencia,
      bono_responsabilidad,
      bono_noche,
      bono_feriado,
      bono_riesgo,
      otros_bonos
    } = body;
    
    const result = await sql.query(`
      UPDATE sueldo_estructuras_roles
      SET 
        sueldo_base = COALESCE($2, sueldo_base),
        bono_asistencia = COALESCE($3, bono_asistencia),
        bono_responsabilidad = COALESCE($4, bono_responsabilidad),
        bono_noche = COALESCE($5, bono_noche),
        bono_feriado = COALESCE($6, bono_feriado),
        bono_riesgo = COALESCE($7, bono_riesgo),
        otros_bonos = COALESCE($8::jsonb, otros_bonos),
        updated_at = NOW()
      WHERE rol_servicio_id = $1
      RETURNING *
    `, [
      id,
      sueldo_base,
      bono_asistencia,
      bono_responsabilidad,
      bono_noche,
      bono_feriado,
      bono_riesgo,
      otros_bonos ? JSON.stringify(otros_bonos) : null
    ]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Estructura de sueldo no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando estructura de sueldo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estructura de sueldo' },
      { status: 500 }
    );
  }
}
