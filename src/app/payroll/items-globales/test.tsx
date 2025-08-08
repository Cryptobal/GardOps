'use client';

import { useState, useEffect } from 'react';
import { SueldoItem } from '@/lib/schemas/sueldo-item';

export default function TestItemsGlobales() {
  const [items, setItems] = useState<SueldoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/payroll/items');
        const result = await response.json();

        if (result.success) {
          setItems(result.data);
        } else {
          setError(result.error || 'Error al cargar ítems');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test - Ítems Globales</h1>
      <div className="mb-4">
        <p>Total de ítems: {items.length}</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border p-3 rounded">
            <div className="font-medium">{item.nombre}</div>
            <div className="text-sm text-gray-600">Código: {item.codigo}</div>
            <div className="text-sm">
              Clase: {item.clase} | Naturaleza: {item.naturaleza}
            </div>
            <div className="text-sm">
              Tope: {item.tope_modo} {item.tope_valor ? `(${item.tope_valor})` : ''}
            </div>
            <div className="text-sm">
              Estado: {item.activo ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
