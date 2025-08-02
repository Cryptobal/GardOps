import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id, anio, mes, pauta } = body;

    // Validar datos requeridos
    if (!instalacion_id || !anio || !mes || !pauta || !Array.isArray(pauta)) {
      return NextResponse.json(
        { error: 'Datos requeridos: instalacion_id, anio, mes, pauta (array)' },
        { status: 400 }
      );
    }

    // Validar estados permitidos
    const estadosPermitidos = ['trabajado', 'libre', 'permiso'];
    const estadosInvalidos = pauta.filter(item => !estadosPermitidos.includes(item.estado));
    
    if (estadosInvalidos.length > 0) {
      return NextResponse.json(
        { error: `Estados no permitidos: ${estadosInvalidos.map(item => item.estado).join(', ')}. Estados válidos: ${estadosPermitidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar estructura de cada item de la pauta
    for (const item of pauta) {
      if (!item.guardia_id || !item.dia || !item.estado) {
        return NextResponse.json(
          { error: 'Cada item de la pauta debe tener: guardia_id, dia, estado' },
          { status: 400 }
        );
      }
    }

    // Borrar pauta anterior para ese mes/instalación
    await query(
      'DELETE FROM as_turnos_pauta_mensual WHERE instalacion_id = $1 AND anio = $2 AND mes = $3',
      [instalacion_id, anio, mes]
    );

    // Insertar nueva pauta
    const insertPromises = pauta.map(item => 
      query(
        'INSERT INTO as_turnos_pauta_mensual (instalacion_id, guardia_id, anio, mes, dia, estado) VALUES ($1, $2, $3, $4, $5, $6)',
        [instalacion_id, item.guardia_id, anio, mes, item.dia, item.estado]
      )
    );

    await Promise.all(insertPromises);

    console.log("✅ Pauta mensual guardada en base de datos correctamente");
    console.log(`📊 Resumen: ${pauta.length} turnos guardados para instalación ${instalacion_id}, ${mes}/${anio}`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual guardada correctamente',
      data: {
        instalacion_id,
        anio,
        mes,
        turnosGuardados: pauta.length
      }
    });

  } catch (error) {
    console.error('❌ Error al guardar pauta mensual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al guardar la pauta mensual' },
      { status: 500 }
    );
  }
} 