'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EstructurasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/payroll/estructuras');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Redirigiendo a Estructuras de Servicio...</p>
      </div>
    </div>
  );
}
