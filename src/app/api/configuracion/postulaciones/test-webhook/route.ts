import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url_webhook } = body;

    if (!url_webhook) {
      return NextResponse.json({
        error: 'URL del webhook es requerida'
      }, { status: 400 });
    }

    // Validar URL
    try {
      new URL(url_webhook);
    } catch {
      return NextResponse.json({
        error: 'URL del webhook inválida'
      }, { status: 400 });
    }

    // Payload de prueba con todos los datos del formulario
    const testPayload = {
      evento: 'postulacion_guardia',
      tenant_id: '1397e653-a702-4020-9702-3ae4f3f8b337',
      timestamp: new Date().toISOString(),
      mensaje: 'Prueba de webhook con datos completos del formulario de postulación',
      datos: {
        test: true,
        descripcion: 'Datos de prueba para verificar que el webhook reciba toda la información del formulario',
        
        // Datos Personales
        rut: '12345678-9',
        nombre: 'Juan Carlos',
        apellido_paterno: 'Pérez',
        apellido_materno: 'González',
        sexo: 'Masculino',
        fecha_nacimiento: '1990-05-15',
        nacionalidad: 'Chilena',
        
        // Contacto
        email: 'juan.perez@ejemplo.com',
        celular: '912345678',
        direccion: 'Av. Providencia 1234',
        comuna: 'Providencia',
        ciudad: 'Santiago',
        
        // Información Previsional
        afp: 'Capital',
        descuento_afp: '1%',
        prevision_salud: 'FONASA',
        cotiza_sobre_7: 'No',
        monto_pactado_uf: '25.50',
        es_pensionado: 'No',
        asignacion_familiar: 'Sí',
        tramo_asignacion: 'A',
        
        // Información Bancaria
        banco_id: '1',
        tipo_cuenta: 'CCT',
        numero_cuenta: '123456789',
        
        // Información Física
        talla_camisa: 'L',
        talla_pantalon: '42',
        talla_zapato: 41,
        altura_cm: 175,
        peso_kg: 75,
        
        // Documentos
        documentos: [
          { tipo: 'Certificado OS10', estado: 'Cargado' },
          { tipo: 'Carnet Identidad Frontal', estado: 'Cargado' },
          { tipo: 'Carnet Identidad Reverso', estado: 'Cargado' },
          { tipo: 'Certificado Antecedentes', estado: 'Cargado' },
          { tipo: 'Certificado Enseñanza Media', estado: 'Cargado' },
          { tipo: 'Certificado AFP', estado: 'Cargado' },
          { tipo: 'Certificado AFC', estado: 'Cargado' },
          { tipo: 'Certificado FONASA/ISAPRE', estado: 'Cargado' }
        ],
        
        // Metadatos
        ip_postulacion: '192.168.1.100',
        user_agent_postulacion: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        fecha_postulacion: new Date().toISOString()
      }
    };

    console.log('🧪 Probando webhook:', url_webhook);

    try {
      // Enviar webhook de prueba
      const response = await fetch(url_webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GardOps-TestWebhook/1.0'
        },
        body: JSON.stringify(testPayload),
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000)
      });

      const responseText = await response.text();
      let responseBody;
      
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      console.log('✅ Webhook respondió:', {
        status: response.status,
        body: responseBody
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          mensaje: 'Webhook probado exitosamente',
          detalles: {
            status: response.status,
            response: responseBody
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          mensaje: 'Webhook respondió con error',
          detalles: {
            status: response.status,
            response: responseBody
          }
        }, { status: 400 });
      }

    } catch (error: any) {
      console.error('❌ Error probando webhook:', error);
      
      let errorMessage = 'Error de conexión';
      if (error.name === 'TimeoutError') {
        errorMessage = 'Timeout: El webhook no respondió en 10 segundos';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Error DNS: No se puede resolver el dominio';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Conexión rechazada: El servidor no está disponible';
      }

      return NextResponse.json({
        success: false,
        mensaje: errorMessage,
        error: error.message
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Error en API de test webhook:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
