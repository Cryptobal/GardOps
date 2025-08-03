import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TEST: Endpoint de prueba de turnos');
    
    const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
    
    // Consulta simple
    const result = await query(`
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        COUNT(*) as total_puestos
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      GROUP BY rs.id, rs.nombre
      ORDER BY rs.nombre
    `, [instalacionId]);

    console.log('✅ Consulta exitosa, resultados:', result.rows);
    
    return NextResponse.json({
      success: true,
      turnos: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 