import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/documentos-global - Obtener documentos globales con filtros
export async function GET(request: NextRequest) {
  try {
    // Gate backend: requiere permiso 'documentos.view'
    try {
      const h = request.headers;
      const { getCurrentUserServer } = await import('@/lib/auth');
      const fromJwt = getCurrentUserServer(request as any)?.email || null;
      const fromHeader = h.get('x-user-email') || null;
      const isDev = process.env.NODE_ENV !== 'production';
      const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
      // PRIORIZAR el header x-user-email sobre JWT cuando JWT tiene user@example.com
      const email = (fromJwt === 'user@example.com' ? fromHeader : fromJwt) || fromHeader || dev || null;
      if (!email) return NextResponse.json({ ok:false, error:'no-auth' }, { status:401 });
      const { sql } = await import('@vercel/postgres');
      const { rows } = await sql`
        with me as (select id from public.usuarios where lower(email)=lower(${email}) limit 1)
        select public.fn_usuario_tiene_permiso((select id from me), ${'documentos.view'}) as allowed
      `;
      if (rows?.[0]?.allowed !== true) {
        return NextResponse.json({ ok:false, error:'forbidden', perm:'documentos.view' }, { status:403 });
      }
    } catch {}
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const tipoDocumento = searchParams.get('tipo_documento');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const entidadFilter = searchParams.get('entidad_filter');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Obtener tenant_id del usuario actual (por ahora usar 'Gard')
    let tenantId: string;
    try {
      const tenantResult = await query(`
        SELECT id FROM tenants WHERE nombre = 'Gard' LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        // Crear tenant 'Gard' si no existe
        const newTenant = await query(`
          INSERT INTO tenants (nombre, activo) VALUES ('Gard', true) RETURNING id
        `);
        tenantId = newTenant.rows[0].id;
      } else {
        tenantId = tenantResult.rows[0].id;
      }
    } catch (error) {
      console.error('Error obteniendo tenant_id:', error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }

    // Query global para todos los módulos
    let sql = `
      WITH documentos_unidos AS (
        -- Documentos de clientes
        SELECT 
          d.id,
          d.nombre_original as nombre,
          d.tamaño,
          d.creado_en,
          d.fecha_vencimiento,
          td.nombre as tipo_documento_nombre,
          td.id as tipo_documento_id,
          'clientes' as modulo,
          c.nombre as entidad_nombre,
          c.id as entidad_id,
          d.url,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
        LEFT JOIN clientes c ON d.cliente_id = c.id
        WHERE d.cliente_id IS NOT NULL AND d.tenant_id = $1
        
        UNION ALL
        
        -- Documentos de instalaciones
        SELECT 
          d.id,
          d.nombre_original as nombre,
          d.tamaño,
          d.creado_en,
          d.fecha_vencimiento,
          td.nombre as tipo_documento_nombre,
          td.id as tipo_documento_id,
          'instalaciones' as modulo,
          i.nombre as entidad_nombre,
          i.id as entidad_id,
          d.url,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
        LEFT JOIN instalaciones i ON d.instalacion_id = i.id
        WHERE d.instalacion_id IS NOT NULL AND d.tenant_id = $1
        
        UNION ALL
        
        -- Documentos de guardias
        SELECT 
          d.id,
          d.nombre_original as nombre,
          d.tamaño,
          d.creado_en,
          d.fecha_vencimiento,
          td.nombre as tipo_documento_nombre,
          td.id as tipo_documento_id,
          'guardias' as modulo,
          CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as entidad_nombre,
          g.id as entidad_id,
          d.url,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
        LEFT JOIN guardias g ON d.guardia_id = g.id
        WHERE d.guardia_id IS NOT NULL AND d.tenant_id = $1
      )
      SELECT * FROM documentos_unidos
    `;
    
    let params: any[] = [tenantId]; // Agregar tenant_id como primer parámetro
    let paramIndex = 2; // Empezar desde 2 porque 1 ya está ocupado por tenant_id
    
    // Aplicar filtros solo si se especifican
    if (modulo && modulo !== 'todos') {
      sql += ` WHERE modulo = $${paramIndex}`;
      params.push(modulo);
      paramIndex++;
    }
    
    if (tipoDocumento && tipoDocumento !== 'todos') {
      sql += `${params.length > 0 ? ' AND' : ' WHERE'} tipo_documento_id = $${paramIndex}`;
      params.push(tipoDocumento);
      paramIndex++;
    }
    
    if (estado && estado !== 'todos') {
      sql += `${params.length > 0 ? ' AND' : ' WHERE'} estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }
    
    if (entidadFilter) {
      sql += `${params.length > 0 ? ' AND' : ' WHERE'} entidad_id = $${paramIndex}`;
      params.push(entidadFilter);
      paramIndex++;
    }
    
    if (fechaDesde) {
      sql += `${params.length > 0 ? ' AND' : ' WHERE'} fecha_vencimiento >= $${paramIndex}`;
      params.push(fechaDesde);
      paramIndex++;
    }
    
    if (fechaHasta) {
      sql += `${params.length > 0 ? ' AND' : ' WHERE'} fecha_vencimiento <= $${paramIndex}`;
      params.push(fechaHasta);
      paramIndex++;
    }
    
    sql += ` ORDER BY creado_en DESC`;
    
    // Agregar paginación
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    paramIndex += 2;

    console.log('🔍 Query documentos globales:', { sql, params, filtros: { modulo, tipoDocumento, estado, entidadFilter, fechaDesde, fechaHasta } });

    const result = await query(sql, params);
    
    // Query para obtener conteos por estado
    const statsQuery = `
      WITH documentos_unidos AS (
        -- Documentos de clientes
        SELECT 
          d.fecha_vencimiento,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        WHERE d.cliente_id IS NOT NULL AND d.tenant_id = $1
        
        UNION ALL
        
        SELECT 
          d.fecha_vencimiento,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        WHERE d.instalacion_id IS NOT NULL AND d.tenant_id = $1
        
        UNION ALL
        
        SELECT 
          d.fecha_vencimiento,
          CASE 
            WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
            WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
            WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
            ELSE 'vigente'
          END as estado
        FROM documentos d
        WHERE d.guardia_id IS NOT NULL AND d.tenant_id = $1
      )
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'vigente' THEN 1 END) as vigentes,
        COUNT(CASE WHEN estado = 'por_vencer' THEN 1 END) as por_vencer,
        COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as vencidos,
        COUNT(CASE WHEN estado = 'sin_vencimiento' THEN 1 END) as sin_vencimiento
      FROM documentos_unidos
    `;
    
    const statsResult = await query(statsQuery, [tenantId]);
    const stats = statsResult.rows[0] || {
      total: 0,
      vigentes: 0,
      por_vencer: 0,
      vencidos: 0,
      sin_vencimiento: 0
    };

    console.log('✅ Documentos globales obtenidos:', { 
      count: result.rows.length, 
      stats,
      filtros: { modulo, tipoDocumento, estado, entidadFilter, fechaDesde, fechaHasta }
    });
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      stats,
      pagination: {
        limit,
        offset,
        total: parseInt(stats.total) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error en GET /api/documentos-global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener documentos globales' },
      { status: 500 }
    );
  }
}