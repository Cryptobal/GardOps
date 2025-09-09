/* server-only */
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import pool from '@/lib/database';

export async function getFlags(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/flags`, {
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { flags?: Record<string, boolean> };
    return data.flags ?? {};
  } catch {
    return {};
  }
}

// Helper server-side - Lee directo de BD sin caché
export async function isFlagEnabled(code: string): Promise<boolean> {
  noStore(); // Evita caching
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT enabled FROM app_feature_flags WHERE code = $1 LIMIT 1',
        [code]
      );
      return rows?.[0]?.enabled === true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error leyendo flag ${code}:`, error);
    return false;
  }
}


