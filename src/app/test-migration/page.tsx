'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface MigrationResult {
  success: boolean;
  message: string;
  warnings: string[];
  errors: string[];
}

export default function TestMigrationPage() {
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Error de conexión',
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🗄️ Test de Migraciones de Base de Datos</h1>
        <p className="text-gray-600">
          Verifica y corrige el esquema de la base de datos PostgreSQL de GardOps
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎯 ¿Qué hace esta migración?</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ Verifica conexión a PostgreSQL</li>
          <li>✅ Valida que las tablas <code>tenants</code>, <code>instalaciones</code> y <code>roles_servicio</code> tengan campo <code>id UUID</code></li>
          <li>✅ Corrige la tabla <code>guardias</code> para usar UUID (preserva datos existentes)</li>
          <li>✅ Crea la tabla <code>pautas_mensuales</code> con esquema optimizado para multitenencia</li>
          <li>✅ Crea la tabla <code>pautas_diarias</code> para gestión operativa y control de asistencia</li>
          <li>✅ Crea la tabla <code>puestos_por_cubrir</code> para gestión de PPC operativos</li>
          <li>✅ Crea la tabla <code>turnos_extras</code> para turnos adicionales y coberturas</li>
          <li>✅ Agrega índices eficientes para búsquedas por tenant, guardia, fecha, estado y tipos</li>
        </ul>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🚀 Ejecutar Migración</h2>
        <p className="text-sm text-gray-600 mb-4">
          Esta operación es segura: no eliminará datos sin advertir previamente.
        </p>
        
        <Button 
          onClick={runMigration} 
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? '⏳ Ejecutando...' : '🚀 Ejecutar Migraciones'}
        </Button>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {result.success ? '✅ Resultado' : '❌ Resultado'}
          </h2>
          
          <div className={`p-4 rounded mb-4 ${
            result.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`font-medium ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </p>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-orange-800 mb-2">⚠️ Advertencias:</h3>
              <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                {result.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-orange-700 font-mono">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Errores:</h3>
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700 font-mono">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">📋 Configuración de Base de Datos</h2>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm font-mono text-gray-700">
            <strong>Conexión:</strong> {process.env.DATABASE_URL ? 'Configurada ✅' : 'No configurada ❌'}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Asegúrate de tener configurada la variable <code>DATABASE_URL</code> en tu archivo <code>.env.local</code>
          </p>
        </div>
      </Card>
    </div>
  );
} 