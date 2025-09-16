import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Forzar respuesta dinámica (sin cache) para reflejar flags inmediatamente
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT code, enabled
      FROM app_v_flags
    `;

    const flags: Record<string, boolean> = {};
    for (const row of rows as Array<{ code: string; enabled: boolean }>) {
      if (row && typeof row.code === 'string') {
        flags[row.code] = Boolean(row.enabled);
      }
    }

    return NextResponse.json({ flags });
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


