import { NextRequest, NextResponse } from 'next/server';
import { 
  generarPlanillaSueldos, 
  calcularSueldoGuardiaPlanilla,
  marcarTurnosExtrasComoPagados 
} from '@/lib/sueldo/integracion/planillas';
import * as XLSX from 'xlsx';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * POST: Genera planilla de sueldos para un período
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mes, anio, incluirTurnosExtras = true, guardiaId } = body;
    
    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Mes y año son requeridos' },
        { status: 400 }
      );
    }
    
    // Si se especifica un guardia específico
    if (guardiaId) {
      const calculo = await calcularSueldoGuardiaPlanilla(
        guardiaId,
        mes,
        anio,
        incluirTurnosExtras
      );
      
      return NextResponse.json({
        success: true,
        tipo: 'individual',
        calculo
      });
    }
    
    // Generar planilla completa
    const planilla = await generarPlanillaSueldos(mes, anio, incluirTurnosExtras);
    
    // Calcular totales
    const totales = {
      totalGuardias: planilla.length,
      totalSueldosLiquidos: 0,
      totalImponible: 0,
      totalCotizaciones: 0,
      totalImpuestos: 0,
      totalCostoEmpleador: 0,
      totalTurnosExtras: 0
    };
    
    planilla.forEach(item => {
      if (!item.error && item.resultado) {
        totales.totalSueldosLiquidos += item.resultado.sueldoLiquido;
        totales.totalImponible += item.resultado.imponible.total;
        totales.totalCotizaciones += item.resultado.cotizaciones.total;
        totales.totalImpuestos += item.resultado.impuesto.impuestoUnico;
        totales.totalCostoEmpleador += item.resultado.empleador.costoTotal;
        totales.totalTurnosExtras += item.turnosExtras?.valorTotal || 0;
      }
    });
    
    return NextResponse.json({
      success: true,
      tipo: 'completa',
      periodo: { mes, anio },
      planilla,
      totales,
      generadoEn: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error('Error al generar planilla::', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar planilla' },
      { status: 500 }
    );
  }
}

/**
 * GET: Descarga planilla en formato Excel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = Number(searchParams.get('mes'));
    const anio = Number(searchParams.get('anio'));
    const incluirTurnosExtras = searchParams.get('incluirTurnosExtras') !== 'false';
    
    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Mes y año son requeridos' },
        { status: 400 }
      );
    }
    
    // Generar planilla
    const planilla = await generarPlanillaSueldos(mes, anio, incluirTurnosExtras);
    
    // Crear workbook
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Resumen de Sueldos
    const resumenData = [
      ['PLANILLA DE SUELDOS'],
      [`Período: ${mes}/${anio}`],
      [''],
      [
        'RUT',
        'Nombre',
        'Sueldo Base',
        'Gratificación',
        'Horas Extras',
        'Bonos',
        'Turnos Extras',
        'Total Imponible',
        'Colación',
        'Movilización',
        'Total No Imponible',
        'AFP',
        'Salud',
        'AFC',
        'Total Cotizaciones',
        'Impuesto Único',
        'Anticipos',
        'Descuentos Judiciales',
        'Total Descuentos',
        'SUELDO LÍQUIDO',
        'Costo Empleador'
      ]
    ];
    
    // Agregar datos de cada guardia
    planilla.forEach(item => {
      if (!item.error && item.resultado) {
        const r = item.resultado;
        resumenData.push([
          item.guardia.rut,
          item.guardia.nombre,
          r.imponible.sueldoBase,
          r.imponible.gratificacionLegal,
          r.imponible.horasExtras,
          r.imponible.bonos - (item.turnosExtras?.valorTotal || 0), // Bonos sin turnos extras
          item.turnosExtras?.valorTotal || 0,
          r.imponible.total,
          r.noImponible.colacion,
          r.noImponible.movilizacion,
          r.noImponible.total,
          r.cotizaciones.afp,
          r.cotizaciones.salud,
          r.cotizaciones.afc,
          r.cotizaciones.total,
          r.impuesto.impuestoUnico,
          r.descuentos.anticipos,
          r.descuentos.judiciales,
          r.descuentos.total,
          r.sueldoLiquido,
          r.empleador.costoTotal
        ]);
      }
    });
    
    // Agregar fila de totales
    resumenData.push([]);
    resumenData.push([
      'TOTALES',
      '',
      planilla.reduce((sum, i) => sum + (i.resultado?.imponible.sueldoBase || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.imponible.gratificacionLegal || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.imponible.horasExtras || 0), 0),
      planilla.reduce((sum, i) => sum + ((i.resultado?.imponible.bonos || 0) - (i.turnosExtras?.valorTotal || 0)), 0),
      planilla.reduce((sum, i) => sum + (i.turnosExtras?.valorTotal || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.imponible.total || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.noImponible.colacion || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.noImponible.movilizacion || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.noImponible.total || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.cotizaciones.afp || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.cotizaciones.salud || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.cotizaciones.afc || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.cotizaciones.total || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.impuesto.impuestoUnico || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.descuentos.anticipos || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.descuentos.judiciales || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.descuentos.total || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.sueldoLiquido || 0), 0),
      planilla.reduce((sum, i) => sum + (i.resultado?.empleador.costoTotal || 0), 0)
    ]);
    
    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen Sueldos');
    
    // Hoja 2: Detalle Turnos Extras (si aplica)
    if (incluirTurnosExtras) {
      const turnosData = [
        ['DETALLE TURNOS EXTRAS'],
        [`Período: ${mes}/${anio}`],
        [''],
        ['RUT', 'Nombre', 'Cantidad Turnos', 'Valor Total']
      ];
      
      planilla.forEach(item => {
        if (!item.error && item.turnosExtras && item.turnosExtras.cantidad > 0) {
          turnosData.push([
            item.guardia.rut,
            item.guardia.nombre,
            item.turnosExtras.cantidad,
            item.turnosExtras.valorTotal
          ]);
        }
      });
      
      const turnosSheet = XLSX.utils.aoa_to_sheet(turnosData);
      XLSX.utils.book_append_sheet(workbook, turnosSheet, 'Turnos Extras');
    }
    
    // Hoja 3: Costos Empleador
    const empleadorData = [
      ['DETALLE COSTOS EMPLEADOR'],
      [`Período: ${mes}/${anio}`],
      [''],
      ['RUT', 'Nombre', 'SIS', 'AFC Empleador', 'Mutual', 'Reforma Previsional', 'Costo Total']
    ];
    
    planilla.forEach(item => {
      if (!item.error && item.resultado) {
        const e = item.resultado.empleador;
        empleadorData.push([
          item.guardia.rut,
          item.guardia.nombre,
          e.sis,
          e.afc,
          e.mutual,
          e.reformaPrevisional,
          e.costoTotal
        ]);
      }
    });
    
    const empleadorSheet = XLSX.utils.aoa_to_sheet(empleadorData);
    XLSX.utils.book_append_sheet(workbook, empleadorSheet, 'Costos Empleador');
    
    // Generar buffer del archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Retornar archivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="planilla_sueldos_${mes}_${anio}.xlsx"`
      }
    });
    
  } catch (error: any) {
    logger.error('Error al descargar planilla::', error);
    return NextResponse.json(
      { error: error.message || 'Error al descargar planilla' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Marcar turnos extras como pagados
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { guardiaId, mes, anio, planillaId } = body;
    
    if (!guardiaId || !mes || !anio) {
      return NextResponse.json(
        { error: 'guardiaId, mes y año son requeridos' },
        { status: 400 }
      );
    }
    
    const resultado = await marcarTurnosExtrasComoPagados(
      guardiaId,
      mes,
      anio,
      planillaId
    );
    
    return NextResponse.json({
      success: resultado,
      message: resultado ? 
        'Turnos extras marcados como pagados' : 
        'Error al marcar turnos extras como pagados'
    });
    
  } catch (error: any) {
    logger.error('Error al actualizar turnos extras::', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar turnos extras' },
      { status: 500 }
    );
  }
}
