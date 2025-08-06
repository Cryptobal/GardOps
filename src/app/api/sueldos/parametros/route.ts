import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'all';

    let data: any = {};

    if (tipo === 'all' || tipo === 'uf') {
      const resultUF = await query(
        `SELECT * FROM sueldo_valor_uf 
         ORDER BY fecha DESC 
         LIMIT 24`
      );
      data.uf = resultUF.rows;
    }

    if (tipo === 'all' || tipo === 'parametros') {
      const resultParametros = await query(
        `SELECT * FROM sueldo_parametros_generales 
         ORDER BY parametro`
      );
      data.parametros = resultParametros.rows;
    }

    if (tipo === 'all' || tipo === 'afp') {
      const resultAFP = await query(
        `SELECT id, nombre, comision, porcentaje_fondo 
         FROM sueldo_afp 
         ORDER BY nombre`
      );
      data.afp = resultAFP.rows;
    }

    if (tipo === 'all' || tipo === 'isapre') {
      const resultIsapre = await query(
        `SELECT * FROM sueldo_isapre 
         ORDER BY nombre`
      );
      data.isapre = resultIsapre.rows;
    }

    if (tipo === 'all' || tipo === 'mutualidad') {
      const resultMutualidad = await query(
        `SELECT * FROM sueldo_mutualidad 
         ORDER BY entidad`
      );
      data.mutualidad = resultMutualidad.rows;
    }

    if (tipo === 'all' || tipo === 'impuesto') {
      const resultImpuesto = await query(
        `SELECT * FROM sueldo_tramos_impuesto 
         ORDER BY tramo`
      );
      data.impuesto = resultImpuesto.rows;
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error al obtener parámetros:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener parámetros',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, id, campo, valor } = body;

    let querySQL = '';
    let params: any[] = [];

    switch (tipo) {
      case 'parametros':
        querySQL = `UPDATE sueldo_parametros_generales SET valor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        params = [valor, id];
        break;

      case 'uf':
        querySQL = `UPDATE sueldo_valor_uf SET valor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        params = [valor, id];
        break;

      case 'afp':
        if (campo === 'tasa_cotizacion') {
          querySQL = `UPDATE sueldo_afp SET tasa_cotizacion = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        } else if (campo === 'comision') {
          querySQL = `UPDATE sueldo_afp SET comision = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        } else if (campo === 'sis') {
          querySQL = `UPDATE sueldo_afp SET sis = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        }
        params = [valor, id];
        break;

      case 'isapre':
        querySQL = `UPDATE sueldo_isapre SET nombre = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        params = [valor, id];
        break;

      case 'mutualidad':
        if (campo === 'tasa_base') {
          querySQL = `UPDATE sueldo_mutualidad SET tasa_base = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        } else if (campo === 'tasa_adicional') {
          querySQL = `UPDATE sueldo_mutualidad SET tasa_adicional = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        }
        params = [valor, id];
        break;

      case 'impuesto':
        if (campo === 'factor') {
          querySQL = `UPDATE sueldo_tramos_impuesto SET factor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        } else if (campo === 'rebaja') {
          querySQL = `UPDATE sueldo_tramos_impuesto SET rebaja = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        }
        params = [valor, id];
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    if (querySQL) {
      await query(querySQL, params);
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro actualizado correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar parámetro:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar parámetro',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, data } = body;

    switch (tipo) {
      case 'uf':
        await query(
          `INSERT INTO sueldo_valor_uf (fecha, valor) 
           VALUES ($1, $2) 
           ON CONFLICT (fecha) 
           DO UPDATE SET valor = $2, updated_at = CURRENT_TIMESTAMP`,
          [data.fecha, data.valor]
        );
        break;

      case 'parametro':
        await query(
          `INSERT INTO sueldo_parametros_generales (parametro, valor) 
           VALUES ($1, $2)`,
          [data.parametro, data.valor]
        );
        break;

      case 'afp':
        await query(
          `INSERT INTO sueldo_afp (codigo, nombre, tasa_cotizacion, comision, sis, fecha_vigencia) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [data.codigo, data.nombre, data.tasa_cotizacion, data.comision, data.sis, data.fecha_vigencia]
        );
        break;

      case 'isapre':
        await query(
          `INSERT INTO sueldo_isapre (codigo, nombre) 
           VALUES ($1, $2)`,
          [data.codigo, data.nombre]
        );
        break;

      case 'mutualidad':
        await query(
          `INSERT INTO sueldo_mutualidad (codigo, nombre, tasa_base, fecha_vigencia) 
           VALUES ($1, $2, $3, $4)`,
          [data.codigo, data.nombre, data.tasa_base, data.fecha_vigencia]
        );
        break;

      case 'impuesto':
        await query(
          `INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja, fecha_vigencia) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [data.tramo, data.desde, data.hasta, data.factor, data.rebaja, data.fecha_vigencia]
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro agregado correctamente'
    });

  } catch (error) {
    console.error('Error al agregar parámetro:', error);
    return NextResponse.json(
      {
        error: 'Error al agregar parámetro',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const id = searchParams.get('id');

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Tipo e ID son requeridos' },
        { status: 400 }
      );
    }

    switch (tipo) {
      case 'uf':
        await query(`DELETE FROM sueldo_valor_uf WHERE id = $1`, [id]);
        break;
      case 'parametro':
        await query(`DELETE FROM sueldo_parametros_generales WHERE id = $1`, [id]);
        break;
      case 'afp':
        await query(`UPDATE sueldo_afp SET activo = false WHERE id = $1`, [id]);
        break;
      case 'isapre':
        await query(`UPDATE sueldo_isapre SET activo = false WHERE id = $1`, [id]);
        break;
      case 'mutualidad':
        await query(`UPDATE sueldo_mutualidad SET activo = false WHERE id = $1`, [id]);
        break;
      case 'impuesto':
        await query(`UPDATE sueldo_tramos_impuesto SET activo = false WHERE id = $1`, [id]);
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de parámetro no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Parámetro eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar parámetro:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar parámetro',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
