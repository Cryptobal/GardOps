import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, anio, mes } = body;

    if (!instalacion_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Verificar si ya existe pauta para esta instalación en este mes
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
    `, [instalacion_id, anio, mes]);

    if (parseInt(pautaExistente.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Ya existe una pauta mensual para esta instalación en el mes especificado' },
        { status: 409 }
      );
    }

    // 1. PRIMERO: Verificar si hay roles de servicio creados para la instalación
    const rolesResult = await query(`
      SELECT 
        tc.id,
        tc.rol_servicio_id,
        rs.nombre as rol_nombre,
        tc.cantidad_guardias
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1 AND tc.estado = 'Activo'
      ORDER BY rs.nombre
    `, [instalacion_id]);

    if (rolesResult.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Instalación sin rol de servicio creado. Por favor, crea un rol de servicio desde el módulo de asignaciones en la instalación.',
          tipo: 'sin_roles'
        },
        { status: 400 }
      );
    }

    // 2. SEGUNDO: Verificar si hay PPCs activos generados por esos roles
    const ppcsResult = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        rs.nombre as rol_servicio_nombre,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
      ORDER BY rs.nombre
    `, [instalacion_id]);

    if (ppcsResult.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Roles de servicio creados pero sin PPCs activos. Por favor, verifica la configuración de los roles.',
          tipo: 'roles_sin_ppcs',
          roles_creados: rolesResult.rows.length
        },
        { status: 400 }
      );
    }

    // 3. TERCERO: Verificar si hay guardias asignados a los PPCs
    const guardiasResult = await query(`
      SELECT 
        g.id::text as id,
        g.nombre,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true 
        AND ta.estado = 'Activa'
      ORDER BY g.nombre
    `, [instalacion_id]);

    if (guardiasResult.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Hay PPCs pendientes pero no hay guardias asignados. Por favor, asigna guardias a los PPCs pendientes antes de crear la pauta.',
          tipo: 'ppcs_sin_guardias',
          ppcs_pendientes: ppcsResult.rows.length
        },
        { status: 400 }
      );
    }

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    // Crear pauta base para cada guardia
    const pautasParaInsertar = [];
    
    for (const guardia of guardiasResult.rows) {
      for (const dia of diasDelMes) {
        // Por defecto, todos los días como "libre"
        pautasParaInsertar.push({
          instalacion_id: instalacion_id.toString(),
          guardia_id: guardia.id,
          dia: parseInt(dia.toString()),
          tipo: 'libre'
        });
      }
    }

    // Insertar todas las pautas
    const insertPromises = pautasParaInsertar.map(pauta => 
      query(`
        INSERT INTO as_turnos_pauta_mensual (instalacion_id, guardia_id, anio, mes, dia, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pauta.instalacion_id, pauta.guardia_id, anio, mes, pauta.dia, pauta.tipo])
    );

    await Promise.all(insertPromises);

    console.log(`✅ Pauta mensual creada automáticamente para instalación ${instalacion_id} en ${mes}/${anio}`);
    console.log(`📊 Resumen: ${pautasParaInsertar.length} registros creados para ${guardiasResult.rows.length} guardias`);
    console.log(`🔍 Roles de servicio: ${rolesResult.rows.length}, PPCs activos: ${ppcsResult.rows.length}`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual creada exitosamente',
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      roles_servicio: rolesResult.rows.length,
      ppcs_activos: ppcsResult.rows.length,
      guardias_procesados: guardiasResult.rows.length,
      registros_creados: pautasParaInsertar.length,
      dias_del_mes: diasDelMes.length
    });

  } catch (error) {
    console.error('❌ Error creando pauta mensual automática:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la pauta mensual' },
      { status: 500 }
    );
  }
} 