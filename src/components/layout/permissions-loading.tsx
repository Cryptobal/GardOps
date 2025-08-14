'use client';

import { usePermissionsContext } from '@/lib/permissions-context';

interface PermissionsLoadingProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionsLoading({ children, fallback }: PermissionsLoadingProps) {
  const { loading, initialized } = usePermissionsContext();

  // Si ya está inicializado, mostrar el contenido
  if (initialized) {
    return <>{children}</>;
  }

  // Si está cargando, mostrar el fallback o un loading por defecto
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-sm text-muted-foreground">
            Cargando permisos...
          </div>
        </div>
      </div>
    );
  }

  // Si no está cargando ni inicializado, mostrar el contenido (fallback)
  return <>{children}</>;
}
