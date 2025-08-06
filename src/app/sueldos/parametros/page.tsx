'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  X
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
  const [dbInitialized, setDbInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    checkDbStatus();
    cargarParametros();
  }, []);

  const checkDbStatus = async () => {
    try {
      const response = await fetch('/api/sueldos/init-db');
      const result = await response.json();
      
      // Verificar si alguna tabla no existe o está vacía
      const needsInit = Object.values(result.status || {}).some(
        (table: any) => !table.exists || table.count === 0
      );
      
      setDbInitialized(!needsInit);
    } catch (error) {
      console.error('Error verificando DB:', error);
      setDbInitialized(false);
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/sueldos/init-db', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Base de datos inicializada correctamente');
        setDbInitialized(true);
        await cargarParametros();
      } else {
        setError(result.message || 'Error al inicializar la base de datos');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarParametros = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sueldos/parametros?tipo=all');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError('Error al cargar parámetros');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
      console.error('Error:', error);
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
      const newItems = { ...prev };
      delete newItems[key];
      return newItems;
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
    const editingItem = editingItems[key];
    
    if (!editingItem) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const dataToSend = {
        tipo,
        data: {
          id,
          [field]: editingItem.tempValue
        }
      };
      
      const response = await fetch('/api/sueldos/parametros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (response.ok) {
        setSuccess('Parámetro actualizado correctamente');
        await cargarParametros();
        cancelEditing(tipo, id);
      } else {
        setError('Error al actualizar parámetro');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
      console.error('Error:', error);
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
    return editingItems[key]?.tempValue;
  };

  if (dbInitialized === false) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6 text-yellow-500" />
              Inicialización de Base de Datos Requerida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Las tablas de parámetros no están inicializadas. Haga clic en el botón para crear e inicializar las tablas con los valores por defecto.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={initializeDatabase}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Inicializando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Inicializar Base de Datos
                </>
              )}
            </Button>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sueldos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Parámetros del Sistema
          </h1>
        </div>
        <Button onClick={cargarParametros} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="parametros">Generales</TabsTrigger>
          <TabsTrigger value="uf">Valores UF</TabsTrigger>
          <TabsTrigger value="afp">AFP</TabsTrigger>
          <TabsTrigger value="isapre">ISAPRE</TabsTrigger>
          <TabsTrigger value="mutualidad">Mutualidad</TabsTrigger>
          <TabsTrigger value="impuesto">Impuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="parametros">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.parametros.map((param: any) => (
                  <div key={param.id} className="grid grid-cols-3 gap-4 items-center p-2 hover:bg-gray-50 rounded">
                    <div>
                      <Label className="text-sm font-medium">{param.parametro}</Label>
                      <p className="text-xs text-gray-500">{param.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing('parametro', param.id) ? (
                        <Input
                          type="number"
                          value={getTempValue('parametro', param.id)}
                          onChange={(e) => updateTempValue('parametro', param.id, e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        <span className="font-mono">{param.valor}</span>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      {isEditing('parametro', param.id) ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => saveItem('parametro', param.id, 'valor')}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEditing('parametro', param.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing('parametro', param.id, param.valor)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uf">
          <Card>
            <CardHeader>
              <CardTitle>Valores UF por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {data.uf.map((uf: any) => (
                  <div key={uf.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label className="text-sm">
                        {new Date(uf.fecha).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing('uf', uf.id) ? (
                        <>
                          <Input
                            type="number"
                            value={getTempValue('uf', uf.id)}
                            onChange={(e) => updateTempValue('uf', uf.id, e.target.value)}
                            className="w-24"
                            step="0.01"
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => saveItem('uf', uf.id, 'valor')}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEditing('uf', uf.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-semibold">
                            {formatearCLP(uf.valor)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing('uf', uf.id, uf.valor)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="afp">
          <Card>
            <CardHeader>
              <CardTitle>Administradoras de Fondos de Pensiones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 font-semibold border-b pb-2">
                  <div>Código</div>
                  <div>Nombre</div>
                  <div>Comisión (%)</div>
                  <div>Acciones</div>
                </div>
                {data.afp.map((afp: any) => (
                  <div key={afp.id} className="grid grid-cols-4 gap-4 items-center">
                    <div className="font-mono text-sm">{afp.codigo}</div>
                    <div>{afp.nombre}</div>
                    <div className="flex items-center gap-2">
                      {isEditing('afp', afp.id) ? (
                        <Input
                          type="number"
                          value={getTempValue('afp', afp.id)}
                          onChange={(e) => updateTempValue('afp', afp.id, e.target.value)}
                          className="w-20"
                          step="0.01"
                        />
                      ) : (
                        <span className="font-mono">{afp.comision}%</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isEditing('afp', afp.id) ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => saveItem('afp', afp.id, 'comision')}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEditing('afp', afp.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing('afp', afp.id, afp.comision)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="isapre">
          <Card>
            <CardHeader>
              <CardTitle>Instituciones de Salud Previsional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-semibold border-b pb-2">
                  <div>Código</div>
                  <div>Nombre</div>
                  <div>Estado</div>
                </div>
                {data.isapre.map((isapre: any) => (
                  <div key={isapre.id} className="grid grid-cols-3 gap-4 items-center">
                    <div className="font-mono text-sm">{isapre.codigo}</div>
                    <div>{isapre.nombre}</div>
                    <div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        isapre.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isapre.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mutualidad">
          <Card>
            <CardHeader>
              <CardTitle>Mutualidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 font-semibold border-b pb-2">
                  <div>Código</div>
                  <div>Nombre</div>
                  <div>Tasa Base (%)</div>
                  <div>Tasa Adicional (%)</div>
                  <div>Acciones</div>
                </div>
                {data.mutualidad.map((mut: any) => (
                  <div key={mut.id} className="grid grid-cols-5 gap-4 items-center">
                    <div className="font-mono text-sm">{mut.codigo}</div>
                    <div>{mut.nombre}</div>
                    <div className="flex items-center gap-2">
                      {isEditing(`mut-base`, mut.id) ? (
                        <Input
                          type="number"
                          value={getTempValue(`mut-base`, mut.id)}
                          onChange={(e) => updateTempValue(`mut-base`, mut.id, e.target.value)}
                          className="w-20"
                          step="0.01"
                        />
                      ) : (
                        <span className="font-mono">{mut.tasa_base}%</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono">{mut.tasa_adicional || 0}%</span>
                    </div>
                    <div className="flex gap-2">
                      {isEditing(`mut-base`, mut.id) ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => saveItem('mutualidad', mut.id, 'tasa_base')}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEditing(`mut-base`, mut.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(`mut-base`, mut.id, mut.tasa_base)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impuesto">
          <Card>
            <CardHeader>
              <CardTitle>Tramos de Impuesto Único</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4 font-semibold border-b pb-2 text-sm">
                  <div>Tramo</div>
                  <div>Desde</div>
                  <div>Hasta</div>
                  <div>Factor (%)</div>
                  <div>Rebaja</div>
                </div>
                {data.impuesto.map((tramo: any) => (
                  <div key={tramo.id} className="grid grid-cols-5 gap-4 items-center text-sm">
                    <div className="font-semibold">Tramo {tramo.tramo}</div>
                    <div className="font-mono">{formatearCLP(tramo.desde)}</div>
                    <div className="font-mono">
                      {tramo.hasta ? formatearCLP(tramo.hasta) : 'Sin límite'}
                    </div>
                    <div className="font-mono">{(tramo.factor * 100).toFixed(1)}%</div>
                    <div className="font-mono">{formatearCLP(tramo.rebaja)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
