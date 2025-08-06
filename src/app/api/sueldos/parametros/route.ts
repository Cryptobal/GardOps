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
         WHERE activo = true 
         ORDER BY parametro`
      );
      data.parametros = resultParametros.rows;
    }

    if (tipo === 'all' || tipo === 'afp') {
      const resultAFP = await query(
        `SELECT * FROM sueldo_afp 
         WHERE activo = true 
         ORDER BY nombre`
      );
      data.afp = resultAFP.rows;
    }

    if (tipo === 'all' || tipo === 'isapre') {
      const resultIsapre = await query(
        `SELECT * FROM sueldo_isapre 
         WHERE activo = true 
         ORDER BY nombre`
      );
      data.isapre = resultIsapre.rows;
    }

    if (tipo === 'all' || tipo === 'mutualidad') {
      const resultMutualidad = await query(
        `SELECT * FROM sueldo_mutualidad 
         WHERE activo = true 
         ORDER BY nombre`
      );
      data.mutualidad = resultMutualidad.rows;
    }

    if (tipo === 'all' || tipo === 'impuesto') {
      const resultImpuesto = await query(
        `SELECT * FROM sueldo_tramos_impuesto 
         WHERE activo = true 
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
          `UPDATE sueldo_parametros_generales 
           SET valor = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [data.valor, data.id]
        );
        break;

      case 'afp':
        await query(
          `UPDATE sueldo_afp 
           SET comision = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [data.comision, data.id]
        );
        break;

      case 'isapre':
        await query(
          `UPDATE sueldo_isapre 
           SET nombre = $1, activo = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [data.nombre, data.activo, data.id]
        );
        break;

      case 'mutualidad':
        await query(
          `UPDATE sueldo_mutualidad 
           SET tasa_base = $1, tasa_adicional = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [data.tasa_base, data.tasa_adicional || 0, data.id]
        );
        break;

      case 'impuesto':
        await query(
          `UPDATE sueldo_tramos_impuesto 
           SET desde = $1, hasta = $2, factor = $3, rebaja = $4, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $5`,
          [data.desde, data.hasta, data.factor, data.rebaja, data.id]
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
        await query(`UPDATE sueldo_parametros_generales SET activo = false WHERE id = $1`, [id]);
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
