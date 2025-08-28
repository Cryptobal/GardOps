import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query, getColumnType, checkTableExists } from '@/lib/database';

interface CreateBody {
  instalacion_id: string;
  rol_servicio_id: string;
  vigencia_desde: string; // YYYY-MM-DD
  sueldo_base: number; // obligatorio, permite 0
  items?: { item_id: string; monto: number }[]; // solo HABER
}

export async function POST(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const body = (await request.json()) as CreateBody;
    const { instalacion_id, rol_servicio_id, vigencia_desde, sueldo_base, items } = body || {} as CreateBody;

    if (!instalacion_id || !rol_servicio_id || !vigencia_desde || sueldo_base === undefined || sueldo_base === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validar existencia de tablas mínimas
    const hasHeader = await checkTableExists('sueldo_estructura_instalacion');
    const hasDetail = await checkTableExists('sueldo_estructura_inst_item');
    if (!hasHeader || !hasDetail) {
      return NextResponse.json(
        { code: 'MISSING_TABLES', error: 'Faltan tablas de estructuras de servicio. Ejecuta la migración de estructuras.' },
        { status: 400 }
      );
    }

    await query('BEGIN');
    try {
      // a) Insertar cabecera (la exclusión por rango la asegura PG con el constraint EXCLUDE si existe)
      // Detectar columnas reales de cabecera
      const headColsRes = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'sueldo_estructura_instalacion'`
      );
      const headCols = new Set((Array.isArray(headColsRes) ? headColsRes : (headColsRes.rows || [])).map((r: any) => r.column_name));
      const headerHasVigHasta = headCols.has('vigencia_hasta');

      // Adaptar tipo de rol segun columna
      const rolColType = (await getColumnType('sueldo_estructura_instalacion', 'rol_servicio_id')) || '';
      let rolValue: any = rol_servicio_id;
      if (/^int/i.test(rolColType)) {
        const n = parseInt(String(rol_servicio_id), 10);
        if (Number.isNaN(n)) {
          await query('ROLLBACK');
          return NextResponse.json({ code: 'ROL_ID_INVALID', error: 'rol_servicio_id debe ser numérico' }, { status: 400 });
        }
        rolValue = n;
      } else if (/uuid/i.test(rolColType)) {
        // Validar UUID simple
        if (!/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(String(rol_servicio_id))) {
          // Si viene un entero ("4"), avisar del desajuste de tipos
          if (/^\d+$/.test(String(rol_servicio_id))) {
            await query('ROLLBACK');
            return NextResponse.json({ code: 'ROL_ID_TYPE_MISMATCH', error: 'El sistema espera UUID para rol_servicio_id pero se recibió un número. Ajusta el origen de roles.' }, { status: 400 });
          }
        }
      }

      // Calcular próxima versión para esta instalación+rol
      const verRes = await query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM sueldo_estructura_instalacion
         WHERE instalacion_id = $1 AND rol_servicio_id = $2`,
        [instalacion_id, rolValue]
      );
      const nextVersion = (Array.isArray(verRes) ? verRes[0]?.next_version : verRes.rows?.[0]?.next_version) || 1;

      let cabecera;
      try {
        if (headerHasVigHasta) {
          const cabeceraRes = await query(
            `INSERT INTO sueldo_estructura_instalacion (
               instalacion_id, rol_servicio_id, version, vigencia_desde, vigencia_hasta, activo
             ) VALUES ($1, $2, $3, $4, NULL, TRUE)
             RETURNING id`,
            [instalacion_id, rolValue, nextVersion, vigencia_desde]
          );
          cabecera = Array.isArray(cabeceraRes) ? cabeceraRes[0] : (cabeceraRes.rows || [])[0];
        } else {
          const cabeceraRes = await query(
            `INSERT INTO sueldo_estructura_instalacion (
               instalacion_id, rol_servicio_id, version, vigencia_desde, activo
             ) VALUES ($1, $2, $3, $4, TRUE)
             RETURNING id`,
            [instalacion_id, rolValue, nextVersion, vigencia_desde]
          );
          cabecera = Array.isArray(cabeceraRes) ? cabeceraRes[0] : (cabeceraRes.rows || [])[0];
        }
      } catch (e: any) {
        // Intentar resolver solape cerrando estructura previa (solo si hay vigencia_hasta en cabecera)
        const isOverlap = e && (
          e.code === '23P01' ||
          (typeof e.message === 'string' && e.message.includes('sueldo_estructura_instalacion_no_overlap'))
        );
        if (isOverlap && headerHasVigHasta) {
          try {
            const sol = await query(
              `SELECT id, version, vigencia_desde, vigencia_hasta, activo
               FROM sueldo_estructura_instalacion
               WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND activo = TRUE
                 AND daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')
                     && daterange($3::date, 'infinity'::date, '[]')
               ORDER BY vigencia_desde DESC
               LIMIT 1`,
              [instalacion_id, rolValue, vigencia_desde]
            );
            const prev = Array.isArray(sol) ? sol[0] : (sol.rows || [])[0];
            if (prev?.id) {
              await query(
                `UPDATE sueldo_estructura_instalacion
                 SET vigencia_hasta = ($1::date - INTERVAL '1 day'), updated_at = NOW()
                 WHERE id = $2`,
                [vigencia_desde, prev.id]
              );
              // Reintentar inserción de cabecera
              const cabeceraRes = await query(
                `INSERT INTO sueldo_estructura_instalacion (
                   instalacion_id, rol_servicio_id, version, vigencia_desde, vigencia_hasta, activo
                 ) VALUES ($1, $2, $3, $4, NULL, TRUE)
                 RETURNING id`,
                [instalacion_id, rolValue, nextVersion, vigencia_desde]
              );
              cabecera = Array.isArray(cabeceraRes) ? cabeceraRes[0] : (cabeceraRes.rows || [])[0];
            } else {
              await query('ROLLBACK');
              return NextResponse.json(
                { code: 'OVERLAP', error: 'Existe una estructura activa que se solapa y no se pudo determinar.' },
                { status: 409 }
              );
            }
          } catch (autoErr) {
            await query('ROLLBACK');
            
            // Buscar estructuras conflictivas para dar información más específica
            try {
              const conflictivas = await query(
                `SELECT id, version, vigencia_desde, vigencia_hasta, activo, created_at
                 FROM sueldo_estructura_instalacion
                 WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND activo = TRUE
                   AND daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')
                       && daterange($3::date, 'infinity'::date, '[]')
                 ORDER BY vigencia_desde DESC`,
                [instalacion_id, rolValue, vigencia_desde]
              );
              const estructuras = Array.isArray(conflictivas) ? conflictivas : (conflictivas.rows || []);
              
              if (estructuras.length > 0) {
                const estructuraInfo = estructuras.map((e: any) => 
                  `Versión ${e.version} (vigente desde ${e.vigencia_desde}${e.vigencia_hasta ? ` hasta ${e.vigencia_hasta}` : ' sin fecha fin'})`
                ).join(', ');
                
                return NextResponse.json(
                  { 
                    code: 'OVERLAP', 
                    error: `Existe una estructura activa que se solapa con la fecha ${vigencia_desde}. Estructuras conflictivas: ${estructuraInfo}. Inactiva la estructura existente o elige una fecha diferente.`,
                    conflictingStructures: estructuras
                  },
                  { status: 409 }
                );
              }
            } catch (searchErr) {
              // Si no se puede buscar las estructuras conflictivas, continuar con error genérico
            }
            
            return NextResponse.json(
              { code: 'OVERLAP', error: 'Existía una estructura activa en ese período. No se pudo cerrar automáticamente.' },
              { status: 409 }
            );
          }
        } else if (
          e && (
            e.code === '23505' ||
            (typeof e.message === 'string' && e.message.includes('unique_instalacion_rol_version'))
          )
        ) {
          await query('ROLLBACK');
          return NextResponse.json(
            { code: 'OVERLAP', error: 'Ya existe una versión para esa instalación y rol en ese período.' },
            { status: 409 }
          );
        } else if (e && (e.code === '22P02' || e.code === '42804')) {
          await query('ROLLBACK');
          return NextResponse.json(
            { code: 'TYPE_MISMATCH', error: 'Tipo incompatible en rol_servicio_id o campos relacionados.' },
            { status: 400 }
          );
        } else if (e && e.code === '42P01') {
          await query('ROLLBACK');
          return NextResponse.json(
            { code: 'MISSING_TABLES', error: 'Faltan tablas de estructuras de servicio en la BD.' },
            { status: 400 }
          );
        } else {
          // Si es un error de solapamiento pero no se pudo manejar automáticamente, buscar estructuras conflictivas
          if (e && (
            e.code === '23P01' ||
            (typeof e.message === 'string' && e.message.includes('sueldo_estructura_instalacion_no_overlap'))
          )) {
            try {
              const conflictivas = await query(
                `SELECT id, version, vigencia_desde, vigencia_hasta, activo, created_at
                 FROM sueldo_estructura_instalacion
                 WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND activo = TRUE
                   AND daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')
                       && daterange($3::date, 'infinity'::date, '[]')
                 ORDER BY vigencia_desde DESC`,
                [instalacion_id, rolValue, vigencia_desde]
              );
              const estructuras = Array.isArray(conflictivas) ? conflictivas : (conflictivas.rows || []);
              
              if (estructuras.length > 0) {
                const estructuraInfo = estructuras.map((e: any) => 
                  `Versión ${e.version} (vigente desde ${e.vigencia_desde}${e.vigencia_hasta ? ` hasta ${e.vigencia_hasta}` : ' sin fecha fin'})`
                ).join(', ');
                
                await query('ROLLBACK');
                return NextResponse.json(
                  { 
                    code: 'OVERLAP', 
                    error: `Existe una estructura activa que se solapa con la fecha ${vigencia_desde}. Estructuras conflictivas: ${estructuraInfo}. Inactiva la estructura existente o elige una fecha diferente.`,
                    conflictingStructures: estructuras
                  },
                  { status: 409 }
                );
              }
            } catch (searchErr) {
              // Si no se puede buscar las estructuras conflictivas, devolver error genérico
            }
          }
          
          await query('ROLLBACK');
          return NextResponse.json(
            { code: 'OVERLAP', error: 'Existe una estructura activa que se solapa con la fecha especificada. Inactiva la estructura existente o elige una fecha diferente.' },
            { status: 409 }
          );
        }
      }

      // Detectar esquema de detalle (por columnas)
      const colsRes = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'sueldo_estructura_inst_item'`
      );
      const cols = new Set((Array.isArray(colsRes) ? colsRes : (colsRes.rows || [])).map((r: any) => r.column_name));
      const usaItemCodigo = cols.has('item_codigo');

      // Resolver item sueldo_base desde sueldo_item (por código)
      let sueldoBaseRowRes = await query(
        `SELECT id, codigo, nombre, clase, naturaleza
         FROM sueldo_item
         WHERE activo = TRUE AND (LOWER(codigo) = 'sueldo_base')
         LIMIT 1`
      );
      let sueldoBaseItem = Array.isArray(sueldoBaseRowRes)
        ? sueldoBaseRowRes[0]
        : (sueldoBaseRowRes.rows || [])[0];
      // Si no existe en catálogo, crearlo mínimamente
      if (!sueldoBaseItem) {
        try {
          const ins = await query(
            `INSERT INTO sueldo_item (codigo, nombre, clase, naturaleza, tope_modo, activo)
             VALUES ('sueldo_base', 'Sueldo base', 'HABER', 'IMPONIBLE', 'NONE', TRUE)
             ON CONFLICT (codigo) DO NOTHING
             RETURNING id, codigo, nombre, clase, naturaleza`
          );
          sueldoBaseItem = Array.isArray(ins) ? ins[0] : (ins.rows || [])[0];
        } catch (_) {}
        if (!sueldoBaseItem) {
          // Re-consultar por si ON CONFLICT no devolvió
          const re = await query(
            `SELECT id, codigo, nombre, clase, naturaleza FROM sueldo_item WHERE codigo = 'sueldo_base' LIMIT 1`
          );
          sueldoBaseItem = Array.isArray(re) ? re[0] : (re.rows || [])[0];
        }
      }

      const baseCodigo = sueldoBaseItem?.codigo || 'sueldo_base';
      const baseNombre = sueldoBaseItem?.nombre || 'Sueldo base';
      const baseClase = sueldoBaseItem?.clase || 'HABER';
      const baseNaturaleza = sueldoBaseItem?.naturaleza || 'IMPONIBLE';

      // c) Validar solapamiento de sueldo_base dentro de la estructura
      const overlapBaseRes = usaItemCodigo
        ? await query(
            `SELECT 1
             FROM sueldo_estructura_inst_item x
             WHERE x.estructura_id = $1
               AND x.item_codigo = $2
               AND x.activo = TRUE
               AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
                   && daterange($3::date, 'infinity'::date, '[]')
             LIMIT 1`,
            [cabecera.id, baseCodigo, vigencia_desde]
          )
        : await query(
            `SELECT 1
             FROM sueldo_estructura_inst_item x
             WHERE x.estructura_id = $1
               AND x.item_id = $2
               AND x.activo = TRUE
               AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
                   && daterange($3::date, 'infinity'::date, '[]')
             LIMIT 1`,
            [cabecera.id, sueldoBaseItem?.id, vigencia_desde]
          );
      const baseOverlap = Array.isArray(overlapBaseRes) ? overlapBaseRes : (overlapBaseRes.rows || []);
      if (baseOverlap.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { code: 'ITEM_OVERLAP', error: 'La línea de sueldo base se solapa con otra vigente.' },
          { status: 409 }
        );
      }

      // Insertar línea de sueldo_base según esquema
      const insertBaseRes = usaItemCodigo
        ? await query(
            `INSERT INTO sueldo_estructura_inst_item (
               estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE)
             RETURNING id, estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo`,
            [cabecera.id, baseCodigo, baseNombre, baseClase, baseNaturaleza, sueldo_base, vigencia_desde]
          )
        : await query(
            `INSERT INTO sueldo_estructura_inst_item (
               estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo
             ) VALUES ($1, $2, $3, $4, NULL, TRUE)
             RETURNING id, estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo`,
            [cabecera.id, sueldoBaseItem?.id, sueldo_base, vigencia_desde]
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
          const solRes = usaItemCodigo
            ? await query(
                `SELECT 1 FROM sueldo_estructura_inst_item x
                 WHERE x.estructura_id = $1
                   AND x.item_codigo = $2
                   AND x.activo = TRUE
                   AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
                        && daterange($3::date, 'infinity'::date, '[]')
                 LIMIT 1`,
                [cabecera.id, itemRow.codigo, vigencia_desde]
              )
            : await query(
                `SELECT 1 FROM sueldo_estructura_inst_item x
                 WHERE x.estructura_id = $1
                   AND x.item_id = $2
                   AND x.activo = TRUE
                   AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
                        && daterange($3::date, 'infinity'::date, '[]')
                 LIMIT 1`,
                [cabecera.id, itemRow.id, vigencia_desde]
              );
          const existeSolape = Array.isArray(solRes) ? solRes : (solRes.rows || []);
          if (existeSolape.length > 0) {
            await query('ROLLBACK');
            return NextResponse.json(
              { code: 'ITEM_OVERLAP', error: `El ítem ${itemRow.nombre} se solapa con otro período.` },
              { status: 409 }
            );
          }

          const insRes = usaItemCodigo
            ? await query(
                `INSERT INTO sueldo_estructura_inst_item (
                   estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, TRUE)
                 RETURNING id, estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo`,
                [cabecera.id, itemRow.codigo, itemRow.nombre, itemRow.clase, itemRow.naturaleza, it.monto, vigencia_desde]
              )
            : await query(
                `INSERT INTO sueldo_estructura_inst_item (
                   estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo
                 ) VALUES ($1, $2, $3, $4, NULL, TRUE)
                 RETURNING id, estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo`,
                [cabecera.id, itemRow.id, it.monto, vigencia_desde]
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
    console.error('Error creando estructura de instalación:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}


