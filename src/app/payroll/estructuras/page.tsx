"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Edit2, Save, X, Info } from 'lucide-react';
import { DesgloseCalculo } from '@/components/DesgloseCalculo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Instalacion {
  id: string;
  nombre: string;
}

interface RolServicio {
  id: string;
  nombre: string;
}

interface EstructuraServicio {
  instalacion_id: string;
  instalacion_nombre: string;
  rol_servicio_id: string;
  rol_nombre: string;
  rol_descripcion?: string;
  sueldo_base: number;
  bono_1: number;
  bono_2: number;
  bono_3: number;
  sueldo_liquido: number;
  costo_empresa: number;
  estructura_id?: string;
  estructura_activa?: boolean;
  estructura_version?: number;
  desglose?: {
    gratificacion: number;
    total_imponible: number;
    cotizaciones: {
      afp: number;
      salud: number;
      afc: number;
      total: number;
    };
    cargas_sociales: {
      sis: number;
      afc_empleador: number;
      mutual: number;
      reforma_previsional: number;
      total: number;
    };
    base_tributable: number;
    impuesto_unico: number;
  };
}

export default function EstructurasPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([]);
  const [estructuras, setEstructuras] = useState<EstructuraServicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstalacion, setSelectedInstalacion] = useState<string>('todas');
  const [selectedRol, setSelectedRol] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    sueldo_base: string;
    bono_1: string;
    bono_2: string;
    bono_3: string;
  }>({
    sueldo_base: '',
    bono_1: '',
    bono_2: '',
    bono_3: ''
  });
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Cargar instalaciones - solo las que tienen estructuras
  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/payroll/estructuras/list');
      const data = await response.json();
      if (data.success && data.data) {
        // Extraer instalaciones únicas de las estructuras
        const instalacionesUnicas = data.data.reduce((acc: any[], estructura: EstructuraServicio) => {
          const existe = acc.find(inst => inst.id === estructura.instalacion_id);
          if (!existe) {
            acc.push({
              id: estructura.instalacion_id,
              nombre: estructura.instalacion_nombre
            });
          }
          return acc;
        }, []);
        setInstalaciones(instalacionesUnicas);
      }
    } catch (error) {
      logger.error('Error cargando instalaciones::', error);
      toastError("Error", "No se pudieron cargar las instalaciones");
    }
  };

  // Cargar roles de servicio - solo los que tienen estructuras
  const cargarRolesServicio = async () => {
    try {
      const response = await fetch('/api/payroll/estructuras/list');
      const data = await response.json();
      if (data.success && data.data) {
        // Extraer roles únicos de las estructuras
        const rolesUnicos = data.data.reduce((acc: any[], estructura: EstructuraServicio) => {
          const existe = acc.find(rol => rol.id === estructura.rol_servicio_id);
          if (!existe) {
            acc.push({
              id: estructura.rol_servicio_id,
              nombre: estructura.rol_nombre,
              descripcion: estructura.rol_descripcion
            });
          }
          return acc;
        }, []);
        setRolesServicio(rolesUnicos);
      }
    } catch (error) {
      logger.error('Error cargando roles de servicio::', error);
      toastError("Error", "No se pudieron cargar los roles de servicio");
    }
  };

  // Cargar estructuras
  const cargarEstructuras = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstalacion && selectedInstalacion !== 'todas') params.append('instalacion_id', selectedInstalacion);
      if (selectedRol && selectedRol !== 'todos') params.append('rol_servicio_id', selectedRol);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/payroll/estructuras/list?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setEstructuras(data.data);
      } else {
        toastError("Error", "No se pudieron cargar las estructuras");
      }
    } catch (error) {
      logger.error('Error cargando estructuras::', error);
      toastError("Error", "Error al cargar las estructuras");
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CL');
  };

  // Parsear moneda
  const parseCurrency = (value: string) => {
    return parseInt(value.replace(/\D/g, '')) || 0;
  };

  // Iniciar edición
  const startEditing = (row: EstructuraServicio) => {
    const rowId = `${row.instalacion_id}-${row.rol_servicio_id}`;
    setEditingRow(rowId);
    setEditingValues({
      sueldo_base: formatCurrency(row.sueldo_base),
      bono_1: formatCurrency(row.bono_1),
      bono_2: formatCurrency(row.bono_2),
      bono_3: formatCurrency(row.bono_3)
    });
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingRow(null);
    setEditingValues({
      sueldo_base: '',
      bono_1: '',
      bono_2: '',
      bono_3: ''
    });
  };

  // Guardar fila
  const saveRow = async (row: EstructuraServicio) => {
    const rowId = `${row.instalacion_id}-${row.rol_servicio_id}`;
    setSavingRow(rowId);
    
    try {
      const response = await fetch('/api/payroll/estructuras/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instalacion_id: row.instalacion_id,
          rol_servicio_id: row.rol_servicio_id,
          sueldo_base: parseCurrency(editingValues.sueldo_base),
          bono_1: parseCurrency(editingValues.bono_1),
          bono_2: parseCurrency(editingValues.bono_2),
          bono_3: parseCurrency(editingValues.bono_3)
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Actualizar el elemento local inmediatamente con los nuevos valores
        setEstructuras(prev => prev.map(estructura => {
          if (estructura.instalacion_id === row.instalacion_id && estructura.rol_servicio_id === row.rol_servicio_id) {
            return {
              ...estructura,
              sueldo_base: data.data.sueldo_base,
              bono_1: data.data.bono_1,
              bono_2: data.data.bono_2,
              bono_3: data.data.bono_3,
              sueldo_liquido: data.data.sueldo_liquido,
              costo_empresa: data.data.costo_empresa,
              desglose: data.data.desglose
            };
          }
          return estructura;
        }));
        
        toastSuccess("Éxito", "Estructura actualizada correctamente");
        setEditingRow(null);
        setEditingValues({ sueldo_base: '', bono_1: '', bono_2: '', bono_3: '' });
      } else {
        toastError("Error", data.error || "Error al actualizar");
      }
    } catch (error) {
      logger.error('Error guardando estructura::', error);
      toastError("Error", "Error al guardar la estructura");
    } finally {
      setSavingRow(null);
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'Instalación',
      'Rol de Servicio',
      'Sueldo Base',
      'Bono 1',
      'Bono 2', 
      'Bono 3',
      'Sueldo Líquido',
      'Costo Empresa'
    ];

    const csvContent = [
      headers.join(','),
      ...estructuras.map(row => [
        `"${row.instalacion_nombre}"`,
        `"${row.rol_nombre}"`,
        row.sueldo_base,
        row.bono_1,
        row.bono_2,
        row.bono_3,
        row.sueldo_liquido,
        row.costo_empresa
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'estructuras_servicio.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarInstalaciones();
    cargarRolesServicio();
  }, []);

  // Recargar estructuras cuando cambien los filtros
  useEffect(() => {
    cargarEstructuras();
  }, [selectedInstalacion, selectedRol, searchTerm]);

  return (
    <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
          <h1 className="text-2xl font-bold">🏗️ Estructuras de Servicio</h1>
          <p className="text-muted-foreground">Gestión de estructuras salariales por instalación y rol</p>
          </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro Instalación */}
            <div className="space-y-2">
              <Label htmlFor="instalacion">Instalación</Label>
              <Select value={selectedInstalacion} onValueChange={setSelectedInstalacion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las instalaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las instalaciones</SelectItem>
                  {instalaciones.map((instalacion) => (
                    <SelectItem key={instalacion.id} value={instalacion.id}>
                      {instalacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Rol de Servicio */}
            <div className="space-y-2">
              <Label htmlFor="rol">Rol de Servicio</Label>
                <Select value={selectedRol} onValueChange={setSelectedRol}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda */}
            <div className="space-y-2">
              <Label htmlFor="search">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Buscar instalación o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Estructuras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            📊 Estructuras ({estructuras.length} resultados)
                    </CardTitle>
                  </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : estructuras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron estructuras con los filtros aplicados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full space-y-3">
                {estructuras.map((row) => {
                  const rowId = `${row.instalacion_id}-${row.rol_servicio_id}`;
                  const isEditing = editingRow === rowId;
                  const isSaving = savingRow === rowId;

    return (
                    <div key={rowId} className="border rounded-lg p-4 space-y-3">
                      {/* Instalación y Rol */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{row.instalacion_nombre}</h3>
                        <p className="text-sm text-muted-foreground">{row.rol_nombre}</p>
        </div>

                      {/* Valores Financieros */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {/* Sueldo Base */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Sueldo Base</Label>
                          {isEditing ? (
          <Input 
                              value={editingValues.sueldo_base}
                              onChange={(e) => setEditingValues(prev => ({
                                ...prev,
                                sueldo_base: e.target.value
                              }))}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              ${formatCurrency(row.sueldo_base)}
        </div>
                          )}
    </div>

                        {/* Bono 1 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Colación</Label>
                          {isEditing ? (
        <Input 
                              value={editingValues.bono_1}
                              onChange={(e) => setEditingValues(prev => ({
                                ...prev,
                                bono_1: e.target.value
                              }))}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              ${formatCurrency(row.bono_1)}
      </div>
                          )}
              </div>

                        {/* Bono 2 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Movilización</Label>
                          {isEditing ? (
                            <Input
                              value={editingValues.bono_2}
                              onChange={(e) => setEditingValues(prev => ({
                                ...prev,
                                bono_2: e.target.value
                              }))}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              ${formatCurrency(row.bono_2)}
              </div>
                          )}
                              </div>

                        {/* Bono 3 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Responsabilidad</Label>
                          {isEditing ? (
                            <Input
                              value={editingValues.bono_3}
                              onChange={(e) => setEditingValues(prev => ({
                                ...prev,
                                bono_3: e.target.value
                              }))}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              ${formatCurrency(row.bono_3)}
              </div>
                          )}
            </div>

                        {/* Sueldo Líquido */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Sueldo Líquido</Label>
                          <div className="text-sm font-medium text-green-600">
                            ${formatCurrency(row.sueldo_liquido)}
                          </div>
                        </div>

                        {/* Costo Empresa */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            Costo Empresa
                            {row.desglose && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-gray-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="w-72 sm:w-80 p-0">
                                    <DesgloseCalculo
                                      desglose={row.desglose}
                                      sueldoBase={row.sueldo_base}
                                      bono1={row.bono_1}
                                      bono2={row.bono_2}
                                      bono3={row.bono_3}
                                      sueldoLiquido={row.sueldo_liquido}
                                      costoEmpresa={row.costo_empresa}
                                    />
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </Label>
                          <div className="text-sm font-medium text-red-600">
                            ${formatCurrency(row.costo_empresa)}
                          </div>
                        </div>
      </div>

                      {/* Acciones */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                                        {isEditing ? (
                          <>
                    <Button
                              onClick={() => saveRow(row)}
                      size="sm"
                                                disabled={isSaving}
                              className="h-8"
                                              >
                                                {isSaving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                                                    Guardar
                    </Button>
                    <Button
                              onClick={cancelEditing}
                                                variant="outline" 
                      size="sm"
                              className="h-8"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                    </Button>
                          </>
                                        ) : (
                          <Button
                            onClick={() => startEditing(row)}
                                                variant="outline" 
                            size="sm"
                            className="h-8"
                                              >
                            <Edit2 className="h-4 w-4 mr-1" />
                                                Editar
                          </Button>
                    )}
                  </div>
                        </div>
                      );
                })}
              </div>
      </div>
                  )}
                </CardContent>
              </Card>
    </div>
  );
}
