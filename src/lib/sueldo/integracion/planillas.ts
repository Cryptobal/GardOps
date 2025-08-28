import { query } from '@/lib/database';
import { calcularSueldo } from '../calcularSueldo';
import { SueldoInput } from '../tipos/sueldo';
import { guardarHistorialCalculo } from '../db/guardarHistorial';

/**
 * Obtiene los datos de un guardia para el cálculo de sueldo
 */
export async function obtenerDatosGuardia(guardiaId: string | number) {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.telefono,
        g.email,
        g.banco,
        g.numero_cuenta,
        g.tipo_cuenta,
        g.activo,
        g.instalacion_id
       FROM guardias g
       WHERE g.id = $1
       AND g.activo = true
       LIMIT 1`,
      [guardiaIdStr]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Guardia con ID ${guardiaId} no encontrado o inactivo`);
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al obtener datos del guardia:', error);
    throw error;
  }
}

/**
 * Calcula los turnos extras del mes para un guardia
 */
export async function calcularTurnosExtrasMes(
  guardiaId: string | number, 
  mes: number, 
  anio: number
): Promise<{ cantidad: number; valorTotal: number }> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT 
        COUNT(*) as cantidad,
        COALESCE(SUM(valor), 0) as valor_total
       FROM TE_turnos_extras
       WHERE guardia_id = $1
       AND EXTRACT(MONTH FROM fecha) = $2
       AND EXTRACT(YEAR FROM fecha) = $3
       AND estado IN ('aprobado', 'pagado')`,
      [guardiaIdStr, mes, anio]
    );
    
    return {
      cantidad: Number(result.rows[0].cantidad),
      valorTotal: Number(result.rows[0].valor_total)
    };
  } catch (error) {
    console.error('Error al calcular turnos extras:', error);
    return { cantidad: 0, valorTotal: 0 };
  }
}

/**
 * Calcula las horas extras del mes para un guardia
 */
export async function calcularHorasExtrasMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<{ al50: number; al100: number }> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
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
      [guardiaIdStr, mes, anio]
    );
    
    if (result.rows.length > 0) {
      return {
        al50: Number(result.rows[0].horas_50),
        al100: Number(result.rows[0].horas_100)
      };
    }
    
    return { al50: 0, al100: 0 };
  } catch (error) {
    console.error('Error al calcular horas extras:', error);
    return { al50: 0, al100: 0 };
  }
}

/**
 * Cuenta días de inasistencia del guardia en el mes/año dados
 */
export async function contarAusenciasGuardiaMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<number> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT COUNT(*) AS faltas
       FROM as_turnos_pauta_mensual pm
       WHERE pm.guardia_id = $1
         AND pm.mes = $2
         AND pm.anio = $3
         AND pm.estado = 'inasistencia'`,
      [guardiaIdStr, mes, anio]
    );
    return Number(result.rows?.[0]?.faltas ?? 0);
  } catch (error) {
    console.error('Error al contar ausencias:', error);
    return 0;
  }
}

/**
 * Cuenta días trabajados del guardia en el mes/año dados
 * Considera días con estado 'trabajado' (confirmados como asistidos)
 */
export async function contarDiasTrabajadosGuardiaMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<number> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT COUNT(*) AS dias_trabajados
       FROM as_turnos_pauta_mensual pm
       WHERE pm.guardia_id = $1
         AND pm.mes = $2
         AND pm.anio = $3
         AND pm.estado = 'trabajado'`,
      [guardiaIdStr, mes, anio]
    );
    return Number(result.rows?.[0]?.dias_trabajados ?? 0);
  } catch (error) {
    console.error('Error al contar días trabajados:', error);
    return 0;
  }
}

/**
 * Cuenta días planificados del guardia en el mes/año dados
 * Considera días con estado 'planificado' (asignados pero no confirmados)
 */
export async function contarDiasPlanificadosGuardiaMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<number> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT COUNT(*) AS dias_planificados
       FROM as_turnos_pauta_mensual pm
       WHERE pm.guardia_id = $1
         AND pm.mes = $2
         AND pm.anio = $3
         AND pm.estado = 'planificado'`,
      [guardiaIdStr, mes, anio]
    );
    return Number(result.rows?.[0]?.dias_planificados ?? 0);
  } catch (error) {
    console.error('Error al contar días planificados:', error);
    return 0;
  }
}

/**
 * Obtiene resumen completo de días del guardia en el mes/año dados
 * Incluye lógica correcta para diferentes tipos de permisos
 */
export async function obtenerResumenDiasGuardiaMes(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<{
  diasTrabajados: number;
  diasPlanificados: number;
  diasAusencia: number;
  diasLibre: number;
  diasPermiso: number;
  diasLicencia: number;
  diasVacaciones: number;
  totalDias: number;
  // Nuevos campos para cálculo de sueldo
  diasPagables: number; // Días que se pagan (trabajados + vacaciones + permisos con goce)
  diasNoPagables: number; // Días que no se pagan (libres + licencias + permisos sin goce)
  diasDescontables: number; // Días que se descuentan (inasistencias)
}> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    const result = await query(
      `SELECT 
         COUNT(*) AS total_dias,
         COUNT(CASE WHEN estado = 'trabajado' THEN 1 END) AS dias_trabajados,
         COUNT(CASE WHEN estado = 'planificado' THEN 1 END) AS dias_planificados,
         COUNT(CASE WHEN estado = 'inasistencia' THEN 1 END) AS dias_ausencia,
         COUNT(CASE WHEN estado = 'libre' THEN 1 END) AS dias_libre,
         COUNT(CASE WHEN estado = 'permiso_con_goce' THEN 1 END) AS dias_permiso_con_goce,
         COUNT(CASE WHEN estado = 'permiso_sin_goce' THEN 1 END) AS dias_permiso_sin_goce,
         COUNT(CASE WHEN estado = 'licencia' THEN 1 END) AS dias_licencia,
         COUNT(CASE WHEN estado = 'vacaciones' THEN 1 END) AS dias_vacaciones
       FROM as_turnos_pauta_mensual pm
       WHERE pm.guardia_id = $1
         AND pm.mes = $2
         AND pm.anio = $3`,
      [guardiaIdStr, mes, anio]
    );
    
    const row = result.rows?.[0] ?? {};
    const diasTrabajados = Number(row.dias_trabajados ?? 0);
    const diasPlanificados = Number(row.dias_planificados ?? 0);
    const diasAusencia = Number(row.dias_ausencia ?? 0);
    const diasLibre = Number(row.dias_libre ?? 0);
    const diasPermisoConGoce = Number(row.dias_permiso_con_goce ?? 0);
    const diasPermisoSinGoce = Number(row.dias_permiso_sin_goce ?? 0);
    const diasLicencia = Number(row.dias_licencia ?? 0);
    const diasVacaciones = Number(row.dias_vacaciones ?? 0);
    const totalDias = Number(row.total_dias ?? 0);

    // Lógica de cálculo según tipos de permisos:
    // - VACACIONES: Se pagan (trabajador no asiste pero se le paga)
    // - LICENCIA: No se pagan (trabajador no asiste y no se le paga)
    // - PERMISO CON GOCE: Se pagan (trabajador no asiste pero se le paga)
    // - PERMISO SIN GOCE: No se pagan (trabajador no asiste y no se le paga)
    // - INASISTENCIA: Se descuentan (trabajador no asiste y se le descuenta)

    const diasPagables = diasTrabajados + diasVacaciones + diasPermisoConGoce;
    const diasNoPagables = diasLibre + diasLicencia + diasPermisoSinGoce + diasPlanificados;
    const diasDescontables = diasAusencia;

    return {
      diasTrabajados,
      diasPlanificados,
      diasAusencia,
      diasLibre,
      diasPermiso: diasPermisoConGoce + diasPermisoSinGoce, // Total de permisos
      diasLicencia,
      diasVacaciones,
      totalDias,
      // Nuevos campos para cálculo de sueldo
      diasPagables,
      diasNoPagables,
      diasDescontables
    };
  } catch (error) {
    console.error('Error al obtener resumen de días:', error);
    return {
      diasTrabajados: 0,
      diasPlanificados: 0,
      diasAusencia: 0,
      diasLibre: 0,
      diasPermiso: 0,
      diasLicencia: 0,
      diasVacaciones: 0,
      totalDias: 0,
      diasPagables: 0,
      diasNoPagables: 0,
      diasDescontables: 0
    };
  }
}

/**
 * Obtiene ítems extras registrados en payroll_items_extras para el guardia y período
 */
export async function obtenerItemsExtrasMes(
  guardiaId: string | number,
  instalacionId: string | null,
  mes: number,
  anio: number
): Promise<{ haberImponible: number; haberNoImponible: number; descuento: number }> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
    // Si tenemos instalación, buscamos (o usamos) el payroll_run del período
    let payrollRunId: string | null = null;
    if (instalacionId) {
      const pr = await query(
        `SELECT id FROM payroll_run WHERE instalacion_id = $1 AND mes = $2 AND anio = $3 LIMIT 1`,
        [instalacionId, mes, anio]
      );
      payrollRunId = pr.rows?.[0]?.id ?? null;
    }

    if (!payrollRunId) {
      // Si no hay run, no consideramos extras (se gestionan desde la UI y crearán el run)
      return { haberImponible: 0, haberNoImponible: 0, descuento: 0 };
    }

    const res = await query(
      `SELECT tipo, COALESCE(SUM(monto), 0) AS total
       FROM payroll_items_extras
       WHERE payroll_run_id = $1 AND guardia_id = $2
       GROUP BY tipo`,
      [payrollRunId, guardiaIdStr]
    );

    const acc = { haberImponible: 0, haberNoImponible: 0, descuento: 0 };
    for (const row of res.rows ?? []) {
      if (row.tipo === 'haber_imponible') acc.haberImponible += Number(row.total || 0);
      else if (row.tipo === 'haber_no_imponible') acc.haberNoImponible += Number(row.total || 0);
      else if (row.tipo === 'descuento') acc.descuento += Number(row.total || 0);
    }
    return acc;
  } catch (error) {
    console.error('Error al obtener ítems extras:', error);
    return { haberImponible: 0, haberNoImponible: 0, descuento: 0 };
  }
}

interface EstructuraItemNormalized {
  codigo: string;
  nombre: string;
  clase: 'HABER' | 'DESCUENTO';
  naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  monto: number;
}

/**
 * Obtiene la estructura vigente para el guardia: primero personal; si no, por instalación+rol
 */
export async function obtenerEstructuraVigenteParaGuardia(
  guardiaId: string | number,
  mes: number,
  anio: number
): Promise<{ items: EstructuraItemNormalized[]; sueldoBase?: number; instalacionId: string | null }> {
  const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
  const primerDiaMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
  let instalacionId: string | null = null;

  // 1) Intentar estructura personal
  try {
    const cab = await query(
      `SELECT id
       FROM sueldo_estructura_guardia
       WHERE guardia_id = $1
         AND vigencia_desde <= $2::date
         AND (vigencia_hasta IS NULL OR $2::date <= vigencia_hasta)
       ORDER BY vigencia_desde DESC
       LIMIT 1`,
      [guardiaIdStr, primerDiaMes]
    );

    if (cab.rows?.length) {
      const estructuraId = cab.rows[0].id;
      const li = await query(
        `SELECT si.codigo, si.nombre, si.clase, si.naturaleza, gi.monto
         FROM sueldo_estructura_guardia_item gi
         JOIN sueldo_item si ON si.id = gi.item_id
         WHERE gi.estructura_guardia_id = $1
           AND gi.activo = TRUE
           AND gi.vigencia_desde <= $2::date
           AND (gi.vigencia_hasta IS NULL OR $2::date <= gi.vigencia_hasta)
         ORDER BY si.codigo`,
        [estructuraId, primerDiaMes]
      );

      const items: EstructuraItemNormalized[] = (li.rows ?? []).map((r: any) => ({
        codigo: r.codigo,
        nombre: r.nombre,
        clase: r.clase,
        naturaleza: r.naturaleza,
        monto: Number(r.monto || 0)
      }));

      const sueldoBase = items.find(i => i.codigo === 'sueldo_base')?.monto;
      return { items, sueldoBase, instalacionId };
    }
  } catch (error) {
    console.warn('obtenerEstructuraVigenteParaGuardia: estructura personal no disponible', error);
  }

  // 2) Tomar instalación+rol actuales y cargar estructura de servicio
  try {
    const asign = await query(
      `SELECT po.instalacion_id::text AS instalacion_id, po.rol_id AS rol_id
       FROM as_turnos_puestos_operativos po
       WHERE po.guardia_id = $1 AND po.activo = TRUE
       ORDER BY po.creado_en DESC
       LIMIT 1`,
      [guardiaIdStr]
    );
    instalacionId = asign.rows?.[0]?.instalacion_id ?? null;
    const rolId = asign.rows?.[0]?.rol_id ?? null;

    if (!instalacionId || !rolId) {
      return { items: [], instalacionId: null };
    }

    const cabServ = await query(
      `SELECT id
       FROM sueldo_estructura_instalacion
       WHERE instalacion_id = $1 AND rol_servicio_id = $2
         AND activo = TRUE
         AND vigencia_desde <= $3::date
         AND (vigencia_hasta IS NULL OR $3::date <= vigencia_hasta)
       ORDER BY vigencia_desde DESC
       LIMIT 1`,
      [instalacionId, rolId, primerDiaMes]
    );

    if (!cabServ.rows?.length) {
      return { items: [], instalacionId };
    }

    const estructuraId = cabServ.rows[0].id;
    const li = await query(
      `SELECT item_codigo, item_nombre, item_clase, item_naturaleza, monto
       FROM sueldo_estructura_inst_item
       WHERE estructura_id = $1 AND activo = TRUE
         AND vigencia_desde <= $2::date
         AND (vigencia_hasta IS NULL OR $2::date <= vigencia_hasta)
       ORDER BY item_codigo`,
      [estructuraId, primerDiaMes]
    );

    const items: EstructuraItemNormalized[] = (li.rows ?? []).map((r: any) => ({
      codigo: r.item_codigo,
      nombre: r.item_nombre,
      clase: r.item_clase,
      naturaleza: r.item_naturaleza,
      monto: Number(r.monto || 0)
    }));

    const sueldoBase = items.find(i => i.codigo === 'sueldo_base')?.monto;
    return { items, sueldoBase, instalacionId };
  } catch (error) {
    console.error('obtenerEstructuraVigenteParaGuardia: error estructura servicio', error);
    return { items: [], instalacionId };
  }
}

/**
 * Obtiene los bonos y asignaciones del guardia
 */
export async function obtenerBonosGuardia(
  guardiaId: string | number,
  mes: number,
  anio: number
) {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
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
      [guardiaIdStr]
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
    console.error('Error al obtener bonos:', error);
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
  guardiaId: string | number,
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
    
    // 4. Obtener estructura vigente (personal o por servicio) y mapear a input
    const estructura = await obtenerEstructuraVigenteParaGuardia(guardiaId, mes, anio);
    const itemsEstructura = estructura.items;

    const sueldoBaseEstructura = estructura.sueldoBase;
    const colacionItem = itemsEstructura.find(i => i.codigo === 'colacion' || (i.clase==='HABER' && i.naturaleza==='NO_IMPONIBLE' && i.nombre.toLowerCase().includes('colaci')))?.monto || 0;
    const movilizacionItem = itemsEstructura.find(i => i.codigo === 'movilizacion' || (i.clase==='HABER' && i.naturaleza==='NO_IMPONIBLE' && i.nombre.toLowerCase().includes('movil')))?.monto || 0;

    const totalBonosImponibles = itemsEstructura
      .filter(i => i.clase === 'HABER' && i.naturaleza === 'IMPONIBLE' && i.codigo !== 'sueldo_base')
      .reduce((s, i) => s + i.monto, 0);

    // 5. Obtener resumen completo de días del guardia con lógica correcta de permisos
    const resumenDias = await obtenerResumenDiasGuardiaMes(guardiaId, mes, anio);
    
    // Usar días descontables (solo inasistencias) para el cálculo de sueldo
    const diasAusencia = resumenDias.diasDescontables;
    
    // Información adicional para el resultado
    const diasTrabajados = resumenDias.diasTrabajados;
    const diasPlanificados = resumenDias.diasPlanificados;
    const diasPagables = resumenDias.diasPagables;
    const diasNoPagables = resumenDias.diasNoPagables;

    // 6. Ítems extras del período
    const extras = await obtenerItemsExtrasMes(guardiaId, estructura.instalacionId ?? null, mes, anio);
    
    // 7. Preparar input para cálculo de sueldo
    const fecha = new Date(anio, mes - 1, 1); // Primer día del mes
    
    // Validar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
      throw new Error('Fecha inválida para el cálculo');
    }
    
    const sueldoInput: SueldoInput = {
      sueldoBase: Number(sueldoBaseEstructura) || 550000,
      fecha: fecha, // Mantener como objeto Date
      afp: 'capital', // Por defecto, se puede obtener de otra tabla después
      tipoContrato: 'indefinido', // Por defecto, se puede obtener de otra tabla después
      horasExtras: {
        cincuenta: horasExtras.al50,
        cien: horasExtras.al100
      },
      bonos: {
        otros: totalBonosImponibles + (incluirTurnosExtras ? turnosExtras.valorTotal : 0) + extras.haberImponible
      },
      comisiones: 0,
      noImponible: {
        colacion: colacionItem + extras.haberNoImponible,
        movilizacion: movilizacionItem,
        asignacionFamiliar: 0
      },
      anticipos: extras.descuento,
      judiciales: 0,
      apv: 0,
      cuenta2: 0,
      diasAusencia
    };
    
    // Si tiene ISAPRE (por defecto no tiene, se puede implementar después)
    // if (guardia.isapre && guardia.plan_isapre_uf) {
    //   sueldoInput.isapre = {
    //     plan: Number(guardia.plan_isapre_uf)
    //   };
    // }
    
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
      resumenDias: {
        diasTrabajados,
        diasPlanificados,
        diasAusencia: diasAusencia,
        diasLibre: resumenDias.diasLibre,
        diasPermiso: resumenDias.diasPermiso,
        diasLicencia: resumenDias.diasLicencia,
        diasVacaciones: resumenDias.diasVacaciones,
        totalDias: resumenDias.totalDias,
        // Nuevos campos para cálculo de sueldo
        diasPagables,
        diasNoPagables,
        diasDescontables: diasAusencia
      },
      turnosExtras: {
        cantidad: turnosExtras.cantidad,
        valorTotal: turnosExtras.valorTotal
      },
      resultado,
      historialId
    };
    
  } catch (error) {
    console.error('Error al calcular sueldo desde planilla:', error);
    throw error;
  }
}

/**
 * Genera planilla de sueldos para todos los guardias activos
 */
export async function generarPlanillaSueldos(
  mes: number,
  anio: number,
  incluirTurnosExtras: boolean = true,
  instalacionId?: string
): Promise<any[]> {
  try {
    // Obtener guardias activos (opcionalmente por instalación)
    const guardias = await query(
      `SELECT id FROM guardias 
       WHERE activo = true
       ${instalacionId ? 'AND instalacion_id = $1' : ''}
       ORDER BY apellido_paterno, apellido_materno, nombre`,
      instalacionId ? [instalacionId] : []
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
    console.error('Error al generar planilla de sueldos:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de los turnos extras después del pago
 */
export async function marcarTurnosExtrasComoPagados(
  guardiaId: string | number,
  mes: number,
  anio: number,
  planillaId?: number
): Promise<boolean> {
  try {
    const guardiaIdStr = typeof guardiaId === 'number' ? guardiaId.toString() : guardiaId;
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
      [planillaId || null, guardiaIdStr, mes, anio]
    );
    
    console.log(`✅ Marcados ${result.rowCount} turnos extras como pagados para guardia ${guardiaId}`);
    return true;
  } catch (error) {
    console.error('Error al marcar turnos extras como pagados:', error);
    return false;
  }
}
