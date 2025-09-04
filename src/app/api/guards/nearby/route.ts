import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Función para calcular distancia usando fórmula de Haversine
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distancia = R * c;
  return distancia;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('installationId');
  const radius = Number(searchParams.get('radius') || 10);

  if (!id) return NextResponse.json({ error: 'installationId requerido' }, { status: 400 });

  try {
    // Primero obtener las coordenadas de la instalación
    const instalacionResult = await query(`
      SELECT latitud, longitud FROM instalaciones WHERE id = $1
    `, [id]);

    if (instalacionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Instalación no encontrada' }, { status: 404 });
    }

    const instalacion = instalacionResult.rows[0];
    const instLat = parseFloat(instalacion.latitud);
    const instLng = parseFloat(instalacion.longitud);

    if (isNaN(instLat) || isNaN(instLng)) {
      return NextResponse.json({ error: 'Coordenadas de instalación inválidas' }, { status: 400 });
    }

    // Obtener todos los guardias con coordenadas
    const guardiasResult = await query(`
      SELECT g.id,
             CONCAT(g.nombre,' ',g.apellido_paterno) AS nombre,
             g.comuna,
             g.latitud, g.longitud
      FROM guardias g
      WHERE g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND g.activo = true
    `);

    // Calcular distancia usando fórmula de Haversine
    const guardiasCercanos = guardiasResult.rows
      .map(guardia => {
        const guardLat = parseFloat(guardia.latitud);
        const guardLng = parseFloat(guardia.longitud);
        
        if (isNaN(guardLat) || isNaN(guardLng)) {
          return null;
        }

        const distancia = calcularDistancia(instLat, instLng, guardLat, guardLng);
        
        if (distancia <= radius) {
          return {
            id: guardia.id,
            nombre: guardia.nombre,
            comuna: guardia.comuna,
            lat: guardLat,
            lng: guardLng,
            distancia: distancia
          };
        }
        return null;
      })
      .filter(guardia => guardia !== null)
      .sort((a, b) => a.distancia - b.distancia);

    return NextResponse.json(guardiasCercanos);
  } catch (error) {
    console.error('Error en nearby guards:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 