import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Función para detectar la tabla correcta
async function getTableName(client: any): Promise<string> {
  // La tabla correcta es 'guardias' en ambos entornos
  console.log('🔍 Usando tabla: guardias (producción y local)');
  return 'guardias';
}

export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const body = await request.json();
    
    // Detectar la tabla correcta
    const tableName = await getTableName(client);
    
    logger.debug('🚀 API Postulación - Creando nuevo guardia:', body);

    // Validar campos requeridos
    const camposRequeridos = [
      'rut', 'nombre', 'apellido_paterno', 'email', 'celular', 
      'direccion', 'tenant_id'
    ];
    
    for (const campo of camposRequeridos) {
      if (!body[campo] || body[campo].toString().trim() === '') {
        return NextResponse.json(
          { error: `Campo requerido: ${campo}` },
          { status: 400 }
        );
      }
    }

    // Validar RUT
    const rutLimpio = body.rut.replace(/\./g, '').replace(/\s+/g, '');
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    if (!rutRegex.test(rutLimpio)) {
      return NextResponse.json(
        { error: 'RUT inválido. Formato esperado: 12345678-9' },
        { status: 400 }
      );
    }

    // Validar dígito verificador
    const [numeroStr, dvStr] = rutLimpio.split('-');
    const dv = dvStr.toLowerCase();
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = numeroStr.length - 1; i >= 0; i--) {
      suma += parseInt(numeroStr[i]) * multiplicador;
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

    // Verificar duplicados por RUT y Email dentro del tenant
    devLogger.search(' Verificando duplicados por RUT:', rutLimpio, 'en tenant:', body.tenant_id);
    
    const dupRut = await client.query(
      `SELECT id FROM ${tableName} WHERE rut = $1 AND tenant_id = $2 LIMIT 1`,
      [rutLimpio, body.tenant_id]
    );
    
    logger.debug('📊 Resultado de verificación RUT:', {
      rut: rutLimpio,
      tenant_id: body.tenant_id,
      filas_encontradas: dupRut.rows.length,
      resultado: dupRut.rows,
      tabla_usada: tableName
    });
    
    if (dupRut.rows.length > 0) {
      logger.debug('❌ RUT duplicado encontrado:', dupRut.rows[0]);
      return NextResponse.json(
        { error: 'Ya existe un guardia con este RUT en este tenant' },
        { status: 409 }
      );
    }
    
    logger.debug('✅ RUT no duplicado');

    const dupEmail = await client.query(
      `SELECT id FROM ${tableName} WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
      [body.email, body.tenant_id]
    );
    
    if (dupEmail.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un guardia con este email en este tenant' },
        { status: 409 }
      );
    }

    logger.debug('✅ Email no duplicado');

    // Verificar que el banco existe
    if (body.banco_id) {
      devLogger.search(' Verificando banco:', body.banco_id);
      const bancoCheck = await client.query(
        'SELECT id FROM bancos WHERE id = $1 LIMIT 1',
        [body.banco_id]
      );
      if (bancoCheck.rows.length === 0) {
        logger.debug('❌ Banco no encontrado');
        return NextResponse.json(
          { error: 'Banco no encontrado' },
          { status: 400 }
        );
      }
      logger.debug('✅ Banco verificado');
    }

    // Preparar datos para inserción
    logger.debug('🔍 Preparando datos para inserción...');
    const modoPrueba = body.modo_prueba === true;
    
    const datosGuardia = {
      rut: rutLimpio,
      nombre: body.nombre.trim(),
      apellido_paterno: body.apellido_paterno.trim(),
      apellido_materno: body.apellido_materno?.trim() || '',
      email: body.email.trim().toLowerCase(),
      telefono: body.celular.trim(),
      direccion: body.direccion.trim(),
      ciudad: body.ciudad || '',
      comuna: body.comuna || '',
      latitud: null,
      longitud: null,
      banco: body.banco_id,
      tipo_cuenta: body.tipo_cuenta || '',
      numero_cuenta: body.numero_cuenta || '',
      tenant_id: body.tenant_id,
      activo: true,
      tipo_guardia: 'contratado',
      sexo: body.sexo || '',
      nacionalidad: body.nacionalidad || '',
      fecha_nacimiento: body.fecha_nacimiento || null,
      afp: body.afp || '',
      descuento_afp: parseFloat(body.descuento_afp?.replace('%', '') || '0'),
      prevision_salud: body.prevision_salud || '',
      cotiza_sobre_7: body.cotiza_sobre_7 === 'Sí' || body.cotiza_sobre_7 === 'Yes',
      monto_pactado_uf: parseFloat(body.monto_pactado_uf || '0'),
      es_pensionado: body.es_pensionado === 'Sí' || body.es_pensionado === 'Yes',
      asignacion_familiar: body.asignacion_familiar === 'Sí' || body.asignacion_familiar === 'Yes',
      tramo_asignacion: body.tramo_asignacion || null,
      talla_camisa: body.talla_camisa || '',
      talla_pantalon: body.talla_pantalon || '',
      talla_zapato: parseInt(body.talla_zapato) || null,
      altura_cm: parseInt(body.altura_cm) || null,
      peso_kg: parseInt(body.peso_kg) || null,
      fecha_postulacion: new Date().toISOString(),
      estado_postulacion: 'pendiente',
      ip_postulacion: request.headers.get('x-forwarded-for') || request.ip || null,
      user_agent_postulacion: request.headers.get('user-agent') || null
    };

    console.log('📋 Datos preparados:', JSON.stringify(datosGuardia, null, 2));

    // Insertar en la base de datos
    logger.debug('🚀 Insertando guardia en base de datos...');
    const insertQuery = `
        INSERT INTO ${tableName} (
          rut, nombre, apellido_paterno, apellido_materno, email, telefono,
          direccion, ciudad, comuna, latitud, longitud, banco, tipo_cuenta,
          numero_cuenta, tenant_id, activo, tipo_guardia,
          sexo, nacionalidad, fecha_nacimiento, afp, descuento_afp,
          prevision_salud, cotiza_sobre_7, monto_pactado_uf, es_pensionado,
          asignacion_familiar, tramo_asignacion, talla_camisa, talla_pantalon,
          talla_zapato, altura_cm, peso_kg, fecha_postulacion, estado_postulacion,
          ip_postulacion, user_agent_postulacion, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, NOW(), NOW()
        ) RETURNING id, nombre, apellido_paterno, email, rut
      `;
    
    devLogger.search(' Query de inserción:', insertQuery);
    console.log('🔍 Parámetros:', JSON.stringify([
      datosGuardia.rut, datosGuardia.nombre, datosGuardia.apellido_paterno, datosGuardia.apellido_materno,
      datosGuardia.email, datosGuardia.telefono, datosGuardia.direccion, datosGuardia.ciudad, datosGuardia.comuna,
      datosGuardia.latitud, datosGuardia.longitud, datosGuardia.banco, datosGuardia.tipo_cuenta,
      datosGuardia.numero_cuenta, datosGuardia.tenant_id, datosGuardia.activo, datosGuardia.tipo_guardia,
      datosGuardia.sexo, datosGuardia.nacionalidad, datosGuardia.fecha_nacimiento, datosGuardia.afp,
      datosGuardia.descuento_afp, datosGuardia.prevision_salud, datosGuardia.cotiza_sobre_7,
      datosGuardia.monto_pactado_uf, datosGuardia.es_pensionado, datosGuardia.asignacion_familiar,
      datosGuardia.tramo_asignacion, datosGuardia.talla_camisa, datosGuardia.talla_pantalon,
      datosGuardia.talla_zapato, datosGuardia.altura_cm, datosGuardia.peso_kg,
      datosGuardia.fecha_postulacion, datosGuardia.estado_postulacion,
      datosGuardia.ip_postulacion, datosGuardia.user_agent_postulacion
    ], null, 2));

    logger.debug('🚀 Ejecutando query de inserción...');
    let result: any;
    try {
      result = await client.query(insertQuery, [
        datosGuardia.rut, datosGuardia.nombre, datosGuardia.apellido_paterno, datosGuardia.apellido_materno,
        datosGuardia.email, datosGuardia.telefono, datosGuardia.direccion, datosGuardia.ciudad, datosGuardia.comuna,
        datosGuardia.latitud, datosGuardia.longitud, datosGuardia.banco, datosGuardia.tipo_cuenta,
        datosGuardia.numero_cuenta, datosGuardia.tenant_id, datosGuardia.activo, datosGuardia.tipo_guardia,
        datosGuardia.sexo, datosGuardia.nacionalidad, datosGuardia.fecha_nacimiento, datosGuardia.afp,
        datosGuardia.descuento_afp, datosGuardia.prevision_salud, datosGuardia.cotiza_sobre_7,
        datosGuardia.monto_pactado_uf, datosGuardia.es_pensionado, datosGuardia.asignacion_familiar,
        datosGuardia.tramo_asignacion, datosGuardia.talla_camisa, datosGuardia.talla_pantalon,
        datosGuardia.talla_zapato, datosGuardia.altura_cm, datosGuardia.peso_kg,
        datosGuardia.fecha_postulacion, datosGuardia.estado_postulacion,
        datosGuardia.ip_postulacion, datosGuardia.user_agent_postulacion
      ]);
      logger.debug('✅ Query de inserción ejecutada exitosamente');
    } catch (insertError: unknown) {
      console.error('❌ Error en inserción:', insertError);
      if (insertError && typeof insertError === 'object' && 'code' in insertError) {
        console.error('🔍 Detalles del error:', {
          code: (insertError as any).code,
          message: (insertError as any).message,
          detail: (insertError as any).detail,
          hint: (insertError as any).hint
        });
      }
      throw insertError;
    }

    const guardiaCreado = result.rows[0];
    devLogger.success(' Guardia creado exitosamente:', guardiaCreado);

    // Enviar webhook (asíncrono)
    enviarWebhook(body.tenant_id, guardiaCreado.id, datosGuardia, modoPrueba);

    // Crear notificación para administradores (asíncrono)
    crearNotificacionNuevaPostulacion(body.tenant_id, guardiaCreado.id, datosGuardia);

    // Enviar email de confirmación (asíncrono)
    enviarEmailConfirmacion(datosGuardia);

    // Log de la operación
    await logCRUD(
      tableName,
      guardiaCreado.id,
      'CREATE',
      'postulacion_publica',
      undefined,
      datosGuardia,
      body.tenant_id,
      'api'
    );

    return NextResponse.json({
      success: true,
      guardia_id: guardiaCreado.id,
      mensaje: 'Guardia creado exitosamente'
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('❌ Error en API de postulación:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logError(
      'postulacion',
      'unknown',
      'postulacion_publica',
      { message: errorMessage, stack: errorStack },
      { datos_entrada: 'Error en procesamiento' },
      'unknown'
    );

    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}

// Función para enviar webhook (asíncrona)
async function enviarWebhook(tenantId: string, guardiaId: string, datosGuardia: any, modoPrueba: boolean = false) {
  try {
    // Obtener configuración del webhook del tenant
    const client = await getClient();
    const webhookConfig = await client.query(
      'SELECT url_webhook FROM tenant_webhooks WHERE tenant_id = $1 AND activo = true',
      [tenantId]
    );

    if (webhookConfig.rows.length === 0 || !webhookConfig.rows[0].url_webhook) {
      logger.debug('ℹ️ No hay webhook configurado para este tenant');
      return;
    }

    const webhookUrl = webhookConfig.rows[0].url_webhook;

    // Validar URL del webhook
    try {
      new URL(webhookUrl);
    } catch (error) {
      console.error('❌ URL de webhook inválida:', webhookUrl);
      return;
    }

    // Obtener datos completos del guardia incluyendo el nombre del banco
    let datosCompletos = { ...datosGuardia };
    
    // Si hay banco_id, obtener el nombre del banco
    if (datosGuardia.banco_id || datosGuardia.banco) {
      try {
        const bancoId = datosGuardia.banco_id || datosGuardia.banco;
        const bancoQuery = await client.query(`
          SELECT b.nombre as banco_nombre 
          FROM bancos b 
          WHERE b.id = $1
        `, [bancoId]);
        
        if (bancoQuery.rows.length > 0) {
          datosCompletos.banco_nombre = bancoQuery.rows[0].banco_nombre;
          devLogger.success(' Nombre del banco obtenido:', datosCompletos.banco_nombre);
        } else {
          logger.warn(' Banco no encontrado para ID:', bancoId);
          datosCompletos.banco_nombre = null;
        }
      } catch (error) {
        console.error('❌ Error obteniendo nombre del banco:', error);
        datosCompletos.banco_nombre = null;
      }
    }

    // Generar URLs de la ficha del guardia
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ops.gard.cl';
    const fichaGuardiaUrl = `${baseUrl}/guardias?id=${guardiaId}`;
    const fichaGuardiaDirectUrl = `${baseUrl}/guardias/${guardiaId}`;
    
    // Preparar payload del webhook
    const payload = {
      evento: 'nueva_postulacion_guardia',
      tenant_id: tenantId,
      guardia_id: guardiaId,
      timestamp: new Date().toISOString(),
      urls: {
        ficha_guardia: fichaGuardiaUrl,
        ficha_guardia_directa: fichaGuardiaDirectUrl,
        sistema_principal: baseUrl
      },
      datos: {
        personal: {
          rut: datosCompletos.rut,
          nombre: datosCompletos.nombre,
          apellido_paterno: datosCompletos.apellido_paterno,
          apellido_materno: datosCompletos.apellido_materno,
          sexo: datosCompletos.sexo,
          fecha_nacimiento: datosCompletos.fecha_nacimiento,
          nacionalidad: datosCompletos.nacionalidad,
          email: datosCompletos.email,
          telefono: datosCompletos.telefono,
          direccion: datosCompletos.direccion,
          ciudad: datosCompletos.ciudad,
          comuna: datosCompletos.comuna
        },
        previsional: {
          afp: datosCompletos.afp,
          descuento_afp: datosCompletos.descuento_afp,
          prevision_salud: datosCompletos.prevision_salud,
          cotiza_sobre_7: datosCompletos.cotiza_sobre_7,
          monto_pactado_uf: datosCompletos.monto_pactado_uf,
          es_pensionado: datosCompletos.es_pensionado,
          asignacion_familiar: datosCompletos.asignacion_familiar,
          tramo_asignacion: datosCompletos.tramo_asignacion
        },
        bancario: {
          banco_id: datosCompletos.banco_id || datosCompletos.banco,
          banco_nombre: datosCompletos.banco_nombre,
          tipo_cuenta: datosCompletos.tipo_cuenta,
          numero_cuenta: datosCompletos.numero_cuenta
        },
        fisico: {
          talla_camisa: datosCompletos.talla_camisa,
          talla_pantalon: datosCompletos.talla_pantalon,
          talla_zapato: datosCompletos.talla_zapato,
          altura_cm: datosCompletos.altura_cm,
          peso_kg: datosCompletos.peso_kg,
          imc: datosCompletos.altura_cm && datosCompletos.peso_kg 
            ? (datosCompletos.peso_kg / Math.pow(datosCompletos.altura_cm / 100, 2)).toFixed(1)
            : null
        },
        postulacion: {
          fecha_postulacion: datosCompletos.fecha_postulacion,
          estado_postulacion: datosCompletos.estado_postulacion,
          ip_postulacion: datosCompletos.ip_postulacion,
          user_agent_postulacion: datosCompletos.user_agent_postulacion
        }
      },
      test_mode: modoPrueba,
      test_timestamp: modoPrueba ? new Date().toISOString() : undefined
    };

    // Log del payload para debug
    console.log('📦 Payload del webhook:', JSON.stringify(payload, null, 2));
    
    // Enviar webhook de manera inmediata (sin setTimeout)
    try {
      logger.debug(`🚀 Enviando webhook a: ${webhookUrl}`);
      
      // Función para enviar webhook con reintentos robusta
      const enviarWebhookConReintentos = async (intento: number = 1): Promise<any> => {
        try {
          console.log(`🚀 Enviando webhook (intento ${intento}) a: ${webhookUrl}`);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'GardOps-Postulacion/1.0'
            },
            body: JSON.stringify(payload),
            // Timeout más largo para Make.com
            signal: AbortSignal.timeout(120000), // 2 minutos timeout
            keepalive: true
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error: unknown) {
          console.error(`❌ Error en intento ${intento}:`, error);
          
          // Reintentar hasta 3 veces con delay exponencial
          if (intento < 3) {
            const delay = Math.pow(2, intento) * 1000; // 2s, 4s, 8s
            logger.debug(`⏳ Reintentando en ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return enviarWebhookConReintentos(intento + 1);
          }
          
          throw error;
        }
      };

      const response = await enviarWebhookConReintentos();

      // Log del webhook
      await client.query(`
        INSERT INTO webhook_logs (
          tenant_id, guardia_id, url_webhook, payload_sent, 
          response_status, response_body, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        tenantId,
        guardiaId,
        webhookUrl,
        JSON.stringify(payload),
        response.status,
        await response.text().catch(() => 'Error leyendo respuesta')
      ]);

      logger.debug(`✅ Webhook enviado exitosamente a ${webhookUrl}`);

    } catch (error: unknown) {
      console.error('❌ Error enviando webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN';
      
      // Log detallado del error
      console.error('🔍 Detalles del error del webhook:');
      console.error('   - URL:', webhookUrl);
      console.error('   - Código de error:', errorCode);
      console.error('   - Mensaje:', errorMessage);
      
      // Log del error del webhook
      try {
        await client.query(`
          INSERT INTO webhook_logs (
            tenant_id, guardia_id, url_webhook, payload_sent, 
            error_message, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          tenantId,
          guardiaId,
          webhookUrl,
          JSON.stringify(payload),
          errorMessage
        ]);
      } catch (dbError) {
        console.error('❌ Error guardando log del webhook en BD:', dbError);
      }
    }
  } catch (error) {
    console.error('❌ Error en función de webhook:', error);
  }
}

// Función para enviar email de confirmación (asíncrona)
async function enviarEmailConfirmacion(datosGuardia: any) {
  try {
    // Aquí implementarías el envío de email usando tu servicio preferido
    // Por ahora solo log
    logger.debug('📧 Email de confirmación enviado a:', datosGuardia.email);
    
    // Ejemplo con Resend (si lo tienes configurado)
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'postulaciones@gardops.com',
      to: datosGuardia.email,
      subject: 'Postulación Recibida - GardOps',
      html: `
        <h2>¡Hola ${datosGuardia.nombre}!</h2>
        <p>Hemos recibido tu postulación como guardia de seguridad.</p>
        <p><strong>RUT:</strong> ${datosGuardia.rut}</p>
        <p><strong>Email:</strong> ${datosGuardia.email}</p>
        <p>Nos pondremos en contacto contigo pronto.</p>
      `
    });
    */
    
  } catch (error) {
    console.error('❌ Error enviando email de confirmación:', error);
  }
}

// Función para crear notificación de nueva postulación (asíncrona)
async function crearNotificacionNuevaPostulacion(tenantId: string, guardiaId: string, datosGuardia: any) {
  try {
    const client = await getClient();
    
    // Obtener todos los usuarios administradores del tenant
    const usuariosQuery = `
      SELECT u.id, u.email, u.nombre
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE u.tenant_id = $1 
        AND u.activo = true 
        AND r.nombre ILIKE '%admin%'
    `;
    
    const usuariosResult = await client.query(usuariosQuery, [tenantId]);
    
    if (usuariosResult.rows.length === 0) {
      logger.debug('ℹ️ No hay usuarios administradores para notificar');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ops.gard.cl';
    const fichaGuardiaUrl = `${baseUrl}/guardias?id=${guardiaId}`;
    
    // Crear notificación para cada administrador
    for (const usuario of usuariosResult.rows) {
      const notificacionQuery = `
        INSERT INTO notificaciones (
          tenant_id, usuario_id, tipo, titulo, mensaje, datos
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const titulo = `Nueva postulación de guardia`;
      const mensaje = `${datosGuardia.nombre} ${datosGuardia.apellido_paterno} (${datosGuardia.rut}) ha enviado una nueva postulación`;
      
      const datosNotificacion = {
        guardia_id: guardiaId,
        rut: datosGuardia.rut,
        nombre: datosGuardia.nombre,
        apellido_paterno: datosGuardia.apellido_paterno,
        email: datosGuardia.email,
        telefono: datosGuardia.telefono,
        urls: {
          ficha_guardia: fichaGuardiaUrl,
          ficha_guardia_directa: `${baseUrl}/guardias/${guardiaId}`
        }
      };
      
      await client.query(notificacionQuery, [
        tenantId,
        usuario.id,
        'nueva_postulacion',
        titulo,
        mensaje,
        JSON.stringify(datosNotificacion)
      ]);
    }
    
    devLogger.success(`🔔 Notificaciones creadas para ${usuariosResult.rows.length} administradores`);
    
  } catch (error) {
    console.error('❌ Error creando notificaciones:', error);
  }
}
