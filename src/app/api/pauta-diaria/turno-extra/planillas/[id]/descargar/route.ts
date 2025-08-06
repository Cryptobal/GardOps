import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

// GET - Descargar planilla individual en formato XLSX
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planillaId = params.id;

    // Obtener información de la planilla
    const planillaQuery = `
      SELECT 
        p.id,
        p.codigo,
        p.fecha_generacion,
        p.monto_total,
        p.cantidad_turnos,
        p.estado,
        p.observaciones
      FROM TE_planillas_turnos_extras p
      WHERE p.id = $1
    `;
    
    const planillaResult = await query(planillaQuery, [planillaId]);
    
    if (planillaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
    }

    const planilla = planillaResult.rows[0];

    // Obtener turnos agrupados por guardia con datos bancarios
    const turnosQuery = `
      SELECT 
        te.guardia_id,
        te.guardia_nombre,
        te.guardia_apellido_paterno,
        te.guardia_apellido_materno,
        te.guardia_rut,
        te.instalacion_nombre,
        te.fecha,
        te.valor,
        g.email as correo_beneficiario,
        g.numero_cuenta as cuenta_destino,
        b.codigo as codigo_banco,
        b.nombre as nombre_banco
      FROM TE_turnos_extras te
      LEFT JOIN guardias g ON te.guardia_id = g.id
      LEFT JOIN bancos b ON g.banco = b.id
      WHERE te.planilla_id = $1
      ORDER BY te.guardia_nombre, te.guardia_apellido_paterno, te.fecha
    `;
    
    const turnosResult = await query(turnosQuery, [planillaId]);
    const turnos = turnosResult.rows;

    if (turnos.length === 0) {
      return NextResponse.json({ error: 'No se encontraron turnos en la planilla' }, { status: 404 });
    }

    // Agrupar turnos por guardia y calcular montos totales
    const guardiasAgrupados = new Map();
    
    turnos.forEach(turno => {
      const guardiaId = turno.guardia_id;
      
      if (!guardiasAgrupados.has(guardiaId)) {
        guardiasAgrupados.set(guardiaId, {
          guardia_id: guardiaId,
          nombre: turno.guardia_nombre,
          apellido_paterno: turno.guardia_apellido_paterno,
          apellido_materno: turno.guardia_apellido_materno,
          rut: turno.guardia_rut,
          instalacion: turno.instalacion_nombre,
          correo: turno.correo_beneficiario,
          cuenta_destino: turno.cuenta_destino,
          codigo_banco: turno.codigo_banco,
          nombre_banco: turno.nombre_banco,
          monto_total: 0,
          turnos: []
        });
      }
      
      const guardia = guardiasAgrupados.get(guardiaId);
      guardia.monto_total += Number(turno.valor);
      guardia.turnos.push(turno);
    });

    // Obtener mes actual para la glosa
    const mesActual = new Date().toLocaleDateString('es-ES', { month: 'long' });

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Preparar datos para el archivo XLSX según especificaciones
    const datosXLSX = [
      [
        'Cuenta Origen',
        'Moneda Origen',
        'Cuenta Destino',
        'Moneda Destino',
        'Código Banco',
        'Banco',
        'RUT Beneficiario',
        'Nombre Beneficiario',
        'Monto Transferencia',
        'Glosa Personalizada Transferencia',
        'Correo Beneficiario',
        'Glosa Cartola Original'
      ]
    ];

    // Agregar una fila por guardia
    guardiasAgrupados.forEach(guardia => {
      // Formatear RUT sin puntos ni guiones
      const rutFormateado = guardia.rut.replace(/[.-]/g, '');
      
      // Nombre completo del guardia
      const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();
      
      // Glosa cartola original: "Pago [MES] instalación"
      const glosaCartola = `Pago ${mesActual} instalación`;

      datosXLSX.push([
        '94541158', // Cuenta Origen fija
        'CLP', // Moneda Origen fija
        guardia.cuenta_destino || '', // Cuenta Destino
        'CLP', // Moneda Destino fija
        guardia.codigo_banco || '', // Código Banco
        guardia.nombre_banco || '', // Banco
        rutFormateado, // RUT Beneficiario sin puntos ni guiones
        nombreCompleto, // Nombre Beneficiario
        guardia.monto_total, // Monto Transferencia
        planilla.observaciones || '', // Glosa Personalizada (desde observaciones de la planilla)
        guardia.correo || '', // Correo Beneficiario
        glosaCartola // Glosa Cartola Original
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(datosXLSX);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Planilla Transferencias');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="Planilla_Transferencias_Turnos_Extras_${planilla.id}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    return response;

  } catch (error) {
    console.error('Error descargando planilla:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 