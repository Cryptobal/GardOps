import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.email,
        g.telefono,
        g.direccion,
        g.latitud,
        g.longitud,
        g.ciudad,
        g.comuna,
        g.region,
        g.activo,
        g.tipo_guardia,
        g.fecha_os10,
        g.instalacion_id,
        i.nombre as instalacion_nombre,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
        g.created_at,
        g.updated_at,
        -- Información de asignación actual
        ta_asignacion.instalacion_nombre as instalacion_asignada,
        ta_asignacion.rol_nombre as rol_actual
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      -- Left join para obtener asignación actual usando la nueva estructura
      LEFT JOIN (
        SELECT 
          po.guardia_id,
          i.nombre as instalacion_nombre,
          rs.nombre as rol_nombre
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.guardia_id IS NOT NULL AND po.es_ppc = false
      ) ta_asignacion ON g.id = ta_asignacion.guardia_id
      ORDER BY g.activo DESC, g.nombre, g.apellido_paterno, g.apellido_materno
    `);

    // Log de lectura (opcional, para auditoría completa)
    // await logCRUD('guardias', 'ALL', 'READ', 'system', null, { total_guardias: result.rows.length }, 'accebf8a-bacc-41fa-9601-ed39cb320a52');

    return NextResponse.json({ 
      success: true, 
      guardias: result.rows 
    });
  } catch (error) {
    console.error('Error obteniendo guardias:', error);
    
    // Log del error
    await logCRUD(
      'guardias',
      'ALL',
      'READ',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias',
        method: 'GET'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia
export async function POST(request: NextRequest) {
  console.log('🔍 API Guardias - Creando nuevo guardia');
  
  // Por ahora usar un tenant_id fijo para testing
  const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
  const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación
  
  try {
    const body = await request.json();
    
    console.log('✅ API Guardias - Creando con datos:', body);
    console.log('🔍 API Guardias - Tipos de datos:', {
      nombre: typeof body.nombre,
      apellido_paterno: typeof body.apellido_paterno,
      rut: typeof body.rut,
      email: typeof body.email,
      telefono: typeof body.telefono,
      direccion: typeof body.direccion,
      ciudad: typeof body.ciudad,
      comuna: typeof body.comuna,
      latitud: typeof body.latitud,
      longitud: typeof body.longitud,
      banco_id: typeof body.banco_id,
      numero_cuenta: typeof body.numero_cuenta,
      tipo_cuenta: typeof body.tipo_cuenta
    });

    // Validaciones mínimas para evitar errores 500 por columnas NOT NULL o tipos
    const nombre = (body.nombre ?? '').toString().trim();
    const apellidoPaterno = (body.apellido_paterno ?? '').toString().trim();
    const email = (body.email ?? '').toString().trim();
    const telefono = (body.telefono ?? '').toString().trim();
    const latitud = body.latitud;
    const longitud = body.longitud;
    const tipoCuentaRaw = (body.tipo_cuenta ?? '').toString().trim();

    // Mapear tipo_cuenta desde etiquetas del UI a códigos de BD
    let tipoCuentaDb: string | null = null;
    if (tipoCuentaRaw) {
      const v = tipoCuentaRaw.toLowerCase();
      if (['cct', 'cuenta corriente'].includes(v)) tipoCuentaDb = 'CCT';
      else if (['cte', 'cuenta vista'].includes(v)) tipoCuentaDb = 'CTE';
      else if (['cta', 'cuenta de ahorro'].includes(v)) tipoCuentaDb = 'CTA';
      else if (['rut'].includes(v)) tipoCuentaDb = 'RUT';
      else {
        return NextResponse.json(
          { error: 'Tipo de cuenta inválido. Use Cuenta Corriente, Cuenta Vista, Cuenta de Ahorro o RUT' },
          { status: 400 }
        );
      }
    }

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
    }
    if (!apellidoPaterno) {
      return NextResponse.json(
        { error: 'El apellido paterno es obligatorio' },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json(
        { error: 'El email es obligatorio' },
        { status: 400 }
      );
    }
    if (!telefono) {
      return NextResponse.json(
        { error: 'El teléfono es obligatorio' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return NextResponse.json(
        { error: 'La ubicación es obligatoria (latitud y longitud válidas)' },
        { status: 400 }
      );
    }

    // Normalizar y validar RUT (sin puntos, con guion y DV correcto)
    const rutOriginal: string = (body.rut || '').toString().trim();
    const rutLimpio = rutOriginal.replace(/\./g, '').replace(/\s+/g, '');
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    if (!rutRegex.test(rutLimpio)) {
      return NextResponse.json(
        { error: 'RUT inválido. Formato esperado: 12345678-9' },
        { status: 400 }
      );
    }
    const [numeroStr, dvStr] = rutLimpio.split('-');
    const dv = dvStr.toLowerCase();
    let suma = 0;
    let multiplicador = 2;
    for (let i = numeroStr.length - 1; i >= 0; i--) {
      suma += parseInt(numeroStr[i] as string, 10) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();
    if (dv !== dvCalculado) {
      return NextResponse.json(
        { error: 'RUT inválido. Dígito verificador incorrecto' },
        { status: 400 }
      );
    }
    const rutNormalizado = `${numeroStr}-${dv}`; // Siempre sin puntos y con guion

    // Validar banco_id si se proporciona y confirmar que exista para evitar error de FK
    if (body.banco_id && body.banco_id !== '') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.banco_id)) {
        return NextResponse.json(
          { error: 'ID de banco inválido. Debe ser un UUID válido' },
          { status: 400 }
        );
      }
      const bancoCheck = await query('SELECT 1 FROM bancos WHERE id = $1 LIMIT 1', [body.banco_id]);
      if (bancoCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Banco no encontrado. Seleccione un banco válido.' },
          { status: 400 }
        );
      }
    }

    // Verificar duplicados por RUT y Email dentro del tenant
    const dupRut = await query(
      'SELECT id, nombre, apellido_paterno, rut FROM guardias WHERE rut = $1 AND tenant_id = $2 LIMIT 1',
      [rutNormalizado, tenantId]
    );
    
    const dupEmail = await query(
      'SELECT id, nombre, apellido_paterno, email FROM guardias WHERE email = $1 AND tenant_id = $2 LIMIT 1',
      [email, tenantId]
    );
    
    // Construir mensaje de error específico
    const errores = [];
    if (dupRut.rows.length > 0) {
      errores.push('RUT');
    }
    if (dupEmail.rows.length > 0) {
      errores.push('email');
    }
    
    if (errores.length > 0) {
      let mensajeError = '';
      if (errores.length === 1) {
        mensajeError = `Ya existe un guardia con ese ${errores[0]}`;
      } else {
        mensajeError = `Ya existe un guardia con ese RUT y ese email`;
      }
      
      return NextResponse.json(
        { 
          error: mensajeError,
          detalles: {
            rut_duplicado: dupRut.rows.length > 0,
            email_duplicado: dupEmail.rows.length > 0,
            rut_existente: dupRut.rows[0] || null,
            email_existente: dupEmail.rows[0] || null
          }
        },
        { status: 409 }
      );
    }

    // Preparar los valores para la inserción
    const insertValues = [
      tenantId,
      nombre,
      apellidoPaterno,
      body.apellido_materno || '',
      rutNormalizado,
      email,
      telefono,
      body.direccion,
      body.ciudad,
      body.comuna,
      body.region || null,
      body.fecha_os10 || null,
      body.activo !== false, // Por defecto activo
      latitud,
      longitud,
      body.banco_id && body.banco_id !== '' ? body.banco_id : null, // Validar que sea un UUID válido
      body.numero_cuenta || null,
      tipoCuentaDb,
    ];

    console.log('🔍 API Guardias - Valores a insertar:', insertValues);

    // Query para crear el guardia - corregido para coincidir con la estructura real
    const result = await query(`
      INSERT INTO guardias (
        tenant_id,
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
        fecha_os10,
        activo,
        latitud,
        longitud,
        banco,
        numero_cuenta,
        tipo_cuenta,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *
    `, insertValues);

    const nuevoGuardia = result.rows[0];

    // Log de creación
    await logCRUD(
      'guardias',
      nuevoGuardia.id,
      'CREATE',
      usuario,
      null, // No hay datos anteriores en creación
      nuevoGuardia,
      tenantId
    );

    return NextResponse.json({ 
      success: true, 
      guardia: nuevoGuardia 
    });
  } catch (error) {
    console.error('Error creando guardia:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Log del error
    await logCRUD(
      'guardias',
      'NEW',
      'CREATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias',
        method: 'POST'
      },
      tenantId
    );
    
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        detalles: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 