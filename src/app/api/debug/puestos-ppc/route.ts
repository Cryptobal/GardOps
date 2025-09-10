import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Investigando puestos PPC...');

    // Consultar todos los puestos operativos
    const puestosResult = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.activo = true
      ORDER BY i.nombre, po.nombre_puesto
    `);

    // Verificar específicamente los puestos PPC
    const puestosPPC = puestosResult.rows.filter((p: any) => p.es_ppc);
    
    // Verificar si hay registros en pauta mensual para estos puestos
    const pautaInfo = [];
    for (const puesto of puestosPPC) {
      const pautaResult = await query(`
        SELECT COUNT(*) as count, MIN(dia) as min_dia, MAX(dia) as max_dia
        FROM as_turnos_pauta_mensual 
        WHERE puesto_id = $1 AND anio = 2025 AND mes = 9
      `, [puesto.id]);
      
      const count = parseInt(pautaResult.rows[0].count);
      pautaInfo.push({
        puesto: puesto.nombre_puesto,
        instalacion: puesto.instalacion_nombre,
        guardia_id: puesto.guardia_id,
        tiene_guardia: !!puesto.guardia_id,
        registros_pauta: count,
        dias_pauta: count > 0 ? `${pautaResult.rows[0].min_dia}-${pautaResult.rows[0].max_dia}` : 'N/A'
      });
    }

    return NextResponse.json({
      total_puestos: puestosResult.rows.length,
      puestos_ppc: puestosPPC.length,
      puestos_ppc_info: pautaInfo,
      todos_los_puestos: puestosResult.rows.map((p: any) => ({
        id: p.id,
        nombre: p.nombre_puesto,
        instalacion: p.instalacion_nombre,
        guardia_id: p.guardia_id,
        es_ppc: p.es_ppc,
        tiene_guardia: !!p.guardia_id
      }))
    });

  } catch (error) {
    console.error('❌ Error investigando puestos PPC:', error);
    return NextResponse.json(
      { error: 'Error investigando puestos PPC', details: error },
      { status: 500 }
    );
  }
}
