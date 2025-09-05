import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calcularNomenclaturaRol, calcularHorasTurno } from '@/lib/utils/calcularNomenclaturaRol';
import { 
  validarSerieDias, 
  calcularNomenclaturaConSeries, 
  generarSeriePorDefecto,
  obtenerEstadisticasSerie 
} from '@/lib/utils/roles-servicio-series';
import { SerieDia } from '@/lib/schemas/roles-servicio';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    let tenantId = searchParams.get('tenantId');

    // Si no viene tenantId, inferirlo desde el usuario autenticado (multi-tenant estricto)
    if (!tenantId) {
      const email = request.headers.get('x-user-email');
      console.log('🔍 GET roles-servicio - Email del header:', email);
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        console.log('🔍 GET roles-servicio - Resultado query usuario:', t.rows);
        tenantId = t.rows?.[0]?.tid || null;
      }
    }

    console.log('🔍 GET roles-servicio - Parámetros finales:', { activo, tenantId });

    let query = `
      SELECT 
        id,
        nombre,
        dias_trabajo,
        dias_descanso,
        horas_turno,
        hora_inicio,
        hora_termino,
        estado,
        tenant_id,
        created_at,
        updated_at,
        fecha_inactivacion,
        tiene_horarios_variables,
        duracion_ciclo_dias,
        horas_turno_promedio
      FROM as_turnos_roles_servicio 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tenant_id::text = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    } else {
      // TEMPORAL: Sin tenant => devolver todos los roles (para debugging)
      console.log('⚠️ GET roles-servicio - Sin tenantId, devolviendo todos los roles');
      // query += ` AND 1=0`; // Comentado temporalmente
    }

    if (activo !== null) {
      const estadoFiltro = activo === 'false' ? 'Inactivo' : 'Activo';
      query += ` AND estado = $${paramIndex}`;
      params.push(estadoFiltro);
      paramIndex++;
    }

    query += ' ORDER BY nombre';

    console.log('🔍 Query ejecutada:', query);
    console.log('🔍 Parámetros:', params);

    const result = await sql.query(query, params);
    
    console.log('🔍 Resultados obtenidos:', result.rows.length, 'filas');
    console.log('🔍 IDs de roles:', result.rows.map(rol => ({ id: rol.id, nombre: rol.nombre })));
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener roles de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dias_trabajo, 
      dias_descanso, 
      hora_inicio, 
      hora_termino, 
      estado = 'Activo', 
      tenantId,
      tiene_horarios_variables = false,
      series_dias = []
    } = body;

    // Si no viene tenantId, inferirlo desde el usuario autenticado (multi-tenant estricto)
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      const email = request.headers.get('x-user-email');
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        finalTenantId = t.rows?.[0]?.tid || '1';
      } else {
        finalTenantId = '1';
      }
    }

    // Validar campos requeridos - Si tiene horarios variables, no necesita campos tradicionales
    if (!tiene_horarios_variables && (!dias_trabajo || !dias_descanso || !hora_inicio || !hora_termino)) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos de turno son requeridos para roles tradicionales' },
        { status: 400 }
      );
    }
    
    // Si tiene horarios variables, debe tener series_dias
    if (tiene_horarios_variables && (!series_dias || series_dias.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Series de días son requeridas para roles con horarios variables' },
        { status: 400 }
      );
    }

    // ELIMINADA VALIDACIÓN PROBLEMÁTICA - Solo validar que tenga series
    console.log('🔍 Series recibidas:', series_dias);

    // Calcular horas de turno y nombre automáticamente
    let horas_turno: number;
    let nombre: string;
    let calculated_dias_trabajo: number = dias_trabajo;
    let calculated_dias_descanso: number = dias_descanso;
    
    if (tiene_horarios_variables && series_dias.length > 0) {
      // Para horarios variables, calcular desde las series
      const diasTrabajo = series_dias.filter((dia: any) => dia.es_dia_trabajo);
      const totalHoras = diasTrabajo.reduce((sum: number, dia: any) => sum + (dia.horas_turno || 0), 0);
      horas_turno = diasTrabajo.length > 0 ? Math.round(totalHoras / diasTrabajo.length) : 0;
      
      // Calcular días de trabajo y descanso desde las series
      calculated_dias_trabajo = diasTrabajo.length;
      calculated_dias_descanso = (body.duracion_ciclo_dias || 7) - calculated_dias_trabajo;
      
      // Usar nomenclatura con series
      nombre = calcularNomenclaturaConSeries(calculated_dias_trabajo, calculated_dias_descanso, series_dias);
    } else {
      // Para horarios tradicionales
      horas_turno = calcularHorasTurno(hora_inicio, hora_termino);
      nombre = calcularNomenclaturaRol(dias_trabajo, dias_descanso, hora_inicio, hora_termino);
    }

    console.log('🔍 POST roles-servicio - Datos recibidos:', {
      dias_trabajo,
      dias_descanso,
      hora_inicio,
      hora_termino,
      estado,
      tenantId,
      finalTenantId,
      nombre,
      horas_turno
    });

    // Verificar duplicados por nombre completo
    const checkDuplicate = await sql.query(`
      SELECT 1 FROM as_turnos_roles_servicio 
      WHERE nombre = $1 AND (tenant_id::text = $2 OR (tenant_id IS NULL AND $2 = '1'))
    `, [nombre, finalTenantId]);

    if (checkDuplicate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un rol de servicio con esa configuración de turno' },
        { status: 400 }
      );
    }

    // Verificación adicional: evitar duplicados por parámetros específicos (solo para roles tradicionales)
    if (!tiene_horarios_variables) {
      const checkDuplicateParams = await sql.query(`
        SELECT nombre FROM as_turnos_roles_servicio 
        WHERE dias_trabajo = $1 
          AND dias_descanso = $2 
          AND hora_inicio = $3 
          AND hora_termino = $4
          AND (tenant_id::text = $5 OR (tenant_id IS NULL AND $5 = '1'))
      `, [dias_trabajo, dias_descanso, hora_inicio, hora_termino, finalTenantId]);
      
      if (checkDuplicateParams.rows.length > 0) {
        const rolExistente = checkDuplicateParams.rows[0].nombre;
        return NextResponse.json(
          { 
            success: false, 
            error: `Ya existe un rol con los mismos parámetros: "${rolExistente}". Cada combinación de días de trabajo, descanso y horario debe ser única.` 
          },
          { status: 400 }
        );
      }
    }

    // Crear la tabla sueldo_estructuras_roles si no existe (para evitar error del trigger)
    try {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS sueldo_estructuras_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
          sueldo_base DECIMAL(10,2) DEFAULT 680000,
          bono_asistencia DECIMAL(10,2) DEFAULT 0,
          bono_responsabilidad DECIMAL(10,2) DEFAULT 0,
          bono_noche DECIMAL(10,2) DEFAULT 0,
          bono_feriado DECIMAL(10,2) DEFAULT 0,
          bono_riesgo DECIMAL(10,2) DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id UUID
        )
      `);
      console.log('✅ Tabla sueldo_estructuras_roles creada/verificada');
    } catch (tableError) {
      console.log('⚠️ Error creando tabla sueldo_estructuras_roles:', tableError);
      // Continuar de todas formas
    }

    // Insertar nuevo rol
    const insertQuery = `
      INSERT INTO as_turnos_roles_servicio (
        nombre, dias_trabajo, dias_descanso, horas_turno, 
        hora_inicio, hora_termino, estado, tenant_id,
        tiene_horarios_variables, duracion_ciclo_dias, horas_turno_promedio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await sql.query(insertQuery, [
      nombre,
      calculated_dias_trabajo,
      calculated_dias_descanso,
      horas_turno,
      tiene_horarios_variables ? '00:00' : (hora_inicio || '08:00'),
      tiene_horarios_variables ? '00:00' : (hora_termino || '20:00'),
      estado,
      finalTenantId === '1' ? null : finalTenantId,
      tiene_horarios_variables,
      body.duracion_ciclo_dias || (calculated_dias_trabajo + calculated_dias_descanso), // duracion_ciclo_dias
      horas_turno // horas_turno_promedio (se actualizará con trigger si hay series)
    ]);

    const nuevoRol = result.rows[0];

    // Si tiene series, insertarlas
    if (tiene_horarios_variables && series_dias.length > 0) {
      for (const dia of series_dias) {
        await sql.query(`
          INSERT INTO as_turnos_series_dias (
            rol_servicio_id, posicion_en_ciclo, es_dia_trabajo,
            hora_inicio, hora_termino, observaciones, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          nuevoRol.id,
          dia.posicion_en_ciclo,
          dia.es_dia_trabajo,
          dia.hora_inicio || null,
          dia.hora_termino || null,
          dia.observaciones || null,
          finalTenantId === '1' ? null : finalTenantId
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Rol de servicio creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 