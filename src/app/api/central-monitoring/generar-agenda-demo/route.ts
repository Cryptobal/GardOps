import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'configure' });
  if (deny) return deny;

  try {
    const { fecha } = await req.json();
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const fechaStr = fechaObj.toISOString().split('T')[0];

    console.log('📅 Generando agenda demo para fecha:', fechaStr);

    // Primero, limpiar llamados existentes para esta fecha
    await sql`
      DELETE FROM central_llamados 
      WHERE programado_para::date = ${fechaStr}::date
    `;

    // Obtener instalaciones activas (simplificado)
    const instalacionesQuery = await sql`
      SELECT 
        id as instalacion_id,
        nombre as instalacion_nombre,
        telefono as instalacion_telefono
      FROM instalaciones 
      WHERE estado = 'Activo'
      ORDER BY nombre ASC
      LIMIT 5
    `;

    console.log(`📋 Encontradas ${instalacionesQuery.rows.length} instalaciones activas`);

    const llamadosGenerados = [];

    // Generar llamados simples para cada instalación
    for (const instalacion of instalacionesQuery.rows) {
      console.log(`🏢 Procesando instalación: ${instalacion.instalacion_nombre}`);
      
      // Generar llamados cada hora desde las 21:00 hasta las 07:00 del día siguiente
      const horas = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
      
      for (const hora of horas) {
        const horaStr = `${hora.toString().padStart(2, '0')}:00:00`;
        
        // Para las horas 0-7, usar el día siguiente
        let fechaHoraCompleta;
        if (hora >= 0 && hora <= 7) {
          const fechaSiguiente = new Date(fechaStr);
          fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);
          const fechaSiguienteStr = fechaSiguiente.toISOString().split('T')[0];
          fechaHoraCompleta = `${fechaSiguienteStr}T${horaStr}`;
        } else {
          fechaHoraCompleta = `${fechaStr}T${horaStr}`;
        }
        
        // Insertar el llamado en la base de datos
        const insertResult = await sql`
          INSERT INTO central_llamados (
            instalacion_id,
            programado_para,
            contacto_tipo,
            contacto_nombre,
            contacto_telefono,
            estado,
            observaciones,
            canal,
            created_at
          ) VALUES (
            ${instalacion.instalacion_id},
            ${fechaHoraCompleta}::timestamp,
            'instalacion',
            ${instalacion.instalacion_nombre},
            ${instalacion.instalacion_telefono || '123456789'},
            'pendiente',
            NULL,
            'telefono',
            NOW()
          ) RETURNING id
        `;

        llamadosGenerados.push({
          id: insertResult.rows[0].id,
          instalacion_id: instalacion.instalacion_id,
          instalacion_nombre: instalacion.instalacion_nombre,
          programado_para: fechaHoraCompleta,
          contacto_tipo: 'instalacion',
          contacto_nombre: instalacion.instalacion_nombre,
          contacto_telefono: instalacion.instalacion_telefono || '123456789',
          estado: 'pendiente',
          observaciones: null
        });

        console.log(`✅ Llamado generado: ${instalacion.instalacion_nombre} - ${horaStr}`);
      }
    }

    console.log(`✅ Agenda demo generada: ${llamadosGenerados.length} llamados creados`);

    return NextResponse.json({ 
      success: true, 
      fecha: fechaStr,
      llamados_generados: llamadosGenerados.length,
      data: llamadosGenerados
    });

  } catch (error) {
    console.error('Error generando agenda demo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
