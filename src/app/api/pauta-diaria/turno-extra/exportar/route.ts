import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'pauta_diaria', action: 'read:list' });
if (deny) return deny;

  try {
    console.log('🚀 Exportando CSV de turnos extras');
    
    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');
    const estado = searchParams.get('estado');
    const pagado = searchParams.get('pagado');
    const instalacion_id = searchParams.get('instalacion_id');
    const busqueda = searchParams.get('busqueda');

    // Construir query con filtros
    let queryString = `
      SELECT 
        te.id,
        te.fecha,
        te.estado,
        te.valor,
        te.pagado,
        te.fecha_pago,
        te.observaciones_pago,
        te.usuario_pago,
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
        
      FROM TE_turnos_extras te
      INNER JOIN guardias g ON te.guardia_id = g.id
      INNER JOIN instalaciones i ON te.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON te.puesto_id = po.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (fecha_inicio) {
      queryString += ` AND te.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      queryString += ` AND te.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    if (estado && estado !== 'all') {
      queryString += ` AND te.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    if (pagado && pagado !== 'all') {
      queryString += ` AND te.pagado = $${paramIndex}`;
      params.push(pagado === 'true');
      paramIndex++;
    }

    if (instalacion_id && instalacion_id !== 'all') {
      queryString += ` AND te.instalacion_id = $${paramIndex}`;
      params.push(instalacion_id);
      paramIndex++;
    }

    if (busqueda) {
      queryString += ` AND (
        g.nombre ILIKE $${paramIndex} OR 
        g.apellido_paterno ILIKE $${paramIndex} OR 
        g.rut ILIKE $${paramIndex} OR 
        i.nombre ILIKE $${paramIndex}
      )`;
      params.push(`%${busqueda}%`);
      paramIndex++;
    }

    queryString += ` ORDER BY te.fecha DESC, te.created_at DESC`;

    const { rows: turnosExtras } = await query(queryString, params);

    if (turnosExtras.length === 0) {
      return NextResponse.json(
        { error: 'No hay turnos extras para exportar con los filtros aplicados' },
        { status: 404 }
      );
    }

    // Generar CSV compatible con Banco Santander y sistemas contables
    const csvHeaders = [
      'ID_TURNO',
      'RUT_GUARDIA',
      'NOMBRE_COMPLETO',
      'INSTALACION',
      'PUESTO_OPERATIVO',
      'FECHA_TURNO',
      'TIPO_TURNO_EXTRA',
      'VALOR_PESOS',
      'ESTADO_PAGO',
      'FECHA_PAGO',
      'USUARIO_PAGO',
      'OBSERVACIONES',
      'FECHA_REGISTRO',
      'TENANT_ID'
    ];

    const csvRows = turnosExtras.map((turno: any) => [
      turno.id,
      turno.guardia_rut,
      `${turno.guardia_nombre} ${turno.guardia_apellido_paterno} ${turno.guardia_apellido_materno || ''}`.trim(),
      turno.instalacion_nombre,
      turno.nombre_puesto,
      turno.fecha,
      turno.estado === 'reemplazo' ? 'REEMPLAZO' : 'PPC',
      turno.valor,
      turno.pagado ? 'PAGADO' : 'PENDIENTE',
      turno.fecha_pago || 'N/A',
      turno.usuario_pago || 'N/A',
      turno.observaciones_pago || 'N/A',
      turno.created_at,
      'accebf8a-bacc-41fa-9601-ed39cb320a52' // tenant_id fijo
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="turnos_extras_${new Date().toISOString().split('T')[0]}.csv"`);

    console.log(`📊 CSV exportado: ${turnosExtras.length} turnos extras`);

    return response;

  } catch (error) {
    console.error('❌ Error exportando CSV:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 