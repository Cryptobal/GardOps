import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
interface CreateBody {
  instalacion_id: string;
  rol_servicio_id: string;
  vigencia_desde: string; // YYYY-MM-DD
  sueldo_base: number; // obligatorio, permite 0
  items?: { item_id: string; monto: number }[]; // solo HABER
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBody;
    const { instalacion_id, rol_servicio_id, vigencia_desde, sueldo_base, items } = body || {} as CreateBody;

    if (!instalacion_id || !rol_servicio_id || !vigencia_desde || sueldo_base === undefined || sueldo_base === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await query('BEGIN');
    try {
      // a) Insertar cabecera (la exclusión por rango la asegura PG con el constraint EXCLUDE)
      const cabeceraSql = `
        INSERT INTO sueldo_estructura_instalacion (
          instalacion_id, rol_servicio_id, version, vigencia_desde, vigencia_hasta, activo
        ) VALUES ($1, $2, 1, $3, NULL, TRUE)
        RETURNING id, instalacion_id, rol_servicio_id, version, vigencia_desde, vigencia_hasta, activo
      `;
      let cabecera;
      try {
        const cabeceraRes = await query(cabeceraSql, [instalacion_id, rol_servicio_id, vigencia_desde]);
        cabecera = Array.isArray(cabeceraRes) ? cabeceraRes[0] : (cabeceraRes.rows || [])[0];
      } catch (e: any) {
        // Mapear exclusión por rango a 409
        if (e && (e.code === '23P01' || (typeof e.message === 'string' && e.message.includes('sueldo_estructura_instalacion_no_overlap')))) {
          await query('ROLLBACK');
          return NextResponse.json(
            { code: 'OVERLAP', error: 'Ya existe una estructura activa o solapada para ese período.' },
            { status: 409 }
          );
        }
        throw e;
      }

      // Resolver item sueldo_base desde sueldo_item (por código o por id si se enviara)
      const sueldoBaseRowRes = await query(
        `SELECT id, codigo, nombre, clase, naturaleza
         FROM sueldo_item
         WHERE activo = TRUE AND (LOWER(codigo) = 'sueldo_base')
         LIMIT 1`
      );
      const sueldoBaseItem = Array.isArray(sueldoBaseRowRes)
        ? sueldoBaseRowRes[0]
        : (sueldoBaseRowRes.rows || [])[0];

      const baseCodigo = sueldoBaseItem?.codigo || 'sueldo_base';
      const baseNombre = sueldoBaseItem?.nombre || 'Sueldo base';
      const baseClase = sueldoBaseItem?.clase || 'HABER';
      const baseNaturaleza = sueldoBaseItem?.naturaleza || 'IMPONIBLE';

      // c) Validar solapamiento de sueldo_base dentro de la estructura
      const overlapBaseRes = await query(
        `SELECT 1
         FROM sueldo_estructura_inst_item x
         WHERE x.estructura_id = $1
           AND x.item_codigo = $2
           AND x.activo = TRUE
           AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
               && daterange($3::date, 'infinity'::date, '[]')
         LIMIT 1`,
        [cabecera.id, baseCodigo, vigencia_desde]
      );
      const baseOverlap = Array.isArray(overlapBaseRes) ? overlapBaseRes : (overlapBaseRes.rows || []);
      if (baseOverlap.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { code: 'ITEM_OVERLAP', error: 'La línea de sueldo base se solapa con otra vigente.' },
          { status: 409 }
        );
      }

      // Insertar línea de sueldo_base
      const insertBaseRes = await query(
        `INSERT INTO sueldo_estructura_inst_item (
           estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE)
         RETURNING id, estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo`,
        [cabecera.id, baseCodigo, baseNombre, baseClase, baseNaturaleza, sueldo_base, vigencia_desde]
      );
      const lineaBase = Array.isArray(insertBaseRes) ? insertBaseRes[0] : (insertBaseRes.rows || [])[0];

      const lineas: any[] = [lineaBase];

      // d) Insertar ítems HABER opcionales (si vienen)
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (!it || it.monto === undefined || it.monto === null) continue;

          // Resolver datos del item por ID o por código
          let itemRow;
          if (it.item_id && it.item_id.length === 36) {
            // parece UUID -> buscar por id
            const itemRes = await query(
              `SELECT id, codigo, nombre, clase, naturaleza
               FROM sueldo_item
               WHERE id = $1 AND activo = TRUE
               LIMIT 1`,
              [it.item_id]
            );
            itemRow = Array.isArray(itemRes) ? itemRes[0] : (itemRes.rows || [])[0];
          } else if (it.item_id) {
            const itemRes = await query(
              `SELECT id, codigo, nombre, clase, naturaleza
               FROM sueldo_item
               WHERE activo = TRUE AND codigo = $1
               LIMIT 1`,
              [it.item_id]
            );
            itemRow = Array.isArray(itemRes) ? itemRes[0] : (itemRes.rows || [])[0];
          }

          if (!itemRow) continue;
          if (String(itemRow.clase).toUpperCase() !== 'HABER') continue; // Solo HABER
          if (String(itemRow.codigo).toLowerCase() === 'sueldo_base') continue; // excluir base aquí

          // validar solape
          const solRes = await query(
            `SELECT 1 FROM sueldo_estructura_inst_item x
             WHERE x.estructura_id = $1
               AND x.item_codigo = $2
               AND x.activo = TRUE
               AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
                    && daterange($3::date, 'infinity'::date, '[]')
             LIMIT 1`,
            [cabecera.id, itemRow.codigo, vigencia_desde]
          );
          const existeSolape = Array.isArray(solRes) ? solRes : (solRes.rows || []);
          if (existeSolape.length > 0) {
            await query('ROLLBACK');
            return NextResponse.json(
              { code: 'ITEM_OVERLAP', error: `El ítem ${itemRow.nombre} se solapa con otro período.` },
              { status: 409 }
            );
          }

          const insRes = await query(
            `INSERT INTO sueldo_estructura_inst_item (
               estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE)
             RETURNING id, estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo`,
            [cabecera.id, itemRow.codigo, itemRow.nombre, itemRow.clase, itemRow.naturaleza, it.monto, vigencia_desde]
          );
          const linea = Array.isArray(insRes) ? insRes[0] : (insRes.rows || [])[0];
          lineas.push(linea);
        }
      }

      await query('COMMIT');

      return NextResponse.json({ cabecera, lineas }, { status: 201 });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    logger.error('Error creando estructura de instalación::', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}


