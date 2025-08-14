import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    // 1. Validar parámetros de entrada
    if (!guardiaId) {
      return NextResponse.json(
        { error: 'ID de guardia requerido' },
        { status: 400 }
      );
    }

    // 2. Validar y procesar mes y año
    const fechaActual = new Date();
    let mesActual = fechaActual.getMonth() + 1;
    let anioActual = fechaActual.getFullYear();

    if (mes) {
      const mesNum = parseInt(mes);
      if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
        return NextResponse.json(
          { error: 'Mes debe ser un número entre 1 y 12' },
          { status: 400 }
        );
      }
      mesActual = mesNum;
    }

    if (anio) {
      const anioNum = parseInt(anio);
      if (isNaN(anioNum) || anioNum <= 0) {
        return NextResponse.json(
          { error: 'Año debe ser un número positivo' },
          { status: 400 }
        );
      }
      anioActual = anioNum;
    }

    console.log(`🔍 Consultando historial mensual para guardia ${guardiaId}, mes ${mesActual}, año ${anioActual}`);

    // 3. Verificar que el guardia existe
    const guardiaResult = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno
      FROM guardias 
      WHERE id = $1
    `, [guardiaId]);

    if (guardiaResult.rows.length === 0) {
      console.log(`❌ Guardia ${guardiaId} no encontrado`);
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardia = guardiaResult.rows[0];

    // 4. Consultar historial mensual del guardia con LEFT JOINs
    const historialResult = await query(`
      SELECT 
        pm.id,
        pm.dia,
        CASE 
          -- Días planificados con turno se muestran como 'turno'
          WHEN pm.estado = 'planificado' THEN 'turno'
          -- Días confirmados como trabajado se mantienen como 'trabajado'
          WHEN pm.estado = 'trabajado' THEN 'trabajado'
          -- Días de inasistencia se mantienen como 'inasistencia'
          WHEN pm.estado = 'inasistencia' THEN 'inasistencia'
          -- Días con reemplazo se mantienen como 'reemplazo'
          WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
          -- Días libres se mantienen como 'libre'
          WHEN pm.estado = 'libre' THEN 'libre'
          -- Días de vacaciones se mantienen como 'vacaciones'
          WHEN pm.estado = 'vacaciones' THEN 'vacaciones'
          -- Días de licencia se mantienen como 'licencia'
          WHEN pm.estado = 'licencia' THEN 'licencia'
          -- Días de permiso se mantienen como 'permiso'
          WHEN pm.estado = 'permiso' THEN 'permiso'
          -- Para cualquier otro estado, mantener el original
          ELSE pm.estado
        END as estado,
        pm.observaciones,
        pm.reemplazo_guardia_id,
        pm.created_at,
        pm.updated_at,
        
        -- Información del puesto (LEFT JOIN para evitar pérdida de registros)
        po.nombre_puesto,
        po.es_ppc,
        
        -- Información de la instalación (LEFT JOIN)
        i.nombre as instalacion_nombre,
        
        -- Información del guardia de reemplazo (si existe)
        rg.nombre as reemplazo_nombre,
        rg.apellido_paterno as reemplazo_apellido_paterno,
        rg.apellido_materno as reemplazo_apellido_materno
        
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias rg ON pm.reemplazo_guardia_id::uuid = rg.id
      
      WHERE pm.guardia_id = $1
        AND pm.anio = $2 
        AND pm.mes = $3
      
      ORDER BY pm.dia ASC
    `, [guardiaId, anioActual, mesActual]);

    const historial = historialResult.rows;

    // 5. Log para depuración
    console.log(`✅ Historial mensual cargado correctamente para el guardia ${guardia.nombre} ${guardia.apellido_paterno}`);
    console.log(`📊 Registros encontrados: ${historial.length}`);

    if (historial.length === 0) {
      console.log(`ℹ️ No hay registros para el guardia ${guardiaId} en ${mesActual}/${anioActual}`);
    }

    // 6. Retornar respuesta exitosa (incluso con array vacío)
    return NextResponse.json({
      success: true,
      guardia: {
        id: guardia.id,
        nombre: `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim()
      },
      mes: mesActual,
      anio: anioActual,
      historial: historial,
      total_registros: historial.length
    });

  } catch (error) {
    console.error('❌ Error consultando historial mensual:', error);
    return NextResponse.json(
      { error: 'Error al cargar historial' },
      { status: 500 }
    );
  }
}

