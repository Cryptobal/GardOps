'use client';

import React from 'react';
import { usePermissionsContext } from '@/lib/permissions-context';

interface PermissionsLoadingProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionsLoading({ children, fallback }: PermissionsLoadingProps) {
  const { loading, initialized } = usePermissionsContext();
  const [timeout, setTimeout] = React.useState(false);

  // Timeout de 10 segundos para evitar que se quede colgado
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimeout(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Si ya está inicializado o ha pasado el timeout, mostrar el contenido
  if (initialized || timeout) {
    return <>{children}</>;
  }

  // Si está cargando, mostrar el fallback o un loading por defecto
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-sm text-muted-foreground">
            {timeout ? 'Cargando...' : 'Cargando permisos...'}
          </div>
        </div>
      </div>
    );
  }

  // Si no está cargando ni inicializado, mostrar el contenido (fallback)
  return <>{children}</>;
}
