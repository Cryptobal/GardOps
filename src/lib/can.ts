'use client';
import { useEffect, useState } from 'react';

export async function fetchCan(permission: string): Promise<boolean> {
  const r = await fetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' });
  return r.ok;
}

export function useCan(permission: string) {
  const [ok, setOk] = useState<boolean>(false);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const allowed = await fetchCan(permission);
        if (!cancel) setOk(allowed);
      } catch {
        if (!cancel) setOk(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [permission]);
  return ok;
}


