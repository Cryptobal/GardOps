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
      fecha_inicio
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

    // Registrar en historial (opcional)
    try {
      const instalacion_id = puestoCheck.rows[0].instalacion_id;
      const fechaInicioFinal = fecha_inicio || new Date().toISOString().split('T')[0];
      
      console.log('🔍 [SIMPLE] Registrando en historial...');
      await query(`
        INSERT INTO historial_asignaciones_guardias (
          guardia_id, instalacion_id, puesto_id, fecha_inicio,
          tipo_asignacion, motivo_inicio, estado, observaciones
        ) VALUES ($1, $2, $3, $4, 'fija', 'asignacion_ppc_simple', 'activa', 'Asignación desde PPC con fecha')
      `, [guardia_id, instalacion_id, puesto_operativo_id, fechaInicioFinal]);
      
      console.log('✅ [SIMPLE] Historial registrado');
    } catch (historialError) {
      console.log('⚠️ [SIMPLE] Error en historial (no crítico):', historialError);
    }

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado exitosamente',
      data: {
        guardia_id,
        puesto_operativo_id,
        fecha_inicio: fecha_inicio || new Date().toISOString().split('T')[0]
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
