import { query } from '@/lib/database';

/**
 * Calcula los días de vacaciones que debería tener un guardia basado en su fecha de ingreso
 * @param fechaIngreso - Fecha de ingreso del guardia
 * @param fechaActual - Fecha actual (opcional, por defecto usa la fecha actual)
 * @returns Días de vacaciones acumulados
 */
export function calcularDiasVacaciones(fechaIngreso: string | Date, fechaActual?: Date): number {
  const ingreso = new Date(fechaIngreso);
  const actual = fechaActual || new Date();
  
  // Calcular meses trabajados
  const mesesTrabajados = (actual.getFullYear() - ingreso.getFullYear()) * 12 + 
                         (actual.getMonth() - ingreso.getMonth());
  
  // Calcular días de vacaciones (1.25 días por mes)
  return mesesTrabajados * 1.25;
}

/**
 * Verifica si las vacaciones de un guardia necesitan actualización
 * @param guardia - Objeto guardia con fecha_ingreso y dias_vacaciones_pendientes
 * @returns true si necesita actualización
 */
export function necesitaActualizacionVacaciones(guardia: {
  fecha_ingreso?: string | null;
  dias_vacaciones_pendientes?: number | null;
  updated_at?: string;
}): boolean {
  // Si no tiene fecha de ingreso, no se pueden calcular vacaciones
  if (!guardia.fecha_ingreso) {
    return false;
  }

  // Si no tiene días de vacaciones registrados, necesita actualización
  if (!guardia.dias_vacaciones_pendientes) {
    return true;
  }

  // Verificar si la última actualización fue en un mes diferente al actual
  const fechaActualizacion = guardia.updated_at ? new Date(guardia.updated_at) : new Date();
  const fechaActual = new Date();
  
  // Si la última actualización fue en un mes diferente, necesita actualización
  return fechaActualizacion.getMonth() !== fechaActual.getMonth() || 
         fechaActualizacion.getFullYear() !== fechaActual.getFullYear();
}

/**
 * Actualiza los días de vacaciones de un guardia en la base de datos
 * @param guardiaId - ID del guardia
 * @param diasActuales - Días actuales de vacaciones
 * @returns Nuevos días de vacaciones
 */
export async function actualizarVacacionesGuardia(guardiaId: string, diasActuales: number = 0): Promise<number> {
  try {
    // Sumar 1.25 días a los días actuales
    const nuevosDias = diasActuales + 1.25;
    
    // Actualizar en la base de datos
    await query(`
      UPDATE guardias 
      SET dias_vacaciones_pendientes = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [nuevosDias, guardiaId]);
    
    console.log(`✅ Vacaciones actualizadas para guardia ${guardiaId}: ${diasActuales} → ${nuevosDias} días`);
    return nuevosDias;
    
  } catch (error) {
    console.error(`❌ Error actualizando vacaciones para guardia ${guardiaId}:`, error);
    throw error;
  }
}

/**
 * Obtiene un guardia con vacaciones actualizadas automáticamente
 * @param guardiaId - ID del guardia
 * @returns Guardia con vacaciones actualizadas
 */
export async function getGuardiaConVacacionesActualizadas(guardiaId: string): Promise<any> {
  try {
    // Obtener datos del guardia
    const result = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        rut,
        email,
        telefono,
        direccion,
        ciudad,
        comuna,
        region,
        activo,
        tipo_guardia,
        fecha_os10,
        latitud,
        longitud,
        sexo,
        nacionalidad,
        fecha_nacimiento,
        pin,
        afp,
        descuento_afp,
        prevision_salud,
        cotiza_sobre_7,
        monto_pactado_uf,
        es_pensionado,
        asignacion_familiar,
        tramo_asignacion,
        talla_camisa,
        talla_pantalon,
        talla_zapato,
        altura_cm,
        peso_kg,
        fecha_ingreso,
        dias_vacaciones_pendientes,
        monto_anticipo,
        fecha_finiquito,
        fecha_postulacion,
        estado_postulacion,
        ip_postulacion,
        user_agent_postulacion,
        banco_id,
        tipo_cuenta,
        numero_cuenta,
        created_at,
        updated_at
      FROM guardias 
      WHERE id = $1
    `, [guardiaId]);

    if (result.rows.length === 0) {
      throw new Error('Guardia no encontrado');
    }

    const guardia = result.rows[0];

    // Verificar si necesita actualización de vacaciones
    if (necesitaActualizacionVacaciones(guardia)) {
      console.log(`🔄 Actualizando vacaciones para ${guardia.nombre} ${guardia.apellido_paterno}...`);
      
      // Actualizar vacaciones
      const nuevosDias = await actualizarVacacionesGuardia(
        guardiaId, 
        guardia.dias_vacaciones_pendientes || 0
      );
      
      // Actualizar el objeto guardia con los nuevos días
      guardia.dias_vacaciones_pendientes = nuevosDias;
      guardia.updated_at = new Date().toISOString();
    }

    return guardia;
    
  } catch (error) {
    console.error(`❌ Error obteniendo guardia con vacaciones:`, error);
    throw error;
  }
}

/**
 * Formatea los días de vacaciones para mostrar en la UI
 * @param dias - Días de vacaciones
 * @returns String formateado
 */
export function formatearDiasVacaciones(dias: number | null | undefined): string {
  if (!dias || dias === 0) {
    return '0 días';
  }
  
  const diasEnteros = Math.floor(dias);
  const decimales = dias - diasEnteros;
  
  if (decimales === 0) {
    return `${diasEnteros} día${diasEnteros !== 1 ? 's' : ''}`;
  }
  
  // Convertir decimales a horas (0.25 días = 6 horas)
  const horas = Math.round(decimales * 24);
  return `${diasEnteros} día${diasEnteros !== 1 ? 's' : ''} y ${horas} horas`;
}
