'use client';

import { useCan } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { ReactNode } from 'react';

interface ProtectedPageProps {
  permission: string;
  children: ReactNode;
  moduleName?: string;
}

export default function ProtectedPage({ 
  permission, 
  children, 
  moduleName = 'esta página' 
}: ProtectedPageProps) {
  const { allowed, loading } = useCan(permission);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para acceder a {moduleName}.
            </p>
            <p className="text-sm text-gray-500">
              Permiso requerido: <code>{permission}</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
