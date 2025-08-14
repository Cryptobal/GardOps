'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  DollarSign,
  Shield,
  Building2,
  Edit2,
  X,
  Check,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  getEstructurasSueldo,
  actualizarEstructuraSueldo
} from '@/lib/api/estructuras-sueldo';
import { 
  EstructuraSueldo, 
  ActualizarEstructuraSueldoData,
  calcularTotalEstructura,
  formatearMoneda
} from '@/lib/schemas/estructuras-sueldo';

interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface EstructuraServicioProps {
  instalacionId: string;
  rolesPrecargados?: RolServicio[];
}

export default function EstructuraServicioNueva({ instalacionId, rolesPrecargados = [] }: EstructuraServicioProps) {
  const [roles, setRoles] = useState<RolServicio[]>(rolesPrecargados);
  const [estructuras, setEstructuras] = useState<EstructuraSueldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [editData, setEditData] = useState<ActualizarEstructuraSueldoData>({});

  useEffect(() => {
    cargarDatos();
  }, [instalacionId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Si no hay roles precargados, cargarlos
      if (rolesPrecargados.length === 0) {
        const rolesResponse = await fetch(`/api/roles-servicio/instalacion/${instalacionId}`);
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          const rolesArray = Array.isArray(rolesData) 
            ? rolesData 
            : (rolesData.rows || []);
          setRoles(rolesArray);
        }
      }

      // Cargar estructuras de sueldo (nueva relación 1:1)
      const estructurasData = await getEstructurasSueldo();
      setEstructuras(estructurasData);
      console.log("✅ Estructuras de sueldo cargadas (relación 1:1)");
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRolExpanded = (rolId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(rolId)) {
      newExpanded.delete(rolId);
    } else {
      newExpanded.add(rolId);
    }
    setExpandedRoles(newExpanded);
  };

  const handleEditar = (estructura: EstructuraSueldo) => {
    setEditando(estructura.rol_servicio_id);
    setEditData({
      sueldo_base: estructura.sueldo_base,
      bono_asistencia: estructura.bono_asistencia,
      bono_responsabilidad: estructura.bono_responsabilidad,
      bono_noche: estructura.bono_noche,
      bono_feriado: estructura.bono_feriado,
      bono_riesgo: estructura.bono_riesgo,
      otros_bonos: estructura.otros_bonos
    });
  };

  const handleGuardar = async (rolId: string) => {
    try {
      setSaving(true);
      await actualizarEstructuraSueldo(rolId, editData);
      console.log(`✅ Estructura de sueldo actualizada para rol: ${rolId}`);
      setEditando(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error actualizando estructura:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    setEditando(null);
    setEditData({});
  };

  const actualizarCampo = (campo: keyof ActualizarEstructuraSueldoData, valor: number) => {
    setEditData(prev => ({ ...prev, [campo]: valor }));
  };

  const obtenerEstructuraRol = (rolId: string) => {
    return estructuras.find(e => e.rol_servicio_id === rolId);
  };

  const obtenerSueldoBase = (rolId: string) => {
    const estructura = obtenerEstructuraRol(rolId);
    return estructura?.sueldo_base || 0;
  };

  const calcularTotalRol = (rolId: string) => {
    const estructura = obtenerEstructuraRol(rolId);
    return estructura ? calcularTotalEstructura(estructura) : 0;
  };

  const calcularImponibleRol = (rolId: string) => {
    const estructura = obtenerEstructuraRol(rolId);
    return estructura ? estructura.sueldo_base : 0; // Simplificado para este ejemplo
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Cargando estructuras de servicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Estructura de Servicio por Rol</h2>
          <p className="text-sm text-gray-600">
            {estructuras.length} Roles • Relación 1:1 con estructuras de sueldo
          </p>
        </div>
      </div>

      {roles.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay roles de servicio configurados para esta instalación.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {roles.map((rol) => {
            const estructura = obtenerEstructuraRol(rol.id);
            const isExpanded = expandedRoles.has(rol.id);
            const isEditing = editando === rol.id;
            const sueldoBase = obtenerSueldoBase(rol.id);
            const total = calcularTotalRol(rol.id);
            const imponible = calcularImponibleRol(rol.id);

            return (
              <Card key={rol.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRolExpanded(rol.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <CardTitle className="text-lg">{rol.nombre}</CardTitle>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline">
                            Sueldo Base: {formatearMoneda(sueldoBase)}
                          </Badge>
                          <Badge variant="outline">
                            Total: {formatearMoneda(total)}
                          </Badge>
                          <Badge variant="outline">
                            Imponible: {formatearMoneda(imponible)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleGuardar(rol.id)}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelar}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => estructura && handleEditar(estructura)}
                          disabled={!estructura}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && estructura && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sueldo Base */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sueldo Base</label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData.sueldo_base || estructura.sueldo_base}
                            onChange={(e) => actualizarCampo('sueldo_base', parseInt(e.target.value) || 0)}
                            className="w-full"
                          />
                        ) : (
                          <div className="text-lg font-semibold text-green-600">
                            {formatearMoneda(estructura.sueldo_base)}
                          </div>
                        )}
                      </div>

                      {/* Bonos */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bonos</label>
                        <div className="space-y-1">
                          {isEditing ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs w-20">Asistencia:</span>
                                <Input
                                  type="number"
                                  value={editData.bono_asistencia || estructura.bono_asistencia}
                                  onChange={(e) => actualizarCampo('bono_asistencia', parseInt(e.target.value) || 0)}
                                  className="w-24 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs w-20">Responsabilidad:</span>
                                <Input
                                  type="number"
                                  value={editData.bono_responsabilidad || estructura.bono_responsabilidad}
                                  onChange={(e) => actualizarCampo('bono_responsabilidad', parseInt(e.target.value) || 0)}
                                  className="w-24 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs w-20">Noche:</span>
                                <Input
                                  type="number"
                                  value={editData.bono_noche || estructura.bono_noche}
                                  onChange={(e) => actualizarCampo('bono_noche', parseInt(e.target.value) || 0)}
                                  className="w-24 text-xs"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {estructura.bono_asistencia > 0 && (
                                <div className="text-sm">
                                  Asistencia: {formatearMoneda(estructura.bono_asistencia)}
                                </div>
                              )}
                              {estructura.bono_responsabilidad > 0 && (
                                <div className="text-sm">
                                  Responsabilidad: {formatearMoneda(estructura.bono_responsabilidad)}
                                </div>
                              )}
                              {estructura.bono_noche > 0 && (
                                <div className="text-sm">
                                  Noche: {formatearMoneda(estructura.bono_noche)}
                                </div>
                              )}
                              {estructura.bono_feriado > 0 && (
                                <div className="text-sm">
                                  Feriado: {formatearMoneda(estructura.bono_feriado)}
                                </div>
                              )}
                              {estructura.bono_riesgo > 0 && (
                                <div className="text-sm">
                                  Riesgo: {formatearMoneda(estructura.bono_riesgo)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">Total Estructura:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatearMoneda(calcularTotalEstructura(estructura))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Nueva estructura 1:1:</strong> Cada rol de servicio tiene una estructura de sueldo única. 
          Las estructuras se crean automáticamente al crear roles y se inactivan junto con los roles.
        </AlertDescription>
      </Alert>
    </div>
  );
}
