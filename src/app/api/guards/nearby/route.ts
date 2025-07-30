import { NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('installationId');
  const radius = Number(searchParams.get('radius') || 10);

  if (!id) return NextResponse.json({ error: 'installationId requerido' }, { status: 400 });

  /* Haversine simplified */
  const guards = await sql/*sql*/`
    SELECT g.id,
           CONCAT(g.nombre,' ',g.apellido_paterno)   AS nombre,
           c.nombre                                   AS comuna,
           g.lat, g.lng,
           ST_DistanceSphere(                           -- metros
             ST_MakePoint(g.lng, g.lat),
             (SELECT ST_MakePoint(i.lng, i.lat) FROM instalaciones i WHERE i.id = ${id})
           )/1000                                     AS distancia
    FROM guardias g
    JOIN comunas c ON c.id = g.comuna_id
    WHERE g.lat IS NOT NULL
      AND ST_DistanceSphere(
            ST_MakePoint(g.lng, g.lat),
            (SELECT ST_MakePoint(i.lng, i.lat) FROM instalaciones i WHERE i.id = ${id})
          ) <= ${radius * 1000}
    ORDER BY distancia;
  `;

  return NextResponse.json(guards);
} 