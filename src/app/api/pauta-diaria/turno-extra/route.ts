import { query } from '@/lib/database';
import { NextResponse } from 'next/server';
import { logCRUD } from '@/lib/logging';
import { getTenantId } from '@/lib/utils/tenant-utils';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: Request) {
  try {
    const { guardia_id, puesto_id, pauta_id, estado } = await req.json();

    // Por ahora usar un tenant_id fijo para testing
    const tenantId = await getTenantId(request);
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
    
    logger.debug('💰 Valor turno extra obtenido:', {
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

    // Validación mejorada: Verificar que el guardia no tenga ningún turno extra para la misma fecha
    const { rows: existingRows } = await query(
      `SELECT id, estado, valor FROM TE_turnos_extras 
       WHERE guardia_id = $1 AND fecha = $2 AND tenant_id = $3`,
      [guardia_id, fecha, tenantId]
    );

    if (existingRows.length > 0) {
      const turnosExistentes = existingRows.map((row: any) => ({
        id: row.id,
        estado: row.estado,
        valor: row.valor
      }));
      
      return NextResponse.json(
        { 
          error: 'El guardia ya tiene turnos extras asignados para esta fecha',
          detalles: {
            fecha,
            turnos_existentes: turnosExistentes,
            mensaje: 'Un guardia no puede tener múltiples turnos extras el mismo día'
          }
        },
        { status: 409 }
      );
    }

    // Verificar también turnos regulares del guardia para la misma fecha
    const { rows: turnosRegulares } = await query(
      `SELECT id FROM as_turnos_pauta_mensual 
       WHERE guardia_id = $1 AND anio = $2 AND mes = $3 AND dia = $4`,
      [guardia_id, anio, mes, dia]
    );

    if (turnosRegulares.length > 0) {
      return NextResponse.json(
        { 
          error: 'El guardia ya tiene turnos regulares asignados para esta fecha',
          detalles: {
            fecha,
            turnos_regulares: turnosRegulares.length,
            mensaje: 'No se puede asignar un turno extra cuando el guardia ya tiene turnos regulares'
          }
        },
        { status: 409 }
      );
    }

    // Insertar el turno extra con referencia al turno original
    const { rows: insertRows } = await query(
      `INSERT INTO TE_turnos_extras 
       (guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenant_id, turno_original_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenantId, pauta_id]
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
    logger.error('Error al registrar turno extra::', error);
    
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
      await getTenantId(request)
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

    // 1) TE materializados (canónico)
    let qMat = `
      SELECT 
        te.id,
        te.guardia_id,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        te.instalacion_id,
        i.nombre as instalacion_nombre,
        te.puesto_id,
        po.nombre_puesto,
        te.pauta_id,
        te.fecha,
        te.estado,
        te.valor,
        te.pagado,
        te.fecha_pago,
        te.observaciones_pago,
        te.usuario_pago,
        te.planilla_id,
        te.created_at,
        'materializado' as source
      FROM TE_turnos_extras te
      LEFT JOIN guardias g ON te.guardia_id = g.id
      LEFT JOIN instalaciones i ON te.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON po.id = te.puesto_id
      WHERE 1=1
    `;
    const pMat: any[] = [];

    if (guardia_id) { qMat += ` AND te.guardia_id = $${pMat.length+1}`; pMat.push(guardia_id); }
    if (instalacion_id) { qMat += ` AND te.instalacion_id = $${pMat.length+1}`; pMat.push(instalacion_id); }
    if (fecha_inicio) { qMat += ` AND te.fecha >= $${pMat.length+1}`; pMat.push(fecha_inicio); }
    if (fecha_fin) { qMat += ` AND te.fecha <= $${pMat.length+1}`; pMat.push(fecha_fin); }
    if (estado && estado !== 'all') { qMat += ` AND te.estado = $${pMat.length+1}`; pMat.push(estado); }
    if (pagado && pagado !== 'all') {
      if (pagado === 'pending') qMat += ` AND te.pagado = false AND te.planilla_id IS NOT NULL`;
      else if (pagado === 'false') qMat += ` AND te.pagado = false AND te.planilla_id IS NULL`;
      else { qMat += ` AND te.pagado = $${pMat.length+1}`; pMat.push(pagado === 'true'); }
    }
    if (busqueda) {
      qMat += ` AND (
        g.nombre ILIKE $${pMat.length+1} OR 
        g.apellido_paterno ILIKE $${pMat.length+1} OR 
        g.rut ILIKE $${pMat.length+1} OR 
        i.nombre ILIKE $${pMat.length+1}
      )`;
      pMat.push(`%${busqueda}%`);
    }
    qMat += ` ORDER BY te.fecha DESC, te.created_at DESC`;

    const { rows: materializados } = await query(qMat, pMat);

    // 2) TE virtuales desde pauta mensual (pm.meta) que no estén materializados
    let qVirt = `
      SELECT 
        ('pm-'||pm.id)::text as id,
        (pm.meta->>'cobertura_guardia_id')::uuid as guardia_id,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        pm.puesto_id,
        pm.id as pauta_id,
        make_date(pm.anio, pm.mes, pm.dia) as fecha,
        CASE WHEN po.es_ppc THEN 'ppc' ELSE 'reemplazo' END as estado,
        COALESCE(i.valor_turno_extra, 0) as valor,
        false as pagado,
        NULL::timestamp as fecha_pago,
        NULL::text as observaciones_pago,
        NULL::text as usuario_pago,
        NULL::bigint as planilla_id,
        NOW() as created_at,
        'virtual' as source
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
      JOIN instalaciones i ON i.id = po.instalacion_id
      JOIN guardias g ON g.id::text = (pm.meta->>'cobertura_guardia_id')
      WHERE pm.meta->>'cobertura_guardia_id' IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM TE_turnos_extras tx WHERE tx.pauta_id = pm.id)
    `;
    const pVirt: any[] = [];
    if (instalacion_id) { qVirt += ` AND po.instalacion_id = $${pVirt.length+1}`; pVirt.push(instalacion_id); }
    if (fecha_inicio) { qVirt += ` AND make_date(pm.anio, pm.mes, pm.dia) >= $${pVirt.length+1}`; pVirt.push(fecha_inicio); }
    if (fecha_fin) { qVirt += ` AND make_date(pm.anio, pm.mes, pm.dia) <= $${pVirt.length+1}`; pVirt.push(fecha_fin); }
    if (estado && estado !== 'all') { qVirt += ` AND (CASE WHEN po.es_ppc THEN 'ppc' ELSE 'reemplazo' END) = $${pVirt.length+1}`; pVirt.push(estado); }
    if (busqueda) {
      qVirt += ` AND (
        g.nombre ILIKE $${pVirt.length+1} OR 
        g.apellido_paterno ILIKE $${pVirt.length+1} OR 
        g.rut ILIKE $${pVirt.length+1} OR 
        i.nombre ILIKE $${pVirt.length+1}
      )`;
      pVirt.push(`%${busqueda}%`);
    }
    qVirt += ` ORDER BY fecha DESC`;

    const { rows: virtuales } = await query(qVirt, pVirt);

    const rows = [...materializados, ...virtuales];

    return NextResponse.json({ 
      ok: true, 
      turnos_extras: rows,
      total: rows.length
    });

  } catch (error) {
    logger.error('Error al obtener turnos extras::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 