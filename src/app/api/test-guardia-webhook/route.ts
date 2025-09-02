import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    // Obtener el último guardia creado para usar sus datos reales
    const ultimoGuardiaQuery = await client.query(`
      SELECT 
        g.*,
        b.nombre as banco_nombre
      FROM guardias g
      LEFT JOIN bancos b ON g.banco_id = b.id
      WHERE g.estado_postulacion = 'pendiente'
      ORDER BY g.fecha_postulacion DESC
      LIMIT 1
    `);

    if (ultimoGuardiaQuery.rows.length === 0) {
      return NextResponse.json({
        error: 'No hay guardias de postulación recientes para probar'
      }, { status: 404 });
    }

    const guardia = ultimoGuardiaQuery.rows[0];
    const tenantId = guardia.tenant_id;
    const guardiaId = guardia.id;

    // Obtener configuración del webhook
    const webhookConfig = await client.query(
      'SELECT url_webhook FROM configuracion_postulaciones WHERE tenant_id = $1 AND activo = true',
      [tenantId]
    );

    if (webhookConfig.rows.length === 0) {
      return NextResponse.json({
        error: 'No hay webhook configurado para este tenant'
      }, { status: 404 });
    }

    const webhookUrl = webhookConfig.rows[0].url_webhook;

    // Generar URLs de la ficha del guardia
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ops.gard.cl';
    const fichaGuardiaUrl = `${baseUrl}/guardias?id=${guardiaId}`;
    const fichaGuardiaDirectUrl = `${baseUrl}/guardias/${guardiaId}`;
    
    // Preparar payload del webhook (idéntico al real)
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
          rut: guardia.rut,
          nombre: guardia.nombre,
          apellido_paterno: guardia.apellido_paterno,
          apellido_materno: guardia.apellido_materno,
          sexo: guardia.sexo,
          fecha_nacimiento: guardia.fecha_nacimiento,
          nacionalidad: guardia.nacionalidad,
          email: guardia.email,
          telefono: guardia.telefono,
          direccion: guardia.direccion,
          ciudad: guardia.ciudad,
          comuna: guardia.comuna
        },
        previsional: {
          afp: guardia.afp,
          descuento_afp: guardia.descuento_afp,
          prevision_salud: guardia.prevision_salud,
          cotiza_sobre_7: guardia.cotiza_sobre_7,
          monto_pactado_uf: guardia.monto_pactado_uf,
          es_pensionado: guardia.es_pensionado,
          asignacion_familiar: guardia.asignacion_familiar,
          tramo_asignacion: guardia.tramo_asignacion
        },
        bancario: {
          banco_id: guardia.banco_id,
          banco_nombre: guardia.banco_nombre,
          tipo_cuenta: guardia.tipo_cuenta,
          numero_cuenta: guardia.numero_cuenta
        },
        fisico: {
          talla_camisa: guardia.talla_camisa,
          talla_pantalon: guardia.talla_pantalon,
          talla_zapato: guardia.talla_zapato,
          altura_cm: guardia.altura_cm,
          peso_kg: guardia.peso_kg,
          imc: guardia.altura_cm && guardia.peso_kg 
            ? (guardia.peso_kg / Math.pow(guardia.altura_cm / 100, 2)).toFixed(1)
            : null
        },
        postulacion: {
          fecha_postulacion: guardia.fecha_postulacion,
          estado_postulacion: guardia.estado_postulacion,
          ip_postulacion: guardia.ip_postulacion,
          user_agent_postulacion: guardia.user_agent_postulacion
        }
      },
      test_mode: true, // Indicador de que es una prueba
      test_timestamp: new Date().toISOString()
    };

    console.log('🧪 TEST WEBHOOK - Enviando con datos reales del guardia:', guardia.nombre, guardia.apellido_paterno);
    console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));

    // Enviar webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GardOps-TestWebhook/1.0',
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Guardar log del test
    await client.query(`
      INSERT INTO logs_webhooks (
        tenant_id, tipo_evento, url_destino, payload_enviado,
        respuesta_status, respuesta_body, exito, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      tenantId,
      'test_postulacion_guardia',
      webhookUrl,
      JSON.stringify(payload),
      response.status,
      JSON.stringify(responseData),
      response.ok
    ]);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      guardia_usado: {
        id: guardiaId,
        nombre: `${guardia.nombre} ${guardia.apellido_paterno}`,
        rut: guardia.rut,
        fecha_postulacion: guardia.fecha_postulacion
      },
      urls_enviadas: payload.urls,
      webhook_url: webhookUrl,
      response: responseData,
      payload_enviado: payload
    });

  } catch (error: any) {
    console.error('❌ Error en test de webhook:', error);
    return NextResponse.json({
      error: 'Error al enviar webhook de prueba',
      detalles: error.message
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
