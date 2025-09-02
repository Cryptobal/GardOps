import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get('cliente_id');
  
  if (!clienteId) {
    return NextResponse.json({ 
      success: false, 
      error: 'cliente_id requerido' 
    }, { status: 400 });
  }

  try {
    // Query completa para mostrar documentos
    const sql = `
      SELECT 
        d.id,
        d.nombre_original,
        d.tamaño,
        d.creado_en,
        d.fecha_vencimiento,
        d.url,
        d.tipo_documento_id,
        td.nombre as tipo_documento_nombre,
        CASE 
          WHEN d.fecha_vencimiento IS NULL THEN 'sin_vencimiento'
          WHEN d.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
          WHEN d.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'por_vencer'
          ELSE 'vigente'
        END as estado
      FROM documentos d
      LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
      WHERE d.cliente_id = $1
      ORDER BY d.creado_en DESC
    `;
    
    const result = await query(sql, [clienteId]);
    
    return NextResponse.json({ 
      success: true, 
      documentos: result.rows,
      total: result.rows.length,
      clienteId: clienteId
    });
    
  } catch (error) {
    // Error más visible
    console.error('❌ ERROR EN API DOCUMENTOS-POR-CLIENTE:');
    console.error('Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
