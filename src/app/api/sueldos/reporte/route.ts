import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { calcularSueldo } from '@/lib/sueldo/calcularSueldo';
import { guardarHistorialCalculo } from '@/lib/sueldo/db/guardarHistorial';
import { SueldoInput } from '@/lib/sueldo/tipos/sueldo';
import { formatearCLP } from '@/lib/sueldo/utils/redondeo';

/**
 * Genera un reporte detallado del cálculo de sueldo
 */
function generarReporteDetallado(resultado: any) {
  const reporte = {
    resumen: {
      sueldoLiquido: formatearCLP(resultado.sueldoLiquido),
      totalImponible: formatearCLP(resultado.imponible.total),
      totalNoImponible: formatearCLP(resultado.noImponible.total),
      totalCotizaciones: formatearCLP(resultado.cotizaciones.total),
      impuestoUnico: formatearCLP(resultado.impuesto.impuestoUnico),
      totalDescuentos: formatearCLP(resultado.descuentos.total),
      costoEmpleador: formatearCLP(resultado.empleador.costoTotal)
    },
    
    detalleImponible: {
      sueldoBase: {
        valor: formatearCLP(resultado.imponible.sueldoBase),
        descripcion: 'Sueldo base mensual pactado en contrato'
      },
      gratificacionLegal: {
        valor: formatearCLP(resultado.imponible.gratificacionLegal),
        descripcion: '25% del total imponible bruto (tope $209.396)',
        formula: '25% × (Sueldo Base + Horas Extras + Comisiones + Bonos)'
      },
      horasExtras: {
        valor: formatearCLP(resultado.imponible.horasExtras),
        descripcion: 'Valor de horas extras trabajadas (solo al 50%)',
        detalle: {
          al50: resultado.entrada.horasExtras?.cincuenta || 0,
          al100: resultado.entrada.horasExtras?.cien || 0,
          nota: 'Solo se consideran las horas extras al 50% para el cálculo'
        }
      },
      comisiones: {
        valor: formatearCLP(resultado.imponible.comisiones),
        descripcion: 'Comisiones por ventas o productividad'
      },
      bonos: {
        valor: formatearCLP(resultado.imponible.bonos),
        descripcion: 'Bonos imponibles',
        detalle: resultado.entrada.bonos || {}
      },
      total: {
        valor: formatearCLP(resultado.imponible.total),
        descripcion: 'Total de haberes imponibles'
      },
      topeAplicado: {
        valor: formatearCLP(resultado.imponible.topeAplicado),
        descripcion: 'Monto que excede el tope imponible (87.8 UF)'
      }
    },
    
    detalleNoImponible: {
      colacion: {
        valor: formatearCLP(resultado.noImponible.colacion),
        descripcion: 'Asignación de colación'
      },
      movilizacion: {
        valor: formatearCLP(resultado.noImponible.movilizacion),
        descripcion: 'Asignación de movilización'
      },
      viatico: {
        valor: formatearCLP(resultado.noImponible.viatico),
        descripcion: 'Viáticos'
      },
      desgaste: {
        valor: formatearCLP(resultado.noImponible.desgaste),
        descripcion: 'Desgaste de herramientas'
      },
      asignacionFamiliar: {
        valor: formatearCLP(resultado.noImponible.asignacionFamiliar),
        descripcion: 'Asignación familiar'
      },
      total: {
        valor: formatearCLP(resultado.noImponible.total),
        descripcion: 'Total de haberes no imponibles'
      }
    },
    
    detalleCotizaciones: {
      afp: {
        valor: formatearCLP(resultado.cotizaciones.afp),
        descripcion: `Cotización AFP ${resultado.entrada.afp.toUpperCase()}`,
        formula: `${resultado.imponible.total} × tasa AFP`
      },
      salud: {
        valor: formatearCLP(resultado.cotizaciones.salud),
        descripcion: resultado.entrada.isapre ? 'Plan ISAPRE' : 'FONASA 7%',
        formula: resultado.entrada.isapre ? 
          `${resultado.entrada.isapre.plan} UF × ${resultado.parametros.valorUf}` :
          `${resultado.imponible.total} × 7%`
      },
      afc: {
        valor: formatearCLP(resultado.cotizaciones.afc),
        descripcion: 'Seguro de cesantía (0.6% contrato indefinido)',
        formula: resultado.entrada.tipoContrato === 'indefinido' ?
          `${resultado.imponible.total} × 0.6%` : 'No aplica'
      },
      total: {
        valor: formatearCLP(resultado.cotizaciones.total),
        descripcion: 'Total cotizaciones previsionales'
      }
    },
    
    detalleImpuesto: {
      baseTributable: {
        valor: formatearCLP(resultado.impuesto.baseTributable),
        descripcion: 'Base para cálculo de impuesto',
        formula: 'Total Imponible - Cotizaciones - APV - Cuenta 2'
      },
      tramo: {
        valor: resultado.impuesto.tramo,
        descripcion: `Tramo ${resultado.impuesto.tramo} de impuesto único`
      },
      factor: {
        valor: `${(resultado.impuesto.factor * 100).toFixed(2)}%`,
        descripcion: 'Tasa de impuesto del tramo'
      },
      rebaja: {
        valor: formatearCLP(resultado.impuesto.rebaja),
        descripcion: 'Rebaja del tramo'
      },
      impuestoUnico: {
        valor: formatearCLP(resultado.impuesto.impuestoUnico),
        descripcion: 'Impuesto único de segunda categoría',
        formula: `(${resultado.impuesto.baseTributable} × ${resultado.impuesto.factor}) - ${resultado.impuesto.rebaja}`
      }
    },
    
    detalleDescuentos: {
      anticipos: {
        valor: formatearCLP(resultado.descuentos.anticipos),
        descripcion: 'Anticipos de sueldo'
      },
      judiciales: {
        valor: formatearCLP(resultado.descuentos.judiciales),
        descripcion: 'Retenciones judiciales'
      },
      apv: {
        valor: formatearCLP(resultado.entrada.apv || 0),
        descripcion: 'Ahorro Previsional Voluntario'
      },
      cuenta2: {
        valor: formatearCLP(resultado.entrada.cuenta2 || 0),
        descripcion: 'Cuenta 2 AFP'
      },
      total: {
        valor: formatearCLP(resultado.descuentos.total),
        descripcion: 'Total descuentos'
      }
    },
    
    detalleCostoEmpleador: {
      sis: {
        valor: formatearCLP(resultado.empleador.sis),
        descripcion: 'Seguro de Invalidez y Sobrevivencia (1.88%)',
        formula: `${resultado.imponible.total} × 1.88%`
      },
      afc: {
        valor: formatearCLP(resultado.empleador.afc),
        descripcion: resultado.entrada.tipoContrato === 'indefinido' ?
          'AFC Empleador (2.4%)' : 'AFC Empleador (3%)',
        formula: resultado.entrada.tipoContrato === 'indefinido' ?
          `${resultado.imponible.total} × 2.4%` :
          `${resultado.imponible.total} × 3%`
      },
      mutual: {
        valor: formatearCLP(resultado.empleador.mutual),
        descripcion: `Mutualidad ${resultado.entrada.mutualidad.toUpperCase()}`,
        formula: `${resultado.imponible.total} × ${resultado.parametros.tasaMutualidad}%`
      },
      reformaPrevisional: {
        valor: formatearCLP(resultado.empleador.reformaPrevisional),
        descripcion: 'Reforma Previsional (1%)',
        formula: `${resultado.imponible.total} × 1%`
      },
      costoTotal: {
        valor: formatearCLP(resultado.empleador.costoTotal),
        descripcion: 'Costo total para el empleador',
        formula: 'Total Imponible + No Imponible + Aportes Patronales'
      }
    },
    
    parametrosUtilizados: {
      valorUF: {
        valor: formatearCLP(resultado.parametros.valorUf),
        descripcion: 'Valor UF del período'
      },
      topeImponible: {
        valor: `${resultado.parametros.ufTopeImponible} UF`,
        descripcion: 'Tope imponible para cotizaciones',
        valorCLP: formatearCLP(resultado.parametros.ufTopeImponible * resultado.parametros.valorUf)
      },
      ingresoMinimo: {
        valor: formatearCLP(529000),
        descripcion: 'Ingreso mínimo legal 2025'
      },
      topeGratificacion: {
        valor: formatearCLP(209396),
        descripcion: 'Tope mensual gratificación (4.75 IM / 12)'
      }
    },
    
    formulaCalculo: {
      paso1: 'Total Imponible = Sueldo Base + Horas Extras + Comisiones + Bonos + Gratificación Legal',
      paso2: 'Total Cotizaciones = AFP + Salud + AFC',
      paso3: 'Base Tributable = Total Imponible - Cotizaciones - APV - Cuenta 2',
      paso4: 'Impuesto Único = (Base Tributable × Factor) - Rebaja',
      paso5: 'Total Descuentos = Anticipos + Judiciales + Otros',
      paso6: 'Sueldo Líquido = Total Imponible + No Imponible - Cotizaciones - Impuesto - Descuentos'
    },
    
    metadata: {
      fechaCalculo: new Date().toISOString(),
      periodo: `${resultado.entrada.fecha.getMonth() + 1}/${resultado.entrada.fecha.getFullYear()}`,
      tipoContrato: resultado.entrada.tipoContrato,
      afp: resultado.entrada.afp,
      mutualidad: resultado.entrada.mutualidad,
      sistemaPrevisional: resultado.entrada.isapre ? 'ISAPRE' : 'FONASA'
    }
  };
  
  return reporte;
}

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'sueldos', action: 'read:list' });
  if (deny) return deny;

try {
    const body = await request.json();
    
    // Convertir fecha string a Date
    if (body.fecha && typeof body.fecha === 'string') {
      body.fecha = new Date(body.fecha);
    }
    
    // Calcular sueldo
    const resultado = await calcularSueldo(body as SueldoInput);
    
    // Generar reporte detallado
    const reporte = generarReporteDetallado(resultado);
    
    // Guardar en historial si se especifica guardiaId
    let historialId = null;
    if (body.guardiaId) {
      try {
        historialId = await guardarHistorialCalculo(
          resultado,
          body.guardiaId,
          body.usuario || 'api'
        );
      } catch (error) {
        console.error('Error al guardar historial:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      resultado,
      reporte,
      historialId
    });
    
  } catch (error: any) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al generar reporte',
        codigo: error.codigo || 'ERROR_REPORTE'
      },
      { status: 400 }
    );
  }
}

/**
 * Obtiene reportes históricos
 */
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'sueldos', action: 'read:list' });
  if (deny) return deny;

try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const guardiaId = searchParams.get('guardiaId');
    
    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Mes y año son requeridos' },
        { status: 400 }
      );
    }
    
    // Aquí podrías implementar la lógica para obtener reportes históricos
    // desde la base de datos
    
    return NextResponse.json({
      success: true,
      message: 'Endpoint para obtener reportes históricos',
      params: { mes, anio, guardiaId }
    });
    
  } catch (error: any) {
    console.error('Error al obtener reportes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener reportes' },
      { status: 500 }
    );
  }
}
