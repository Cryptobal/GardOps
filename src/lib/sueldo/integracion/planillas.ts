import { query } from '@/lib/database';
import { calcularSueldo } from '../calcularSueldo';
import { SueldoInput } from '../tipos/sueldo';
import { guardarHistorialCalculo } from '../db/guardarHistorial';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * Obtiene los datos de un guardia para el cálculo de sueldo
 */
export async function obtenerDatosGuardia(guardiaId: number) {
  try {
    const result = await query(
      `SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.sueldo_base,
        g.tipo_contrato,
        g.afp,
        g.isapre,
        g.plan_isapre_uf,
        g.mutualidad,
        g.banco_id,
        g.numero_cuenta,
        g.tipo_cuenta,
        g.correo
       FROM guardias g
       WHERE g.id = $1
       AND g.activo = true
       LIMIT 1`,
      [guardiaId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Guardia con ID ${guardiaId} no encontrado o inactivo`);
    }
    
    return result.rows[0];
  } catch (error) {
    logger.error('Error al obtener datos del guardia::', error);
    throw error;
  }
}

/**
 * Calcula los turnos extras del mes para un guardia
 */
export async function calcularTurnosExtrasMes(
  guardiaId: number, 
  mes: number, 
  anio: number
): Promise<{ cantidad: number; valorTotal: number }> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as cantidad,
        COALESCE(SUM(valor), 0) as valor_total
       FROM TE_turnos_extras
       WHERE guardia_id = $1
       AND EXTRACT(MONTH FROM fecha) = $2
       AND EXTRACT(YEAR FROM fecha) = $3
       AND estado IN ('aprobado', 'pagado')`,
      [guardiaId, mes, anio]
    );
    
    return {
      cantidad: Number(result.rows[0].cantidad),
      valorTotal: Number(result.rows[0].valor_total)
    };
  } catch (error) {
    logger.error('Error al calcular turnos extras::', error);
    return { cantidad: 0, valorTotal: 0 };
  }
}

/**
 * Calcula las horas extras del mes para un guardia
 */
export async function calcularHorasExtrasMes(
  guardiaId: number,
  mes: number,
  anio: number
): Promise<{ al50: number; al100: number }> {
  try {
    // Aquí podrías obtener las horas extras desde una tabla específica
    // Por ahora retornamos valores por defecto
    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tipo = '50' THEN cantidad ELSE 0 END), 0) as horas_50,
        COALESCE(SUM(CASE WHEN tipo = '100' THEN cantidad ELSE 0 END), 0) as horas_100
       FROM horas_extras
       WHERE guardia_id = $1
       AND mes = $2
       AND anio = $3`,
      [guardiaId, mes, anio]
    );
    
    if (result.rows.length > 0) {
      return {
        al50: Number(result.rows[0].horas_50),
        al100: Number(result.rows[0].horas_100)
      };
    }
    
    return { al50: 0, al100: 0 };
  } catch (error) {
    logger.error('Error al calcular horas extras::', error);
    return { al50: 0, al100: 0 };
  }
}

/**
 * Obtiene los bonos y asignaciones del guardia
 */
export async function obtenerBonosGuardia(
  guardiaId: number,
  mes: number,
  anio: number
) {
  try {
    // Obtener bonos desde configuración del guardia o tabla de bonos
    const result = await query(
      `SELECT 
        colacion,
        movilizacion,
        bono_responsabilidad,
        bono_nocturno,
        asignacion_familiar
       FROM guardias_configuracion
       WHERE guardia_id = $1
       LIMIT 1`,
      [guardiaId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Valores por defecto si no hay configuración
    return {
      colacion: 0,
      movilizacion: 0,
      bono_responsabilidad: 0,
      bono_nocturno: 0,
      asignacion_familiar: 0
    };
  } catch (error) {
    logger.error('Error al obtener bonos::', error);
    return {
      colacion: 0,
      movilizacion: 0,
      bono_responsabilidad: 0,
      bono_nocturno: 0,
      asignacion_familiar: 0
    };
  }
}

/**
 * Calcula el sueldo completo de un guardia incluyendo turnos extras
 */
export async function calcularSueldoGuardiaPlanilla(
  guardiaId: number,
  mes: number,
  anio: number,
  incluirTurnosExtras: boolean = true
): Promise<any> {
  try {
    // 1. Obtener datos básicos del guardia
    const guardia = await obtenerDatosGuardia(guardiaId);
    
    // 2. Calcular turnos extras si corresponde
    let turnosExtras = { cantidad: 0, valorTotal: 0 };
    if (incluirTurnosExtras) {
      turnosExtras = await calcularTurnosExtrasMes(guardiaId, mes, anio);
    }
    
    // 3. Calcular horas extras
    const horasExtras = await calcularHorasExtrasMes(guardiaId, mes, anio);
    
    // 4. Obtener bonos y asignaciones
    const bonos = await obtenerBonosGuardia(guardiaId, mes, anio);
    
    // 5. Preparar input para cálculo de sueldo
    const fecha = new Date(anio, mes - 1, 1); // Primer día del mes
    
    const sueldoInput: SueldoInput = {
      sueldoBase: Number(guardia.sueldo_base) || 550000, // Default si no tiene
      fecha: fecha,
      afp: guardia.afp || 'capital',
      mutualidad: guardia.mutualidad || 'achs',
      tipoContrato: guardia.tipo_contrato || 'indefinido',
      horasExtras: {
        cincuenta: horasExtras.al50,
        cien: horasExtras.al100
      },
      bonos: {
        nocturnidad: Number(bonos.bono_nocturno) || 0,
        responsabilidad: Number(bonos.bono_responsabilidad) || 0,
        otros: turnosExtras.valorTotal // Turnos extras como bono
      },
      comisiones: 0,
      noImponible: {
        colacion: Number(bonos.colacion) || 0,
        movilizacion: Number(bonos.movilizacion) || 0,
        asignacionFamiliar: Number(bonos.asignacion_familiar) || 0
      },
      anticipos: 0,
      judiciales: 0,
      apv: 0,
      cuenta2: 0
    };
    
    // Si tiene ISAPRE
    if (guardia.isapre && guardia.plan_isapre_uf) {
      sueldoInput.isapre = {
        plan: Number(guardia.plan_isapre_uf)
      };
    }
    
    // 6. Calcular sueldo
    const resultado = await calcularSueldo(sueldoInput);
    
    // 7. Guardar en historial
    const historialId = await guardarHistorialCalculo(
      resultado,
      guardiaId,
      'sistema_planillas'
    );
    
    // 8. Retornar resultado con información adicional
    return {
      guardia: {
        id: guardia.id,
        nombre: `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`,
        rut: guardia.rut
      },
      periodo: {
        mes,
        anio,
        descripcion: `${mes}/${anio}`
      },
      turnosExtras: {
        cantidad: turnosExtras.cantidad,
        valorTotal: turnosExtras.valorTotal
      },
      resultado,
      historialId
    };
    
  } catch (error) {
    logger.error('Error al calcular sueldo desde planilla::', error);
    throw error;
  }
}

/**
 * Genera planilla de sueldos para todos los guardias activos
 */
export async function generarPlanillaSueldos(
  mes: number,
  anio: number,
  incluirTurnosExtras: boolean = true
): Promise<any[]> {
  try {
    // Obtener todos los guardias activos
    const guardias = await query(
      `SELECT id FROM guardias 
       WHERE activo = true
       ORDER BY apellido_paterno, apellido_materno, nombre`
    );
    
    const planilla = [];
    
    for (const guardia of guardias.rows) {
      try {
        const calculo = await calcularSueldoGuardiaPlanilla(
          guardia.id,
          mes,
          anio,
          incluirTurnosExtras
        );
        planilla.push(calculo);
      } catch (error) {
        console.error(`Error calculando sueldo para guardia ${guardia.id}:`, error);
        planilla.push({
          guardia: { id: guardia.id },
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    return planilla;
  } catch (error) {
    logger.error('Error al generar planilla de sueldos::', error);
    throw error;
  }
}

/**
 * Actualiza el estado de los turnos extras después del pago
 */
export async function marcarTurnosExtrasComoPagados(
  guardiaId: number,
  mes: number,
  anio: number,
  planillaId?: number
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE TE_turnos_extras
       SET 
        estado = 'pagado',
        fecha_pago = CURRENT_DATE,
        planilla_pago_id = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE guardia_id = $2
       AND EXTRACT(MONTH FROM fecha) = $3
       AND EXTRACT(YEAR FROM fecha) = $4
       AND estado = 'aprobado'`,
      [planillaId || null, guardiaId, mes, anio]
    );
    
    logger.debug(`✅ Marcados ${result.rowCount} turnos extras como pagados para guardia ${guardiaId}`);
    return true;
  } catch (error) {
    logger.error('Error al marcar turnos extras como pagados::', error);
    return false;
  }
}

// Función de compatibilidad para imports faltantes
export async function obtenerResumenDiasGuardiaMes(guardiaId: number, mes: number, anio: number) {
  // Implementación básica para compatibilidad
  return {
    dias_trabajados: 0,
    dias_feriados: 0,
    dias_extras: 0,
    total_dias: 0
  };
}
