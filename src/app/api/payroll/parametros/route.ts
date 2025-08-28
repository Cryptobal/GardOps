import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

/**
 * Obtiene el valor UF actual desde la API de la CMF
 */
async function obtenerValorUFActual(): Promise<{ valor: number; fecha: string }> {
  try {
    const API_KEY = 'd9f76c741ee20ccf0e776ecdf58c32102cfa9806';
    const UF_API_URL = `https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey=${API_KEY}&formato=json`;
    
    const response = await fetch(UF_API_URL);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.UFs && data.UFs.length > 0) {
      const uf = data.UFs[0];
      // Convertir formato chileno (39.280,76) a número
      const valor = parseFloat(uf.Valor.replace(/\./g, '').replace(',', '.'));
      return {
        valor: valor,
        fecha: uf.Fecha
      };
    } else {
      throw new Error('No se encontraron datos de UF');
    }
  } catch (error) {
    console.error('Error al obtener valor UF desde API:', error);
    // Valor por defecto en caso de error
    return {
      valor: 39280.76,
      fecha: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * GET - Obtener parámetros generales
 */
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'read:list' });
  if (deny) return deny;

  try {
    // Ejecutar consultas con tolerancia a tablas faltantes
    let parametros: any[] = [];
    let afp: any[] = [];
    let isapre: any[] = [];
    let tramos: any[] = [];
    let uf: any = null;

    try {
      const r = await query(`SELECT parametro, valor FROM sueldo_parametros_generales ORDER BY parametro`);
      parametros = r.rows;
    } catch (e) {
      console.warn('parametros: tabla ausente o error, usando vacío');
    }

    try {
      const r = await query(`SELECT codigo, nombre, tasa, periodo FROM sueldo_afp ORDER BY nombre`);
      afp = r.rows;
    } catch (e) {
      console.warn('afp: tabla/columnas ausentes, usando vacío');
    }

    try {
      const r = await query(`SELECT nombre, plan, valor_uf FROM sueldo_isapre ORDER BY nombre`);
      isapre = r.rows;
    } catch (e) {
      console.warn('isapre: tabla/columnas ausentes, usando vacío');
    }

    try {
      const r = await query(`SELECT tramo, desde, hasta, factor, rebaja FROM sueldo_tramos_impuesto ORDER BY tramo ASC`);
      tramos = r.rows;
    } catch (e) {
      console.warn('tramos: tabla ausente, usando vacío');
    }

    // Obtener valor UF desde la API de la CMF
    try {
      uf = await obtenerValorUFActual();
    } catch (e) {
      console.warn('uf: error obteniendo desde API, usando default');
      uf = { valor: 39280.76, fecha: new Date().toISOString().split('T')[0] };
    }

    return NextResponse.json({
      success: true,
      data: {
        parametros,
        afp,
        isapre,
        tramos,
        uf
      }
    });

  } catch (error) {
    console.error('Error al obtener parámetros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST - Actualizar parámetros generales
 */
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'payroll', action: 'update' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { tipo, datos } = body;

    switch (tipo) {
      case 'parametros':
        // Actualizar parámetros generales
        for (const [parametro, valor] of Object.entries(datos)) {
          await query(`
            INSERT INTO sueldo_parametros_generales (parametro, valor)
            VALUES ($1, $2)
            ON CONFLICT (parametro) 
            DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
          `, [parametro, valor]);
        }
        break;

      case 'tramos':
        // Actualizar tramos de impuesto
        await query('DELETE FROM sueldo_tramos_impuesto');
        for (const tramo of datos) {
          await query(`
            INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja)
            VALUES ($1, $2, $3, $4, $5)
          `, [tramo.tramo, tramo.desde, tramo.hasta, tramo.factor, tramo.rebaja]);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetros actualizados correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar parámetros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
