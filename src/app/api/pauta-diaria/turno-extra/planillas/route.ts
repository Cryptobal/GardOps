import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

// GET - Obtener todas las planillas
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando GET /api/pauta-diaria/turno-extra/planillas');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    console.log('🔍 Parámetros:', { estado, page, limit, offset });

    let whereClause = '';
    const params: any[] = [];

    if (estado !== 'all') {
      whereClause = 'WHERE p.estado = $1';
      params.push(estado);
    }

    const sqlQuery = `
      SELECT 
        p.id,
        p.codigo,
        p.fecha_generacion,
        p.monto_total,
        p.cantidad_turnos,
        p.estado,
        p.fecha_pago,
        p.observaciones,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        MIN(te.fecha) as fecha_inicio_turnos,
        MAX(te.fecha) as fecha_fin_turnos
      FROM planillas_turnos_extras p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN turnos_extras te ON te.planilla_id = p.id
      ${whereClause}
      GROUP BY p.id, p.codigo, p.fecha_generacion, p.monto_total, p.cantidad_turnos, p.estado, p.fecha_pago, p.observaciones, u.nombre, u.apellido
      ORDER BY p.fecha_generacion DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    console.log('🔍 Ejecutando query:', sqlQuery);
    console.log('🔍 Parámetros:', params);

    const { rows } = await query(sqlQuery, params);
    
    console.log('🔍 Resultados:', rows);
    
    // Obtener total de planillas para paginación
    const countQuery = `
      SELECT COUNT(*) as total
      FROM planillas_turnos_extras p
      ${whereClause}
    `;
    
    console.log('🔍 Ejecutando count query:', countQuery);
    const countResult = await query(countQuery, estado !== 'all' ? [estado] : []);
    const total = parseInt(countResult.rows[0]?.total || '0');

    console.log('🔍 Total de planillas:', total);

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
    console.error('❌ Error obteniendo planillas:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
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

    // Generar código único TE-YYYY-MM-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Obtener el siguiente número secuencial para este mes
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as count 
       FROM planillas_turnos_extras 
       WHERE codigo LIKE $1`,
      [`TE-${year}-${month}-%`]
    );
    
    const nextNumber = parseInt(countRows[0].count) + 1;
    const codigo = `TE-${year}-${month}-${String(nextNumber).padStart(4, '0')}`;
    
    // Crear la planilla con código
    const planillaQuery = `
      INSERT INTO planillas_turnos_extras (usuario_id, monto_total, cantidad_turnos, observaciones, codigo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, codigo
    `;
    
    const { rows: planillaRows } = await query(planillaQuery, [
      usuarioId, 
      montoTotal, 
      turnos.length, 
      observaciones || null,
      codigo
    ]);
    
    const planillaId = planillaRows[0].id;
    const planillaCodigo = planillaRows[0].codigo;

    // Actualizar turnos extras con la planilla asignada
    const turnoIdsArray = turnos.map(t => t.id);
    
    // Solo actualizar turnos extras con planilla_id, ya no usamos planilla_turno_relacion
    await query(
      'UPDATE turnos_extras SET planilla_id = $1 WHERE id = ANY($2)',
      [planillaId, turnoIdsArray]
    );

    return NextResponse.json({
      mensaje: `Planilla ${planillaCodigo} creada exitosamente con ${turnos.length} turnos`,
      planilla_id: planillaId,
      codigo: planillaCodigo,
      monto_total: montoTotal,
      cantidad_turnos: turnos.length
    });

  } catch (error) {
    console.error('Error creando planilla:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 