'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Building2,
  User,
  DollarSign,
  Save,
  Plus,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Instalacion {
  id: string;
  nombre: string;
}

interface Rol {
  id: string;
  nombre: string;
}

interface Guardia {
  id: string;
  nombre: string;
  rut: string;
}

interface Bono {
  id: string;
  codigo: string;
  nombre: string;
  monto: number;
  imponible: boolean;
}

interface FormData {
  instalacion: string;
  rol: string;
  guardia: string;
  sueldo_base: string;
  bonos: {
    [key: string]: string;
  };
}

export default function NuevaEstructuraPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [tipoEstructura, setTipoEstructura] = useState<'servicio' | 'guardia'>('servicio');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Datos para formularios
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [bonos, setBonos] = useState<Bono[]>([]);

  // Formulario
  const [formData, setFormData] = useState<FormData>({
    instalacion: '',
    rol: '',
    guardia: '',
    sueldo_base: '',
    bonos: {}
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar roles cuando cambie la instalación
  useEffect(() => {
    if (formData.instalacion && formData.instalacion !== '') {
      cargarRolesPorInstalacion(formData.instalacion);
    } else {
      setRoles([]);
    }
  }, [formData.instalacion]);

  const cargarDatosIniciales = async () => {
    setLoadingData(true);
    try {
      // Cargar instalaciones con turnos
      const responseInstalaciones = await fetch('/api/instalaciones?simple=true');
      const dataInstalaciones = await responseInstalaciones.json();
      if (dataInstalaciones.success) {
        setInstalaciones(dataInstalaciones.data);
      }

      // Cargar guardias
      const responseGuardias = await fetch('/api/guardias?simple=true');
      const dataGuardias = await responseGuardias.json();
      if (dataGuardias.success) {
        setGuardias(dataGuardias.data);
      }

      // Cargar bonos desde la tabla de bonos globales
      const responseBonos = await fetch('/api/payroll/bonos');
      const dataBonos = await responseBonos.json();
      if (dataBonos.success) {
        // Filtrar bonos duplicados (mantener solo uno por nombre, ignorando mayúsculas/minúsculas)
        const bonosUnicos = dataBonos.data.filter((bono: any, index: number, self: any[]) => 
          index === self.findIndex((b: any) => 
            b.nombre.toLowerCase() === bono.nombre.toLowerCase()
          )
        );
        setBonos(bonosUnicos);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      toastError("Error", "No se pudieron cargar los datos iniciales");
    } finally {
      setLoadingData(false);
    }
  };

  const cargarRolesPorInstalacion = async (instalacionId: string) => {
    try {
      const response = await fetch(`/api/roles-servicio/instalacion/${instalacionId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setRoles(data);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error cargando roles:', error);
      toastError("Error", "No se pudieron cargar los roles");
      setRoles([]);
    }
  };

  const handleVolver = () => {
    window.history.back();
  };

  const formatNumber = (value: string): string => {
    // Remover todo excepto números
    const numericValue = value.replace(/\D/g, '');
    
    // Formatear con separador de miles
    if (numericValue) {
      return parseInt(numericValue).toLocaleString('es-CL');
    }
    return '';
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'sueldo_base') {
      setFormData(prev => ({
        ...prev,
        [field]: formatNumber(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleBonoChange = (bonoId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bonos: {
        ...prev.bonos,
        [bonoId]: formatNumber(value)
      }
    }));
  };

  const verificarRestricciones = async () => {
    try {
      const dataToSend = tipoEstructura === 'servicio' 
        ? { tipo: 'servicio', instalacion_id: formData.instalacion, rol_servicio_id: formData.rol }
        : { tipo: 'guardia', guardia_id: formData.guardia };

      const response = await fetch('/api/payroll/estructuras-unificadas/verificar-restricciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verificando restricciones:', error);
      return { success: false, error: 'Error al verificar restricciones' };
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    try {
      // Validar datos
      if (!formData.sueldo_base) {
        toastError("Error", "Por favor complete el sueldo base");
        return;
      }

      if (tipoEstructura === 'servicio' && !formData.instalacion) {
        toastError("Error", "Por favor seleccione una instalación");
        return;
      }

      if (tipoEstructura === 'servicio' && !formData.rol) {
        toastError("Error", "Por favor seleccione un rol de servicio");
        return;
      }

      if (tipoEstructura === 'guardia' && !formData.guardia) {
        toastError("Error", "Por favor seleccione un guardia");
        return;
      }

      // Verificar restricciones antes de guardar
      const verificacion = await verificarRestricciones();
      
      if (!verificacion.success) {
        if (verificacion.error.includes('Ya existe')) {
          toastError("Error", verificacion.error);
          return;
        } else {
          toastError("Error", verificacion.error);
          return;
        }
      }

      // Convertir montos a números
      const sueldoBase = parseInt(formData.sueldo_base.replace(/\D/g, ''));
      
      // Preparar datos para enviar al servidor
      const estructuraData = {
        tipo: tipoEstructura,
        instalacion_id: tipoEstructura === 'servicio' ? formData.instalacion : null,
        rol_servicio_id: tipoEstructura === 'servicio' ? formData.rol : null,
        guardia_id: tipoEstructura === 'guardia' ? formData.guardia : null,
        sueldo_base: sueldoBase,
        bono_movilizacion: parseInt(formData.bonos['8892f19e-3b77-4933-af8f-4309fdd56cde']?.replace(/\D/g, '') || '0'),
        bono_colacion: parseInt(formData.bonos['f385aede-5ebe-452f-bd36-5b45e347878c']?.replace(/\D/g, '') || '0'),
        bono_responsabilidad: parseInt(formData.bonos['230adfdd-5d45-41d1-a745-10ffd2101a86']?.replace(/\D/g, '') || '0')
      };

      // Enviar al endpoint de estructuras unificadas
      const response = await fetch('/api/payroll/estructuras-unificadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estructuraData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la estructura');
      }

      if (result.success) {
        toastSuccess("Éxito", "Estructura creada correctamente");
        handleVolver();
      } else {
        throw new Error(result.error || 'Error al crear la estructura');
      }
    } catch (error) {
      console.error('Error al crear estructura:', error);
      toastError("Error", error instanceof Error ? error.message : "No se pudo crear la estructura");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleVolver}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Nueva Estructura
          </h1>
          <p className="text-muted-foreground">
            Crear una nueva estructura de remuneración
          </p>
        </div>
      </div>

      {/* Tipo de estructura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo de Estructura</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tipoEstructura} onValueChange={(value) => setTipoEstructura(value as 'servicio' | 'guardia')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="servicio" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Estructura de Servicio
              </TabsTrigger>
              <TabsTrigger value="guardia" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Estructura por Guardia
              </TabsTrigger>
            </TabsList>

            <TabsContent value="servicio" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instalacion">Instalación *</Label>
                  <Select 
                    value={formData.instalacion} 
                    onValueChange={(value) => handleInputChange('instalacion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar instalación" />
                    </SelectTrigger>
                    <SelectContent>
                      {instalaciones.map((instalacion) => (
                        <SelectItem key={instalacion.id} value={instalacion.id}>
                          {instalacion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rol">Rol de Servicio *</Label>
                  <Select 
                    value={formData.rol} 
                    onValueChange={(value) => handleInputChange('rol', value)}
                    disabled={!formData.instalacion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="sueldo">Sueldo Base *</Label>
                <Input 
                  id="sueldo" 
                  type="text" 
                  placeholder="Ingrese el sueldo base"
                  value={formData.sueldo_base}
                  onChange={(e) => handleInputChange('sueldo_base', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Bonos */}
              {bonos.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Bonos</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonos.map((bono) => (
                      <div key={bono.id}>
                        <Label htmlFor={`bono-${bono.id}`}>{bono.nombre}</Label>
                        <Input 
                          id={`bono-${bono.id}`} 
                          type="text" 
                          placeholder="0"
                          value={formData.bonos[bono.id] || ''}
                          onChange={(e) => handleBonoChange(bono.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="guardia" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardia">Guardia *</Label>
                  <Select 
                    value={formData.guardia} 
                    onValueChange={(value) => handleInputChange('guardia', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar guardia" />
                    </SelectTrigger>
                    <SelectContent>
                      {guardias.map((guardia) => (
                        <SelectItem key={guardia.id} value={guardia.id}>
                          {guardia.nombre} ({guardia.rut})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sueldo-guardia">Sueldo Base *</Label>
                  <Input 
                    id="sueldo-guardia" 
                    type="text" 
                    placeholder="Ingrese el sueldo base"
                    value={formData.sueldo_base}
                    onChange={(e) => handleInputChange('sueldo_base', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Bonos para guardia */}
              {bonos.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">Bonos</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonos.map((bono) => (
                      <div key={bono.id}>
                        <Label htmlFor={`bono-guardia-${bono.id}`}>{bono.nombre}</Label>
                        <Input 
                          id={`bono-guardia-${bono.id}`} 
                          type="text" 
                          placeholder="0"
                          value={formData.bonos[bono.id] || ''}
                          onChange={(e) => handleBonoChange(bono.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleVolver}>
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Estructura'}
        </Button>
      </div>
    </div>
  );
}
