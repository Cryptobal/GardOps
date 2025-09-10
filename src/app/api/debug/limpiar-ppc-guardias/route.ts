import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Limpiando guardia_id de puestos PPC...');

    // Buscar puestos PPC que tengan guardia_id asignado
    const puestosPPCConGuardia = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.es_ppc = true AND po.guardia_id IS NOT NULL
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`🔍 Encontrados ${puestosPPCConGuardia.rows.length} puestos PPC con guardia asignado`);

    if (puestosPPCConGuardia.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay puestos PPC con guardia asignado',
        puestos_limpiados: 0
      });
    }

    // Mostrar qué puestos se van a limpiar
    const puestosALimpiar = puestosPPCConGuardia.rows.map((puesto: any) => ({
      id: puesto.id,
      nombre: puesto.nombre_puesto,
      instalacion: puesto.instalacion_nombre,
      guardia_id: puesto.guardia_id,
      guardia_nombre: `${puesto.guardia_nombre} ${puesto.apellido_paterno} ${puesto.apellido_materno}`.trim()
    }));

    // Limpiar guardia_id de los puestos PPC
    const updatePromises = puestosPPCConGuardia.rows.map((puesto: any) => 
      query(`
        UPDATE as_turnos_puestos_operativos 
        SET guardia_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [puesto.id])
    );

    await Promise.all(updatePromises);

    console.log(`✅ Limpiados ${puestosPPCConGuardia.rows.length} puestos PPC`);

    return NextResponse.json({
      success: true,
      message: `Limpiados ${puestosPPCConGuardia.rows.length} puestos PPC`,
      puestos_limpiados: puestosPPCConGuardia.rows.length,
      puestos: puestosALimpiar
    });

  } catch (error) {
    console.error('❌ Error limpiando puestos PPC:', error);
    return NextResponse.json(
      { error: 'Error limpiando puestos PPC', details: error },
      { status: 500 }
    );
  }
}
