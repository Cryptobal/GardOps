import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'read:list' });
  if (deny) return deny;

  try {
    console.log('🔍 Obteniendo KPIs de instalaciones...');

    // Obtener tenant_id del contexto
          const ctx = (request as any).ctx as { tenantId: string; selectedTenantId: string | null; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    console.log('🔍 Usando tenant_id:', tenantId);

    // Obtener KPIs de instalaciones con manejo de errores
    let instalacionesActivas = 0;
    let puestosActivos = 0;
    let ppcActivos = 0;
    let guardiasAsignados = 0;
    let documentosVencidos = 0;

    try {
      // Verificar si la tabla instalaciones existe y obtener datos
      const instalacionesResult = await sql`
        SELECT 
          COUNT(*) as total_instalaciones,
          COUNT(CASE WHEN estado = 'Activo' THEN 1 END) as instalaciones_activas,
          COUNT(CASE WHEN estado = 'Inactivo' THEN 1 END) as instalaciones_inactivas
        FROM instalaciones
        WHERE tenant_id = ${tenantId}
      `;
      
      instalacionesActivas = parseInt(instalacionesResult.rows[0]?.instalaciones_activas) || 0;
      console.log('✅ Instalaciones activas:', instalacionesActivas);
    } catch (error) {
      console.error('❌ Error obteniendo instalaciones:', error);
    }

    try {
      // Obtener puestos activos - solo los que están realmente activos
      const puestosResult = await sql`
        SELECT COUNT(*) as puestos_activos
        FROM as_turnos_puestos_operativos po
        WHERE (po.activo = true OR po.activo IS NULL)
        AND po.instalacion_id IN (
          SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
        )
      `;
      
      puestosActivos = parseInt(puestosResult.rows[0]?.puestos_activos) || 0;
      console.log('✅ Puestos activos (solo en instalaciones activas):', puestosActivos);
    } catch (error) {
      console.error('❌ Error obteniendo puestos:', error);
      // Intentar con tabla alternativa si existe
      try {
        const puestosAltResult = await sql`
          SELECT COUNT(*) as puestos_activos
          FROM puestos_operativos po
          WHERE (po.activo = true OR po.activo IS NULL)
          AND po.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
          )
        `;
        puestosActivos = parseInt(puestosAltResult.rows[0]?.puestos_activos) || 0;
        console.log('✅ Puestos activos (tabla alternativa):', puestosActivos);
      } catch (altError) {
        console.error('❌ Error con tabla alternativa:', altError);
      }
    }

    try {
      // Obtener PPC activos - solo los que están realmente activos
      const ppcResult = await sql`
        SELECT COUNT(*) as ppc_activos
        FROM as_turnos_puestos_operativos po
        WHERE (po.activo = true OR po.activo IS NULL)
        AND po.es_ppc = true
        AND po.instalacion_id IN (
          SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
        )
      `;
      
      ppcActivos = parseInt(ppcResult.rows[0]?.ppc_activos) || 0;
      console.log('✅ PPC activos (solo en instalaciones activas):', ppcActivos);
    } catch (error) {
      console.error('❌ Error obteniendo PPC:', error);
      // Intentar con tabla alternativa
      try {
        const ppcAltResult = await sql`
          SELECT COUNT(*) as ppc_activos
          FROM puestos_operativos po
          WHERE (po.activo = true OR po.activo IS NULL)
          AND po.es_ppc = true
          AND po.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
          )
        `;
        ppcActivos = parseInt(ppcAltResult.rows[0]?.ppc_activos) || 0;
        console.log('✅ PPC activos (tabla alternativa):', ppcActivos);
      } catch (altError) {
        console.error('❌ Error con tabla alternativa PPC:', altError);
      }
    }

    try {
      // Obtener guardias asignados - solo los que están realmente asignados
      const guardiasResult = await sql`
        SELECT COUNT(*) as guardias_asignados
        FROM as_turnos_puestos_operativos po
        WHERE (po.activo = true OR po.activo IS NULL)
        AND po.guardia_id IS NOT NULL
        AND po.instalacion_id IN (
          SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
        )
      `;
      
      guardiasAsignados = parseInt(guardiasResult.rows[0]?.guardias_asignados) || 0;
      console.log('✅ Guardias asignados (solo en instalaciones activas):', guardiasAsignados);
    } catch (error) {
      console.error('❌ Error obteniendo guardias asignados:', error);
      // Intentar con tabla alternativa
      try {
        const guardiasAltResult = await sql`
          SELECT COUNT(*) as guardias_asignados
          FROM puestos_operativos po
          WHERE (po.activo = true OR po.activo IS NULL)
          AND po.guardia_id IS NOT NULL
          AND po.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
          )
        `;
        guardiasAsignados = parseInt(guardiasAltResult.rows[0]?.guardias_asignados) || 0;
        console.log('✅ Guardias asignados (tabla alternativa):', guardiasAsignados);
      } catch (altError) {
        console.error('❌ Error con tabla alternativa guardias:', altError);
      }
    }

    try {
      // Obtener documentos vencidos - intentar diferentes tablas
      let documentosResult;
      try {
        documentosResult = await sql`
          SELECT COUNT(*) as documentos_vencidos
          FROM documentos_instalaciones di
          INNER JOIN instalaciones i ON di.instalacion_id = i.id
          WHERE di.fecha_vencimiento < NOW() AT TIME ZONE 'America/Santiago'
          AND i.estado = 'Activo' AND i.tenant_id = ${tenantId}
        `;
      } catch (error) {
        // Intentar con tabla alternativa
        documentosResult = await sql`
          SELECT COUNT(*) as documentos_vencidos
          FROM documentos d
          WHERE d.tipo = 'instalacion' 
          AND d.fecha_vencimiento < NOW() AT TIME ZONE 'America/Santiago'
          AND d.instalacion_id IN (
            SELECT id FROM instalaciones WHERE estado = 'Activo' AND tenant_id = ${tenantId}
          )
        `;
      }
      
      documentosVencidos = parseInt(documentosResult.rows[0]?.documentos_vencidos) || 0;
      console.log('✅ Documentos vencidos (solo en instalaciones activas):', documentosVencidos);
    } catch (error) {
      console.error('❌ Error obteniendo documentos vencidos:', error);
    }

    const kpis = {
      instalaciones_activas: instalacionesActivas,
      puestos_activos: puestosActivos,
      ppc_activos: ppcActivos,
      guardias_asignados: guardiasAsignados,
      documentos_vencidos: documentosVencidos
    };

    console.log('📊 KPIs finales (solo activos):', kpis);

    return NextResponse.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('❌ Error general obteniendo KPIs de instalaciones:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener KPIs',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 