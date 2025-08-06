'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  DollarSign, 
  Building2, 
  Percent,
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowLeft,
  Check,
  Edit,
  X,
  TrendingUp,
  Shield,
  Users,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import { formatearCLP } from '@/lib/sueldo/utils/redondeo';

interface ParametroEditable {
  id: number;
  isEditing: boolean;
  tempValue: string | number;
}

export default function ParametrosPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('parametros');
  const [data, setData] = useState<any>({
    uf: [],
    parametros: [],
    afp: [],
    isapre: [],
    mutualidad: [],
    impuesto: []
  });
  const [editingItems, setEditingItems] = useState<{ [key: string]: ParametroEditable }>({});

  useEffect(() => {
    cargarParametros();
  }, []);

  const cargarParametros = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Cargando parámetros...');
      const response = await fetch('/api/sueldos/parametros?tipo=all');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Result:', result);
      
      if (result.success) {
        setData(result.data);
        console.log('Datos cargados:', result.data);
      } else {
        setError('Error al cargar parámetros');
      }
    } catch (error) {
      console.error('Error cargando parámetros:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (tipo: string, id: number, currentValue: any) => {
    const key = `${tipo}-${id}`;
    setEditingItems(prev => ({
      ...prev,
      [key]: {
        id,
        isEditing: true,
        tempValue: currentValue
      }
    }));
  };

  const cancelEditing = (tipo: string, id: number) => {
    const key = `${tipo}-${id}`;
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const updateTempValue = (tipo: string, id: number, value: any) => {
    const key = `${tipo}-${id}`;
    setEditingItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        tempValue: value
      }
    }));
  };

  const saveItem = async (tipo: string, id: number, field: string) => {
    const key = `${tipo}-${id}`;
    const item = editingItems[key];
    if (!item) return;

    setSaving(true);
    try {
      const response = await fetch('/api/sueldos/parametros', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          id,
          campo: field,
          valor: item.tempValue
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Actualizar datos locales
        setData(prev => ({
          ...prev,
          [tipo]: prev[tipo].map((item: any) => 
            item.id === id ? { ...item, [field]: item.tempValue } : item
          )
        }));
        
        // Limpiar estado de edición
        cancelEditing(tipo, id);
        setSuccess('Parámetro actualizado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Error al actualizar parámetro');
      }
    } catch (error) {
      console.error('Error guardando:', error);
      setError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = (tipo: string, id: number) => {
    const key = `${tipo}-${id}`;
    return editingItems[key]?.isEditing || false;
  };

  const getTempValue = (tipo: string, id: number) => {
    const key = `${tipo}-${id}`;
    return editingItems[key]?.tempValue || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/sueldos">
                <Button variant="outline" size="sm" className="p-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Parámetros del Sistema
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Configuración de valores para el cálculo de sueldos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                Sistema
              </Badge>
              <Button 
                onClick={cargarParametros} 
                disabled={loading}
                variant="outline" 
                size="sm"
                className="hidden sm:flex"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Contenido Principal */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-blue-600" />
              Configuración de Parámetros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="parametros">Generales</TabsTrigger>
                <TabsTrigger value="uf">Valor UF</TabsTrigger>
                <TabsTrigger value="afp">AFP</TabsTrigger>
                <TabsTrigger value="impuesto">Impuestos</TabsTrigger>
              </TabsList>

              {/* Parámetros Generales */}
              <TabsContent value="parametros" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <Settings className="h-4 w-4" />
                    Parámetros Generales del Sistema
                  </div>
                  
                  {data.parametros?.map((param: any) => (
                    <div key={param.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {param.nombre}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {param.descripcion}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isEditing('parametros', param.id) ? (
                          <>
                            <Input
                              type="number"
                              value={getTempValue('parametros', param.id)}
                              onChange={(e) => updateTempValue('parametros', param.id, Number(e.target.value))}
                              className="w-24 h-8"
                            />
                            <Button
                              size="sm"
                              onClick={() => saveItem('parametros', param.id, 'valor')}
                              disabled={saving}
                              className="h-8 px-2"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelEditing('parametros', param.id)}
                              className="h-8 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {param.valor}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing('parametros', param.id, param.valor)}
                              className="h-8 px-2"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Valor UF */}
              <TabsContent value="uf" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <DollarSign className="h-4 w-4" />
                    Valores UF por Fecha
                  </div>
                  
                  <div className="grid gap-4">
                    {data.uf?.slice(0, 10).map((uf: any) => (
                      <div key={uf.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {new Date(uf.fecha).toLocaleDateString('es-CL')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('uf', uf.id) ? (
                            <>
                              <Input
                                type="number"
                                value={getTempValue('uf', uf.id)}
                                onChange={(e) => updateTempValue('uf', uf.id, Number(e.target.value))}
                                className="w-24 h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveItem('uf', uf.id, 'valor')}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing('uf', uf.id)}
                                className="h-8 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {formatearCLP(uf.valor)}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing('uf', uf.id, uf.valor)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* AFP */}
              <TabsContent value="afp" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <Building2 className="h-4 w-4" />
                    Configuración AFP
                  </div>
                  
                  <div className="grid gap-4">
                    {data.afp?.map((afp: any) => (
                      <div key={afp.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {afp.nombre}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Tasa: {afp.tasa}%
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('afp', afp.id) ? (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                value={getTempValue('afp', afp.id)}
                                onChange={(e) => updateTempValue('afp', afp.id, Number(e.target.value))}
                                className="w-24 h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveItem('afp', afp.id, 'tasa')}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing('afp', afp.id)}
                                className="h-8 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {afp.tasa}%
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing('afp', afp.id, afp.tasa)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Impuestos */}
              <TabsContent value="impuesto" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    <Percent className="h-4 w-4" />
                    Configuración de Impuestos
                  </div>
                  
                  <div className="grid gap-4">
                    {data.impuesto?.map((imp: any) => (
                      <div key={imp.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            Tramo {imp.tramo}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Desde: {formatearCLP(imp.desde)} - Hasta: {formatearCLP(imp.hasta)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('impuesto', imp.id) ? (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                value={getTempValue('impuesto', imp.id)}
                                onChange={(e) => updateTempValue('impuesto', imp.id, Number(e.target.value))}
                                className="w-24 h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveItem('impuesto', imp.id, 'factor')}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing('impuesto', imp.id)}
                                className="h-8 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {(imp.factor * 100).toFixed(2)}%
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing('impuesto', imp.id, imp.factor)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
