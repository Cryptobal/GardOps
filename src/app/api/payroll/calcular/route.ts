import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { calcularSueldo } from '@/lib/sueldo/calcularSueldo';
import { SueldoInput, SueldoError } from '@/lib/sueldo/tipos/sueldo';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
  if (deny) return deny;

  try {
    const body = await request.json();
    
    // Validar que el body tenga los campos requeridos
    if (!body.sueldoBase || !body.afp || !body.fecha) {
      return NextResponse.json(
        { 
          error: 'Faltan campos requeridos',
          detalles: 'sueldoBase, afp y fecha son obligatorios'
        },
        { status: 400 }
      );
    }

    // Convertir la fecha string a Date
    const input: SueldoInput = {
      ...body,
      fecha: new Date(body.fecha),
      horasExtras: body.horasExtras || { cincuenta: 0, cien: 0 },
      bonos: body.bonos || {},
      comisiones: body.comisiones || 0,
      noImponible: body.noImponible || {},
      anticipos: body.anticipos || 0,
      judiciales: body.judiciales || 0,
      apv: body.apv || 0,
      cuenta2: body.cuenta2 || 0,
      cotizacionAdicionalUF: body.cotizacionAdicionalUF || 0,
      diasAusencia: body.diasAusencia || 0,
      tipoContrato: body.tipoContrato || 'indefinido'
    };

    // Calcular sueldo
    const resultado = await calcularSueldo(input);

    return NextResponse.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    logger.error('Error en cálculo de sueldo::', error);

    if (error instanceof SueldoError) {
      return NextResponse.json(
        {
          error: error.message,
          codigo: error.codigo,
          detalles: error.detalles
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
  if (deny) return deny;

  return NextResponse.json({
    message: 'Endpoint de cálculo de sueldos',
    version: '1.0.0',
    endpoints: {
      POST: '/api/payroll/calcular'
    }
  });
}
