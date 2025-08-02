import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!instalacion_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    const fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${new Date(parseInt(anio), parseInt(mes), 0).getDate()}`;

    // Obtener la pauta mensual desde la base de datos
    const pautaResult = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        g.nombre as guardia_nombre,
        pm.dia,
        pm.tipo,
        pm.observacion,
        EXTRACT(DAY FROM pm.dia) as dia_numero
      FROM pautas_mensuales pm
      INNER JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.instalacion_id = $1 
        AND pm.dia >= $2 
        AND pm.dia <= $3
      ORDER BY g.nombre, pm.dia
    `, [instalacion_id, fechaInicio, fechaFin]);

    // Obtener todos los guardias de la instalación para mostrar también los que no tienen pauta
    const guardiasResult = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.rol_servicio
      FROM guardias g
      INNER JOIN instalaciones i ON g.instalacion_id = i.id
      WHERE g.instalacion_id = $1
      ORDER BY g.nombre
    `, [instalacion_id]);

    // Organizar los datos por guardia
    const pautaPorGuardia = guardiasResult.rows.map(guardia => {
      const pautaGuardia = pautaResult.rows.filter(p => p.guardia_id === guardia.id);
      
      // Crear array de días del mes
      const diasDelMes = Array.from({ length: new Date(parseInt(anio), parseInt(mes), 0).getDate() }, (_, i) => i + 1);
      
      const dias = diasDelMes.map(dia => {
        const pautaDia = pautaGuardia.find(p => p.dia_numero === dia);
        if (pautaDia) {
          // Convertir tipo de la base de datos a estado del frontend
          let estado = '';
          switch (pautaDia.tipo) {
            case 'turno':
              estado = 'T';
              break;
            case 'libre':
              estado = 'L';
              break;
            case 'permiso':
              estado = 'P';
              break;
            case 'licencia':
              estado = 'LIC';
              break;
            default:
              estado = '';
          }
          return estado;
        }
        return '';
      });

      return {
        nombre: guardia.nombre,
        rol: guardia.rol_servicio || 'Sin rol asignado',
        dias: dias
      };
    });

    return NextResponse.json({
      success: true,
      pauta: pautaPorGuardia,
      instalacion_id,
      anio: parseInt(anio),
      mes: parseInt(mes),
      totalGuardias: guardiasResult.rows.length,
      totalRegistros: pautaResult.rows.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo pauta mensual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener la pauta mensual' },
      { status: 500 }
    );
  }
} 