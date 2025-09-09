import { NextResponse } from 'next/server';
import { registrarPermiso, registrarFiniquito, obtenerPermisos } from '@/lib/db/permisos';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(req: Request) {
  const body = await req.json();

  if (!body || !body.tipo || !body.guardiaId) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  try {
    if (body.tipo === 'finiquito') {
      const cantidad = await registrarFiniquito({
        guardiaId: body.guardiaId,
        fecha_termino: body.fecha,
      });
      return NextResponse.json({ ok: true, generado: cantidad });
    }

    const cantidad = await registrarPermiso({
      guardiaId: body.guardiaId,
      tipo: body.tipo,
      desde: body.desde,
      hasta: body.hasta,
      observaciones: body.observaciones,
    });

    return NextResponse.json({ ok: true, actualizado: cantidad });
  } catch (err) {
    logger.error('Error al registrar permiso/finiquito::', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const guardiaId = searchParams.get('guardiaId');
  const tipo = searchParams.get('tipo') || undefined;

  if (!guardiaId) {
    return NextResponse.json({ error: 'guardiaId requerido' }, { status: 400 });
  }

  try {
    const permisos = await obtenerPermisos({ guardiaId, tipo });
    return NextResponse.json({ ok: true, data: permisos });
  } catch (err) {
    logger.error('Error al obtener permisos::', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
} 