"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BackToSecurity from "@/components/BackToSecurity";
import { useCan } from "@/lib/permissions";

export default function MigratePage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addToast: toast } = useToast();
  const { allowed: isPlatformAdmin } = useCan('rbac.platform_admin');

  const handleMigrate = async () => {
    if (!confirm('¿Estás seguro? Esto migrará TODA la data al tenant Gard y eliminará tenants vacíos.')) {
      return;
    }

    setMigrating(true);
    try {
      const response = await fetch('/api/admin/migrate-to-gard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setResult(data);
        toast({ 
          title: '✅ Migración exitosa', 
          description: 'Toda la data ha sido migrada al tenant Gard', 
          type: 'success' 
        });
      } else {
        throw new Error(data.error || 'Error en migración');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({ 
        title: '❌ Error', 
        description: error.message || 'Error en migración', 
        type: 'error' 
      });
    } finally {
      setMigrating(false);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground mt-1">No tienes permisos para ejecutar migraciones.</p>
          <BackToSecurity />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <BackToSecurity />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">🚀 Migración a Tenant Gard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Importante</h3>
              <p className="text-sm text-yellow-700">
                Esta migración hará lo siguiente:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• Migrar TODOS los clientes sin tenant_id → Gard</li>
                <li>• Migrar TODAS las instalaciones sin tenant_id → Gard</li>
                <li>• Migrar TODOS los guardias sin tenant_id → Gard</li>
                <li>• Migrar guardias de "GardOps" → Gard</li>
                <li>• Asignar Carlos.Irigoyen@gard.cl al tenant Gard</li>
                <li>• Eliminar tenants vacíos (Prueba Tenant, Pruyeba, Empresa Demo, GardOps)</li>
                <li>• Crear "Tenant Demo" para pruebas</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleMigrate} 
              disabled={migrating}
              className="w-full"
              variant="destructive"
            >
              {migrating ? '🔄 Migrando...' : '🚀 Ejecutar Migración'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Resultado de la Migración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Clientes migrados:</strong> {result.summary.clientesMigrados}
                </div>
                <div>
                  <strong>Instalaciones migradas:</strong> {result.summary.instalacionesMigradas}
                </div>
                <div>
                  <strong>Guardias migrados:</strong> {result.summary.guardiasMigrados}
                </div>
                <div>
                  <strong>Guardias de GardOps:</strong> {result.summary.guardiasGardOps}
                </div>
                <div>
                  <strong>Carlos actualizado:</strong> {result.summary.carlosActualizado ? 'Sí' : 'No'}
                </div>
                <div>
                  <strong>Tenants eliminados:</strong> {result.summary.tenantsEliminados}
                </div>
                <div>
                  <strong>Admin demo creado:</strong> {result.summary.demoAdminCreado ? 'Sí' : 'No'}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Tenants Finales:</h4>
                <div className="space-y-2">
                  {result.finalTenants.map((tenant: any) => (
                    <div key={tenant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{tenant.nombre}</span>
                      <span className="text-sm text-gray-600">
                        Clientes: {tenant.clientes} | Instalaciones: {tenant.instalaciones} | Guardias: {tenant.guardias}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">✅ Migración Completada</h4>
                <p className="text-sm text-green-700">
                  Ahora el selector de tenant debería mostrar solo "Gard" y "Tenant Demo". 
                  Carlos.Irigoyen@gard.cl es Super Admin del tenant Gard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
