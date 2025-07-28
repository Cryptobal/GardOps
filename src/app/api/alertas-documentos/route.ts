import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { cookies } from 'next/headers';

// GET: Obtener alertas de documentos por vencer
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const tenantCookie = cookieStore.get('tenant');
    
    // TEMPORAL: Permitir funcionar sin autenticación durante debug de 1Password
    if (!tenantCookie?.value) {
      console.log('⚠️ Sin cookie tenant - usando modo debug');
      // return NextResponse.json({ success: false, error: 'No hay sesión activa' }, { status: 401 });
    } else {
      const tenant = JSON.parse(tenantCookie.value);
      console.log('🔔 Obteniendo alertas de documentos para tenant:', tenant.id);
    }

    // Query funcionando con datos reales
    const alertasClientesQuery = `
      SELECT 
        dc.id as documento_id,
        dc.nombre as documento_nombre,
        dc.fecha_vencimiento,
        c.nombre as cliente_nombre,
        c.id as cliente_id,
        td.nombre as tipo_documento_nombre,
        td.dias_antes_alarma,
        (dc.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN dc.fecha_vencimiento::date < CURRENT_DATE THEN 'El documento ha vencido'
          WHEN dc.fecha_vencimiento::date = CURRENT_DATE THEN 'El documento vence hoy'
          WHEN (dc.fecha_vencimiento::date - CURRENT_DATE) = 1 THEN 'El documento vence mañana'
          ELSE 'El documento vence en ' || (dc.fecha_vencimiento::date - CURRENT_DATE) || ' días'
        END as mensaje
      FROM documentos_clientes dc
      JOIN clientes c ON dc.cliente_id = c.id
      LEFT JOIN tipos_documentos td ON dc.tipo_documento_id = td.id
      WHERE dc.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) <= COALESCE(td.dias_antes_alarma, 30)
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) >= -365
      ORDER BY dc.fecha_vencimiento ASC
    `;

    console.log('🔍 Ejecutando query de alertas...');
    const resultClientes = await query(alertasClientesQuery);
    console.log(`📊 Query retornó ${resultClientes.rows.length} registros`);
    
    // Crear alertas con IDs únicos
    const alertas = resultClientes.rows.map((row: any) => {
      const diasRestantes = parseInt(row.dias_restantes);
      console.log(`📄 Documento: ${row.documento_nombre}, Días restantes: ${diasRestantes}, Fecha: ${row.fecha_vencimiento}`);
      
      return {
        id: `cliente-${row.documento_id}`,
        documento_id: row.documento_id,
        dias_restantes: diasRestantes,
        mensaje: row.mensaje,
        creada_en: new Date().toISOString(),
        leida: false,
        documento_nombre: row.documento_nombre,
        cliente_nombre: row.cliente_nombre,
        cliente_id: row.cliente_id,
        fecha_vencimiento: row.fecha_vencimiento,
        tipo_documento_nombre: row.tipo_documento_nombre,
      };
    });

    console.log(`✅ ${alertas.length} alertas generadas`);

    return NextResponse.json({
      success: true,
      data: alertas
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo alertas:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: Generar alertas escaneando documentos con vencimiento
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const tenantCookie = cookieStore.get('tenant');
    
    if (!tenantCookie?.value) {
      return NextResponse.json({ success: false, error: 'No hay sesión activa' }, { status: 401 });
    }

    console.log('🧠 Iniciando generación de alertas de documentos...');

    return NextResponse.json({
      success: true,
      message: 'Las alertas se generan automáticamente al consultar'
    });

  } catch (error: any) {
    console.error('❌ Error generando alertas:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT: Marcar alerta como leída
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de alerta requerido' 
      }, { status: 400 });
    }

    console.log(`✅ Alerta ${id} marcada como leída (simulado)`);

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como leída'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando alerta:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 