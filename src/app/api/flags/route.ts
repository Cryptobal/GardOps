import { requireAuthz } from '@/lib/authz-api'
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/database';

// Forzar respuesta dinámica (sin cache) para reflejar flags inmediatamente
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Permitir flags aun si falla autorización, para no romper UI
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'configuracion', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

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


