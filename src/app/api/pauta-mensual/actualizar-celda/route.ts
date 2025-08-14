import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function PUT(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'pauta_mensual', action: 'update' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { 
      instalacion_id, 
      anio, 
      mes, 
      puesto_id, 
      guardia_id, 
      dia, 
      estado 
    } = body;

    if (!instalacion_id || !anio || !mes || !puesto_id || !guardia_id || !dia || !estado) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes, puesto_id, guardia_id, dia, estado' },
        { status: 400 }
      );
    }

    // Validar estado permitido
    const estadosPermitidos = ['trabajado', 'libre', 'permiso', 'vacaciones', 'licencia'];
    if (!estadosPermitidos.includes(estado)) {
      return NextResponse.json(
        { error: `Estado no válido. Estados permitidos: ${estadosPermitidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Verificar que el puesto pertenece a la instalación
    const puestoExiste = await query(`
      SELECT id 
      FROM as_turnos_puestos_operativos 
      WHERE id = $1 AND instalacion_id = $2 AND activo = true
    `, [puesto_id, instalacion_id]);

    if (puestoExiste.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado o no pertenece a la instalación especificada' },
        { status: 404 }
      );
    }

    // Verificar si existe el registro de pauta
    const pautaExistente = await query(`
      SELECT id 
      FROM as_turnos_pauta_mensual 
      WHERE puesto_id = $1 AND guardia_id = $2 AND anio = $3 AND mes = $4 AND dia = $5
    `, [puesto_id, guardia_id, anio, mes, dia]);

    if (pautaExistente.rows.length === 0) {
      // Crear nuevo registro si no existe
      await query(`
        INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [puesto_id, guardia_id, anio, mes, dia, estado]);
    } else {
      // Actualizar registro existente
      await query(`
        UPDATE as_turnos_pauta_mensual 
        SET estado = $1, updated_at = CURRENT_TIMESTAMP
        WHERE puesto_id = $2 AND guardia_id = $3 AND anio = $4 AND mes = $5 AND dia = $6
      `, [estado, puesto_id, guardia_id, anio, mes, dia]);
    }

    console.log(`✅ Celda actualizada: Puesto ${puesto_id}, Día ${dia}, Estado: ${estado}`);

    return NextResponse.json({
      success: true,
      message: 'Celda actualizada exitosamente',
      data: {
        puesto_id,
        guardia_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        dia: parseInt(dia),
        estado
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando celda de pauta mensual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la celda' },
      { status: 500 }
    );
  }
} 