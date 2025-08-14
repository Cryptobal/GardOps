import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import { registrarPermiso, registrarFiniquito, obtenerPermisos } from '@/lib/db/permisos';

export async function POST(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'read:list' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'create' });
if (deny) return deny;

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
    console.error('Error al registrar permiso/finiquito:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'read:list' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias', action: 'create' });
if (deny) return deny;

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
    console.error('Error al obtener permisos:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
} 