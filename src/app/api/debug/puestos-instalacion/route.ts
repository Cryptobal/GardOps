import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');

    if (!instalacion_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan parámetros: instalacion_id' 
      });
    }

    console.log('🔍 DEBUG - Investigando puestos para instalación:', instalacion_id);

    // 1. Verificar todos los puestos operativos (activos e inactivos) - consulta simple
    const todosPuestos = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
      ORDER BY po.activo DESC, po.nombre_puesto
    `, [instalacion_id]);

    // 2. Verificar solo puestos activos - consulta simple
    const puestosActivos = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    // 3. Verificar solo puestos con guardias asignados - consulta simple
    const puestosConGuardias = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 
        AND po.activo = true 
        AND po.guardia_id IS NOT NULL
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    return NextResponse.json({
      success: true,
      data: {
        instalacion_id,
        todos_puestos: todosPuestos.rows,
        puestos_activos: puestosActivos.rows,
        puestos_con_guardias: puestosConGuardias.rows,
        resumen: {
          total_puestos: todosPuestos.rows.length,
          puestos_activos: puestosActivos.rows.length,
          puestos_con_guardias: puestosConGuardias.rows.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error investigando puestos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al investigar puestos de la instalación' 
    });
  }
}
