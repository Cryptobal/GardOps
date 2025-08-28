'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Building2,
  User,
  Users,
  DollarSign,
  Eye,
  Settings,
  AlertCircle,
  Calendar,
  Clock,
  Star,
  Shield,
  ArrowUp,
  ArrowDown,
  Info,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import VistaUnificadaTab from './components/VistaUnificadaTab';

interface FiltrosUnificados {
  instalacion: string;
  rol: string;
  tipo: 'todos' | 'servicio' | 'guardia';
  guardia: string;
  estado: 'todos' | 'activos' | 'inactivos';
}

interface Instalacion {
  id: string;
  nombre: string;
}

interface Rol {
  id: string;
  nombre: string;
}

export default function EstructurasUnificadasPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  
  // Filtros simplificados
  const [filtros, setFiltros] = useState<FiltrosUnificados>({
    instalacion: 'todas',
    rol: 'todos',
    tipo: 'todos',
    guardia: 'todos',
    estado: 'todos'
  });

  // Datos para filtros
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [guardias, setGuardias] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      // Cargar instalaciones
      const responseInstalaciones = await fetch('/api/instalaciones?simple=true');
      const dataInstalaciones = await responseInstalaciones.json();
      if (dataInstalaciones.success) {
        setInstalaciones(dataInstalaciones.data);
      }

      // Cargar roles
      const responseRoles = await fetch('/api/roles?simple=true');
      const dataRoles = await responseRoles.json();
      if (dataRoles.success) {
        setRoles(dataRoles.data);
      }

      // Cargar guardias
      const responseGuardias = await fetch('/api/guardias?simple=true');
      const dataGuardias = await responseGuardias.json();
      if (dataGuardias.success) {
        setGuardias(dataGuardias.data);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      toastError("Error", "No se pudieron cargar los datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      instalacion: 'todas',
      rol: 'todos',
      tipo: 'todos',
      guardia: 'todos',
      estado: 'todos'
    });
  };

  const handleNuevaEstructura = () => {
    // Navegar a la página de creación de estructuras
    window.location.href = '/payroll/estructuras/nueva';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Cargando estructuras unificadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Estructuras Unificadas
          </h1>
          <p className="text-muted-foreground">
            Gestión unificada de estructuras de remuneración por servicio y por guardia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={cargarDatosIniciales}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleNuevaEstructura}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Estructura
          </Button>
        </div>
      </div>

      {/* Filtros contraíbles */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {filtrosExpandidos ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {filtrosExpandidos && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Instalación */}
              <div>
                <label className="text-sm font-medium mb-2 block">Instalación</label>
                <Select value={filtros.instalacion} onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}>
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

              {/* Rol */}
              <div>
                <label className="text-sm font-medium mb-2 block">Rol</label>
                <Select value={filtros.rol} onValueChange={(value) => setFiltros(prev => ({ ...prev, rol: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    {roles.map((rol) => (
                      <SelectItem key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={filtros.tipo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="servicio">Por Servicio</SelectItem>
                    <SelectItem value="guardia">Por Guardia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Guardia */}
              <div>
                <label className="text-sm font-medium mb-2 block">Guardia</label>
                <Select value={filtros.guardia} onValueChange={(value) => setFiltros(prev => ({ ...prev, guardia: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los guardias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los guardias</SelectItem>
                    {guardias.map((guardia) => (
                      <SelectItem key={guardia.id} value={guardia.id}>
                        {guardia.nombre} {guardia.apellido_paterno} {guardia.apellido_materno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="activos">Activos</SelectItem>
                    <SelectItem value="inactivos">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones de filtros */}
            <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar Filtros
              </Button>
              <Badge variant="outline">
                {Object.values(filtros).filter(v => v !== 'todos' && v !== 'todas').length} filtros activos
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Vista unificada */}
      <div className="space-y-6">
        <VistaUnificadaTab filtros={filtros} />
      </div>
    </div>
  );
}
