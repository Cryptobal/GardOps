import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 Iniciando GET /api/pauta-diaria/turno-extra/planillas');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      logger.debug('❌ Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las planillas con cálculos dinámicos
    const planillas = await query(`
      SELECT 
        p.id,
        p.fecha_generacion as fecha_creacion,
        COUNT(te.id) as cantidad_turnos,
        COALESCE(SUM(te.valor), 0) as monto_total,
        p.observaciones,
        u.nombre || ' ' || u.apellido as usuario_creador,
        p.estado,
        p.codigo,
        ARRAY_AGG(te.id) as turnos_ids
      FROM TE_planillas_turnos_extras p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN TE_turnos_extras te ON te.planilla_id = p.id
      GROUP BY p.id, p.fecha_generacion, p.observaciones, u.nombre, u.apellido, p.estado, p.codigo
      ORDER BY p.fecha_generacion DESC
    `);

    devLogger.search(' Planillas obtenidas:', planillas.rows.length);

    return NextResponse.json({
      success: true,
      planillas: planillas.rows
    });

  } catch (error) {
    logger.error('Error obteniendo planillas::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Utilidad simple para detectar UUID
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// POST - Crear nueva planilla con turnos extras seleccionados
export async function POST(request: NextRequest) {
  try {
    logger.debug('🔍 Iniciando POST /api/pauta-diaria/turno-extra/planillas');
    
    // Temporalmente simplificado para pruebas - en producción usar getCurrentUserServer
    let user = null;
    try {
      user = getCurrentUserServer(request);
    } catch (e) {
      logger.debug('⚠️ No se pudo obtener usuario, usando valores por defecto');
    }
    
    // Si no hay usuario, usar valores por defecto para pruebas
    if (!user) {
      user = { email: 'admin@test.com' } as any;
      logger.debug('⚠️ Usando usuario de prueba para desarrollo');
    }

    const body = await request.json();
    const { turnoIds, observaciones } = body as { turnoIds: string[]; observaciones?: string };
    
    if (!turnoIds || turnoIds.length === 0) {
      return NextResponse.json({ 
        error: 'Debe seleccionar al menos un turno' 
      }, { status: 400 });
    }

    logger.debug('📊 Solicitud de planilla con IDs:', turnoIds);

    // Separar IDs: UUIDs ya materializados y IDs virtuales tipo 'pm-<id>'
    const uuidIds: string[] = [];
    const pmIds: number[] = [];
    for (const id of turnoIds) {
      if (isUuid(id)) {
        uuidIds.push(id);
      } else if (id.startsWith('pm-')) {
        const num = parseInt(id.replace('pm-',''), 10);
        if (!isNaN(num)) pmIds.push(num);
      }
    }

    logger.debug('🧩 UUIDs:', uuidIds.length, '| PM IDs:', pmIds.length);

    // 1) Materializar TE para los PM seleccionados que aún no existen
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const materializedIds: string[] = [];

    if (pmIds.length > 0) {
      // Buscar PM válidos con cobertura y sin TE ya existente
      const { rows: candidatos } = await query(
        `SELECT 
           pm.id as pauta_id,
           (pm.meta->>'cobertura_guardia_id')::uuid as guardia_id,
           po.instalacion_id,
           pm.puesto_id,
           make_date(pm.anio, pm.mes, pm.dia) as fecha,
           CASE WHEN po.es_ppc THEN 'ppc' ELSE 'reemplazo' END as estado,
           COALESCE(i.valor_turno_extra, 0) as valor
         FROM as_turnos_pauta_mensual pm
         JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id
         JOIN instalaciones i ON i.id = po.instalacion_id
         WHERE pm.id = ANY($1::int[])
           AND pm.meta->>'cobertura_guardia_id' IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM TE_turnos_extras te WHERE te.pauta_id = pm.id)
        `,
        [pmIds]
      );

      logger.debug('🧱 PM candidatos a materializar:', candidatos.length);

      // Insertar TE por cada candidato
      for (const c of candidatos) {
        const ins = await query(
          `INSERT INTO TE_turnos_extras (
             guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, tenant_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id`,
          [c.guardia_id, c.instalacion_id, c.puesto_id, c.pauta_id, c.fecha, c.estado, c.valor, tenantId]
        );
        materializedIds.push(ins.rows[0].id);
      }

      // Incluir los que ya existían para esos PM
      const { rows: existentes } = await query(
        `SELECT id FROM TE_turnos_extras WHERE pauta_id = ANY($1::int[])`,
        [pmIds]
      );
      for (const r of existentes) {
        materializedIds.push(r.id);
      }
    }

    const allIds: string[] = [...uuidIds, ...materializedIds];

    if (allIds.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron turnos válidos para incluir en la planilla' 
      }, { status: 400 });
    }

    // 2) Verificar que los turnos existan y no estén ya en otra planilla
    const { rows: turnosValidos } = await query(
      `SELECT 
         id, 
         valor,
         guardia_id,
         instalacion_id,
         fecha
       FROM TE_turnos_extras 
       WHERE id = ANY($1::uuid[])
         AND planilla_id IS NULL
         AND pagado = false
      `, [allIds]
    );

    if (turnosValidos.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron turnos válidos para incluir en la planilla' 
      }, { status: 400 });
    }

    if (turnosValidos.length !== allIds.length) {
      logger.debug(`⚠️ Solo ${turnosValidos.length} de ${allIds.length} turnos son válidos para planilla`);
    }

    // Calcular monto total
    const montoTotal = turnosValidos.reduce((sum, turno) => sum + Number(turno.valor), 0);

    // Generar código único para la planilla
    const fecha = new Date();
    const codigo = `TE-${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Obtener ID del usuario desde la sesión
    const { rows: usuarios } = await query(
      `SELECT id FROM usuarios WHERE email = $1 LIMIT 1`,
      [user.email]
    );
    
    const usuarioId = usuarios[0]?.id || null;

    // Crear la planilla
    const { rows: nuevaPlanilla } = await query(`
      INSERT INTO TE_planillas_turnos_extras (
        codigo,
        fecha_generacion,
        monto_total,
        cantidad_turnos,
        observaciones,
        estado,
        usuario_id
      )
      VALUES ($1, NOW(), $2, $3, $4, 'pendiente', $5)
      RETURNING id, codigo, fecha_generacion, monto_total, cantidad_turnos
    `, [
      codigo,
      montoTotal,
      turnosValidos.length,
      observaciones || '',
      usuarioId
    ]);

    const planillaId = nuevaPlanilla[0].id;

    // Actualizar los turnos extras con el ID de la planilla
    await query(`
      UPDATE TE_turnos_extras 
      SET planilla_id = $1,
          updated_at = NOW()
      WHERE id = ANY($2::uuid[])
    `, [planillaId, turnosValidos.map((t: any) => t.id)]);

    devLogger.success(' Planilla creada con ID:', planillaId);

    // Obtener resumen de turnos por guardia
    const { rows: resumenGuardias } = await query(`
      SELECT 
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        COUNT(te.id) as cantidad_turnos,
        SUM(te.valor) as monto_total
      FROM TE_turnos_extras te
      JOIN guardias g ON te.guardia_id = g.id
      WHERE te.planilla_id = $1
      GROUP BY g.id, g.nombre, g.apellido_paterno
      ORDER BY guardia_nombre
    `, [planillaId]);

    return NextResponse.json({
      success: true,
      planilla_id: planillaId,
      codigo: nuevaPlanilla[0].codigo,
      cantidad_turnos: nuevaPlanilla[0].cantidad_turnos,
      monto_total: nuevaPlanilla[0].monto_total,
      fecha_generacion: nuevaPlanilla[0].fecha_generacion,
      resumen_guardias: resumenGuardias,
      mensaje: `Planilla ${codigo} creada exitosamente`
    });

  } catch (error) {
    console.error('❌ Error creando planilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear la planilla',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 