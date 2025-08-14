'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Calculator,
  Plus,
  Trash2,
  Copy,
  FileText,
  Download,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { formatearCLP } from '@/lib/sueldo/utils/redondeo';

interface ParametroEditable {
  id: number | string;
  isEditing: boolean;
  tempValue: string | number;
}

interface NuevoParametro {
  tipo: string;
  data: any;
}

export default function ParametrosPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('parametros');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-08');
  const [periodosDisponibles, setPeriodosDisponibles] = useState<string[]>([]);
  const [data, setData] = useState<any>({
    parametros: [],
    afp: [],
    impuesto: [],
    asignacionFamiliar: []
  });
  const [editingItems, setEditingItems] = useState<{ [key: string]: ParametroEditable }>({});
  const [showAddForm, setShowAddForm] = useState<{ [key: string]: boolean }>({});
  const [newItem, setNewItem] = useState<NuevoParametro>({ tipo: '', data: {} });

  useEffect(() => {
    cargarPeriodos();
  }, []);

  useEffect(() => {
    if (periodoSeleccionado) {
      cargarParametros();
    }
  }, [periodoSeleccionado]);

  const cargarPeriodos = async () => {
    try {
      const response = await fetch('/api/sueldos/parametros/periodos');
      const result = await response.json();
      
      if (result.success) {
        setPeriodosDisponibles(result.periodos);
        if (result.periodos.length > 0 && !result.periodos.includes(periodoSeleccionado)) {
          setPeriodoSeleccionado(result.periodos[0]);
        }
      }
    } catch (error) {
      console.error('Error cargando períodos:', error);
    }
  };

  const cargarParametros = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/sueldos/parametros?periodo=${periodoSeleccionado}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
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

  const copiarPeriodo = async () => {
    const nuevoPeriodo = prompt('Ingrese el nuevo período (formato: YYYY-MM):');
    if (!nuevoPeriodo || !/^\d{4}-\d{2}$/.test(nuevoPeriodo)) {
      setError('Formato de período inválido. Use YYYY-MM');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/sueldos/parametros/copiar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origen: periodoSeleccionado,
          destino: nuevoPeriodo
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await cargarPeriodos();
        setPeriodoSeleccionado(nuevoPeriodo);
        setSuccess('Período copiado exitosamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Error al copiar período');
      }
    } catch (error) {
      console.error('Error copiando período:', error);
      setError('Error al copiar período');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (tipo: string, id: number | string, currentValue: any) => {
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

  const cancelEditing = (tipo: string, id: number | string) => {
    const key = `${tipo}-${id}`;
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const updateTempValue = (tipo: string, id: number | string, value: any) => {
    const key = `${tipo}-${id}`;
    setEditingItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        tempValue: value
      }
    }));
  };

  const saveItem = async (tipo: string, id: number | string, field: string) => {
    const key = `${tipo}-${id}`;
    const item = editingItems[key];
    if (!item) return;

    setSaving(true);
    try {
      const body: any = {
        tipo,
        campo: field,
        valor: item.tempValue,
        periodo: periodoSeleccionado
      };

      // Para valores de UF, usar fecha en lugar de id
      if (tipo === 'uf') {
        body.fecha = id;
      } else {
        body.id = id;
      }

      const response = await fetch('/api/sueldos/parametros', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (result.success) {
        await cargarParametros();
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

  const deleteItem = async (tipo: string, id: number | string) => {
    if (!confirm('¿Está seguro de que desea eliminar este parámetro?')) return;

    setSaving(true);
    try {
      let url = `/api/sueldos/parametros?tipo=${tipo}&periodo=${periodoSeleccionado}`;
      
      // Para valores de UF, usar fecha en lugar de id
      if (tipo === 'uf') {
        url += `&fecha=${id}`;
      } else {
        url += `&id=${id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        await cargarParametros();
        setSuccess('Parámetro eliminado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Error al eliminar parámetro');
      }
    } catch (error) {
      console.error('Error eliminando:', error);
      setError('Error al eliminar parámetro');
    } finally {
      setSaving(false);
    }
  };

  const addNewItem = async (tipo: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/sueldos/parametros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          data: { ...newItem.data, periodo: periodoSeleccionado }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await cargarParametros();
        setNewItem({ tipo: '', data: {} });
        setShowAddForm(prev => ({ ...prev, [tipo]: false }));
        setSuccess('Parámetro agregado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Error al agregar parámetro');
      }
    } catch (error) {
      console.error('Error agregando:', error);
      setError('Error al agregar parámetro');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = (tipo: string, id: number | string) => {
    const key = `${tipo}-${id}`;
    return editingItems[key]?.isEditing || false;
  };

  const getTempValue = (tipo: string, id: number | string) => {
    const key = `${tipo}-${id}`;
    return editingItems[key]?.tempValue || '';
  };

  const toggleAddForm = (tipo: string) => {
    setShowAddForm(prev => ({ ...prev, [tipo]: !prev[tipo] }));
    if (!showAddForm[tipo]) {
      setNewItem({ tipo, data: {} });
    }
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

        {/* Selector de Período */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Período:</Label>
                <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodosDisponibles.map((periodo) => (
                      <SelectItem key={periodo} value={periodo}>
                        {periodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Calendar className="h-3 w-3 mr-1" />
                  {periodoSeleccionado}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={copiarPeriodo}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Período
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                <TabsTrigger value="parametros">Generales</TabsTrigger>
                <TabsTrigger value="afp">AFP</TabsTrigger>
                <TabsTrigger value="impuesto">Impuestos</TabsTrigger>
                <TabsTrigger value="asignacion">Asignación Familiar</TabsTrigger>
                <TabsTrigger value="uf">Valor UF</TabsTrigger>
              </TabsList>

              {/* Parámetros Generales */}
              <TabsContent value="parametros" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Settings className="h-4 w-4" />
                      Parámetros Generales del Sistema
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAddForm('parametros')}
                      className="h-8 px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {showAddForm.parametros && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Parámetro</Label>
                          <Input
                            value={newItem.data.parametro || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, parametro: e.target.value }
                            }))}
                            placeholder="NOMBRE_PARAMETRO"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor</Label>
                          <Input
                            type="number"
                            value={newItem.data.valor || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, valor: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Descripción</Label>
                          <Input
                            value={newItem.data.descripcion || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, descripcion: e.target.value }
                            }))}
                            placeholder="Descripción del parámetro"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addNewItem('parametros')}
                          disabled={saving}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAddForm('parametros')}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {data.parametros?.map((param: any) => (
                    <div key={param.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {param.parametro}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {param.descripcion || 'Parámetro del sistema'}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteItem('parametros', param.id)}
                              disabled={saving}
                              className="h-8 px-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* AFP */}
              <TabsContent value="afp" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Building2 className="h-4 w-4" />
                      Configuración AFP
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAddForm('afp')}
                      className="h-8 px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {showAddForm.afp && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Código</Label>
                          <Input
                            value={newItem.data.codigo || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, codigo: e.target.value }
                            }))}
                            placeholder="codigo_afp"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={newItem.data.nombre || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, nombre: e.target.value }
                            }))}
                            placeholder="Nombre AFP"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tasa (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newItem.data.tasa || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, tasa: Number(e.target.value) }
                            }))}
                            placeholder="11.44"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addNewItem('afp')}
                          disabled={saving}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAddForm('afp')}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-4">
                    {data.afp?.map((afp: any) => (
                      <div key={afp.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {afp.nombre}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Código: {afp.codigo}
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteItem('afp', afp.id)}
                                disabled={saving}
                                className="h-8 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Percent className="h-4 w-4" />
                      Configuración de Impuestos
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAddForm('impuesto')}
                      className="h-8 px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {showAddForm.impuesto && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Tramo</Label>
                          <Input
                            type="number"
                            value={newItem.data.tramo || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, tramo: Number(e.target.value) }
                            }))}
                            placeholder="1"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Desde</Label>
                          <Input
                            type="number"
                            value={newItem.data.desde || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, desde: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta</Label>
                          <Input
                            type="number"
                            value={newItem.data.hasta || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, hasta: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Factor</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={newItem.data.factor || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, factor: Number(e.target.value) }
                            }))}
                            placeholder="0.00"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rebaja</Label>
                          <Input
                            type="number"
                            value={newItem.data.rebaja || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, rebaja: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tasa Máx (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newItem.data.tasa_max || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, tasa_max: Number(e.target.value) }
                            }))}
                            placeholder="0.0"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addNewItem('impuesto')}
                          disabled={saving}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAddForm('impuesto')}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  
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
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            Factor: {imp.factor} | Rebaja: {formatearCLP(imp.rebaja)} | Tasa Máx: {imp.tasa_max}%
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('impuesto', imp.id) ? (
                            <>
                              <Input
                                type="number"
                                step="0.001"
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
                                  {(imp.factor * 100).toFixed(1)}%
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteItem('impuesto', imp.id)}
                                disabled={saving}
                                className="h-8 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Asignación Familiar */}
              <TabsContent value="asignacion" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Users className="h-4 w-4" />
                      Asignación Familiar
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAddForm('asignacionFamiliar')}
                      className="h-8 px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {showAddForm.asignacionFamiliar && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Tramo</Label>
                          <Input
                            value={newItem.data.tramo || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, tramo: e.target.value }
                            }))}
                            placeholder="A"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Desde</Label>
                          <Input
                            type="number"
                            value={newItem.data.desde || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, desde: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta</Label>
                          <Input
                            type="number"
                            value={newItem.data.hasta || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, hasta: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Monto</Label>
                          <Input
                            type="number"
                            value={newItem.data.monto || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, monto: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addNewItem('asignacionFamiliar')}
                          disabled={saving}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAddForm('asignacionFamiliar')}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-4">
                    {data.asignacionFamiliar?.map((asig: any) => (
                      <div key={asig.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            Tramo {asig.tramo}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Desde: {formatearCLP(asig.desde)} - Hasta: {formatearCLP(asig.hasta)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('asignacionFamiliar', asig.id) ? (
                            <>
                              <Input
                                type="number"
                                value={getTempValue('asignacionFamiliar', asig.id)}
                                onChange={(e) => updateTempValue('asignacionFamiliar', asig.id, Number(e.target.value))}
                                className="w-24 h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveItem('asignacionFamiliar', asig.id, 'monto')}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing('asignacionFamiliar', asig.id)}
                                className="h-8 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {formatearCLP(asig.monto)}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing('asignacionFamiliar', asig.id, asig.monto)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteItem('asignacionFamiliar', asig.id)}
                                disabled={saving}
                                className="h-8 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Valor UF */}
              <TabsContent value="uf" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <DollarSign className="h-4 w-4" />
                      Valores UF por Fecha
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleAddForm('uf')}
                      className="h-8 px-3"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  
                  {showAddForm.uf && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Fecha</Label>
                          <Input
                            type="date"
                            value={newItem.data.fecha || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, fecha: e.target.value }
                            }))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor UF</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newItem.data.valor || ''}
                            onChange={(e) => setNewItem(prev => ({
                              ...prev,
                              data: { ...prev.data, valor: Number(e.target.value) }
                            }))}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => addNewItem('uf')}
                          disabled={saving}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAddForm('uf')}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-4">
                    {data.uf?.map((uf: any) => (
                      <div key={uf.fecha} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {new Date(uf.fecha).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Fecha: {uf.fecha}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing('uf', uf.fecha) ? (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                value={getTempValue('uf', uf.fecha)}
                                onChange={(e) => updateTempValue('uf', uf.fecha, Number(e.target.value))}
                                className="w-32 h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveItem('uf', uf.fecha, 'valor')}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing('uf', uf.fecha)}
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
                                <div className="text-xs text-slate-500 dark:text-slate-500">
                                  UF
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing('uf', uf.fecha, uf.valor)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteItem('uf', uf.fecha)}
                                disabled={saving}
                                className="h-8 px-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {(!data.uf || data.uf.length === 0) && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay valores de UF registrados</p>
                        <p className="text-sm">Agrega el primer valor de UF para comenzar</p>
                      </div>
                    )}
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
