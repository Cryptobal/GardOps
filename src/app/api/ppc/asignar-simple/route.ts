import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

/**
 * API simplificada para asignación de PPC - Solo para debuggear
 * SIN imports complejos que puedan causar error 500
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [SIMPLE] Iniciando asignación simple...');
    
    const body = await request.json();
    console.log('🔍 [SIMPLE] Body recibido:', body);
    
    const { guardia_id, puesto_operativo_id, fecha_inicio } = body;
    
    console.log('🔍 [SIMPLE] Datos extraídos:', {
      guardia_id,
      puesto_operativo_id,
      fecha_inicio,
      fecha_inicio_tipo: typeof fecha_inicio,
      fecha_inicio_length: fecha_inicio?.length
    });
    
    // DEPURACIÓN ESPECÍFICA PARA EL PROBLEMA - PARA CUALQUIER PUESTO
    console.log('🔴 [BACKEND] RECIBIDO EN EL SERVIDOR:', {
      puesto_id: puesto_operativo_id,
      fecha_inicio_recibida: fecha_inicio,
      fecha_inicio_tipo: typeof fecha_inicio,
      fecha_parseada_normal: new Date(fecha_inicio),
      fecha_parseada_con_hora: new Date(fecha_inicio + 'T12:00:00'),
      fecha_parseada_iso: new Date(fecha_inicio).toISOString(),
      fecha_parseada_chile: new Date(fecha_inicio).toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
      diferencia_dias: new Date(fecha_inicio).getDate() - new Date(fecha_inicio + 'T12:00:00').getDate()
    });

    if (!guardia_id || !puesto_operativo_id) {
      console.log('❌ [SIMPLE] Faltan campos requeridos');
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y puesto_operativo_id' },
        { status: 400 }
      );
    }

    // Verificar que el puesto existe
    console.log('🔍 [SIMPLE] Verificando puesto...');
    const puestoCheck = await query(`
      SELECT id, instalacion_id, es_ppc, guardia_id, nombre_puesto
      FROM as_turnos_puestos_operativos 
      WHERE id = $1
    `, [puesto_operativo_id]);
    
    console.log('🔍 [SIMPLE] Resultado puesto:', puestoCheck.rows[0] || null);

    if (puestoCheck.rows.length === 0) {
      console.log('❌ [SIMPLE] Puesto no encontrado');
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el guardia existe
    console.log('🔍 [SIMPLE] Verificando guardia...');
    const guardiaCheck = await query(`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      WHERE id = $1
    `, [guardia_id]);
    
    console.log('🔍 [SIMPLE] Resultado guardia:', guardiaCheck.rows[0] || null);

    if (guardiaCheck.rows.length === 0) {
      console.log('❌ [SIMPLE] Guardia no encontrado');
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Asignación simple
    console.log('🔍 [SIMPLE] Ejecutando asignación...');
    await query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        guardia_id = $1,
        es_ppc = false,
        actualizado_en = NOW()
      WHERE id = $2
    `, [guardia_id, puesto_operativo_id]);
    
    console.log('✅ [SIMPLE] Asignación completada');

    // CRÍTICO: Sincronizar la pauta mensual para que muestre las iniciales
    console.log('🔍 [SIMPLE] Sincronizando pauta mensual...');
    const fechaInicioFinal = fecha_inicio || new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }).split(',')[0];
    const fechaInicioDate = new Date(fechaInicioFinal);
    const anio = fechaInicioDate.getFullYear();
    const mes = fechaInicioDate.getMonth() + 1; // getMonth() es 0-based
    const diaInicio = fechaInicioDate.getDate();
    
    console.log('🔍 [SIMPLE] Parámetros de sincronización:', {
      puesto_operativo_id,
      guardia_id,
      fechaInicioFinal,
      anio,
      mes,
      diaInicio
    });

    // CORRECCIÓN CRÍTICA: Solo actualizar días PLANIFICADOS, dejar días libres sin cambios
    const updatePautaResult = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET 
        guardia_id = CASE 
          WHEN tipo_turno = 'planificado' THEN $1  -- Solo días planificados
          ELSE guardia_id  -- Días libres NO cambian
        END,
        guardia_trabajo_id = CASE 
          WHEN tipo_turno = 'planificado' THEN $1  -- Solo días planificados
          ELSE guardia_trabajo_id  -- Días libres NO cambian
        END,
        estado_puesto = CASE 
          WHEN tipo_turno = 'planificado' THEN 'asignado'  -- Solo días planificados
          ELSE estado_puesto  -- Días libres NO cambian
        END,
        estado_guardia = null,  -- SIEMPRE null en pauta mensual
        tipo_cobertura = CASE 
          WHEN tipo_turno = 'planificado' THEN 'guardia_asignado'  -- Solo días planificados
          ELSE tipo_cobertura  -- Días libres NO cambian
        END,
        updated_at = NOW()
      WHERE puesto_id = $2 
        AND anio = $3 
        AND mes = $4
        AND dia >= $5  -- Solo desde fecha de inicio
    `, [guardia_id, puesto_operativo_id, anio, mes, diaInicio]);
    
    console.log('✅ [SIMPLE] Pauta mensual sincronizada:', updatePautaResult.rowCount, 'registros actualizados');
    
    // Verificar que la actualización funcionó correctamente
    console.log('🔍 [SIMPLE] Verificando actualización...');
    const verificacion = await query(`
      SELECT dia, tipo_turno, guardia_id, guardia_trabajo_id, estado_puesto, tipo_cobertura
      FROM as_turnos_pauta_mensual 
      WHERE puesto_id = $1 
        AND anio = $2 
        AND mes = $3
        AND dia >= $4
      ORDER BY dia
    `, [puesto_operativo_id, anio, mes, diaInicio]);
    
    console.log('🔍 [SIMPLE] Resultado de verificación:', verificacion.rows.slice(0, 10));

    // Registrar en historial (opcional)
    try {
      const instalacion_id = puestoCheck.rows[0].instalacion_id;
      const fechaInicioFinal = fecha_inicio || new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }).split(',')[0];
      
      console.log('🔍 [SIMPLE] Registrando en historial...', {
        guardia_id,
        instalacion_id,
        puesto_operativo_id,
        fechaInicioFinal,
        fechaOriginal: fecha_inicio,
        fechaActualUTC: new Date().toISOString(),
        fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
        fechaActualChileISO: new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' })
      });
      
      console.log('🔍 [SIMPLE] FECHA RECIBIDA VS FINAL:', {
        fecha_inicio_recibida: fecha_inicio,
        fechaInicioFinal_calculada: fechaInicioFinal,
        son_iguales: fecha_inicio === fechaInicioFinal
      });
      
      await query(`
        INSERT INTO historial_asignaciones_guardias (
          guardia_id, instalacion_id, puesto_id, fecha_inicio,
          tipo_asignacion, motivo_inicio, estado, observaciones, tenant_id
        ) VALUES ($1, $2, $3, $4, 'fija', 'asignacion_ppc_simple', 'activa', 'Asignación desde PPC con fecha', obtener_tenant_id_actual())
      `, [guardia_id, instalacion_id, puesto_operativo_id, fechaInicioFinal]);
      
      console.log('✅ [SIMPLE] Historial registrado con fecha:', fechaInicioFinal);
    } catch (historialError) {
      console.log('⚠️ [SIMPLE] Error en historial (no crítico):', historialError);
    }

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado exitosamente',
      data: {
        guardia_id,
        puesto_operativo_id,
        fecha_inicio: fecha_inicio || new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }).split(',')[0]
      }
    });

  } catch (error) {
    console.error('❌ [SIMPLE] Error en asignación simple:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
