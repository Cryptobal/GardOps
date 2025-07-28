'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface AuditResult {
  success: boolean;
  foreignKeys: any[];
  tables: { [key: string]: any[] };
  indexes: any[];
  constraints: any[];
  tableCounts: any[];
  errors: string[];
}

export default function AuditDatabasePage() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        foreignKeys: [],
        tables: {},
        indexes: [],
        constraints: [],
        tableCounts: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔍 Auditoría de Base de Datos</h1>
        <p className="text-gray-600">
          Análisis completo de la estructura actual de la base de datos PostgreSQL en Neon
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Información de Conexión</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Conexión:</strong> {process.env.DATABASE_URL ? 'Configurada ✅' : 'No configurada ❌'}
          </div>
        </div>
        {!process.env.DATABASE_URL && (
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-yellow-800">
              Asegúrate de tener configurada la variable <code>DATABASE_URL</code> en tu archivo <code>.env.local</code>
            </p>
          </div>
        )}
      </Card>

      <div className="mb-6">
        <Button 
          onClick={runAudit} 
          disabled={loading}
          className="w-full h-12 text-lg"
        >
          {loading ? '🔄 Ejecutando Auditoría...' : '🚀 Ejecutar Auditoría de Base de Datos'}
        </Button>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Errores */}
          {result.errors.length > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 mb-3">❌ Errores</h3>
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <div key={index} className="text-red-700 font-mono text-sm">
                    {error}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.success && (
            <>
              {/* Claves Foráneas */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">📋 Relaciones y Claves Foráneas</h3>
                {result.foreignKeys.length === 0 ? (
                  <p className="text-gray-500">❌ No se encontraron claves foráneas</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left">Tabla Origen</th>
                          <th className="border border-gray-300 p-2 text-left">Columna Origen</th>
                          <th className="border border-gray-300 p-2 text-left">Tabla Referenciada</th>
                          <th className="border border-gray-300 p-2 text-left">Columna Referenciada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.foreignKeys.map((fk, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">{fk.tabla_origen}</td>
                            <td className="border border-gray-300 p-2">{fk.columna_origen}</td>
                            <td className="border border-gray-300 p-2">{fk.tabla_referenciada}</td>
                            <td className="border border-gray-300 p-2">{fk.columna_referenciada}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Tablas y Columnas */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">📊 Tablas y Columnas</h3>
                {Object.keys(result.tables).length === 0 ? (
                  <p className="text-gray-500">❌ No se encontraron tablas</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(result.tables).map(([tableName, columns]) => (
                      <div key={tableName} className="border rounded p-4">
                        <h4 className="text-md font-semibold mb-2 text-blue-600">🏷️ {tableName.toUpperCase()}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-2 text-left">Columna</th>
                                <th className="border border-gray-300 p-2 text-left">Tipo</th>
                                <th className="border border-gray-300 p-2 text-left">Nulo</th>
                                <th className="border border-gray-300 p-2 text-left">Default</th>
                              </tr>
                            </thead>
                            <tbody>
                              {columns.map((col, index) => (
                                <tr key={index}>
                                  <td className="border border-gray-300 p-2 font-mono">{col.columna}</td>
                                  <td className="border border-gray-300 p-2">{col.tipo}</td>
                                  <td className="border border-gray-300 p-2">{col.nulo}</td>
                                  <td className="border border-gray-300 p-2 font-mono text-xs">{col.default || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Conteo de Registros */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">📈 Conteo de Registros por Tabla</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left">Tabla</th>
                        <th className="border border-gray-300 p-2 text-right">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tableCounts.map((count, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-2 font-mono">{count.tabla}</td>
                          <td className="border border-gray-300 p-2 text-right font-mono">
                            {count.registros === -1 ? (
                              <span className="text-red-500">Error</span>
                            ) : (
                              count.registros.toLocaleString()
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Índices */}
              {result.indexes.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-3">🔍 Índices</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left">Tabla</th>
                          <th className="border border-gray-300 p-2 text-left">Índice</th>
                          <th className="border border-gray-300 p-2 text-left">Definición</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.indexes.map((idx, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">{idx.tablename}</td>
                            <td className="border border-gray-300 p-2 font-mono">{idx.indexname}</td>
                            <td className="border border-gray-300 p-2 font-mono text-xs">{idx.indexdef}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Constraints */}
              {result.constraints.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-3">⚙️ Constraints</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left">Tabla</th>
                          <th className="border border-gray-300 p-2 text-left">Constraint</th>
                          <th className="border border-gray-300 p-2 text-left">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.constraints.map((constraint, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">{constraint.table_name}</td>
                            <td className="border border-gray-300 p-2 font-mono">{constraint.constraint_name}</td>
                            <td className="border border-gray-300 p-2">{constraint.constraint_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}