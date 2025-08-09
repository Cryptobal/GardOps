'use client';
import { useEffect, useState } from 'react';

export function useCan(permission: string) {
  const [ok, setOk] = useState<boolean>(false);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch('/api/me/permissions?perm=' + encodeURIComponent(permission), { cache: 'no-store' });
        if (!cancel) setOk(r.ok);
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


