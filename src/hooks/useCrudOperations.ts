import { useState, useCallback } from 'react';

export interface CrudState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  success: string | null;
}

export interface CrudActions<T> {
  create: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string, item: Partial<T>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export interface ApiService<T> {
  getAll: () => Promise<T[]>;
  create: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, item: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

export const useCrudOperations = <T extends { id: string }>(
  apiService: ApiService<T>,
  initialData: T[] = []
): CrudState<T> & CrudActions<T> => {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await apiService.getAll();
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    try {
      setLoading(true);
      setError(null);
      const newItem = await apiService.create(item);
      setData(prev => [...prev, newItem]);
      setSuccess('Elemento creado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const update = useCallback(async (id: string, item: Partial<T>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedItem = await apiService.update(id, item);
      setData(prev => prev.map(existing => 
        existing.id === id ? updatedItem : existing
      ));
      setSuccess('Elemento actualizado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.delete(id);
      setData(prev => prev.filter(item => item.id !== id));
      setSuccess('Elemento eliminado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  return {
    // Estados
    data,
    loading,
    error,
    success,
    
    // Acciones
    create,
    update,
    delete: deleteItem,
    refresh,
    clearError,
    clearSuccess,
  };
}; 