import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateImpuestoUnico, 
  calculateGratificacion, 
  calculateTopeImponibleAFP,
  calculateTopeImponibleISAPRE,
  formatCurrency,
  formatUF,
  getCurrentUFValue,
  getCurrentUTMValue
} from '@/lib/payroll-utils';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * POST - Ejemplo de cálculo usando valores UF/UTM en tiempo real
 */
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { sueldoBase, mesesTrabajados = 12 } = body;

    if (!sueldoBase || typeof sueldoBase !== 'number') {
      return NextResponse.json(
        { error: 'Sueldo base es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    // Obtener valores UF/UTM actuales
    const ufValue = await getCurrentUFValue();
    const utmValue = await getCurrentUTMValue();

    // Cálculos usando valores UF/UTM en tiempo real
    const impuestoUnico = await calculateImpuestoUnico(sueldoBase);
    const gratificacion = await calculateGratificacion(sueldoBase, mesesTrabajados);
    const topeAFP = await calculateTopeImponibleAFP();
    const topeISAPRE = await calculateTopeImponibleISAPRE();

    // Cálculos adicionales
    const rentaImponible = sueldoBase;
    const rentaUF = rentaImponible / ufValue;
    
    // AFP (10% del sueldo imponible, con tope)
    const cotizacionAFP = Math.min(sueldoBase * 0.10, topeAFP.tope * 0.10);
    
    // ISAPRE (7% del sueldo imponible, con tope)
    const cotizacionISAPRE = Math.min(sueldoBase * 0.07, topeISAPRE.tope * 0.07);
    
    // Cálculo de sueldo líquido
    const totalDescuentos = cotizacionAFP + cotizacionISAPRE + impuestoUnico.impuesto;
    const sueldoLiquido = sueldoBase - totalDescuentos;

    return NextResponse.json({
      success: true,
      data: {
        // Valores UF/UTM utilizados
        valoresUtilizados: {
          uf: {
            valor: ufValue,
            formateado: formatCurrency(ufValue)
          },
          utm: {
            valor: utmValue,
            formateado: formatCurrency(utmValue)
          }
        },
        
        // Desglose del sueldo
        sueldo: {
          base: {
            valor: sueldoBase,
            formateado: formatCurrency(sueldoBase)
          },
          rentaImponible: {
            valor: rentaImponible,
            formateado: formatCurrency(rentaImponible),
            enUF: formatUF(rentaUF)
          }
        },
        
        // Descuentos
        descuentos: {
          afp: {
            valor: cotizacionAFP,
            formateado: formatCurrency(cotizacionAFP),
            porcentaje: '10%',
            tope: {
              valor: topeAFP.tope,
              formateado: formatCurrency(topeAFP.tope),
              enUF: formatUF(80.2)
            }
          },
          isapre: {
            valor: cotizacionISAPRE,
            formateado: formatCurrency(cotizacionISAPRE),
            porcentaje: '7%',
            tope: {
              valor: topeISAPRE.tope,
              formateado: formatCurrency(topeISAPRE.tope),
              enUF: formatUF(80.2)
            }
          },
          impuestoUnico: {
            valor: impuestoUnico.impuesto,
            formateado: formatCurrency(impuestoUnico.impuesto),
            tramo: impuestoUnico.tramo,
            rentaEnUF: formatUF(rentaUF)
          }
        },
        
        // Beneficios
        beneficios: {
          gratificacion: {
            valor: gratificacion.gratificacion,
            formateado: formatCurrency(gratificacion.gratificacion),
            porcentaje: '25%',
            tope: {
              valor: 4.75 * ufValue,
              formateado: formatCurrency(4.75 * ufValue),
              enUF: formatUF(4.75)
            },
            mesesTrabajados
          }
        },
        
        // Totales
        totales: {
          totalDescuentos: {
            valor: totalDescuentos,
            formateado: formatCurrency(totalDescuentos)
          },
          sueldoLiquido: {
            valor: sueldoLiquido,
            formateado: formatCurrency(sueldoLiquido)
          },
          sueldoTotal: {
            valor: sueldoLiquido + gratificacion.gratificacion,
            formateado: formatCurrency(sueldoLiquido + gratificacion.gratificacion)
          }
        },
        
        // Información adicional
        informacion: {
          timestamp: new Date().toISOString(),
          fuente: 'CMF Chile APIs',
          observaciones: [
            'Los valores UF/UTM se obtienen en tiempo real desde las APIs oficiales de la CMF',
            'Los topes imponibles se calculan dinámicamente según el valor UF actual',
            'El impuesto único se calcula según los tramos vigentes',
            'La gratificación legal tiene un tope de 4.75 UF'
          ]
        }
      }
    });

  } catch (error) {
    logger.error('Error en cálculo de ejemplo::', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

