import { NextRequest, NextResponse } from 'next/server';
import { crearInstalacionSchema, actualizarInstalacionSchema } from '../../../lib/schemas/instalaciones';
import { query } from '../../../lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// Cache para evitar verificaciones repetitivas
let tableVerified = false;

// GET /api/instalaciones - Obtener todas las instalaciones con estadísticas optimizadas
export async function GET(request: NextRequest) {
  try {
    // Gate backend: requiere permiso 'instalaciones.view'
    try {
      const h = request.headers;
      const { getCurrentUserServer } = await import('@/lib/auth');
      const fromJwt = getCurrentUserServer(request as any)?.email || null;
      const fromHeader = h.get('x-user-email') || h.get('x-user-email(next/headers)') || null;
      const isDev = process.env.NODE_ENV !== 'production';
      const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
      const email = fromJwt || fromHeader || dev || null;
      if (!email) return NextResponse.json({ ok:false, error:'no-auth' }, { status:401 });
      const { sql } = await import('@vercel/postgres');
      const { rows } = await sql`
        with me as (select id from public.usuarios where lower(email)=lower(${email}) limit 1)
        select public.fn_usuario_tiene_permiso((select id from me), ${'instalaciones.view'}) as allowed
      `;
      if (rows?.[0]?.allowed !== true) {
        return NextResponse.json({ ok:false, error:'forbidden', perm:'instalaciones.view' }, { status:403 });
      }
    } catch {}
    const { searchParams } = new URL(request.url);
    const withCoords = searchParams.get('withCoords') === 'true';
    const withStats = searchParams.get('withStats') === 'true';
    const withAllData = searchParams.get('withAllData') === 'true';
    
    // Verificar tabla solo una vez por sesión
    if (!tableVerified) {
      await ensureInstalacionesTable();
      tableVerified = true;
    }
    
    // Si se solicita con coordenadas, devolver formato simplificado
    if (withCoords) {
      const result = await query(`
        SELECT 
          i.id,
          i.nombre,
          i.latitud as lat,
          i.longitud as lng
        FROM instalaciones i
        WHERE i.latitud IS NOT NULL AND i.longitud IS NOT NULL
        ORDER BY i.nombre
      `);
      
    return NextResponse.json(result.rows);
    }

    // Si se solicita formato simple para KPIs
    const simple = searchParams.get('simple') === 'true';
    if (simple) {
      const result = await query(`
        SELECT 
          i.id,
          i.nombre,
          i.direccion,
          i.ciudad,
          i.comuna,
          i.telefono,
          i.estado,
          i.cliente_id,
          COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
          COALESCE(stats.total_puestos, 0) as puestos_creados,
          COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN (
          SELECT 
            po.instalacion_id,
            COUNT(*) as total_puestos,
            COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
          FROM as_turnos_puestos_operativos po
          WHERE po.activo = true
          GROUP BY po.instalacion_id
        ) stats ON stats.instalacion_id = i.id
        ORDER BY i.nombre
      `);
      
      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }

    // Si se solicita con todos los datos, devolver instalaciones + clientes + comunas
    if (withAllData) {
      // Optimizar: Separar las queries complejas y usar índices
      const [instalacionesResult, clientesResult, comunasResult] = await Promise.all([
        query(`
          SELECT 
            i.id,
            i.nombre,
            i.cliente_id,
            i.direccion,
            i.latitud,
            i.longitud,
            i.ciudad,
            i.comuna,
            i.telefono,
            i.valor_turno_extra,
            i.estado,
            i.created_at,
            i.updated_at,
            COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre
          FROM instalaciones i
          LEFT JOIN clientes c ON i.cliente_id = c.id
          ORDER BY i.nombre
        `),
        query(`
          SELECT id, nombre, estado
          FROM clientes 
          ORDER BY nombre
        `),
        query(`
          SELECT id, nombre, region 
          FROM comunas 
          ORDER BY nombre
        `)
      ]);

      // Obtener estadísticas por separado para evitar JOINs complejos (solo puestos activos)
      const statsResult = await query(`
        SELECT 
          po.instalacion_id,
          COUNT(*) as total_puestos,
          COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
          COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes,
          COUNT(*) as ppc_totales,
          COUNT(CASE WHEN po.guardia_id IS NULL THEN 1 END) as puestos_disponibles
        FROM as_turnos_puestos_operativos po
        WHERE po.activo = true
        GROUP BY po.instalacion_id
      `);

      // Crear mapa de estadísticas para unir con instalaciones
      const statsMap = new Map();
      statsResult.rows.forEach((stat: any) => {
        statsMap.set(stat.instalacion_id, {
          puestos_creados: parseInt(stat.total_puestos) || 0,
          puestos_asignados: parseInt(stat.puestos_asignados) || 0,
          ppc_pendientes: parseInt(stat.ppc_pendientes) || 0,
          ppc_totales: parseInt(stat.ppc_totales) || 0,
          puestos_disponibles: parseInt(stat.puestos_disponibles) || 0
        });
      });

      const instalaciones = instalacionesResult.rows.map((instalacion: any) => {
        const stats = statsMap.get(instalacion.id) || {
          puestos_creados: 0,
          puestos_asignados: 0,
          ppc_pendientes: 0,
          ppc_totales: 0,
          puestos_disponibles: 0
        };

        return {
          ...instalacion,
          cliente_nombre: instalacion.cliente_nombre || 'Cliente no encontrado',
          ...stats
        };
      });

      return NextResponse.json({ 
        success: true, 
        data: {
          instalaciones,
          clientes: clientesResult.rows,
          comunas: comunasResult.rows
        }
      });
    }
    
    // Query optimizada que incluye estadísticas en una sola consulta
    let querySQL = `
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre`;

        if (withStats) {
      querySQL += `,
        COALESCE(stats.total_puestos, 0) as puestos_creados,
        COALESCE(stats.puestos_asignados, 0) as puestos_asignados,
        COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes,
        COALESCE(stats.ppc_totales, 0) as ppc_totales,
        COALESCE(stats.puestos_disponibles, 0) as puestos_disponibles`;
    }

    querySQL += `
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id`;

    if (withStats) {
      querySQL += `
        LEFT JOIN (
          SELECT 
            po.instalacion_id,
            COUNT(*) as total_puestos,
            COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
            COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes,
            COUNT(*) as ppc_totales,
            COUNT(CASE WHEN po.guardia_id IS NULL THEN 1 END) as puestos_disponibles
          FROM as_turnos_puestos_operativos po
          GROUP BY po.instalacion_id
        ) stats ON stats.instalacion_id = i.id`;
    }

    querySQL += `
      ORDER BY i.nombre`;

    const result = await query(querySQL);

    const instalaciones = result.rows.map((instalacion: any) => ({
      ...instalacion,
      cliente_nombre: instalacion.cliente_nombre || 'Cliente no encontrado',
      // Convertir estadísticas a números si están presentes
      ...(withStats && {
        puestos_creados: parseInt(instalacion.puestos_creados) || 0,
        puestos_asignados: parseInt(instalacion.puestos_asignados) || 0,
        ppc_pendientes: parseInt(instalacion.ppc_pendientes) || 0,
        ppc_totales: parseInt(instalacion.ppc_totales) || 0,
        puestos_disponibles: parseInt(instalacion.puestos_disponibles) || 0
      })
    }));
    
    return NextResponse.json({ success: true, data: instalaciones });
  } catch (error) {
    console.error('❌ Error en GET /api/instalaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener instalaciones' },
      { status: 500 }
    );
  }
}

// POST /api/instalaciones - Crear nueva instalación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = crearInstalacionSchema.parse(body);
    
    // Verificar que la tabla existe, si no, crearla
    await ensureInstalacionesTable();
    
    const nuevaInstalacion = await crearInstalacionDB(validatedData);
    
    return NextResponse.json(
      { success: true, data: nuevaInstalacion, message: 'Instalación creada correctamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error en POST /api/instalaciones:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al crear instalación' },
      { status: 500 }
    );
  }
}

// PUT /api/instalaciones - Actualizar instalación
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = actualizarInstalacionSchema.parse(body);
    
    // Obtener datos originales ANTES de la actualización
    const datosOriginales = await query(`
      SELECT nombre, cliente_id, direccion, latitud, longitud, ciudad, comuna, telefono, valor_turno_extra, estado
      FROM instalaciones WHERE id = $1
    `, [validatedData.id]);
    
    const original = datosOriginales.rows[0];
    
    const instalacionActualizada = await actualizarInstalacionDB(validatedData.id, validatedData);
    
    // Registrar log de actividad
    try {
      const cambios: string[] = [];
      
      // Comparar solo los campos que se enviaron explícitamente
      const camposEnviados = Object.keys(validatedData).filter(key => key !== 'id');
      
      for (const campo of camposEnviados) {
        const valorEnviado = (validatedData as any)[campo];
        const valorOriginal = (original as any)[campo];
        
        // Comparar valores, manejando null/undefined
        if (valorEnviado !== valorOriginal) {
          switch (campo) {
            case 'nombre':
              cambios.push('nombre');
              break;
            case 'cliente_id':
              cambios.push('cliente');
              break;
            case 'direccion':
              cambios.push('dirección');
              break;
            case 'latitud':
              cambios.push('latitud');
              break;
            case 'longitud':
              cambios.push('longitud');
              break;
            case 'ciudad':
              cambios.push('ciudad');
              break;
            case 'comuna':
              cambios.push('comuna');
              break;
            case 'telefono':
              cambios.push('teléfono');
              break;
            case 'valor_turno_extra':
              cambios.push('valor turno extra');
              break;
            case 'estado':
              cambios.push('estado');
              break;
          }
        }
      }
      
      let accion = 'Datos actualizados';
      let detalles = `Actualización de: ${cambios.join(', ')}`;
      
      // Si solo se cambió el estado, usar un mensaje más específico
      if (cambios.length === 1 && cambios[0] === 'estado') {
        accion = `Estado cambiado a ${validatedData.estado}`;
        detalles = `${validatedData.estado === 'Activo' ? 'Activación' : 'Desactivación'} de la instalación`;
      }
      
      // Registrar log directamente en la base de datos con zona horaria de Santiago
      await query(`
        INSERT INTO logs_instalaciones (instalacion_id, accion, usuario, tipo, contexto, fecha)
        VALUES ($1, $2, $3, $4, $5, NOW() AT TIME ZONE 'America/Santiago')
      `, [
        validatedData.id,
        accion,
        'Admin',
        'manual',
        detalles
      ]);
      
      console.log('✅ Log registrado para módulo instalaciones:', {
        entidadId: validatedData.id,
        accion,
        usuario: 'Admin',
        tipo: 'manual',
        detalles
      });
    } catch (logError) {
      console.error('⚠️ Error al registrar log:', logError);
      console.error('⚠️ Stack trace:', (logError as Error).stack);
      // No fallar la operación principal si el logging falla
    }
    
    return NextResponse.json({
      success: true,
      data: instalacionActualizada,
      message: 'Instalación actualizada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en PUT /api/instalaciones:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al actualizar instalación' },
      { status: 500 }
    );
  }
}

// DELETE /api/instalaciones - Eliminar instalación
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }
    
    await eliminarInstalacionDB(id);
    
    return NextResponse.json({
      success: true,
      message: 'Instalación eliminada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/instalaciones:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al eliminar instalación' },
      { status: 500 }
    );
  }
}

// Función para asegurar que la tabla instalaciones existe
async function ensureInstalacionesTable() {
  try {
    // Verificar si la tabla ya existe y tiene la estructura correcta
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instalaciones'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      // Crear tabla si no existe
      await query(`
        CREATE TABLE instalaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre VARCHAR(255) NOT NULL,
          cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
          direccion TEXT NOT NULL,
          latitud DECIMAL(10, 8),
          longitud DECIMAL(11, 8),
          ciudad VARCHAR(100),
          comuna VARCHAR(100),
          telefono VARCHAR(20),
          valor_turno_extra DECIMAL(10, 2) DEFAULT 0,
          estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Crear índices para mejorar el rendimiento
      await query(`
        CREATE INDEX idx_instalaciones_cliente_id ON instalaciones(cliente_id);
        CREATE INDEX idx_instalaciones_estado ON instalaciones(estado);
        CREATE INDEX idx_instalaciones_ciudad ON instalaciones(ciudad);
        CREATE INDEX idx_instalaciones_comuna ON instalaciones(comuna);
      `);
      
      console.log('✅ Tabla instalaciones creada con índices');
    } else {
      // Verificar si faltan columnas críticas
      const columns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'instalaciones' 
        AND table_schema = 'public'
      `);
      
      const columnNames = columns.rows.map((row: any) => row.column_name);
      
      if (!columnNames.includes('ciudad')) {
        await query(`ALTER TABLE instalaciones ADD COLUMN ciudad VARCHAR(100)`);
        console.log('✅ Columna ciudad agregada');
      }
      
      if (!columnNames.includes('comuna')) {
        await query(`ALTER TABLE instalaciones ADD COLUMN comuna VARCHAR(100)`);
        console.log('✅ Columna comuna agregada');
      }

      if (!columnNames.includes('telefono')) {
        await query(`ALTER TABLE instalaciones ADD COLUMN telefono VARCHAR(20)`);
        console.log('✅ Columna telefono agregada');
      }
      
      console.log('✅ Tabla instalaciones verificada');
    }
  } catch (error) {
    console.error('❌ Error verificando tabla instalaciones:', error);
    throw error;
  }
}

// Función para crear instalación en la base de datos
async function crearInstalacionDB(data: any) {
  console.log('🔧 Creando instalación con datos:', {
    nombre: data.nombre,
    cliente_id: data.cliente_id,
    direccion: data.direccion,
    latitud: data.latitud,
    longitud: data.longitud,
    ciudad: data.ciudad,
    comuna: data.comuna,
    valor_turno_extra: data.valor_turno_extra,
    estado: data.estado
  });

  const result = await query(`
    INSERT INTO instalaciones (
      nombre, cliente_id, direccion, latitud, longitud, 
      ciudad, comuna, valor_turno_extra, estado
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    data.nombre,
    data.cliente_id,
    data.direccion,
    data.latitud,
    data.longitud,
    data.ciudad,
    data.comuna,
    data.valor_turno_extra,
    data.estado
  ]);

  console.log('✅ Instalación creada exitosamente:', result.rows[0]);
  return result.rows[0];
}

// Función para actualizar instalación en la base de datos
async function actualizarInstalacionDB(id: string, data: any) {
  console.log('🔧 Actualizando instalación con datos:', data);

  // Construir la consulta SQL dinámicamente basada en los campos proporcionados
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Solo incluir campos que están definidos en data
  if (data.nombre !== undefined) {
    updates.push(`nombre = $${paramIndex}`);
    values.push(data.nombre);
    paramIndex++;
  }

  if (data.cliente_id !== undefined) {
    updates.push(`cliente_id = $${paramIndex}`);
    values.push(data.cliente_id);
    paramIndex++;
  }

  if (data.direccion !== undefined) {
    updates.push(`direccion = $${paramIndex}`);
    values.push(data.direccion);
    paramIndex++;
  }

  if (data.latitud !== undefined) {
    updates.push(`latitud = $${paramIndex}`);
    values.push(data.latitud);
    paramIndex++;
  }

  if (data.longitud !== undefined) {
    updates.push(`longitud = $${paramIndex}`);
    values.push(data.longitud);
    paramIndex++;
  }

  if (data.ciudad !== undefined) {
    updates.push(`ciudad = $${paramIndex}`);
    values.push(data.ciudad);
    paramIndex++;
  }

  if (data.comuna !== undefined) {
    updates.push(`comuna = $${paramIndex}`);
    values.push(data.comuna);
    paramIndex++;
  }

  if (data.telefono !== undefined) {
    updates.push(`telefono = $${paramIndex}`);
    values.push(data.telefono);
    paramIndex++;
  }

  if (data.valor_turno_extra !== undefined) {
    updates.push(`valor_turno_extra = $${paramIndex}`);
    values.push(data.valor_turno_extra);
    paramIndex++;
  }

  if (data.estado !== undefined) {
    updates.push(`estado = $${paramIndex}`);
    values.push(data.estado);
    paramIndex++;
  }

  // Siempre actualizar updated_at con zona horaria de Santiago
  updates.push(`updated_at = NOW() AT TIME ZONE 'America/Santiago'`);

  if (updates.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  const sql = `
    UPDATE instalaciones SET
      ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  values.push(id);

  console.log('🔍 SQL generado:', sql);
  console.log('📋 Parámetros:', values);

  const result = await query(sql, values);

  if (result.rows.length === 0) {
    throw new Error('Instalación no encontrada');
  }

  console.log('✅ Instalación actualizada exitosamente:', result.rows[0]);
  return result.rows[0];
}

// Función para eliminar instalación de la base de datos
async function eliminarInstalacionDB(id: string) {
  const result = await query(`
    DELETE FROM instalaciones WHERE id = $1
  `, [id]);

  if (result.rowCount === 0) {
    throw new Error('Instalación no encontrada');
  }
} 