import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Forzar respuesta dinámica (sin cache) para reflejar flags inmediatamente
export const dynamic = 'force-dynamic';

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'flags', action: 'read:list' });
if (deny) return deny;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
          SELECT code, enabled
          FROM app_v_flags
        `
      );

      const flags: Record<string, boolean> = {};
      for (const row of result.rows as Array<{ code: string; enabled: boolean }>) {
        if (row && typeof row.code === 'string') {
          flags[row.code] = Boolean(row.enabled);
        }
      }

      return NextResponse.json({ flags });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error obteniendo feature flags:', error);
    return NextResponse.json(
      {
        error: 'Error obteniendo feature flags',
      },
      { status: 500 }
    );
  }
}


