/* server-only */
import 'server-only';

export async function getFlags(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/flags`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { flags?: Record<string, boolean> };
    return data.flags ?? {};
  } catch {
    return {};
  }
}

// Cliente: hook ligero sin SWR (evitamos nueva dep). Usa fetch y estado.
import { useEffect, useMemo, useState } from 'react';

export function useFlag(code: string): boolean {
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/flags', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { flags?: Record<string, boolean> };
        if (!cancelled) setFlags(data.flags ?? {});
      } catch {
        if (!cancelled) setFlags({});
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return useMemo(() => {
    if (!flags) return false;
    return Boolean(flags[code]);
  }, [flags, code]);
}

// Helper server-side
export async function isFlagEnabled(code: string): Promise<boolean> {
  const flags = await getFlags();
  return Boolean(flags[code]);
}


