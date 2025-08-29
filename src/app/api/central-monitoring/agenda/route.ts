import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  console.log('🔍 Central Monitoring Agenda - Iniciando request');
  
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'view' });
  if (deny) {
    console.log('❌ Central Monitoring Agenda - Acceso denegado');
    return deny;
  }

  console.log('✅ Central Monitoring Agenda - Acceso autorizado');

  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD
    const estado = searchParams.get('estado');

    console.log('🔍 Central Monitoring Agenda - Parámetros:', { fecha, estado });

    console.log('🔍 Central Monitoring Agenda - Ejecutando consulta SQL...');

    // Consulta simplificada usando template literals
    let result;
    
    if (fecha) {
      if (estado) {
        result = await sql`
          SELECT 
            cl.id,
            cl.instalacion_id,
            cl.programado_para,
            cl.estado,
            cl.observaciones,
            i.nombre as instalacion_nombre,
            i.telefono as instalacion_telefono,
            g.nombre as guardia_nombre,
            g.telefono as guardia_telefono
          FROM central_llamados cl
          JOIN instalaciones i ON i.id = cl.instalacion_id
          LEFT JOIN guardias g ON cl.guardia_id = g.id
          WHERE cl.programado_para::date = ${fecha}::date
            AND cl.estado = ${estado}
          ORDER BY cl.programado_para ASC, i.nombre ASC
        `;
      } else {
        result = await sql`
          SELECT 
            cl.id,
            cl.instalacion_id,
            cl.programado_para,
            cl.estado,
            cl.observaciones,
            i.nombre as instalacion_nombre,
            i.telefono as instalacion_telefono,
            g.nombre as guardia_nombre,
            g.telefono as guardia_telefono
          FROM central_llamados cl
          JOIN instalaciones i ON i.id = cl.instalacion_id
          LEFT JOIN guardias g ON cl.guardia_id = g.id
          WHERE cl.programado_para::date = ${fecha}::date
          ORDER BY cl.programado_para ASC, i.nombre ASC
        `;
      }
    } else {
      if (estado) {
        result = await sql`
          SELECT 
            cl.id,
            cl.instalacion_id,
            cl.programado_para,
            cl.estado,
            cl.observaciones,
            i.nombre as instalacion_nombre,
            i.telefono as instalacion_telefono,
            g.nombre as guardia_nombre,
            g.telefono as guardia_telefono
          FROM central_llamados cl
          JOIN instalaciones i ON i.id = cl.instalacion_id
          LEFT JOIN guardias g ON cl.guardia_id = g.id
          WHERE cl.programado_para::date BETWEEN CURRENT_DATE - INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '1 day'
            AND cl.estado = ${estado}
          ORDER BY cl.programado_para ASC, i.nombre ASC
        `;
      } else {
        result = await sql`
          SELECT 
            cl.id,
            cl.instalacion_id,
            cl.programado_para,
            cl.estado,
            cl.observaciones,
            i.nombre as instalacion_nombre,
            i.telefono as instalacion_telefono,
            g.nombre as guardia_nombre,
            g.telefono as guardia_telefono
          FROM central_llamados cl
          JOIN instalaciones i ON i.id = cl.instalacion_id
          LEFT JOIN guardias g ON cl.guardia_id = g.id
          WHERE cl.programado_para::date BETWEEN CURRENT_DATE - INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '1 day'
          ORDER BY cl.programado_para ASC, i.nombre ASC
        `;
      }
    }

    console.log('✅ Central Monitoring Agenda - Consulta exitosa, registros encontrados:', result.rows.length);

    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('❌ Central Monitoring Agenda - Error obteniendo agenda de monitoreo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
