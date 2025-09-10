import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (!instalacion_id || !mes || !anio) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan parámetros: instalacion_id, mes, anio' 
      });
    }

    console.log('🔍 DEBUG - Parámetros:', { instalacion_id, mes, anio });

    // 1. Verificar puestos operativos básicos
    const puestosBasicos = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    console.log('🔍 DEBUG - Puestos básicos:', puestosBasicos.rows.length);

    // 2. Verificar registros en pauta mensual
    const pautaRegistros = await query(`
      SELECT 
        pm.puesto_id,
        pm.dia,
        pm.estado
      FROM as_turnos_pauta_mensual pm
      WHERE pm.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY pm.puesto_id, pm.dia
    `, [instalacion_id, anio, mes]);

    console.log('🔍 DEBUG - Registros pauta:', pautaRegistros.rows.length);

    // 3. Verificar puestos con guardias asignados
    const puestosConGuardias = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        g.nombre as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
        AND po.guardia_id IS NOT NULL
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    console.log('🔍 DEBUG - Puestos con guardias:', puestosConGuardias.rows.length);

    return NextResponse.json({
      success: true,
      debug: {
        instalacion_id,
        mes,
        anio,
        puestos_basicos: puestosBasicos.rows,
        pauta_registros: pautaRegistros.rows,
        puestos_con_guardias: puestosConGuardias.rows,
        counts: {
          puestos_basicos: puestosBasicos.rows.length,
          pauta_registros: pautaRegistros.rows.length,
          puestos_con_guardias: puestosConGuardias.rows.length
        }
      }
    });

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    });
  }
}
