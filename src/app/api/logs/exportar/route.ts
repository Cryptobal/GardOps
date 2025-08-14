import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'logs', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de filtro
    const modulo = searchParams.get('modulo') || '';
    const usuario = searchParams.get('usuario') || '';
    const accion = searchParams.get('accion') || '';
    const fechaDesde = searchParams.get('fechaDesde') || '';
    const fechaHasta = searchParams.get('fechaHasta') || '';
    const search = searchParams.get('search') || '';
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';

    // Construir la consulta base
    let whereConditions = ['tenant_id = $1'];
    let params: any[] = [tenantId];
    let paramIndex = 2;

    // Aplicar filtros
    if (modulo) {
      whereConditions.push(`modulo = $${paramIndex}`);
      params.push(modulo);
      paramIndex++;
    }

    if (usuario) {
      whereConditions.push(`usuario = $${paramIndex}`);
      params.push(usuario);
      paramIndex++;
    }

    if (accion) {
      whereConditions.push(`accion = $${paramIndex}`);
      params.push(accion);
      paramIndex++;
    }

    if (fechaDesde) {
      whereConditions.push(`fecha >= $${paramIndex}`);
      params.push(`${fechaDesde}T00:00:00.000Z`);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`fecha <= $${paramIndex}`);
      params.push(`${fechaHasta}T23:59:59.999Z`);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        modulo ILIKE $${paramIndex} OR 
        usuario ILIKE $${paramIndex} OR 
        accion ILIKE $${paramIndex} OR
        contexto::text ILIKE $${paramIndex} OR
        datos_anteriores::text ILIKE $${paramIndex} OR
        datos_nuevos::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para obtener todos los logs sin paginación
    const exportQuery = `
      SELECT 
        id,
        modulo,
        entidad_id,
        accion,
        usuario,
        tipo,
        contexto,
        datos_anteriores,
        datos_nuevos,
        fecha,
        tenant_id
      FROM (
        SELECT 
          id,
          'guardias' as modulo, 
          guardia_id as entidad_id, 
          accion, 
          usuario, 
          tipo, 
          contexto, 
          datos_anteriores, 
          datos_nuevos, 
          fecha, 
          tenant_id
        FROM logs_guardias
        WHERE ${whereClause}
        UNION ALL
        SELECT 
          id,
          'pauta_mensual' as modulo, 
          pauta_id as entidad_id, 
          accion, 
          usuario, 
          tipo, 
          contexto, 
          datos_anteriores, 
          datos_nuevos, 
          fecha, 
          tenant_id
        FROM logs_pauta_mensual
        WHERE ${whereClause}
        UNION ALL
        SELECT 
          id,
          'pauta_diaria' as modulo, 
          pauta_id as entidad_id, 
          accion, 
          usuario, 
          tipo, 
          contexto, 
          datos_anteriores, 
          datos_nuevos, 
          fecha, 
          tenant_id
        FROM logs_pauta_diaria
        WHERE ${whereClause}
        UNION ALL
        SELECT 
          id,
          'turnos_extras' as modulo, 
          turno_extra_id as entidad_id, 
          accion, 
          usuario, 
          tipo, 
          contexto, 
          datos_anteriores, 
          datos_nuevos, 
          fecha, 
          tenant_id
        FROM logs_turnos_extras
        WHERE ${whereClause}
      ) combined_logs
      ORDER BY fecha DESC
    `;

    const result = await query(exportQuery, params);

    // Generar CSV
    const headers = [
      'ID',
      'Módulo',
      'Entidad ID',
      'Acción',
      'Usuario',
      'Tipo',
      'Fecha',
      'Contexto',
      'Datos Anteriores',
      'Datos Nuevos'
    ];

    const csvRows = [
      headers.join(','),
      ...result.rows.map((log: any) => [
        log.id,
        log.modulo,
        log.entidad_id,
        log.accion,
        log.usuario,
        log.tipo,
        new Date(log.fecha).toLocaleString('es-ES'),
        JSON.stringify(log.contexto || {}).replace(/"/g, '""'),
        JSON.stringify(log.datos_anteriores || {}).replace(/"/g, '""'),
        JSON.stringify(log.datos_nuevos || {}).replace(/"/g, '""')
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="logs_${new Date().toISOString().split('T')[0]}.csv"`);

    return response;

  } catch (error) {
    console.error('Error exportando logs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al exportar logs',
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 