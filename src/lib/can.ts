'use client';
import { useEffect, useState } from 'react';

export async function fetchCan(permission: string): Promise<boolean> {
  const r = await fetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' });
  return r.ok;
}

export function useCan(permission: string): { allowed: boolean; loading: boolean } {
  const [ok, setOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const allowed = await fetchCan(permission);
        if (!cancel) {
          setOk(allowed);
          setLoading(false);
        }
      } catch {
        if (!cancel) {
          setOk(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [permission]);
  
  return { allowed: ok ?? false, loading };
}


