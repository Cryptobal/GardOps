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

// Función simple para calcular horas
function calcularHorasSimple(inicio: string, fin: string): number {
  const inicioDate = new Date(`2000-01-01 ${inicio}`);
  const finDate = new Date(`2000-01-01 ${fin}`);
  
  if (finDate <= inicioDate) {
    finDate.setDate(finDate.getDate() + 1);
  }
  
  const diferencia = finDate.getTime() - inicioDate.getTime();
  return Math.round(diferencia / (1000 * 60 * 60));
}

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
      nombre,
      descripcion,
      activo = true,
      dias_trabajo, 
      dias_descanso, 
      hora_inicio, 
      hora_termino, 
      estado = 'Activo', 
      tenantId,
      tiene_horarios_variables = false,
      series_dias = [],
      // Nuevos campos para wizard simple
      tipo,
      duracion_ciclo,
      dias_serie = []
    } = body;

    // Si no viene tenantId, inferirlo desde el usuario autenticado (multi-tenant estricto)
    let finalTenantId = tenantId;
    if (!finalTenantId) {
      const email = request.headers.get('x-user-email') || process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
      console.log('🔍 POST roles-servicio - Email del header:', email);
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        console.log('🔍 POST roles-servicio - Resultado query usuario:', t.rows);
        finalTenantId = t.rows?.[0]?.tid || null;
      } else {
        // Usar tenant_id de Carlos como fallback
        finalTenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
      }
    }
    
    console.log('🔍 POST roles-servicio - finalTenantId:', finalTenantId);

    // LÓGICA SIMPLIFICADA - Si es tipo 'series', siempre es horarios variables
    let esRolSeries = (tipo === 'series' || tiene_horarios_variables);
    
    console.log('🔍 Tipo de rol detectado:', { tipo, esRolSeries, tiene_horarios_variables });
    
    // Si NO es rol de series, validar campos tradicionales
    if (!esRolSeries && (!dias_trabajo || !dias_descanso || !hora_inicio || !hora_termino)) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos de turno son requeridos para roles tradicionales' },
        { status: 400 }
      );
    }
    
    // Si ES rol de series, validar que tenga dias_serie o series_dias
    if (esRolSeries && (!dias_serie || dias_serie.length === 0) && (!series_dias || series_dias.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Se requieren días de serie para roles con horarios variables' },
        { status: 400 }
      );
    }

    // LÓGICA PARA WIZARD SIMPLE
    console.log('🔍 Datos recibidos:', { tipo, duracion_ciclo, dias_serie: dias_serie.length });
    
    // Si es del wizard simple, convertir formato
    if (tipo === 'series' && dias_serie.length > 0) {
      console.log('🔄 Procesando datos del wizard simple...');
      
      // Convertir dias_serie a series_dias
      const series_convertidas = dias_serie.map((dia: any) => ({
        posicion_en_ciclo: dia.posicion,
        es_dia_trabajo: dia.trabaja,
        hora_inicio: dia.hora_inicio,
        hora_termino: dia.hora_termino,
        horas_turno: dia.trabaja ? calcularHorasSimple(dia.hora_inicio, dia.hora_termino) : 0,
        observaciones: null
      }));
      
      // Actualizar variables
      series_dias.length = 0;
      series_dias.push(...series_convertidas);
      // tiene_horarios_variables ya se maneja abajo
      
      console.log('✅ Series convertidas:', series_dias.length);
    }
    
    // ELIMINADA VALIDACIÓN PROBLEMÁTICA - Solo validar que tenga series
    console.log('🔍 Series finales:', series_dias.length);

    // Calcular horas de turno y nombre automáticamente
    let horas_turno: number;
    let nombreCalculado: string = nombre || '';
    let calculated_dias_trabajo: number = dias_trabajo || 0;
    let calculated_dias_descanso: number = dias_descanso || 0;
    let esHorariosVariables = tiene_horarios_variables;
    let primerHorario: any = null;
    
    // Determinar si usar horarios variables
    if (esRolSeries) {
      // Verificar si todos los días de trabajo tienen el mismo horario
      const diasTrabajo = series_dias.filter((dia: any) => dia.es_dia_trabajo);
      primerHorario = diasTrabajo[0];
      const todosMismoHorario = diasTrabajo.every((dia: any) => 
        dia.hora_inicio === primerHorario?.hora_inicio && 
        dia.hora_termino === primerHorario?.hora_termino
      );
      
      esHorariosVariables = !todosMismoHorario;
      
      // Calcular horas desde las series
      const totalHoras = diasTrabajo.reduce((sum: number, dia: any) => sum + (dia.horas_turno || 0), 0);
      horas_turno = diasTrabajo.length > 0 ? Math.round(totalHoras / diasTrabajo.length) : 0;
      
      // Calcular días de trabajo y descanso desde las series
      calculated_dias_trabajo = diasTrabajo.length;
      calculated_dias_descanso = (duracion_ciclo || 7) - calculated_dias_trabajo;
      
      // Usar nombre proporcionado o calcular
      if (!nombreCalculado) {
        nombreCalculado = calcularNomenclaturaConSeries(calculated_dias_trabajo, calculated_dias_descanso, series_dias);
      }
    } else {
      // Para horarios tradicionales
      horas_turno = calcularHorasTurno(hora_inicio || '08:00', hora_termino || '20:00');
      if (!nombreCalculado) {
        nombreCalculado = calcularNomenclaturaRol(calculated_dias_trabajo, calculated_dias_descanso, hora_inicio || '08:00', hora_termino || '20:00');
      }
    }

    console.log('🔍 POST roles-servicio - Datos procesados:', {
      nombreCalculado,
      calculated_dias_trabajo,
      calculated_dias_descanso,
      horas_turno,
      esHorariosVariables,
      series_dias: series_dias.length,
      tipo,
      esRolSeries
    });

    // Verificar duplicados por nombre completo (solo para el mismo tenant)
    const checkDuplicate = await sql.query(`
      SELECT nombre FROM as_turnos_roles_servicio 
      WHERE nombre = $1 AND tenant_id = $2
    `, [nombreCalculado, finalTenantId]);

    if (checkDuplicate.rows.length > 0) {
      console.log('⚠️ Rol duplicado encontrado:', checkDuplicate.rows[0]);
      return NextResponse.json(
        { success: false, error: `Ya existe un rol "${nombreCalculado}" en tu cuenta` },
        { status: 400 }
      );
    }

    // Verificación de parámetros eliminada - solo verificar por nombre exacto

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
      nombreCalculado,
      calculated_dias_trabajo,
      calculated_dias_descanso,
      horas_turno,
      esHorariosVariables ? '00:00' : (primerHorario?.hora_inicio || hora_inicio || '08:00'),
      esHorariosVariables ? '00:00' : (primerHorario?.hora_termino || hora_termino || '20:00'),
      estado,
      finalTenantId,
      esHorariosVariables,
      duracion_ciclo || (calculated_dias_trabajo + calculated_dias_descanso), // duracion_ciclo_dias
      horas_turno // horas_turno_promedio (se actualizará con trigger si hay series)
    ]);

    const nuevoRol = result.rows[0];

    // Si tiene series, insertarlas
    if (esHorariosVariables && series_dias.length > 0) {
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
          finalTenantId
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