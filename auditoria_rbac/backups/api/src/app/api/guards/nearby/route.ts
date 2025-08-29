import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('installationId');
  const radius = Number(searchParams.get('radius') || 10);

  if (!id) return NextResponse.json({ error: 'installationId requerido' }, { status: 400 });

  try {
    /* Haversine simplified */
    const result = await query(`
      SELECT g.id,
             CONCAT(g.nombre,' ',g.apellido_paterno)   AS nombre,
             g.comuna,
             g.latitud, g.longitud,
             ST_DistanceSphere(                           -- metros
               ST_MakePoint(g.longitud, g.latitud),
               (SELECT ST_MakePoint(i.longitud, i.latitud) FROM instalaciones i WHERE i.id = $1)
             )/1000                                     AS distancia
      FROM guardias g
      WHERE g.latitud IS NOT NULL
        AND ST_DistanceSphere(
              ST_MakePoint(g.longitud, g.latitud),
              (SELECT ST_MakePoint(i.longitud, i.latitud) FROM instalaciones i WHERE i.id = $1)
            ) <= $2
      ORDER BY distancia
    `, [id, radius * 1000]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error en nearby guards:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 