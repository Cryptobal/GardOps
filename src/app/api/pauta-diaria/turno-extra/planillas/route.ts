import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

// GET - Obtener todas las planillas
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (estado !== 'all') {
      whereClause = 'WHERE p.estado = $1';
      params.push(estado);
    }

    const sqlQuery = `
      SELECT 
        p.id,
        p.fecha_generacion,
        p.monto_total,
        p.cantidad_turnos,
        p.estado,
        p.fecha_pago,
        p.observaciones,
        u.nombre as usuario_nombre,
        u.apellido_paterno as usuario_apellido,
        MIN(te.fecha) as fecha_inicio_turnos,
        MAX(te.fecha) as fecha_fin_turnos
      FROM planillas_turnos_extras p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN turnos_extras te ON te.planilla_id = p.id
      ${whereClause}
      GROUP BY p.id, p.fecha_generacion, p.monto_total, p.cantidad_turnos, p.estado, p.fecha_pago, p.observaciones, u.nombre, u.apellido_paterno
      ORDER BY p.fecha_generacion DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const { rows } = await query(sqlQuery, params);
    
    // Obtener total de planillas para paginación
    const countQuery = `
      SELECT COUNT(*) as total
      FROM planillas_turnos_extras p
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, estado !== 'all' ? [estado] : []);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      planillas: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo planillas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear nueva planilla
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { turnoIds, observaciones } = await request.json();

    if (!turnoIds || !Array.isArray(turnoIds) || turnoIds.length === 0) {
      return NextResponse.json({ error: 'Se requieren IDs de turnos' }, { status: 400 });
    }

    // Obtener información de los turnos
    const turnosQuery = `
      SELECT id, valor
      FROM turnos_extras 
      WHERE id = ANY($1) AND planilla_id IS NULL
    `;
    
    const { rows: turnos } = await query(turnosQuery, [turnoIds]);

    if (turnos.length === 0) {
      return NextResponse.json({ error: 'No se encontraron turnos válidos' }, { status: 400 });
    }

    // Calcular monto total
    const montoTotal = turnos.reduce((sum, turno) => sum + Number(turno.valor), 0);

    // Obtener usuario_id
    const usuarioQuery = 'SELECT id FROM usuarios WHERE email = $1';
    const { rows: usuarioRows } = await query(usuarioQuery, [user.email]);
    const usuarioId = usuarioRows[0]?.id;

    if (!usuarioId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 400 });
    }

    // Crear la planilla
    const planillaQuery = `
      INSERT INTO planillas_turnos_extras (usuario_id, monto_total, cantidad_turnos, observaciones)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const { rows: planillaRows } = await query(planillaQuery, [
      usuarioId, 
      montoTotal, 
      turnos.length, 
      observaciones || null
    ]);
    
    const planillaId = planillaRows[0].id;

    // Crear relaciones y actualizar turnos
    const turnoIdsArray = turnos.map(t => t.id);
    
    // Insertar relaciones
    for (const turnoId of turnoIdsArray) {
      await query(
        'INSERT INTO planilla_turno_relacion (planilla_id, turno_extra_id) VALUES ($1, $2)',
        [planillaId, turnoId]
      );
    }

    // Actualizar turnos extras
    await query(
      'UPDATE turnos_extras SET planilla_id = $1 WHERE id = ANY($2)',
      [planillaId, turnoIdsArray]
    );

    return NextResponse.json({
      mensaje: `Planilla creada exitosamente con ${turnos.length} turnos`,
      planilla_id: planillaId,
      monto_total: montoTotal,
      cantidad_turnos: turnos.length
    });

  } catch (error) {
    console.error('Error creando planilla:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 