import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calcularNomenclaturaRol, calcularHorasTurno } from '@/lib/utils/calcularNomenclaturaRol';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    let tenantId = searchParams.get('tenantId');

    // Si no viene tenantId, inferirlo desde el usuario autenticado (multi-tenant estricto)
    if (!tenantId) {
      const email = request.headers.get('x-user-email');
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        tenantId = t.rows?.[0]?.tid || null;
      }
    }

    console.log('🔍 GET roles-servicio - Parámetros:', { activo, tenantId });

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
        fecha_inactivacion
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
      // Sin tenant => no devolver nada
      query += ` AND 1=0`;
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
      tenantId 
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

    // Validar campos requeridos
    if (!dias_trabajo || !dias_descanso || !hora_inicio || !hora_termino) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos de turno son requeridos' },
        { status: 400 }
      );
    }

    // Calcular horas de turno automáticamente
    const horas_turno = calcularHorasTurno(hora_inicio, hora_termino);

    // Calcular nombre automáticamente
    const nombre = calcularNomenclaturaRol(
      dias_trabajo,
      dias_descanso,
      hora_inicio,
      hora_termino
    );

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

    // Verificación adicional: evitar duplicados por parámetros específicos
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
        hora_inicio, hora_termino, estado, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await sql.query(insertQuery, [
      nombre,
      dias_trabajo,
      dias_descanso,
      horas_turno,
      hora_inicio,
      hora_termino,
      estado,
      finalTenantId === '1' ? null : finalTenantId
    ]);

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