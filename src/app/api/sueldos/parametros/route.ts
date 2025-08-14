import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database-vercel';
import { 
  obtenerParametrosMensuales, 
  obtenerAFPsMensuales, 
  obtenerTramosImpuesto, 
  obtenerAsignacionFamiliar,
  obtenerPeriodosDisponibles,
  actualizarParametroGeneral,
  actualizarAFP,
  actualizarTramoImpuesto,
  actualizarAsignacionFamiliar,
  obtenerValoresUF,
  actualizarValorUF,
  eliminarValorUF,
  actualizarValorUFExistente
} from '@/lib/sueldo/db/parametros';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '2025-08';
    const tipo = searchParams.get('tipo');

    let data: any = {};

    if (tipo === 'all' || !tipo) {
      // Cargar todos los tipos de parámetros
      try {
        // Cargar parámetros básicos
        const [parametros, afps, impuestos, asignacionFamiliar] = await Promise.all([
          obtenerParametrosMensuales(periodo),
          obtenerAFPsMensuales(periodo),
          obtenerTramosImpuesto(periodo),
          obtenerAsignacionFamiliar(periodo)
        ]);

        // Cargar valores de UF por separado
        let valoresUF: any[] = [];
        try {
          valoresUF = await obtenerValoresUF();
        } catch (ufError) {
          console.error('❌ Error cargando valores UF:', ufError);
          valoresUF = [];
        }

        data = {
          parametros,
          afp: afps,
          impuesto: impuestos,
          asignacionFamiliar,
          uf: valoresUF
        };
      } catch (error) {
        console.error('❌ Error cargando parámetros:', error);
        throw error;
      }
    } else {
      // Cargar solo el tipo específico
      switch (tipo) {
        case 'parametros':
          data.parametros = await obtenerParametrosMensuales(periodo);
          break;
        case 'afp':
          data.afp = await obtenerAFPsMensuales(periodo);
          break;
        case 'impuesto':
          data.impuesto = await obtenerTramosImpuesto(periodo);
          break;
        case 'asignacionFamiliar':
          data.asignacionFamiliar = await obtenerAsignacionFamiliar(periodo);
          break;
        case 'uf':
          data.uf = await obtenerValoresUF();
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Tipo de parámetro no válido' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json({
      success: true,
      data,
      periodo
    });

  } catch (error) {
    console.error('❌ Error obteniendo parámetros:', error);
    return NextResponse.json(
      { success: false, error: `Error al obtener parámetros: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'read:list' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { tipo, data: itemData } = body;

    switch (tipo) {
      case 'parametros':
        await actualizarParametroGeneral(
          itemData.periodo,
          itemData.parametro,
          itemData.valor,
          itemData.descripcion
        );
        break;
      case 'afp':
        await actualizarAFP(
          itemData.periodo,
          itemData.codigo,
          itemData.nombre,
          itemData.tasa
        );
        break;
      case 'impuesto':
        await actualizarTramoImpuesto(
          itemData.periodo,
          itemData.tramo,
          itemData.desde,
          itemData.hasta,
          itemData.factor,
          itemData.rebaja,
          itemData.tasa_max
        );
        break;
      case 'asignacionFamiliar':
        await actualizarAsignacionFamiliar(
          itemData.periodo,
          itemData.tramo,
          itemData.desde,
          itemData.hasta,
          itemData.monto
        );
        break;
      case 'uf':
        await actualizarValorUF(
          itemData.fecha,
          itemData.valor
        );
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro agregado correctamente'
    });

  } catch (error) {
    console.error('Error agregando parámetro:', error);
    return NextResponse.json(
      { success: false, error: 'Error al agregar parámetro' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'read:list' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { tipo, id, campo, valor, periodo, fecha } = body;

    switch (tipo) {
      case 'parametros':
        await sql`
          UPDATE sueldo_parametros_generales 
          SET valor = ${valor}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'afp':
        await sql`
          UPDATE sueldo_afp 
          SET tasa = ${valor}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'impuesto':
        await sql`
          UPDATE sueldo_tramos_impuesto 
          SET factor = ${valor}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'asignacionFamiliar':
        await sql`
          UPDATE sueldo_asignacion_familiar 
          SET monto = ${valor}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'uf':
        await actualizarValorUFExistente(fecha, valor);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro actualizado correctamente'
    });

  } catch (error) {
    console.error('Error actualizando parámetro:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar parámetro' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'sueldos', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const id = searchParams.get('id');
    const periodo = searchParams.get('periodo');
    const fecha = searchParams.get('fecha');

    if (!tipo || (!id && tipo !== 'uf') || (tipo === 'uf' && !fecha)) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    switch (tipo) {
      case 'parametros':
        await sql`
          DELETE FROM sueldo_parametros_generales 
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'afp':
        await sql`
          DELETE FROM sueldo_afp 
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'impuesto':
        await sql`
          DELETE FROM sueldo_tramos_impuesto 
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'asignacionFamiliar':
        await sql`
          DELETE FROM sueldo_asignacion_familiar 
          WHERE id = ${id} AND periodo = ${periodo}
        `;
        break;
      case 'uf':
        await eliminarValorUF(fecha!);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando parámetro:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar parámetro' },
      { status: 500 }
    );
  }
}
