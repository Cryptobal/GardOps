'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import Link from 'next/link';

export default function MigrarParametrosPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutarMigracion = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/sueldos/migrar-parametros', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.details || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Link href="/payroll/parametros">
              <Button variant="outline" size="sm" className="p-2">
                ← Volver
              </Button>
            </Link>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                Migración de Parámetros
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Actualizar sistema de parámetros con versionado mensual
              </p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Migración de Parámetros de Sueldos
            </CardTitle>
            <CardDescription>
              Ejecuta la migración para actualizar las tablas de parámetros con versionado mensual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Cambios que se realizarán:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Agregar campo periodo a todas las tablas existentes</li>
                <li>Crear tabla sueldo_asignacion_familiar</li>
                <li>Migrar datos existentes al período 2025-08</li>
                <li>Insertar 17 parámetros generales faltantes</li>
                <li>Insertar 3 AFPs nuevas (EMPART, INP_SSS, CADDEMED)</li>
                <li>Actualizar tramos de impuesto con valores de 2025-08</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Importante:</strong> Esta migración modificará la estructura de las tablas existentes. 
                  Asegúrate de tener un respaldo antes de continuar.
                </div>
              </div>
            </div>

            <Button 
              onClick={ejecutarMigracion} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ejecutando migración...
                </>
              ) : (
                'Ejecutar Migración'
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Migración completada exitosamente!</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {result.cambios?.map((cambio: string, index: number) => (
                      <li key={index} className="text-sm">{cambio}</li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <Link href="/payroll/parametros">
                      <Button size="sm">
                        Ir a Parámetros
                      </Button>
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
