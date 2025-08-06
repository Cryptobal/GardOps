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

    // Verificar que el guardia esté activo
    const { rows: guardiaRows } = await query(
      `SELECT id, nombre, apellido_paterno, activo FROM guardias WHERE id = $1`,
      [guardia_id]
    );

    if (guardiaRows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    if (!guardiaRows[0].activo) {
      return NextResponse.json(
        { error: 'El guardia no está activo' },
        { status: 400 }
      );
    }

    // Obtener instalación_id y valor_turno_extra desde el puesto
    const { rows: puestoRows } = await query(`
      SELECT 
        i.id AS instalacion_id, 
        COALESCE(i.valor_turno_extra, 0) as valor_turno_extra, 
        i.nombre as instalacion_nombre
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
    const instalacion_nombre = puestoRows[0].instalacion_nombre;
    
    console.log('💰 Valor turno extra obtenido:', {
      instalacion_id,
      instalacion_nombre,
      valor_turno_extra: valor,
      puesto_id
    });

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

    // Verificar que no exista un turno extra para el mismo guardia, puesto y fecha
    const { rows: existingRows } = await query(
      `SELECT id FROM turnos_extras 
       WHERE guardia_id = $1 AND puesto_id = $2 AND fecha = $3 AND tenant_id = $4`,
      [guardia_id, puesto_id, fecha, tenantId]
    );

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un turno extra registrado para este guardia en esta fecha y puesto' },
        { status: 409 }
      );
    }

    // Insertar el turno extra
    const { rows: insertRows } = await query(
      `INSERT INTO turnos_extras 
       (guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenantId]
    );

    const turnoExtraId = insertRows[0].id;

    // Log de la operación
    await logCRUD(
      'turnos_extras',
      turnoExtraId,
      'CREATE',
      usuario,
      null,
      {
        guardia_id,
        instalacion_id,
        puesto_id,
        pauta_id,
        fecha,
        estado,
        valor,
        tenant_id: tenantId
      },
      tenantId
    );

    // Obtener nombre del guardia para la notificación
    const guardiaNombre = `${guardiaRows[0].nombre} ${guardiaRows[0].apellido_paterno}`;

    return NextResponse.json({
      ok: true,
      id: turnoExtraId,
      valor: valor,
      guardia_nombre: guardiaNombre,
      instalacion_nombre: instalacion_nombre,
      mensaje: `✅ Turno extra registrado: $${valor.toLocaleString()} pagado`
    });

  } catch (error) {
    console.error('Error al registrar turno extra:', error);
    
    // Log del error
    await logCRUD(
      'turnos_extras',
      'error',
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
      if (pagado === 'pending') {
        // Pendientes: no pagados pero con planilla_id
        queryString += ` AND te.pagado = false AND te.planilla_id IS NOT NULL`;
      } else if (pagado === 'false') {
        // No pagados: no pagados y sin planilla_id
        queryString += ` AND te.pagado = false AND te.planilla_id IS NULL`;
      } else {
        // Pagados: pagado = true
        queryString += ` AND te.pagado = $${paramIndex}`;
        params.push(pagado === 'true');
        paramIndex++;
      }
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

    console.log('🔍 Query turnos extras:', queryString);
    console.log('🔍 Params:', params);

    const { rows } = await query(queryString, params);

    console.log('📊 Turnos extras obtenidos:', rows.length);
    console.log('📊 Primer turno (ejemplo):', rows[0]);

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