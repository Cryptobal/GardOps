import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/database";

// GET /api/logs?modulo=clientes&entidad_id=uuid - Obtener logs de cualquier módulo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');
    const entidadId = searchParams.get('entidad_id');
    
    if (!modulo || !entidadId) {
      return NextResponse.json(
        { success: false, error: 'Módulo y entidad_id requeridos' },
        { status: 400 }
      );
    }

    // Usar la tabla logs_clientes como tabla unificada para todos los módulos
    const result = await query(`
      SELECT 
        id,
        cliente_id as entidad_id,
        accion,
        usuario,
        tipo,
        contexto as detalles,
        fecha as created_at,
        'clientes' as modulo
      FROM logs_clientes
      WHERE cliente_id = $1
      UNION ALL
      SELECT 
        id,
        instalacion_id as entidad_id,
        accion,
        usuario,
        tipo,
        contexto as detalles,
        fecha as created_at,
        'instalaciones' as modulo
      FROM logs_instalaciones
      WHERE instalacion_id = $1
      UNION ALL
      SELECT 
        id,
        guardia_id as entidad_id,
        accion,
        usuario,
        tipo,
        contexto as detalles,
        fecha as created_at,
        'guardias' as modulo
      FROM logs_guardias
      WHERE guardia_id = $1
      ORDER BY created_at DESC
    `, [entidadId]);
    
    // Filtrar por módulo si se especifica
    const logsFiltrados = modulo === 'todos' 
      ? result.rows 
      : result.rows.filter((log: any) => log.modulo === modulo);
    
    return NextResponse.json({
      success: true,
      data: logsFiltrados
    });
  } catch (error) {
    console.error('❌ Error en GET /api/logs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener logs' },
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
        // Verificar si la tabla existe, si no, crear logs en logs_clientes como fallback
        const checkGuardias = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'logs_guardias'
          );
        `);
        
        if (checkGuardias.rows[0].exists) {
          sql = `
            INSERT INTO logs_guardias (guardia_id, accion, usuario, tipo, contexto, fecha)
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
        
      default:
        return NextResponse.json(
          { success: false, error: 'Módulo no válido' },
          { status: 400 }
        );
    }

    const result = await query(sql, params);
    
    console.log(`✅ Log registrado para módulo ${modulo}:`, {
      entidadId,
      accion,
      usuario,
      tipo,
      detalles
    });
    
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en POST /api/logs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar log' },
      { status: 500 }
    );
  }
} 