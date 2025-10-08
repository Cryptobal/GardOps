import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { validate as validateUUID } from 'uuid';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET: Obtener todos los datos de una instalación en una sola llamada optimizada
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    if (!validateUUID(instalacionId)) {
      return NextResponse.json({ success: false, error: 'ID de instalación inválido (no es UUID)' }, { status: 400 });
    }
    const startTime = Date.now();

    devLogger.search(' Iniciando endpoint completa para instalación:', instalacionId);

    // 1. Datos básicos de la instalación
    logger.debug('1. Consultando instalación...');
    const instalacionResult = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at
      FROM instalaciones i
      WHERE i.id = $1
    `, [instalacionId]);

    // Verificar que la instalación existe
    if (instalacionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = instalacionResult.rows[0];
    devLogger.success(' Instalación encontrada:', instalacion.nombre);
    devLogger.search(' Datos de instalación completos:', instalacion);

    // 2. Obtener información del cliente
    logger.debug('2. Consultando cliente...');
    let cliente_nombre = 'Cliente no encontrado';
    if (instalacion.cliente_id) {
      try {
        const clienteResult = await query(`
          SELECT nombre FROM clientes WHERE id = $1
        `, [instalacion.cliente_id]);
        
        if (clienteResult.rows.length > 0) {
          cliente_nombre = clienteResult.rows[0].nombre;
        }
      } catch (error) {
        logger.warn('⚠️ Error obteniendo cliente:', error);
      }
    }
    instalacion.cliente_nombre = cliente_nombre;
    devLogger.success(' Cliente:', cliente_nombre);

    // 3. Consultar puestos operativos
    logger.debug('3. Consultando puestos operativos...');
    let puestosOperativosResult;
    try {
      puestosOperativosResult = await query(`
        SELECT 
          po.id,
          po.instalacion_id,
          po.rol_id,
          po.guardia_id,
          po.nombre_puesto,
          po.es_ppc,
          po.creado_en,
          po.tenant_id,
          po.tipo_puesto_id,
          rs.nombre as rol_nombre,
          rs.dias_trabajo,
          rs.dias_descanso,
          rs.horas_turno,
          rs.hora_inicio,
          rs.hora_termino,
          rs.estado as rol_estado,
          rs.created_at as rol_created_at,
          rs.updated_at as rol_updated_at,
          g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre,
          tp.nombre as tipo_nombre,
          tp.emoji as tipo_emoji,
          tp.color as tipo_color
        FROM as_turnos_puestos_operativos po
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON po.guardia_id = g.id
        LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
        WHERE po.instalacion_id = $1 AND po.activo = true
        ORDER BY po.rol_id, po.nombre_puesto, po.creado_en
      `, [instalacionId]);
      logger.debug(`✅ Puestos operativos encontrados: ${puestosOperativosResult.rows.length}`);
      
      // Agregar diagnóstico detallado
      logger.debug('🔍 Diagnóstico de puestos operativos:');
      puestosOperativosResult.rows.forEach((row: any, index: number) => {
        logger.debug(`   Puesto ${index + 1}:`);
        logger.debug(`     ID: ${row.id}`);
        logger.debug(`     Nombre: ${row.nombre_puesto}`);
        logger.debug(`     Rol ID: ${row.rol_id}`);
        logger.debug(`     Rol Nombre: ${row.rol_nombre || 'NULL'}`);
        logger.debug(`     Es PPC: ${row.es_ppc}`);
        logger.debug(`     Guardia ID: ${row.guardia_id || 'NULL'}`);
        logger.debug(`     Guardia Nombre: ${row.guardia_nombre || 'NULL'}`);
        logger.debug(`     Horario: ${row.hora_inicio || 'NULL'} - ${row.hora_termino || 'NULL'}`);
        logger.debug(`     Días: ${row.dias_trabajo || 'NULL'}x${row.dias_descanso || 'NULL'}x${row.horas_turno || 'NULL'}`);
      });
      
      // Verificar si hay duplicados por rol
      const puestosPorRol: { [key: string]: any[] } = {};
      puestosOperativosResult.rows.forEach((row: any) => {
        if (!puestosPorRol[row.rol_id]) {
          puestosPorRol[row.rol_id] = [];
        }
        puestosPorRol[row.rol_id].push(row);
      });
      
      logger.debug(`📊 Puestos por rol:`);
      Object.keys(puestosPorRol).forEach(rolId => {
        const puestos = puestosPorRol[rolId];
        logger.debug(`   Rol ${rolId}: ${puestos.length} puestos`);
        puestos.forEach((puesto: any, index: number) => {
          logger.debug(`     ${index + 1}. ${puesto.nombre_puesto} - PPC: ${puesto.es_ppc} - Guardia: ${puesto.guardia_id ? 'Sí' : 'No'}`);
        });
      });
      
    } catch (error) {
      console.error('❌ Error consultando puestos operativos:', error);
      puestosOperativosResult = { rows: [] };
    }

    // 4. Consultar roles de servicio (solo los asociados a esta instalación)
    logger.debug('4. Consultando roles de servicio de la instalación...');
    let rolesInstalacionResult;
    try {
      rolesInstalacionResult = await query(`
        SELECT DISTINCT
          rs.id,
          rs.nombre,
          rs.dias_trabajo,
          rs.dias_descanso,
          rs.horas_turno,
          rs.hora_inicio,
          rs.hora_termino,
          rs.estado,
          rs.tenant_id,
          rs.created_at,
          rs.updated_at
        FROM as_turnos_roles_servicio rs
        INNER JOIN as_turnos_puestos_operativos po ON po.rol_id = rs.id
        WHERE po.instalacion_id = $1
          AND rs.estado = 'Activo'
        ORDER BY rs.nombre
      `, [instalacionId]);
      logger.debug(`✅ Roles de servicio de la instalación encontrados: ${rolesInstalacionResult.rows.length}`);
    } catch (error) {
      console.error('❌ Error consultando roles de servicio de la instalación:', error);
      rolesInstalacionResult = { rows: [] };
    }

    // 5. Consultar pauta mensual
    logger.debug('5. Consultando pauta mensual...');
    let pautaMensualResult;
    try {
      pautaMensualResult = await query(`
        SELECT 
          pm.id,
          pm.guardia_id,
          pm.anio,
          pm.mes,
          pm.dia,
          -- Mapear campos nuevos a estado legacy para compatibilidad
          CASE 
            WHEN pm.tipo_turno = 'libre' THEN 'libre'
            WHEN pm.estado_puesto = 'libre' THEN 'libre'
            WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
            WHEN pm.estado_puesto = 'ppc' AND pm.tipo_cobertura = 'turno_extra' THEN 'trabajado'
            WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'asistido' THEN 'trabajado'
            WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'turno_extra' THEN 'reemplazo'
            WHEN pm.estado_puesto = 'asignado' AND pm.estado_guardia = 'falta' AND pm.tipo_cobertura = 'sin_cobertura' THEN 'inasistencia'
            ELSE 'planificado'
          END as estado,
          pm.created_at,
          pm.updated_at,
          g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre,
          g.rut as guardia_rut
        FROM as_turnos_pauta_mensual pm
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        WHERE pm.guardia_id IN (
          SELECT DISTINCT po.guardia_id 
          FROM as_turnos_puestos_operativos po 
          WHERE po.instalacion_id = $1 AND po.guardia_id IS NOT NULL
        )
        ORDER BY pm.anio DESC, pm.mes DESC, pm.dia DESC
        LIMIT 50
      `, [instalacionId]);
      logger.debug(`✅ Pauta mensual encontrada: ${pautaMensualResult.rows.length} registros`);
    } catch (error) {
      console.error('❌ Error consultando pauta mensual:', error);
      pautaMensualResult = { rows: [] };
    }

    // Transformar datos
    logger.debug('6. Transformando datos...');

    // Agrupar puestos operativos por rol de servicio para crear turnos
    const puestosPorRol = puestosOperativosResult.rows.reduce((acc: any, row: any) => {
      const rolId = row.rol_id;
      if (!acc[rolId]) {
        acc[rolId] = {
          id: rolId, // Usar el rol_id como ID del turno
          instalacion_id: row.instalacion_id,
          rol_servicio_id: row.rol_id,
          cantidad_guardias: 0,
          estado: 'Activo',
          created_at: row.creado_en,
          updated_at: row.creado_en,
          rol_servicio: {
            id: row.rol_id,
            nombre: row.rol_nombre || 'Sin nombre',
            descripcion: '',
            dias_trabajo: row.dias_trabajo,
            dias_descanso: row.dias_descanso,
            horas_turno: row.horas_turno,
            hora_inicio: row.hora_inicio,
            hora_termino: row.hora_termino,
            estado: row.rol_estado || 'Activo',
            tenant_id: row.tenant_id,
            created_at: row.rol_created_at,
            updated_at: row.rol_updated_at,
          },
          guardias_asignados: 0,
          ppc_pendientes: 0,
          puestos: []
        };
      }
      
      // Agregar el puesto al rol
      acc[rolId].puestos.push({
        id: row.id,
        nombre_puesto: row.nombre_puesto,
        es_ppc: row.es_ppc,
        guardia_asignado_id: row.guardia_id,
        guardia_nombre: row.guardia_nombre,
        tipo_puesto_id: row.tipo_puesto_id,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color
      });
      
      // Actualizar contadores
      acc[rolId].cantidad_guardias += 1;
      if (row.guardia_id) {
        acc[rolId].guardias_asignados += 1;
      } else if (row.es_ppc) {
        acc[rolId].ppc_pendientes += 1;
      }
      
      return acc;
    }, {});

    // Convertir el objeto agrupado a array
    const turnos = Object.values(puestosPorRol);

    logger.debug(`📊 Turnos encontrados: ${turnos.length}`);
    
    // Calcular totales para verificación
    const totalPuestos = turnos.reduce((sum: number, turno: any) => sum + turno.cantidad_guardias, 0);
    const totalAsignados = turnos.reduce((sum: number, turno: any) => sum + turno.guardias_asignados, 0);
    const totalPendientes = turnos.reduce((sum: number, turno: any) => sum + turno.ppc_pendientes, 0);
    
    logger.debug(`📊 Total puestos: ${totalPuestos}, Asignados: ${totalAsignados}, Pendientes: ${totalPendientes}`);

    // Crear PPCs basados en puestos operativos (tanto pendientes como asignados)
    const ppcs = puestosOperativosResult.rows
      .map((row: any) => ({
        id: row.id,
        instalacion_id: row.instalacion_id,
        rol_servicio_id: row.rol_id,
        motivo: row.guardia_id ? 'Puesto operativo asignado' : 'Puesto operativo sin asignación',
        observacion: `PPC para puesto: ${row.nombre_puesto}`,
        creado_en: row.creado_en,
        rol_servicio_nombre: row.rol_nombre || 'Sin nombre',
        hora_inicio: row.hora_inicio,
        hora_termino: row.hora_termino,
        cantidad_faltante: 1,
        estado: row.guardia_id ? 'Asignado' : 'Pendiente',
        guardia_asignado_id: row.guardia_id,
        guardia_nombre: row.guardia_nombre,
        nombre_puesto: row.nombre_puesto, // Agregar el campo nombre_puesto
        tipo_puesto_id: row.tipo_puesto_id,
        tipo_nombre: row.tipo_nombre,
        tipo_emoji: row.tipo_emoji,
        tipo_color: row.tipo_color
      }));

    logger.debug(`📊 PPCs encontrados: ${ppcs.length}`);

    // 7. Obtener todos los roles de servicio disponibles
    logger.debug('7. Consultando roles de servicio disponibles...');
    let rolesDisponiblesResult;
    try {
      // Obtener el tenant_id del usuario autenticado
      const email = request.headers.get('x-user-email');
      let tenantId = null;
      
      if (email) {
        const tenantResult = await query(`
          SELECT tenant_id::text AS tid 
          FROM usuarios 
          WHERE lower(email) = lower($1) 
          LIMIT 1
        `, [email]);
        tenantId = tenantResult.rows?.[0]?.tid || null;
      }

      devLogger.search(' Tenant ID obtenido:', tenantId);

      let rolesQuery = `
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
        FROM as_turnos_roles_servicio 
        WHERE estado = 'Activo'
      `;
      
      const rolesParams: any[] = [];
      let paramIndex = 1;

      if (tenantId) {
        rolesQuery += ` AND tenant_id::text = $${paramIndex}`;
        rolesParams.push(tenantId);
        paramIndex++;
      } else {
        // Sin tenant => no devolver nada
        rolesQuery += ` AND 1=0`;
      }

      rolesQuery += ' ORDER BY nombre';

      devLogger.search(' Query roles:', rolesQuery);
      devLogger.search(' Parámetros roles:', rolesParams);

      rolesDisponiblesResult = await query(rolesQuery, rolesParams);
      logger.debug(`✅ Roles de servicio disponibles encontrados: ${rolesDisponiblesResult.rows.length}`);
    } catch (error) {
      console.error('❌ Error consultando roles de servicio disponibles:', error);
      rolesDisponiblesResult = { rows: [] };
    }

    // Crear guardias asignados basados en puestos operativos con guardia asignada
    const guardiasAsignados = puestosOperativosResult.rows
      .filter((row: any) => row.guardia_id)
      .map((row: any) => ({
        id: row.id, // Usar el ID del puesto operativo, no del guardia
        nombre: row.guardia_nombre?.split(' ')[0] || '',
        apellido_paterno: row.guardia_nombre?.split(' ')[1] || '',
        apellido_materno: row.guardia_nombre?.split(' ')[2] || '',
        nombre_completo: row.guardia_nombre || 'Sin nombre',
        nombre_puesto: row.nombre_puesto, // Agregar el nombre del puesto
        rut: '', // No disponible en esta consulta
        comuna: '', // No disponible en esta consulta
        region: '', // No disponible en esta consulta
        tipo: 'asignado',
        activo: true,
        rol_servicio: {
          nombre: row.rol_nombre || 'Sin nombre',
          dias_trabajo: row.dias_trabajo,
          dias_descanso: row.dias_descanso,
          horas_turno: row.horas_turno,
          hora_inicio: row.hora_inicio,
          hora_termino: row.hora_termino
        }
      }));

    logger.debug(`👥 Guardias asignados encontrados: ${guardiasAsignados.length}`);

    // Crear PPCs pendientes como "guardias" virtuales
    const ppcsPendientes = ppcs
      .filter((ppc: any) => ppc.estado === 'Pendiente') // Solo PPCs pendientes
      .map((ppc: any) => {
        // Buscar la información del rol de servicio desde puestosOperativosResult
        const puestoOperativo = puestosOperativosResult.rows.find((row: any) => row.id === ppc.id);
        
        return {
          id: ppc.id,
          nombre: `PPC ${ppc.nombre_puesto}`,
          apellido_paterno: '',
          apellido_materno: '',
          nombre_completo: `PPC ${ppc.nombre_puesto}`,
          nombre_puesto: ppc.nombre_puesto, // Agregar el nombre del puesto
          rut: '',
          comuna: '',
          region: '',
          tipo: 'ppc',
          activo: false,
          rol_servicio: {
            nombre: ppc.rol_servicio_nombre,
            dias_trabajo: puestoOperativo?.dias_trabajo || 4,
            dias_descanso: puestoOperativo?.dias_descanso || 4,
            horas_turno: puestoOperativo?.horas_turno || 12,
            hora_inicio: puestoOperativo?.hora_inicio || '08:00',
            hora_termino: puestoOperativo?.hora_termino || '20:00'
          }
        };
      });

    logger.debug(`⏳ PPCs pendientes encontrados: ${ppcsPendientes.length}`);

    // Combinar guardias asignados y PPCs pendientes
    const guardias = [...guardiasAsignados, ...ppcsPendientes];
    
    console.log(`📋 Total de guardias (asignados + PPCs): ${guardias.length}`);

    // Transformar roles de servicio (usar los roles disponibles, no solo los de la instalación)
    const roles = rolesDisponiblesResult.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      dias_trabajo: row.dias_trabajo,
      dias_descanso: row.dias_descanso,
      horas_turno: row.horas_turno,
      hora_inicio: row.hora_inicio,
      hora_termino: row.hora_termino,
      estado: row.estado,
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Transformar pauta mensual
    const pautaMensual = pautaMensualResult.rows.map((row: any) => ({
      id: row.id,
      instalacion_id: row.instalacion_id,
      guardia_id: row.guardia_id,
      anio: row.anio,
      mes: row.mes,
      dia: row.dia,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      guardia_nombre: row.guardia_nombre,
      guardia_rut: row.guardia_rut
    }));

    const endTime = Date.now();
    logger.debug(`🚀 Tiempo total API instalaciones completa: ${endTime - startTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        instalacion,
        turnos,
        ppcs,
        guardias,
        roles,
        pautaMensual
      }
    });

  } catch (error) {
    console.error('❌ Error en endpoint completa:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 