import { query } from '@/lib/database';
import { NextResponse } from 'next/server';
import { logCRUD } from '@/lib/logging';

export async function POST(req: Request) {
  try {
    const { guardia_id, puesto_id, pauta_id, estado } = await req.json();

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    // Validar parámetros requeridos
    if (!guardia_id || !puesto_id || !pauta_id || !estado) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: guardia_id, puesto_id, pauta_id, estado' },
        { status: 400 }
      );
    }

    // Validar que el estado sea válido
    if (!['reemplazo', 'ppc'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado debe ser "reemplazo" o "ppc"' },
        { status: 400 }
      );
    }

    // Obtener instalación_id y valor_turno_extra desde el puesto
    const { rows: puestoRows } = await query(`
      SELECT i.id AS instalacion_id, i.valor_turno_extra
      FROM as_turnos_puestos_operativos p
      JOIN instalaciones i ON i.id = p.instalacion_id
      WHERE p.id = $1
    `, [puesto_id]);

    if (puestoRows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    const instalacion_id = puestoRows[0].instalacion_id;
    const valor = puestoRows[0].valor_turno_extra || 0;

    // Obtener fecha desde la pauta mensual
    const { rows: pautaRows } = await query(
      `SELECT anio, mes, dia FROM as_turnos_pauta_mensual WHERE id = $1`,
      [pauta_id]
    );

    if (pautaRows.length === 0) {
      return NextResponse.json(
        { error: 'Pauta mensual no encontrada' },
        { status: 404 }
      );
    }

    const { anio, mes, dia } = pautaRows[0];
    const fecha = `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

    // Verificar si ya existe un registro para esta combinación
    const { rows: existingRows } = await query(`
      SELECT id FROM turnos_extras 
      WHERE guardia_id = $1 AND puesto_id = $2 AND pauta_id = $3 AND estado = $4
    `, [guardia_id, puesto_id, pauta_id, estado]);

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un registro de turno extra para esta combinación' },
        { status: 409 }
      );
    }

    // Insertar el registro de turno extra
    const { rows: insertRows } = await query(`
      INSERT INTO turnos_extras 
      (guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor]);

    const turnoExtraCreado = insertRows[0];

    // Log de creación de turno extra
    await logCRUD(
      'turnos_extras',
      turnoExtraCreado.id,
      'CREATE',
      usuario,
      null, // No hay datos anteriores en creación
      {
        guardia_id,
        puesto_id,
        pauta_id,
        instalacion_id,
        fecha,
        estado,
        valor,
        turno_extra_id: turnoExtraCreado.id
      },
      tenantId
    );

    console.log("✅ Turno extra registrado con valor desde instalación y guardado en turnos_extras");

    return NextResponse.json({ 
      ok: true, 
      id: turnoExtraCreado.id,
      valor,
      mensaje: `Turno extra registrado: $${valor} pagado`
    });

  } catch (error) {
    console.error('Error al registrar turno extra:', error);
    
    // Log del error
    await logCRUD(
      'turnos_extras',
      'ERROR',
      'CREATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-diaria/turno-extra',
        method: 'POST'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener turnos extras con filtros avanzados
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guardia_id = searchParams.get('guardia_id');
    const instalacion_id = searchParams.get('instalacion_id');
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');
    const estado = searchParams.get('estado');
    const pagado = searchParams.get('pagado');
    const busqueda = searchParams.get('busqueda');

    let queryString = `
      SELECT 
        te.*,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        i.nombre as instalacion_nombre,
        po.nombre_puesto
      FROM turnos_extras te
      JOIN guardias g ON g.id = te.guardia_id
      JOIN instalaciones i ON i.id = te.instalacion_id
      JOIN as_turnos_puestos_operativos po ON po.id = te.puesto_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (guardia_id) {
      queryString += ` AND te.guardia_id = $${paramIndex}`;
      params.push(guardia_id);
      paramIndex++;
    }

    if (instalacion_id) {
      queryString += ` AND te.instalacion_id = $${paramIndex}`;
      params.push(instalacion_id);
      paramIndex++;
    }

    if (fecha_inicio) {
      queryString += ` AND te.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      queryString += ` AND te.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    if (estado && estado !== 'all') {
      queryString += ` AND te.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (pagado && pagado !== 'all') {
      queryString += ` AND te.pagado = $${paramIndex}`;
      params.push(pagado === 'true');
      paramIndex++;
    }

    if (busqueda) {
      queryString += ` AND (
        g.nombre ILIKE $${paramIndex} OR 
        g.apellido_paterno ILIKE $${paramIndex} OR 
        g.rut ILIKE $${paramIndex} OR 
        i.nombre ILIKE $${paramIndex}
      )`;
      params.push(`%${busqueda}%`);
      paramIndex++;
    }

    queryString += ` ORDER BY te.fecha DESC, te.created_at DESC`;

    const { rows } = await query(queryString, params);

    return NextResponse.json({ 
      ok: true, 
      turnos_extras: rows,
      total: rows.length
    });

  } catch (error) {
    console.error('Error al obtener turnos extras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 