'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

interface TableInfo {
  name: string;
  exists: boolean;
  idType: string;
  rowCount: number;
}

export default function DatabaseStatusPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const checkDatabaseStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database-status');
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Estado de la Base de Datos</h1>
        <p className="text-gray-600">
          Consulta el estado actual de las tablas en PostgreSQL
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">🗄️ Tablas del Sistema</h2>
          <Button onClick={checkDatabaseStatus} disabled={loading}>
            {loading ? '⏳ Consultando...' : '🔄 Actualizar'}
          </Button>
        </div>

        <div className="space-y-4">
          {tables.map((table, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{table.name}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  table.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {table.exists ? '✅ Existe' : '❌ No existe'}
                </span>
              </div>
              
              {table.exists && (
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Tipo de ID:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      table.idType === 'uuid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {table.idType}
                    </span>
                  </div>
                  <div>
                    <strong>Filas:</strong> 
                    <span className="ml-2 font-mono">{table.rowCount}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Próximos Pasos</h2>
        <div className="space-y-2 text-sm">
          <p>• Si las tablas no tienen UUID, ejecuta las migraciones para corregirlas</p>
          <p>• Las tablas con datos se preservarán automáticamente</p>
          <p>• Visita <code>/test-migration</code> para ejecutar las migraciones</p>
        </div>
      </Card>
    </div>
  );
} 