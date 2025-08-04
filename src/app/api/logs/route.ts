import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de paginación
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const limite = parseInt(searchParams.get('limite') || '50');
    const offset = (pagina - 1) * limite;
    
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
    if (modulo && modulo !== 'todos') {
      whereConditions.push(`modulo = $${paramIndex}`);
      params.push(modulo);
      paramIndex++;
    }

    if (usuario && usuario !== 'todos') {
      whereConditions.push(`usuario = $${paramIndex}`);
      params.push(usuario);
      paramIndex++;
    }

    if (accion && accion !== 'todos') {
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

    // Consulta para obtener el total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT 'guardias' as modulo, guardia_id as entidad_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id
        FROM logs_guardias
        WHERE ${whereClause}
        UNION ALL
        SELECT 'pauta_mensual' as modulo, pauta_id as entidad_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id
        FROM logs_pauta_mensual
        WHERE ${whereClause}
        UNION ALL
        SELECT 'pauta_diaria' as modulo, pauta_id as entidad_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id
        FROM logs_pauta_diaria
        WHERE ${whereClause}
        UNION ALL
        SELECT 'turnos_extras' as modulo, turno_extra_id as entidad_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id
        FROM logs_turnos_extras
        WHERE ${whereClause}
      ) combined_logs
    `;

    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal con paginación
    const mainQuery = `
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
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const queryParams = [...params, limite, offset];
    const result = await query(mainQuery, queryParams);

    const totalPaginas = Math.ceil(total / limite);

    return NextResponse.json({
      success: true,
      logs: result.rows,
      total,
      totalPaginas,
      pagina,
      limite,
      filtros: {
        modulo,
        usuario,
        accion,
        fechaDesde,
        fechaHasta,
        search
      }
    });

  } catch (error) {
    console.error('Error obteniendo logs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al obtener logs',
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/logs - Registrar log para cualquier módulo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modulo, entidadId, accion, detalles, usuario = "Admin", tipo = "manual" } = body;
    
    if (!modulo || !entidadId || !accion) {
      return NextResponse.json(
        { success: false, error: 'Módulo, entidadId y accion son requeridos' },
        { status: 400 }
      );
    }

    let sql = '';
    let params: any[] = [];

    // Insertar en la tabla correspondiente según el módulo
    switch (modulo) {
      case 'clientes':
        sql = `
          INSERT INTO logs_clientes (cliente_id, accion, usuario, tipo, contexto, fecha)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles];
        break;
        
      case 'instalaciones':
        // Verificar si la tabla existe, si no, crear logs en logs_clientes como fallback
        const checkInstalaciones = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'logs_instalaciones'
          );
        `);
        
        if (checkInstalaciones.rows[0].exists) {
          sql = `
            INSERT INTO logs_instalaciones (instalacion_id, accion, usuario, tipo, contexto, fecha)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
          `;
        } else {
          // Fallback a logs_clientes
          sql = `
            INSERT INTO logs_clientes (cliente_id, accion, usuario, tipo, contexto, fecha)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
          `;
        }
        params = [entidadId, accion, usuario, tipo, detalles];
        break;
        
      case 'guardias':
        sql = `
          INSERT INTO logs_guardias (guardia_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles, null, null, 'accebf8a-bacc-41fa-9601-ed39cb320a52'];
        break;
        
      case 'pauta_mensual':
        sql = `
          INSERT INTO logs_pauta_mensual (pauta_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles, null, null, 'accebf8a-bacc-41fa-9601-ed39cb320a52'];
        break;
        
      case 'pauta_diaria':
        sql = `
          INSERT INTO logs_pauta_diaria (pauta_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles, null, null, 'accebf8a-bacc-41fa-9601-ed39cb320a52'];
        break;
        
      case 'turnos_extras':
        sql = `
          INSERT INTO logs_turnos_extras (turno_extra_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles, null, null, 'accebf8a-bacc-41fa-9601-ed39cb320a52'];
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Módulo no soportado' },
          { status: 400 }
        );
    }

    const result = await query(sql, params);
    
    return NextResponse.json({
      success: true,
      log: result.rows[0]
    });

  } catch (error) {
    console.error('Error registrando log:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al registrar log',
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 