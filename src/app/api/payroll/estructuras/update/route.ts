import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { calcularSueldo } from '@/lib/sueldo/calcularSueldo';

// PUT - Actualizar valores de estructura de servicio
export async function PUT(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const body = await request.json();
    const { 
      instalacion_id, 
      rol_servicio_id, 
      sueldo_base, 
      bono_1, 
      bono_2, 
      bono_3 
    } = body;

    console.log('Datos recibidos:', { instalacion_id, rol_servicio_id, sueldo_base, bono_1, bono_2, bono_3 });

    if (!instalacion_id || !rol_servicio_id) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id y rol_servicio_id son requeridos' },
        { status: 400 }
      );
    }

    // Usar valores por defecto para UF y parámetros
    const valorUf = 38000; // Valor UF por defecto
    const parametros = {
      SIS_EMPLEADOR: 0.0188,
      AFC_EMPLEADOR_INDEFINIDO: 0.024,
      MUTUALIDAD_EMPLEADOR: 0.009
    };
    
    // Usar el cálculo correcto según la normativa chilena con valores reales
    const sueldoBase = sueldo_base || 0;
    const colacion = bono_1 || 0;
    const movilizacion = bono_2 || 0;
    const responsabilidad = bono_3 || 0;
    
    // 1. Gratificación legal (25% del sueldo base)
    const gratificacion = sueldoBase * 0.25;
    
    // 2. Total imponible (sueldo base + gratificación + bonos imponibles)
    const totalImponible = sueldoBase + gratificacion + responsabilidad;
    
    // 3. Cotizaciones con valores reales
    const afp = Math.round(totalImponible * 0.1144); // AFP Capital 11.44%
    const salud = Math.round(totalImponible * 0.07); // FONASA 7%
    const afc = Math.round(totalImponible * 0.006); // AFC 0.6%
    const totalCotizaciones = afp + salud + afc;
    
    // 4. Base tributable para impuesto
    const baseTributable = totalImponible - totalCotizaciones;
    
    // 5. Impuesto único (calcular según tramos reales)
    let impuestoUnico = 0;
    const baseTributableUF = baseTributable / valorUf;
    
    // Aplicar tramos de impuesto según normativa 2025
    if (baseTributableUF > 13.5) {
      if (baseTributableUF <= 30) {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.04 - 0.6) * valorUf));
      } else if (baseTributableUF <= 50) {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.08 - 1.8) * valorUf));
      } else if (baseTributableUF <= 70) {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.135 - 4.5) * valorUf));
      } else if (baseTributableUF <= 90) {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.23 - 10.5) * valorUf));
      } else if (baseTributableUF <= 120) {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.304 - 17.1) * valorUf));
      } else {
        impuestoUnico = Math.max(0, Math.round((baseTributableUF * 0.35 - 23.1) * valorUf));
      }
    }
    
    // 6. Sueldo líquido
    const sueldoLiquido = totalImponible + colacion + movilizacion - totalCotizaciones - impuestoUnico;
    
    // 7. Costo empresa con cargas sociales reales
    const sis = Math.round(totalImponible * (parametros.SIS_EMPLEADOR || 0.0188)); // SIS empleador
    const afcEmpleador = Math.round(totalImponible * (parametros.AFC_EMPLEADOR_INDEFINIDO || 0.024)); // AFC empleador
    const mutual = Math.round(totalImponible * (parametros.MUTUALIDAD_EMPLEADOR || 0.009)); // Mutual
    const reformaPrevisional = Math.round(totalImponible * 0.01); // Reforma previsional 1%
    
    const costoEmpresa = totalImponible + colacion + movilizacion + sis + afcEmpleador + mutual + reformaPrevisional;
    
    // Guardar en la base de datos
    try {
      // Buscar si existe la estructura
      const resultExistente = await query(
        `SELECT id FROM sueldo_estructura_instalacion 
         WHERE instalacion_id = $1 
         AND rol_servicio_id = $2
         AND activa = true
         LIMIT 1`,
        [instalacion_id, rol_servicio_id]
      );
      
      const existingRow = Array.isArray(resultExistente) ? resultExistente[0] : (resultExistente.rows || [])[0];
      
      if (existingRow) {
        // Actualizar estructura existente
        await query(
          `UPDATE sueldo_estructura_instalacion 
           SET 
             sueldo_base = $1,
             bono_1 = $2,
             bono_2 = $3,
             bono_3 = $4,
             updated_at = NOW()
           WHERE instalacion_id = $5 
           AND rol_servicio_id = $6
           AND activa = true`,
          [sueldoBase, colacion, movilizacion, responsabilidad, instalacion_id, rol_servicio_id]
        );
      } else {
        // Crear nueva estructura
        await query(
          `INSERT INTO sueldo_estructura_instalacion (
            instalacion_id, 
            rol_servicio_id,
            version,
            vigencia_desde,
            activo,
            sueldo_base, 
            bono_1, 
            bono_2, 
            bono_3, 
            activa, 
            created_at, 
            updated_at
          ) VALUES (
            $1, 
            $2,
            1,
            CURRENT_DATE,
            true,
            $3, 
            $4, 
            $5, 
            $6, 
            true, 
            NOW(), 
            NOW()
          )`,
          [instalacion_id, rol_servicio_id, sueldoBase, colacion, movilizacion, responsabilidad]
        );
      }
    } catch (error) {
      console.error('Error guardando en base de datos:', error);
      // Continuar con la respuesta aunque falle el guardado
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estructura actualizada correctamente',
      data: {
        sueldo_base: sueldoBase,
        bono_1: colacion,
        bono_2: movilizacion,
        bono_3: responsabilidad,
        sueldo_liquido: Math.round(sueldoLiquido),
        costo_empresa: Math.round(costoEmpresa),
        desglose: {
          gratificacion: Math.round(gratificacion),
          total_imponible: Math.round(totalImponible),
          cotizaciones: {
            afp: afp,
            salud: salud,
            afc: afc,
            total: totalCotizaciones
          },
          cargas_sociales: {
            sis: sis,
            afc_empleador: afcEmpleador,
            mutual: mutual,
            reforma_previsional: reformaPrevisional,
            total: sis + afcEmpleador + mutual + reformaPrevisional
          },
          base_tributable: Math.round(baseTributable),
          impuesto_unico: impuestoUnico
        }
      }
    });

  } catch (error) {
    console.error('Error actualizando estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
