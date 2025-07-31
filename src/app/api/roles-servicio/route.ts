import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        dias_trabajo,
        dias_descanso,
        horas_turno,
        hora_inicio,
        hora_termino,
        estado,
        tenant_id,
        created_at,
        updated_at
      FROM roles_servicio 
      ORDER BY nombre
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado } = body;

    // Validaciones
    if (!nombre || !dias_trabajo || !dias_descanso || !horas_turno || !hora_inicio || !hora_termino || !estado) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no existe un rol con el mismo nombre
    const existingRole = await query(
      'SELECT id FROM roles_servicio WHERE nombre = $1',
      [nombre]
    );

    if (existingRole.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un rol de servicio con este nombre' },
        { status: 409 }
      );
    }

    // Crear el rol
    const result = await query(`
      INSERT INTO roles_servicio (nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error creando rol de servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 