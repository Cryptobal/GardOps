import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { calcularSueldo } from '@/lib/sueldo/calcularSueldo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    const rolServicioId = searchParams.get('rol_servicio_id');
    const search = searchParams.get('search');

    console.log('🔍 Parámetros de búsqueda:', { instalacionId, rolServicioId, search });

    // Construir la consulta base - SOLO instalaciones con turnos asociados
    let sqlQuery = `
      SELECT DISTINCT
        sei.id as estructura_id,
        sei.instalacion_id,
        i.nombre as instalacion_nombre,
        sei.rol_servicio_id,
        ars.nombre as rol_nombre,
        CONCAT(ars.dias_trabajo, 'x', ars.dias_descanso, 'x', ars.horas_turno, ' / ', ars.hora_inicio, ' ', ars.hora_termino) as rol_descripcion,
        sei.sueldo_base,
        sei.bono_1,
        sei.bono_2,
        sei.bono_3,
        sei.activa as estructura_activa,
        sei.created_at,
        sei.updated_at
      FROM sueldo_estructura_instalacion sei
      INNER JOIN instalaciones i ON sei.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio ars ON sei.rol_servicio_id = ars.id
      INNER JOIN as_turnos_puestos_operativos atpo ON i.id = atpo.instalacion_id AND ars.id = atpo.rol_id
      WHERE sei.activa = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Agregar filtros
    if (instalacionId && instalacionId !== 'todas') {
      sqlQuery += ` AND sei.instalacion_id = $${paramIndex}`;
      params.push(instalacionId);
      paramIndex++;
    }

    if (rolServicioId && rolServicioId !== 'todos') {
      sqlQuery += ` AND sei.rol_servicio_id = $${paramIndex}`;
      params.push(rolServicioId);
      paramIndex++;
    }

    if (search) {
      sqlQuery += ` AND (i.nombre ILIKE $${paramIndex} OR ars.nombre ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY i.nombre, ars.nombre`;

    console.log('📝 Consulta SQL:', sqlQuery);
    console.log('📊 Parámetros:', params);

    // Ejecutar la consulta
    const result = await query(sqlQuery, params);
    console.log('📥 Resultado de la consulta:', result);
    
    const rows = Array.isArray(result) ? result : (result.rows || []);
    console.log('📋 Filas encontradas:', rows.length);

    // Procesar los resultados y calcular valores
    const data = rows.map((row: any) => {
      const sueldoBase = row.sueldo_base || 0;
      const bono1 = row.bono_1 || 0;
      const bono2 = row.bono_2 || 0;
      const bono3 = row.bono_3 || 0;

      let sueldoLiquido = 0;
      let costoEmpresa = 0;
      let desglose = null;

      // Usar el cálculo correcto según la normativa chilena
      if (sueldoBase > 0) {
        // 1. Gratificación legal (25% del sueldo base)
        const gratificacion = sueldoBase * 0.25;
        
        // 2. Total imponible (sueldo base + gratificación + bonos imponibles)
        const totalImponible = sueldoBase + gratificacion + bono3;
        
        // 3. Cotizaciones
        const afp = Math.round(totalImponible * 0.1144); // AFP Capital 11.44%
        const salud = Math.round(totalImponible * 0.07); // FONASA 7%
        const afc = Math.round(totalImponible * 0.006); // AFC 0.6%
        const totalCotizaciones = afp + salud + afc;
        
        // 4. Base tributable para impuesto
        const baseTributable = totalImponible - totalCotizaciones;
        
        // 5. Impuesto único (para este rango debería ser 0)
        const impuestoUnico = 0; // Para base tributable < $1,000,000 aprox
        
        // 6. Sueldo líquido
        sueldoLiquido = totalImponible + bono1 + bono2 - totalCotizaciones - impuestoUnico;
        
        // 7. Costo empresa con cargas sociales reales
        const sis = Math.round(totalImponible * 0.0188); // SIS empleador 1.88%
        const afcEmpleador = Math.round(totalImponible * 0.024); // AFC empleador 2.4% (indefinido)
        const mutual = Math.round(totalImponible * 0.009); // Mutual 0.9%
        const reformaPrevisional = Math.round(totalImponible * 0.01); // Reforma previsional 1%
        
        costoEmpresa = totalImponible + bono1 + bono2 + sis + afcEmpleador + mutual + reformaPrevisional;

        // Crear desglose para el modal
        desglose = {
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
        };
      }

      return {
        instalacion_id: row.instalacion_id,
        instalacion_nombre: row.instalacion_nombre,
        rol_servicio_id: row.rol_servicio_id,
        rol_nombre: row.rol_nombre,
        rol_descripcion: row.rol_descripcion,
        sueldo_base: sueldoBase,
        bono_1: bono1,
        bono_2: bono2,
        bono_3: bono3,
        sueldo_liquido: Math.round(sueldoLiquido),
        costo_empresa: Math.round(costoEmpresa),
        estructura_id: row.estructura_id,
        estructura_activa: row.estructura_activa,
        desglose: desglose
      };
    });

    console.log('✅ Datos procesados exitosamente');

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('❌ Error obteniendo lista de estructuras:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + errorMessage },
      { status: 500 }
    );
  }
}
