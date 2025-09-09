import { query } from '@/lib/database';
import { SueldoResultado } from '../tipos/sueldo';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * Guarda el historial de cálculo de sueldo en la base de datos
 */
export async function guardarHistorialCalculo(
  resultado: SueldoResultado,
  guardiaId?: number,
  usuario?: string
): Promise<number> {
  try {
    const fecha = resultado.entrada.fecha;
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    
    const result = await query(`
      INSERT INTO sueldo_historial_calculos (
        guardia_id,
        fecha_calculo,
        mes_periodo,
        anio_periodo,
        sueldo_base,
        afp_codigo,
        isapre_codigo,
        mutualidad_codigo,
        tipo_contrato,
        gratificacion_legal,
        horas_extras,
        comisiones,
        bonos,
        total_imponible,
        colacion,
        movilizacion,
        viatico,
        desgaste,
        asignacion_familiar,
        total_no_imponible,
        cotizacion_afp,
        cotizacion_salud,
        cotizacion_afc,
        total_cotizaciones,
        base_tributable,
        impuesto_unico,
        anticipos,
        descuentos_judiciales,
        otros_descuentos,
        total_descuentos,
        sueldo_liquido,
        empleador_sis,
        empleador_afc,
        empleador_mutual,
        empleador_reforma,
        empleador_total,
        usuario_calculo,
        observaciones
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        $25,
        $26,
        $27,
        $28,
        $29, -- otros_descuentos
        $30,
        $31,
        $32,
        $33,
        $34,
        $35,
        $36,
        $37,
        $38
      )
      RETURNING id
    `, [
      guardiaId || null,
      fecha.toISOString().split('T')[0],
      mes,
      anio,
      resultado.entrada.sueldoBase,
      resultado.entrada.afp,
      resultado.entrada.isapre?.plan ? 'isapre' : 'fonasa',
      resultado.entrada.mutualidad,
      resultado.entrada.tipoContrato,
      resultado.imponible.gratificacionLegal,
      resultado.imponible.horasExtras,
      resultado.imponible.comisiones,
      resultado.imponible.bonos,
      resultado.imponible.total,
      resultado.noImponible.colacion,
      resultado.noImponible.movilizacion,
      resultado.noImponible.viatico,
      resultado.noImponible.desgaste,
      resultado.noImponible.asignacionFamiliar,
      resultado.noImponible.total,
      resultado.cotizaciones.afp,
      resultado.cotizaciones.salud,
      resultado.cotizaciones.afc,
      resultado.cotizaciones.total,
      resultado.impuesto.baseTributable,
      resultado.impuesto.impuestoUnico,
      resultado.descuentos.anticipos,
      resultado.descuentos.judiciales,
      0, // otros_descuentos
      resultado.descuentos.total,
      resultado.sueldoLiquido,
      resultado.empleador.sis,
      resultado.empleador.afc,
      resultado.empleador.mutual,
      resultado.empleador.reformaPrevisional,
      resultado.empleador.costoTotal,
      usuario || 'sistema',
      `Cálculo automático - ${new Date().toLocaleString('es-CL')}`
    ]);
    
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error al guardar historial de cálculo::', error);
    throw error;
  }
}

/**
 * Obtiene el último cálculo de sueldo para un guardia
 */
export async function obtenerUltimoCalculo(
  guardiaId: number,
  mes?: number,
  anio?: number
): Promise<any | null> {
  try {
    let query;
    
    if (mes && anio) {
      const result = await query(
        `SELECT * FROM sueldo_historial_calculos
         WHERE guardia_id = $1
         AND mes_periodo = $2
         AND anio_periodo = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [guardiaId, mes, anio]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } else {
      const result = await query(
        `SELECT * FROM sueldo_historial_calculos
         WHERE guardia_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [guardiaId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    }
  } catch (error) {
    logger.error('Error al obtener último cálculo::', error);
    return null;
  }
}

/**
 * Obtiene el historial de cálculos para un período
 */
export async function obtenerHistorialPeriodo(
  mes: number,
  anio: number
): Promise<any[]> {
  try {
    const result = await query(
      `SELECT 
        h.*,
        g.nombre as guardia_nombre,
        g.rut as guardia_rut
       FROM sueldo_historial_calculos h
       LEFT JOIN guardias g ON h.guardia_id = g.id
       WHERE h.mes_periodo = $1
       AND h.anio_periodo = $2
       ORDER BY h.created_at DESC`,
      [mes, anio]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('Error al obtener historial del período::', error);
    return [];
  }
}
