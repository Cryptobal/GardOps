import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';
import { logCRUD, logError } from '@/lib/logging';

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    body = await request.json();
    console.log('🚀 API Postulación - Creando nuevo guardia:', body);

    const client = await getClient();
    
    try {
      // Validar campos requeridos
      const camposRequeridos = [
        'rut', 'nombre', 'apellido_paterno', 'email', 'celular', 'direccion',
        'afp', 'prevision_salud', 'banco_id', 'tipo_cuenta', 'numero_cuenta',
        'tenant_id'
      ];

      for (const campo of camposRequeridos) {
        if (!body[campo]) {
          return NextResponse.json(
            { error: `Campo requerido faltante: ${campo}` },
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
      const dupRut = await client.query(
        'SELECT id FROM guardias WHERE rut = $1 AND tenant_id = $2 LIMIT 1',
        [rutLimpio, body.tenant_id]
      );
      
      if (dupRut.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un guardia con este RUT en este tenant' },
          { status: 409 }
        );
      }

      const dupEmail = await client.query(
        'SELECT id FROM guardias WHERE email = $1 AND tenant_id = $2 LIMIT 1',
        [body.email, body.tenant_id]
      );
      
      if (dupEmail.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe un guardia con este email en este tenant' },
          { status: 409 }
        );
      }

      // Verificar que el banco existe
      if (body.banco_id) {
        const bancoCheck = await client.query(
          'SELECT id FROM bancos WHERE id = $1 LIMIT 1',
          [body.banco_id]
        );
        if (bancoCheck.rows.length === 0) {
          return NextResponse.json(
            { error: 'Banco no encontrado' },
            { status: 400 }
          );
        }
      }

      // Preparar datos para inserción
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
        latitud: body.latitud || null,
        longitud: body.longitud || null,
        banco_id: body.banco_id,
        tipo_cuenta: body.tipo_cuenta,
        numero_cuenta: body.numero_cuenta.trim(),
        tenant_id: body.tenant_id,
        activo: true,
        estado: 'Activo',
        tipo_guardia: 'contratado',
        
        // Nuevos campos del formulario
        sexo: body.sexo || null,
        nacionalidad: body.nacionalidad || 'Chilena',
        fecha_nacimiento: body.fecha_nacimiento || null,
        afp: body.afp || null,
        descuento_afp: body.descuento_afp === '1%' ? 1.00 : 0.00,
        prevision_salud: body.prevision_salud || null,
        cotiza_sobre_7: body.cotiza_sobre_7 === 'Sí',
        monto_pactado_uf: body.monto_pactado_uf ? parseFloat(body.monto_pactado_uf) : null,
        es_pensionado: body.es_pensionado === 'Sí',
        asignacion_familiar: body.asignacion_familiar === 'Sí',
        tramo_asignacion: body.tramo_asignacion || null,
        talla_camisa: body.talla_camisa || null,
        talla_pantalon: body.talla_pantalon || null,
        talla_zapato: body.talla_zapato || null,
        altura_cm: body.altura_cm || null,
        peso_kg: body.peso_kg || null,
        
        // Campos de postulación
        fecha_postulacion: new Date().toISOString(),
        estado_postulacion: 'pendiente',
        ip_postulacion: body.ip_postulacion || null,
        user_agent_postulacion: body.user_agent_postulacion || null
      };

      // Insertar guardia
      const insertQuery = `
        INSERT INTO guardias (
          rut, nombre, apellido_paterno, apellido_materno, email, telefono,
          direccion, ciudad, comuna, latitud, longitud, banco_id, tipo_cuenta,
          numero_cuenta, tenant_id, activo, estado, tipo_guardia,
          sexo, nacionalidad, fecha_nacimiento, afp, descuento_afp,
          prevision_salud, cotiza_sobre_7, monto_pactado_uf, es_pensionado,
          asignacion_familiar, tramo_asignacion, talla_camisa, talla_pantalon,
          talla_zapato, altura_cm, peso_kg, fecha_postulacion, estado_postulacion,
          ip_postulacion, user_agent_postulacion, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, NOW(), NOW()
        ) RETURNING id, nombre, apellido_paterno, email, rut
      `;

      const insertParams = [
        datosGuardia.rut, datosGuardia.nombre, datosGuardia.apellido_paterno,
        datosGuardia.apellido_materno, datosGuardia.email, datosGuardia.telefono,
        datosGuardia.direccion, datosGuardia.ciudad, datosGuardia.comuna,
        datosGuardia.latitud, datosGuardia.longitud, datosGuardia.banco_id,
        datosGuardia.tipo_cuenta, datosGuardia.numero_cuenta, datosGuardia.tenant_id,
        datosGuardia.activo, datosGuardia.estado, datosGuardia.tipo_guardia,
        datosGuardia.sexo, datosGuardia.nacionalidad, datosGuardia.fecha_nacimiento,
        datosGuardia.afp, datosGuardia.descuento_afp, datosGuardia.prevision_salud,
        datosGuardia.cotiza_sobre_7, datosGuardia.monto_pactado_uf,
        datosGuardia.es_pensionado, datosGuardia.asignacion_familiar,
        datosGuardia.tramo_asignacion, datosGuardia.talla_camisa,
        datosGuardia.talla_pantalon, datosGuardia.talla_zapato,
        datosGuardia.altura_cm, datosGuardia.peso_kg, datosGuardia.fecha_postulacion,
        datosGuardia.estado_postulacion, datosGuardia.ip_postulacion,
        datosGuardia.user_agent_postulacion
      ];

      const result = await client.query(insertQuery, insertParams);
      const guardiaCreado = result.rows[0];

      console.log('✅ Guardia creado exitosamente:', guardiaCreado);

      // Crear notificación interna
      try {
        await client.query(`
          INSERT INTO notificaciones_postulaciones (
            tenant_id, guardia_id, tipo, titulo, mensaje
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          body.tenant_id,
          guardiaCreado.id,
          'nueva_postulacion',
          'Nueva Postulación de Guardia',
          `Se ha recibido una nueva postulación de ${guardiaCreado.nombre} ${guardiaCreado.apellido_paterno} (${guardiaCreado.rut})`
        ]);
      } catch (error) {
        console.warn('⚠️ Error creando notificación interna:', error);
      }

      // Enviar webhook (asíncrono)
      enviarWebhook(body.tenant_id, guardiaCreado.id, datosGuardia);

      // Enviar email de confirmación (asíncrono)
      enviarEmailConfirmacion(datosGuardia);

      // Log de la operación
      await logCRUD({
        accion: 'CREATE',
        entidad: 'guardias',
        entidad_id: guardiaCreado.id,
        usuario: 'postulacion_publica',
        detalles: `Guardia creado desde formulario público: ${guardiaCreado.nombre} ${guardiaCreado.apellido_paterno}`,
        tenant_id: body.tenant_id
      });

      return NextResponse.json({
        success: true,
        guardia_id: guardiaCreado.id,
        mensaje: 'Guardia creado exitosamente'
      }, { status: 201 });

    } finally {
      client.release?.();
    }

  } catch (error: any) {
    console.error('❌ Error en API de postulación:', error);
    
    await logError({
      error: error.message,
      stack: error.stack,
      contexto: 'API postulación crear guardia',
      datos_entrada: body
    });

    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Función para enviar webhook (asíncrona)
async function enviarWebhook(tenantId: string, guardiaId: string, datosGuardia: any) {
  try {
    // Obtener configuración del webhook del tenant
    const client = await getClient();
    const webhookConfig = await client.query(
      'SELECT url_webhook FROM tenant_webhooks WHERE tenant_id = $1 AND activo = true',
      [tenantId]
    );

    if (webhookConfig.rows.length === 0 || !webhookConfig.rows[0].url_webhook) {
      console.log('ℹ️ No hay webhook configurado para este tenant');
      return;
    }

    const webhookUrl = webhookConfig.rows[0].url_webhook;

    // Preparar payload del webhook
    const payload = {
      evento: 'nueva_postulacion_guardia',
      tenant_id: tenantId,
      guardia_id: guardiaId,
      timestamp: new Date().toISOString(),
      datos: {
        personal: {
          rut: datosGuardia.rut,
          nombre: datosGuardia.nombre,
          apellido_paterno: datosGuardia.apellido_paterno,
          apellido_materno: datosGuardia.apellido_materno,
          sexo: datosGuardia.sexo,
          fecha_nacimiento: datosGuardia.fecha_nacimiento,
          nacionalidad: datosGuardia.nacionalidad,
          email: datosGuardia.email,
          telefono: datosGuardia.telefono,
          direccion: datosGuardia.direccion,
          ciudad: datosGuardia.ciudad,
          comuna: datosGuardia.comuna
        },
        previsional: {
          afp: datosGuardia.afp,
          descuento_afp: datosGuardia.descuento_afp,
          prevision_salud: datosGuardia.prevision_salud,
          cotiza_sobre_7: datosGuardia.cotiza_sobre_7,
          monto_pactado_uf: datosGuardia.monto_pactado_uf,
          es_pensionado: datosGuardia.es_pensionado,
          asignacion_familiar: datosGuardia.asignacion_familiar,
          tramo_asignacion: datosGuardia.tramo_asignacion
        },
        bancario: {
          banco_id: datosGuardia.banco_id,
          tipo_cuenta: datosGuardia.tipo_cuenta,
          numero_cuenta: datosGuardia.numero_cuenta
        },
        fisico: {
          talla_camisa: datosGuardia.talla_camisa,
          talla_pantalon: datosGuardia.talla_pantalon,
          talla_zapato: datosGuardia.talla_zapato,
          altura_cm: datosGuardia.altura_cm,
          peso_kg: datosGuardia.peso_kg,
          imc: datosGuardia.altura_cm && datosGuardia.peso_kg 
            ? (datosGuardia.peso_kg / Math.pow(datosGuardia.altura_cm / 100, 2)).toFixed(1)
            : null
        },
        postulacion: {
          fecha_postulacion: datosGuardia.fecha_postulacion,
          estado_postulacion: datosGuardia.estado_postulacion,
          ip_postulacion: datosGuardia.ip_postulacion,
          user_agent_postulacion: datosGuardia.user_agent_postulacion
        }
      }
    };

    // Enviar webhook con delay pequeño
    setTimeout(async () => {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GardOps-Postulacion/1.0'
          },
          body: JSON.stringify(payload)
        });

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

        console.log(`✅ Webhook enviado exitosamente a ${webhookUrl}`);

      } catch (error) {
        console.error('❌ Error enviando webhook:', error);
        
        // Log del error del webhook
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
          error.message
        ]);
      }
    }, 2000); // 2 segundos de delay

  } catch (error) {
    console.error('❌ Error en función de webhook:', error);
  }
}

// Función para enviar email de confirmación (asíncrona)
async function enviarEmailConfirmacion(datosGuardia: any) {
  try {
    // Aquí implementarías el envío de email usando tu servicio preferido
    // Por ahora solo log
    console.log('📧 Email de confirmación enviado a:', datosGuardia.email);
    
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
