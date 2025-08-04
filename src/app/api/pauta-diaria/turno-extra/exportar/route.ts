import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Exportando CSV de turnos extras');
    
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    // Obtener turnos extras para la fecha especificada
    const turnosExtras = await query(`
      SELECT 
        te.id,
        te.fecha,
        te.tipo,
        te.valor,
        te.created_at,
        
        -- Datos del guardia
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        g.rut as guardia_rut,
        
        -- Datos de la instalación
        i.nombre as instalacion_nombre,
        i.valor_turno_extra,
        
        -- Datos del puesto
        po.nombre_puesto
        
      FROM turnos_extras te
      INNER JOIN guardias g ON te.guardia_id = g.id
      INNER JOIN instalaciones i ON te.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON te.puesto_id = po.id
      
      WHERE te.fecha = $1
      
      ORDER BY i.nombre, g.apellido_paterno, g.nombre
    `, [fecha]);

    if (turnosExtras.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay turnos extras para exportar en esta fecha' },
        { status: 404 }
      );
    }

    // Generar CSV compatible con Banco Santander
    const csvHeaders = [
      'RUT',
      'NOMBRE',
      'APELLIDO',
      'INSTALACION',
      'PUESTO',
      'FECHA',
      'TIPO_TURNO',
      'VALOR',
      'TIPO_PAGO'
    ];

    const csvRows = turnosExtras.rows.map((turno: any) => [
      turno.guardia_rut,
      turno.guardia_nombre,
      `${turno.guardia_apellido_paterno} ${turno.guardia_apellido_materno || ''}`.trim(),
      turno.instalacion_nombre,
      turno.nombre_puesto,
      turno.fecha,
      turno.tipo === 'reemplazo' ? 'REEMPLAZO' : 'PPC',
      turno.valor,
      'TURNO_EXTRA'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.join(','))
    ].join('\n');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', `attachment; filename="turnos_extras_${fecha}.csv"`);

    console.log(`📊 CSV exportado: ${turnosExtras.rows.length} turnos extras`);

    return response;

  } catch (error) {
    console.error('❌ Error exportando CSV:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 