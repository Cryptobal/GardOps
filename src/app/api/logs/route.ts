import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

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

    // Si se especifica un módulo específico, consultar solo esa tabla
    if (modulo && modulo !== 'todos') {
      const tablaLogs = `logs_${modulo}`;
      // Mapear el nombre del módulo al nombre correcto de la columna ID
      const idCampoMap: { [key: string]: string } = {
        'guardias': 'guardia_id',
        'instalaciones': 'instalacion_id',
        'clientes': 'cliente_id',
        'pauta_mensual': 'pauta_mensual_id',
        'pauta_diaria': 'pauta_diaria_id',
        'turnos_extras': 'turno_extra_id',
        'puestos_operativos': 'puesto_operativo_id',
        'documentos': 'documento_id',
        'usuarios': 'usuario_id'
      };
      const idCampo = idCampoMap[modulo] || `${modulo}_id`;
      
      let whereConditions = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Aplicar filtros específicos del módulo
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
          accion ILIKE $${paramIndex} OR 
          usuario ILIKE $${paramIndex} OR 
          contexto::text ILIKE $${paramIndex} OR
          datos_anteriores::text ILIKE $${paramIndex} OR
          datos_nuevos::text ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Agregar filtro de tenant_id si la tabla lo tiene
      if (modulo !== 'instalaciones' && modulo !== 'clientes') {
        whereConditions.push(`tenant_id = $${paramIndex}`);
        params.push(tenantId);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Consulta para obtener el total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ${tablaLogs}
        ${whereClause}
      `;

      const countResult = await query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Consulta principal con paginación
      const mainQuery = `
        SELECT 
          id,
          '${modulo}' as modulo,
          ${idCampo} as entidad_id,
          accion,
          usuario,
          tipo,
          contexto,
          datos_anteriores,
          datos_nuevos,
          fecha,
          tenant_id
        FROM ${tablaLogs}
        ${whereClause}
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
    }

    // Si no se especifica módulo, consultar todas las tablas de logs
    const tablasLogs = [
      { nombre: 'guardias', tabla: 'logs_guardias', idCampo: 'guardia_id', tieneDatosAnteriores: true },
      { nombre: 'instalaciones', tabla: 'logs_instalaciones', idCampo: 'instalacion_id', tieneDatosAnteriores: false },
      { nombre: 'clientes', tabla: 'logs_clientes', idCampo: 'cliente_id', tieneDatosAnteriores: false },
      { nombre: 'pauta_mensual', tabla: 'logs_pauta_mensual', idCampo: 'pauta_mensual_id', tieneDatosAnteriores: true },
      { nombre: 'pauta_diaria', tabla: 'logs_pauta_diaria', idCampo: 'pauta_diaria_id', tieneDatosAnteriores: true },
      { nombre: 'turnos_extras', tabla: 'logs_turnos_extras', idCampo: 'turno_extra_id', tieneDatosAnteriores: true },
      { nombre: 'puestos_operativos', tabla: 'logs_puestos_operativos', idCampo: 'puesto_operativo_id', tieneDatosAnteriores: true },
      { nombre: 'documentos', tabla: 'logs_documentos', idCampo: 'documento_id', tieneDatosAnteriores: true },
      { nombre: 'usuarios', tabla: 'logs_usuarios', idCampo: 'usuario_id', tieneDatosAnteriores: true }
    ];

    let allLogs: any[] = [];
    let totalLogs = 0;

    for (const tablaInfo of tablasLogs) {
      try {
        let whereConditions = [];
        let params: any[] = [];
        let paramIndex = 1;

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
          const searchConditions = [
            `accion ILIKE $${paramIndex}`,
            `usuario ILIKE $${paramIndex}`,
            `contexto::text ILIKE $${paramIndex}`
          ];
          
          // Solo agregar búsqueda en datos_anteriores y datos_nuevos si la tabla los tiene
          if (tablaInfo.tieneDatosAnteriores) {
            searchConditions.push(`datos_anteriores::text ILIKE $${paramIndex}`);
            searchConditions.push(`datos_nuevos::text ILIKE $${paramIndex}`);
          }
          
          whereConditions.push(`(${searchConditions.join(' OR ')})`);
          params.push(`%${search}%`);
          paramIndex++;
        }

        // Agregar filtro de tenant_id si la tabla lo tiene
        if (tablaInfo.nombre !== 'instalaciones' && tablaInfo.nombre !== 'clientes') {
          whereConditions.push(`tenant_id = $${paramIndex}`);
          params.push(tenantId);
          paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Construir la consulta según la estructura de la tabla
        let selectFields = `
          id,
          '${tablaInfo.nombre}' as modulo,
          ${tablaInfo.idCampo} as entidad_id,
          accion,
          usuario,
          tipo,
          contexto,
          fecha
        `;

        // Agregar campos de datos según la estructura de la tabla
        if (tablaInfo.tieneDatosAnteriores) {
          selectFields += `,
          datos_anteriores,
          datos_nuevos,
          tenant_id`;
        } else {
          selectFields += `,
          null as datos_anteriores,
          null as datos_nuevos,
          null as tenant_id`;
        }

        // Consulta para obtener logs de esta tabla
        const sqlQuery = `
          SELECT 
            ${selectFields}
          FROM ${tablaInfo.tabla}
          ${whereClause}
          ORDER BY fecha DESC
        `;

        const result = await query(sqlQuery, params);
        allLogs.push(...result.rows);
        totalLogs += result.rows.length;

      } catch (error) {
        console.error(`Error consultando tabla ${tablaInfo.tabla}:`, error);
        // Continuar con la siguiente tabla
      }
    }

    // Ordenar todos los logs por fecha descendente
    allLogs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Aplicar paginación
    const logsPaginados = allLogs.slice(offset, offset + limite);
    const totalPaginas = Math.ceil(totalLogs / limite);

    return NextResponse.json({
      success: true,
      logs: logsPaginados,
      total: totalLogs,
      totalPaginas,
      pagina,
      limite,
      filtros: {
        modulo: 'todos',
        usuario,
        accion,
        fechaDesde,
        fechaHasta,
        search
      }
    });

  } catch (error) {
    logger.error('Error obteniendo logs::', error);
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

    // Ruta rápida para logs simples de cliente: { event, payload? }
    if (typeof body?.event === 'string') {
      const event: string = body.event.trim();
      const payload = body.payload;

      if (!event) {
        return NextResponse.json({ error: 'event es requerido' }, { status: 400 });
      }
      if (event.length > 64) {
        return NextResponse.json({ error: 'event demasiado largo (máx 64)' }, { status: 400 });
      }

      console.info('[clientLog]', {
        event,
        payload,
        at: new Date().toISOString(),
      });
      return new Response(null, { status: 204 });
    }

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
          INSERT INTO logs_pauta_mensual (pauta_mensual_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          RETURNING *
        `;
        params = [entidadId, accion, usuario, tipo, detalles, null, null, 'accebf8a-bacc-41fa-9601-ed39cb320a52'];
        break;
        
      case 'pauta_diaria':
        sql = `
          INSERT INTO logs_pauta_diaria (pauta_diaria_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id)
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

    try {
      const result = await query(sql, params);
      
      return NextResponse.json({
        success: true,
        log: result.rows[0]
      });
    } catch (logError) {
      // Si falla el logging, no fallar la operación principal
      console.warn('⚠️ Error registrando log (no crítico):', logError);
      return NextResponse.json({
        success: true,
        warning: 'Log no registrado debido a error de base de datos',
        log: null
      });
    }

  } catch (error) {
    logger.error('Error registrando log::', error);
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