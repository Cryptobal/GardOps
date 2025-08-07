import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener todas las estructuras de servicio de una instalación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    
    const result = await query(`
      WITH base AS (
        SELECT es.*, ROW_NUMBER() OVER (
          PARTITION BY es.instalacion_id, es.rol_servicio_id
          ORDER BY es.updated_at DESC, es.created_at DESC
        ) AS rn
        FROM sueldo_estructuras_servicio es
        WHERE es.instalacion_id = $1 AND es.bono_id IS NULL
      ),
      bonos AS (
        SELECT es.*
        FROM sueldo_estructuras_servicio es
        WHERE es.instalacion_id = $1 AND es.bono_id IS NOT NULL
      )
      (
        SELECT 
          b.id,
          b.instalacion_id,
          b.rol_servicio_id,
          'Sueldo Base' AS nombre_bono,
          b.sueldo_base AS monto,
          TRUE AS imponible,
          rs.nombre AS rol_nombre
        FROM base b
        INNER JOIN as_turnos_roles_servicio rs ON b.rol_servicio_id = rs.id
        WHERE b.rn = 1 AND rs.estado = 'Activo'
      )
      UNION ALL
      (
        SELECT 
          es.id,
          es.instalacion_id,
          es.rol_servicio_id,
          COALESCE(bg.nombre, 'Bono') AS nombre_bono,
          es.monto,
          COALESCE(bg.imponible, TRUE) AS imponible,
          rs.nombre AS rol_nombre
        FROM bonos es
        INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
        LEFT JOIN sueldo_bonos_globales bg ON es.bono_id = bg.id
        WHERE rs.estado = 'Activo'
      )
      ORDER BY rol_nombre, nombre_bono
    `, [instalacionId]);
    
    // Extraer solo el array de rows
    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error obteniendo estructuras de servicio:', error);
    return NextResponse.json(
      { error: 'Error al obtener estructuras de servicio' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva estructura de servicio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { rol_servicio_id, nombre_bono, monto, imponible } = body;
    
    // Validar datos requeridos
    if (!rol_servicio_id || !nombre_bono || monto === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }
    
    // Caso especial: Sueldo Base
    if (nombre_bono === 'Sueldo Base') {
      // Buscar si ya existe fila base (bono_id IS NULL) para este par
      const baseExistente = await query(
        `SELECT id FROM sueldo_estructuras_servicio 
         WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND bono_id IS NULL 
         LIMIT 1`,
        [instalacionId, rol_servicio_id]
      );
      const baseRow = Array.isArray(baseExistente) ? baseExistente[0] : (baseExistente.rows || [])[0];
      if (baseRow) {
        const upd = await query(
          `UPDATE sueldo_estructuras_servicio
           SET sueldo_base = $1, updated_at = NOW()
           WHERE id = $2 RETURNING id, instalacion_id, rol_servicio_id`,
          [monto, baseRow.id]
        );
        const r = Array.isArray(upd) ? upd[0] : (upd.rows || [])[0];
        return NextResponse.json({
          ...r,
          nombre_bono: 'Sueldo Base',
          monto,
          imponible: true,
        });
      } else {
        const ins = await query(
          `INSERT INTO sueldo_estructuras_servicio (
             instalacion_id, rol_servicio_id, sueldo_base, bono_id, monto
           ) VALUES ($1, $2, $3, NULL, 0)
           RETURNING id, instalacion_id, rol_servicio_id`,
          [instalacionId, rol_servicio_id, monto]
        );
        const r = Array.isArray(ins) ? ins[0] : (ins.rows || [])[0];
        return NextResponse.json({
          ...r,
          nombre_bono: 'Sueldo Base',
          monto,
          imponible: true,
        });
      }
    }

    // Buscar o crear bono global por nombre
    const bonoExistente = await query(
      `SELECT id, imponible FROM sueldo_bonos_globales WHERE nombre = $1 LIMIT 1`,
      [nombre_bono]
    );
    let bonoGlobal = Array.isArray(bonoExistente) ? bonoExistente[0] : (bonoExistente.rows || [])[0];
    if (!bonoGlobal) {
      const creado = await query(
        `INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible)
         VALUES ($1, NULL, $2) RETURNING id, imponible`,
        [nombre_bono, imponible !== false]
      );
      bonoGlobal = Array.isArray(creado) ? creado[0] : (creado.rows || [])[0];
    }

    // Evitar duplicados para el mismo bono en la misma instalación/rol
    const dup = await query(
      `SELECT id FROM sueldo_estructuras_servicio 
       WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND bono_id = $3`,
      [instalacionId, rol_servicio_id, bonoGlobal.id]
    );
    const dupRow = Array.isArray(dup) ? dup[0] : (dup.rows || [])[0];
    if (dupRow) {
      return NextResponse.json(
        { error: 'Ya existe un bono con ese nombre para este rol' },
        { status: 400 }
      );
    }

    const ins = await query(
      `INSERT INTO sueldo_estructuras_servicio (
         instalacion_id, rol_servicio_id, bono_id, monto
       ) VALUES ($1, $2, $3, $4)
       RETURNING id, instalacion_id, rol_servicio_id`,
      [instalacionId, rol_servicio_id, bonoGlobal.id, monto]
    );
    const r = Array.isArray(ins) ? ins[0] : (ins.rows || [])[0];
    return NextResponse.json({
      ...r,
      nombre_bono,
      monto,
      imponible: bonoGlobal.imponible,
    });
  } catch (error) {
    console.error('Error creando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al crear estructura de servicio' },
      { status: 500 }
    );
  }
}
