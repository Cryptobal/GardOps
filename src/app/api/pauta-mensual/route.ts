import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';
import { logCRUD, logError } from '@/lib/logging';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'pauta_mensual', action: 'read:list' });
  if (deny) return deny;

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🚀 Iniciando carga de pauta mensual`);
    
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    // Tomar tenant del contexto seteado por requireAuthz (priorizando selectedTenantId)
          const ctx = (request as any).ctx as { userId: string; tenantId: string; selectedTenantId: string | null; isPlatformAdmin?: boolean };
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    const usuario = ctx?.userId;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'TENANT_REQUIRED' }, { status: 400 });
    }

    console.log(`[${timestamp}] 📥 Parámetros recibidos:`, { instalacion_id, anio, mes });

    // Si no se proporcionan parámetros específicos, devolver resumen del tenant
    if (!instalacion_id || !anio || !mes) {
      console.log(`[${timestamp}] 📊 Devolviendo resumen del tenant ${tenantId}`);
      
      // Obtener todas las instalaciones del tenant con pautas
      const resumenResult = await query(`
        SELECT 
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          c.nombre as cliente_nombre,
          COUNT(DISTINCT pm.puesto_id) as puestos_con_pauta,
          COUNT(DISTINCT po.id) as total_puestos
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id AND po.activo = true
        LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
        WHERE i.tenant_id = $1 AND i.estado = 'Activo'
        GROUP BY i.id, i.nombre, c.nombre
        ORDER BY i.nombre
      `, [tenantId]);
      
      return NextResponse.json({
        success: true,
        tipo: 'resumen',
        data: resumenResult.rows
      });
    }

    // Obtener la pauta mensual desde la base de datos usando el nuevo modelo
    const pautaQueryStart = Date.now();
    const pautaResult = await query(`
      SELECT 
        pm.puesto_id,
        pm.guardia_id,
        pm.dia,
        pm.estado,
        pm.estado_ui,
        pm.meta,
        po.nombre_puesto,
        po.es_ppc,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        
        -- Información de cobertura tomada desde meta
        (pm.meta->>'cobertura_guardia_id') as cobertura_guardia_id,
        rg.nombre as cobertura_nombre,
        rg.apellido_paterno as cobertura_apellido_paterno,
        rg.apellido_materno as cobertura_apellido_materno,
        CASE 
          WHEN (pm.meta->>'te_origen') IS NOT NULL THEN (pm.meta->>'te_origen')
          WHEN (pm.meta->>'cobertura_guardia_id') IS NOT NULL AND po.es_ppc THEN 'ppc'
          WHEN (pm.meta->>'cobertura_guardia_id') IS NOT NULL THEN 'reemplazo'
          ELSE NULL
        END as tipo_cobertura
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias rg ON rg.id::text = (pm.meta->>'cobertura_guardia_id')
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
        AND po.activo = true
        AND i.tenant_id = $4
      ORDER BY po.nombre_puesto, pm.dia
    `, [instalacion_id, anio, mes, tenantId]);
    
    const pautaQueryEnd = Date.now();
    console.log(`[${timestamp}] 🐌 Query pauta mensual: ${pautaQueryEnd - pautaQueryStart}ms, ${pautaResult.rows.length} registros encontrados`);

    // Obtener todos los puestos operativos de la instalación (con y sin guardia asignado)
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
        AND i.tenant_id = $2
      ORDER BY po.nombre_puesto
    `, [instalacion_id, tenantId]);

    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, 
      (_, i) => i + 1
    );

    console.log(`[${timestamp}] 📅 Generando pauta para ${diasDelMes.length} días del mes`);

    // Crear pauta en el formato esperado por el frontend
    const pauta = puestosResult.rows.map((puesto: any) => {
      // Buscar registros de pauta para este puesto específico
      const pautaPuesto = pautaResult.rows.filter((p: any) => p.puesto_id === puesto.puesto_id);
      
      console.log(`[${timestamp}] 🔍 Puesto ${puesto.puesto_id} (${puesto.nombre_puesto}): ${pautaPuesto.length} registros encontrados`);
      
      // Crear array de días para este puesto
      const dias = diasDelMes.map(dia => {
        const pautaDia = pautaPuesto.find((p: any) => p.dia === dia);
        const estadoUi = (pautaDia?.estado_ui || '').toLowerCase();
        const estadoDb = (pautaDia?.estado || '').toLowerCase();
        const hasCobertura = Boolean(pautaDia?.cobertura_guardia_id);
        const isTE = (pautaDia?.meta?.tipo === 'turno_extra') || hasCobertura || estadoUi === 'te';
        
        // 1) Si es TE por meta/cobertura/estado_ui => siempre 'R'
        if (isTE) return 'R';

        // 2) Preferir estado_ui cuando existe
        if (estadoUi) {
          switch (estadoUi) {
            case 'trabajado':
            case 'a':
            case 'asistido':
              return 'A';
            case 'plan':
            case 'planificado':
              return 'planificado';
            case 'inasistencia':
              return 'I';
            case 'sin_cobertura':
              return 'S';
            case 'libre':
              return 'L';
            case 'permiso':
              return 'P';
            case 'vacaciones':
              return 'V';
            case 'licencia':
              return 'M';
            default:
              break;
          }
        }

        // 3) Fallback a estado de BD para no perder planificación planificado/libre
        switch (estadoDb) {
          case 'planificado':
            return 'planificado';
          case 'libre':
            return 'L';
          case 'trabajado':
          case 'asistido':
            return 'A';
          case 'inasistencia':
            return 'I';
          case 'permiso':
            return 'P';
          case 'vacaciones':
            return 'V';
          case 'licencia':
            return 'M';
          case 'sin_cobertura':
            return 'S';
          default:
            return '';
        }
      });

      // Crear información de cobertura por día
      const coberturaPorDia = diasDelMes.map(dia => {
        const pautaDia = pautaPuesto.find((p: any) => p.dia === dia);
        if (pautaDia?.cobertura_guardia_id) {
          return {
            guardia_id: pautaDia.cobertura_guardia_id,
            nombre: `${pautaDia.cobertura_nombre} ${pautaDia.cobertura_apellido_paterno} ${pautaDia.cobertura_apellido_materno || ''}`.trim(),
            tipo: pautaDia.tipo_cobertura // 'ppc' o 'reemplazo'
          };
        }
        return null;
      });

      return {
        id: puesto.puesto_id,
        nombre: puesto.nombre_completo,
        nombre_puesto: puesto.nombre_puesto,
        patron_turno: puesto.patron_turno || '4x4',
        dias: dias,
        cobertura_por_dia: coberturaPorDia, // Nueva información de cobertura
        tipo: puesto.tipo,
        es_ppc: puesto.es_ppc,
        guardia_id: puesto.guardia_id,
        rol_nombre: puesto.rol_nombre
      };
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Crear un ID único para la pauta mensual
    const pautaId = `${instalacion_id}_${anio}_${mes}`;
    
    // Log de lectura de pauta mensual
    await logCRUD(
      'pauta_mensual',
      pautaId,
      'READ',
      usuario,
      null, // No hay datos anteriores en lectura
      {
        instalacion_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        total_puestos: pauta.length,
        dias_mes: diasDelMes.length,
        registros_encontrados: pautaResult.rows.length,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      },
      tenantId
    );
    
    console.log(`[${timestamp}] ✅ Pauta mensual cargada exitosamente`);
    console.log(`[${timestamp}] 📊 Resumen: ${pauta.length} puestos, ${diasDelMes.length} días por puesto`);
    console.log(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    return NextResponse.json({
      success: true,
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      pauta: pauta,
      metadata: {
        total_puestos: pauta.length,
        dias_mes: diasDelMes.length,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      }
    });

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Error obteniendo pauta mensual:`, error);
    
    // Log del error
    await logCRUD(
      'pauta_mensual',
      'ERROR',
      'READ',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-mensual',
        method: 'GET',
        timestamp: errorTime
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al obtener la pauta mensual',
        timestamp: errorTime,
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 