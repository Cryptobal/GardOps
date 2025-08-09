/* server-only */
import 'server-only';

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

// Helper server-side
export async function isFlagEnabled(code: string): Promise<boolean> {
  const flags = await getFlags();
  return Boolean(flags[code]);
}


