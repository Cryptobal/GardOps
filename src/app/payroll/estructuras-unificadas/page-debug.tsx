'use client';

import { useCan } from '@/lib/permissions';
import { useEffect, useState } from 'react';

export default function EstructurasUnificadasDebugPage() {
  const { allowed, loading, error } = useCan('payroll.view');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Verificar permisos directamente
    const checkPermissions = async () => {
      try {
        const response = await fetch('/api/rbac/can?perm=payroll.view');
        const data = await response.json();
        setDebugInfo({
          apiResponse: data,
          hookAllowed: allowed,
          hookLoading: loading,
          hookError: error,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        setDebugInfo({
          apiError: err,
          hookAllowed: allowed,
          hookLoading: loading,
          hookError: error,
          timestamp: new Date().toISOString()
        });
      }
    };

    checkPermissions();
  }, [allowed, loading, error]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center">
          <h2 className="text-lg font-semibold mb-4">🔄 Cargando permisos...</h2>
          <p>Estado del hook: {loading ? 'Cargando' : 'Completado'}</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-red-600">
          <h2 className="text-lg font-semibold mb-4">❌ Acceso Denegado</h2>
          <p>El hook useCan('payroll.view') retornó: {String(allowed)}</p>
          {error && <p className="text-sm text-red-500">Error: {error}</p>}
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">✅ Acceso Permitido</h2>
        <p>El hook useCan('payroll.view') retornó: {String(allowed)}</p>
        
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
