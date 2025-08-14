import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { cookies } from 'next/headers';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET: Obtener alertas de documentos por vencer
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'alertas_documentos', action: 'read:list' });
  if (deny) return deny;

  try {
    const cookieStore = cookies();
    const tenantCookie = cookieStore.get('tenant');
    
    const ctx = (request as any).ctx as { tenantId?: string } | undefined;
    const tenantIdFromCtx = ctx?.tenantId ?? null;
    let tenantId: string | null = tenantIdFromCtx;
    if (!tenantId) {
      if (tenantCookie?.value) {
        try { tenantId = JSON.parse(tenantCookie.value)?.id ?? null; } catch {}
      }
    }

    // Query para documentos de clientes
    const alertasClientesQuery = `
      SELECT 
        dc.id as documento_id,
        dc.nombre as documento_nombre,
        dc.fecha_vencimiento,
        c.nombre as entidad_nombre,
        c.id as entidad_id,
        td.nombre as tipo_documento_nombre,
        td.dias_antes_alarma,
        (dc.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN dc.fecha_vencimiento::date < CURRENT_DATE THEN 'El documento ha vencido'
          WHEN dc.fecha_vencimiento::date = CURRENT_DATE THEN 'El documento vence hoy'
          WHEN (dc.fecha_vencimiento::date - CURRENT_DATE) = 1 THEN 'El documento vence mañana'
          ELSE 'El documento vence en ' || (dc.fecha_vencimiento::date - CURRENT_DATE) || ' días'
        END as mensaje,
        'clientes' as modulo
      FROM documentos_clientes dc
      JOIN clientes c ON dc.cliente_id = c.id
      LEFT JOIN tipos_documentos td ON dc.tipo_documento_id = td.id
      WHERE dc.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) <= COALESCE(td.dias_antes_alarma, 30)
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) >= -365
        ${tenantId ? `AND c.tenant_id::text = '${tenantId}'` : ''}
    `;

    // Query para documentos de instalaciones
    const alertasInstalacionesQuery = `
      SELECT 
        di.id as documento_id,
        COALESCE(td.nombre, di.tipo) as documento_nombre,
        di.fecha_vencimiento,
        i.nombre as entidad_nombre,
        i.id as entidad_id,
        td.nombre as tipo_documento_nombre,
        td.dias_antes_alarma,
        (di.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN di.fecha_vencimiento::date < CURRENT_DATE THEN 'El documento ha vencido'
          WHEN di.fecha_vencimiento::date = CURRENT_DATE THEN 'El documento vence hoy'
          WHEN (di.fecha_vencimiento::date - CURRENT_DATE) = 1 THEN 'El documento vence mañana'
          ELSE 'El documento vence en ' || (di.fecha_vencimiento::date - CURRENT_DATE) || ' días'
        END as mensaje,
        'instalaciones' as modulo
      FROM documentos_instalacion di
      JOIN instalaciones i ON di.instalacion_id = i.id
      LEFT JOIN tipos_documentos td ON di.tipo_documento_id = td.id
      WHERE di.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND (di.fecha_vencimiento::date - CURRENT_DATE) <= COALESCE(td.dias_antes_alarma, 30)
        AND (di.fecha_vencimiento::date - CURRENT_DATE) >= -365
        ${tenantId ? `AND i.tenant_id::text = '${tenantId}'` : ''}
    `;

    // Query para documentos de guardias
    const alertasGuardiasQuery = `
      SELECT 
        dg.id as documento_id,
        COALESCE(td.nombre, dg.tipo) as documento_nombre,
        dg.fecha_vencimiento,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as entidad_nombre,
        g.id as entidad_id,
        td.nombre as tipo_documento_nombre,
        td.dias_antes_alarma,
        (dg.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN dg.fecha_vencimiento::date < CURRENT_DATE THEN 'El documento ha vencido'
          WHEN dg.fecha_vencimiento::date = CURRENT_DATE THEN 'El documento vence hoy'
          WHEN (dg.fecha_vencimiento::date - CURRENT_DATE) = 1 THEN 'El documento vence mañana'
          ELSE 'El documento vence en ' || (dg.fecha_vencimiento::date - CURRENT_DATE) || ' días'
        END as mensaje,
        'guardias' as modulo
      FROM documentos_guardias dg
      JOIN guardias g ON dg.guardia_id = g.id
      LEFT JOIN tipos_documentos td ON dg.tipo_documento_id = td.id
      WHERE dg.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND (dg.fecha_vencimiento::date - CURRENT_DATE) <= COALESCE(td.dias_antes_alarma, 30)
        AND (dg.fecha_vencimiento::date - CURRENT_DATE) >= -365
        ${tenantId ? `AND g.tenant_id::text = '${tenantId}'` : ''}
    `;

    // Query para alertas de OS10 de guardias
    const alertasOS10Query = `
      SELECT 
        g.id as documento_id,
        'OS10 - Curso de Seguridad' as documento_nombre,
        g.fecha_os10 as fecha_vencimiento,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as entidad_nombre,
        g.id as entidad_id,
        'OS10' as tipo_documento_nombre,
        30 as dias_antes_alarma,
        (g.fecha_os10::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN g.fecha_os10::date < CURRENT_DATE THEN 'El curso OS10 ha vencido'
          WHEN g.fecha_os10::date = CURRENT_DATE THEN 'El curso OS10 vence hoy'
          WHEN (g.fecha_os10::date - CURRENT_DATE) = 1 THEN 'El curso OS10 vence mañana'
          ELSE 'El curso OS10 vence en ' || (g.fecha_os10::date - CURRENT_DATE) || ' días'
        END as mensaje,
        'guardias_os10' as modulo
      FROM guardias g
      WHERE g.fecha_os10 IS NOT NULL
        AND (g.fecha_os10::date - CURRENT_DATE) <= 30
        AND (g.fecha_os10::date - CURRENT_DATE) >= -365
        AND g.activo = true
        ${tenantId ? `AND g.tenant_id::text = '${tenantId}'` : ''}
    `;

    console.log('🔍 Ejecutando queries de alertas...');
    
    // Ejecutar las cuatro queries
    const [resultClientes, resultInstalaciones, resultGuardias, resultOS10] = await Promise.all([
      query(alertasClientesQuery),
      query(alertasInstalacionesQuery),
      query(alertasGuardiasQuery),
      query(alertasOS10Query)
    ]);

    console.log(`📊 Query clientes retornó ${resultClientes.rows.length} registros`);
    console.log(`📊 Query instalaciones retornó ${resultInstalaciones.rows.length} registros`);
    console.log(`📊 Query guardias retornó ${resultGuardias.rows.length} registros`);
    console.log(`📊 Query OS10 retornó ${resultOS10.rows.length} registros`);
    
    // Combinar todos los resultados
    const todasLasAlertas = [
      ...resultClientes.rows,
      ...resultInstalaciones.rows,
      ...resultGuardias.rows,
      ...resultOS10.rows
    ];

    // Crear alertas con IDs únicos y campo módulo
    const alertas = todasLasAlertas.map((row: any) => {
      const diasRestantes = parseInt(row.dias_restantes);
      console.log(`📄 Documento: ${row.documento_nombre}, Módulo: ${row.modulo}, Días restantes: ${diasRestantes}, Fecha: ${row.fecha_vencimiento}`);
      
      return {
        id: `${row.modulo}-${row.documento_id}`,
        documento_id: row.documento_id,
        dias_restantes: diasRestantes,
        mensaje: row.mensaje,
        creada_en: new Date().toISOString(),
        leida: false,
        documento_nombre: row.documento_nombre,
        entidad_nombre: row.entidad_nombre,
        entidad_id: row.entidad_id,
        fecha_vencimiento: row.fecha_vencimiento,
        tipo_documento_nombre: row.tipo_documento_nombre,
        modulo: row.modulo
      };
    });

    console.log(`✅ ${alertas.length} alertas generadas total`);

    return NextResponse.json({
      success: true,
      data: alertas
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo alertas:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST: Generar alertas escaneando documentos con vencimiento
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'alertas_documentos', action: 'create' });
  if (deny) return deny;

  try {
    const cookieStore = cookies();
    const tenantCookie = cookieStore.get('tenant');
    
    if (!tenantCookie?.value) {
      return NextResponse.json({ success: false, error: 'No hay sesión activa' }, { status: 401 });
    }

    console.log('🧠 Iniciando generación de alertas de documentos...');

    return NextResponse.json({
      success: true,
      message: 'Las alertas se generan automáticamente al consultar'
    });

  } catch (error: any) {
    console.error('❌ Error generando alertas:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT: Marcar alerta como leída
export async function PUT(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'alertas_documentos', action: 'update' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de alerta requerido' 
      }, { status: 400 });
    }

    console.log(`✅ Alerta ${id} marcada como leída (simulado)`);

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como leída'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando alerta:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 