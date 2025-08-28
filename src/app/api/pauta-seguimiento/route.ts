import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const { pauta_id, estado, comentario } = await request.json();
    
    console.log('📝 POST /api/pauta-seguimiento:', { pauta_id, estado, comentario });
    
    // Para simplificar en desarrollo, usar un UUID válido
    const tenantId = '00000000-0000-0000-0000-000000000001';
    
    // Upsert del seguimiento
    const result = await sql`
      INSERT INTO pauta_seguimiento (pauta_id, estado_seguimiento, comentario, tenant_id)
      VALUES (${pauta_id}, ${estado}, ${comentario || null}, ${tenantId})
      ON CONFLICT (pauta_id) 
      DO UPDATE SET 
        estado_seguimiento = EXCLUDED.estado_seguimiento,
        comentario = EXCLUDED.comentario,
        updated_at = NOW()
      RETURNING *
    `;

    console.log('✅ Seguimiento actualizado:', result.rows[0]);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error actualizando seguimiento:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    
    console.log('📝 GET /api/pauta-seguimiento:', { fecha });
    
    // Para simplificar en desarrollo, usar un UUID válido
    const tenantId = '00000000-0000-0000-0000-000000000001';
    
    // Obtener seguimientos para la fecha específica
    let query = `
      SELECT ps.*, u.nombre as operador_nombre
      FROM pauta_seguimiento ps
      LEFT JOIN usuarios u ON u.id = ps.operador_id
      WHERE ps.tenant_id = $1
    `;
    
    const params = [tenantId];
    
    // Por ahora, ignorar el filtro de fecha ya que la tabla as_turnos_v_pauta_diaria_dedup no existe
    // TODO: Implementar filtro de fecha cuando la tabla esté disponible
    
    query += ` ORDER BY ps.updated_at DESC`;
    
    console.log('🔍 Query:', query, 'Params:', params);
    
    const result = await sql.query(query, params);

    console.log('✅ Seguimientos obtenidos:', result.rows.length);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo seguimientos:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
