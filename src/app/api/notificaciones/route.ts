import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logger, devLogger } from '@/lib/utils/logger';
import { getCurrentUserServer } from '@/lib/auth';

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const soloNoLeidas = searchParams.get('solo_no_leidas') === 'true';

    let query = `
      SELECT 
        n.id,
        n.tipo,
        n.titulo,
        n.mensaje,
        n.datos,
        n.leida,
        n.fecha_lectura,
        n.created_at
      FROM notificaciones n
      WHERE n.tenant_id = $1 AND n.usuario_id = $2
    `;
    
    const params: any[] = [user.tenant_id, user.user_id];
    
    if (soloNoLeidas) {
      query += ' AND n.leida = false';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT $3 OFFSET $4';
    params.push(limit, offset);

    const result = await client.query(query, params);
    
    // Obtener contador de notificaciones no leídas
    const countQuery = `
      SELECT COUNT(*) as total_no_leidas
      FROM notificaciones n
      WHERE n.tenant_id = $1 AND n.usuario_id = $2 AND n.leida = false
    `;
    
    const countResult = await client.query(countQuery, [user.tenant_id, user.user_id]);
    const totalNoLeidas = parseInt(countResult.rows[0].total_no_leidas);

    devLogger.success(`📬 Notificaciones obtenidas: ${result.rows.length} (${totalNoLeidas} no leídas)`);

    return NextResponse.json({
      success: true,
      notificaciones: result.rows,
      total_no_leidas: totalNoLeidas,
      pagination: {
        limit,
        offset,
        has_more: result.rows.length === limit
      }
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo notificaciones:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}

// POST - Crear nueva notificación
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const user = getCurrentUserServer(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      usuario_id, 
      tipo, 
      titulo, 
      mensaje, 
      datos 
    } = body;

    if (!usuario_id || !tipo || !titulo || !mensaje) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: usuario_id, tipo, titulo, mensaje'
      }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO notificaciones (
        tenant_id, usuario_id, tipo, titulo, mensaje, datos
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;

    const result = await client.query(insertQuery, [
      user.tenant_id,
      usuario_id,
      tipo,
      titulo,
      mensaje,
      JSON.stringify(datos || {})
    ]);

    const notificacion = result.rows[0];
    
    devLogger.success(`🔔 Notificación creada: ${notificacion.id}`);

    return NextResponse.json({
      success: true,
      notificacion: {
        id: notificacion.id,
        created_at: notificacion.created_at
      }
    });

  } catch (error: any) {
    logger.error('❌ Error creando notificación:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
