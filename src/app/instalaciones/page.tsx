"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Modal, useConfirmModal } from "../../components/ui/modal";
import { useToast, ToastContainer } from "../../components/ui/toast";
import { InputDireccion, type AddressData } from "../../components/ui/input-direccion";
import { Input } from "../../components/ui/input";
import { 
  Building2, 
  Plus, 
  MapPin,
  Users,
  AlertTriangle,
  Shield,
  TrendingUp,
  Eye,
  Trash2,
  FileText,
  Activity,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Instalacion, 
  CrearInstalacionData, 
  Cliente,
  Comuna
} from "../../lib/schemas/instalaciones";
import { 
  obtenerInstalaciones,
  crearInstalacion,
  actualizarInstalacion,
  eliminarInstalacion,
  obtenerClientes,
  obtenerComunas,
  logInstalacionCreada,
  logEdicionInstalacion,
  logCambioEstadoInstalacion
} from "../../lib/api/instalaciones";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";
import { PageHeader } from "../../components/ui/page-header";
import { FilterBar, FilterConfig } from "../../components/ui/filter-bar";
import { EntityModal } from "../../components/ui/entity-modal";
import { EntityTabs, TabConfig } from "../../components/ui/entity-tabs";
import { LocationTab } from "../../components/ui/location-tab";
import { DocumentManager } from "../../components/shared/document-manager";
import { LogViewer } from "../../components/shared/log-viewer";

interface KPIData {
  totalInstalaciones: number;
  guardiasAsignados: number;
  ppcActivos: number;
  criticas: number;
}

export default function InstalacionesPage() {
  const router = useRouter();
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstalacion, setEditingInstalacion] = useState<Instalacion | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCriticas, setShowCriticas] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Record<string, string>>({
    search: "",
    estado: "Activo",
    cliente_id: "",
    totalCount: "0",
    filteredCount: "0"
  });

  const [formData, setFormData] = useState<CrearInstalacionData>({
    nombre: "",
    cliente_id: "",
    direccion: "",
    latitud: null,
    longitud: null,
    ciudad: "",
    comuna: "",
    valor_turno_extra: 0,
    estado: "Activo",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para datos externos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);

  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirmModal();

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      key: "estado",
      label: "Estado",
      type: "select",
      options: [
        { value: "Todos", label: "Todos los estados" },
        { value: "Activo", label: "Activos" },
        { value: "Inactivo", label: "Inactivos" }
      ]
    },
    {
      key: "cliente_id",
      label: "Cliente",
      type: "select",
      options: [
        { value: "", label: "Todos los clientes" },
        ...clientes.map(cliente => ({
          value: cliente.id,
          label: cliente.nombre
        }))
      ]
    }
  ];

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [filtros.search, filtros.estado, filtros.cliente_id, instalaciones, showCriticas]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const clientesData = await obtenerClientes();
      const instalacionesData = await obtenerInstalaciones();
      const comunasData = await obtenerComunas();
      
      setInstalaciones(instalacionesData);
      setClientes(clientesData);
      setComunas(comunasData);
      
      setFiltros(prev => ({
        ...prev,
        totalCount: instalacionesData.length.toString()
      }));
      
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      toast.error("Error al cargar los datos", "Error");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtradas = [...instalaciones];

    // Filtro por búsqueda
    if (filtros.search) {
      const busqueda = filtros.search.toLowerCase();
      filtradas = filtradas.filter(instalacion =>
        instalacion.nombre?.toLowerCase().includes(busqueda) ||
        instalacion.cliente_nombre?.toLowerCase().includes(busqueda) ||
        instalacion.direccion?.toLowerCase().includes(busqueda) ||
        instalacion.comuna?.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por estado
    if (filtros.estado !== "Todos") {
      filtradas = filtradas.filter(instalacion => instalacion.estado === filtros.estado);
    }

    // Filtro por cliente
    if (filtros.cliente_id) {
      filtradas = filtradas.filter(instalacion => instalacion.cliente_id === filtros.cliente_id);
    }

    // Filtro por críticas
    if (showCriticas) {
      filtradas = filtradas.filter(esInstalacionCritica);
    }

    setFiltros(prev => ({
      ...prev,
      filteredCount: filtradas.length.toString()
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFiltros({
      search: "",
      estado: "Activo",
      cliente_id: "",
      totalCount: filtros.totalCount,
      filteredCount: filtros.totalCount
    });
    setShowCriticas(false);
  };

  // Función para generar datos consistentes basados en ID
  const obtenerDatosSimulados = (instalacionId: string) => {
    const seed = instalacionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const guardiasCount = (seed % 8) + 1;
    const ppcCount = Math.floor((seed * 7) % 6);
    
    return { guardiasCount, ppcCount };
  };

  // Función para determinar si una instalación es crítica
  const esInstalacionCritica = (instalacion: Instalacion): boolean => {
    const { guardiasCount, ppcCount } = obtenerDatosSimulados(instalacion.id);
    const porcentajePPC = guardiasCount > 0 ? (ppcCount / guardiasCount) * 100 : 0;
    
    return (
      instalacion.estado === "Inactivo" ||
      porcentajePPC > 20
    );
  };

  // Calcular KPIs
  const calcularKPIs = (): KPIData => {
    const criticasReales = instalaciones.filter(esInstalacionCritica).length;
    
    return {
      totalInstalaciones: instalaciones.length,
      guardiasAsignados: instalaciones.reduce((acc, inst) => acc + Math.floor(Math.random() * 5) + 1, 0),
      ppcActivos: Math.floor(Math.random() * 6),
      criticas: criticasReales
    };
  };

  const kpis = calcularKPIs();

  const abrirModalNuevo = () => {
    setEditingInstalacion(null);
    setFormData({
      nombre: "",
      cliente_id: "",
      direccion: "",
      latitud: null,
      longitud: null,
      ciudad: "",
      comuna: "",
      valor_turno_extra: 0,
      estado: "Activo",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const cerrarModales = () => {
    setIsModalOpen(false);
    setEditingInstalacion(null);
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "valor_turno_extra" ? parseFloat(value) || 0 : value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      direccion: addressData.direccionCompleta,
      latitud: addressData.latitud,
      longitud: addressData.longitud,
      ciudad: addressData.componentes.ciudad || '',
      comuna: addressData.componentes.comuna || '',
    }));
  };

  const handleAddressChange = (query: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: query
    }));
  };

  // Manejar cambio de ciudad
  const handleCiudadChange = (ciudad: string) => {
    setFormData(prev => ({ ...prev, ciudad }));
  };

  // Manejar cambio de comuna
  const handleComunaChange = (comuna: string) => {
    setFormData(prev => ({ ...prev, comuna }));
  };

  // Manejar cambio de coordenadas
  const handleCoordinatesChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitud: lat,
      longitud: lng,
    }));
  };

  // Limpiar ubicación
  const handleClearLocation = () => {
    setFormData(prev => ({
      ...prev,
      direccion: "",
      latitud: null,
      longitud: null,
      ciudad: "",
      comuna: "",
    }));
  };

  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre?.trim()) {
      errors.nombre = "El nombre es requerido";
    }

    if (!formData.cliente_id) {
      errors.cliente_id = "Debe seleccionar un cliente";
    }

    if (!formData.direccion?.trim()) {
      errors.direccion = "La dirección es requerida";
    }

    if (formData.valor_turno_extra < 0) {
      errors.valor_turno_extra = "El valor debe ser mayor o igual a 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarInstalacion = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      if (editingInstalacion) {
        await actualizarInstalacion(editingInstalacion.id, formData);
        
        // Recargar datos para obtener información completa actualizada
        await cargarDatos();

        await logEdicionInstalacion(editingInstalacion.id, "Datos generales actualizados");
        
        toast.success("Instalación actualizada correctamente", "Éxito");
      } else {
        const nuevaInstalacion = await crearInstalacion(formData);
        
        // Recargar datos para obtener información completa (cliente_nombre, comuna_nombre, etc.)
        await cargarDatos();

        await logInstalacionCreada(nuevaInstalacion.id, "Nueva instalación creada");
        
        toast.success("Instalación creada correctamente", "Éxito");
      }

      cerrarModales();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error guardando instalación:", error);
      toast.error("No se pudo guardar la instalación", "Error");
    }
  };

  const cambiarEstadoInstalacion = async (instalacion: Instalacion, nuevoEstado: boolean) => {
    try {
      const nuevoEstadoStr = nuevoEstado ? "Activo" : "Inactivo";
      
      const instalacionActualizada = await actualizarInstalacion(instalacion.id, {
        estado: nuevoEstadoStr
      });

      setInstalaciones(prev => 
        prev.map(inst => 
          inst.id === instalacion.id ? instalacionActualizada : inst
        )
      );

      await logCambioEstadoInstalacion(instalacion.id, nuevoEstadoStr);

      toast.success(`Instalación ${nuevoEstadoStr.toLowerCase()}`, "Éxito");
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error("No se pudo cambiar el estado", "Error");
    }
  };



  // Configuración de columnas para DataTable
  const columns: Column<Instalacion>[] = [
    {
      key: "nombre",
      label: "Instalación",
      render: (instalacion) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground truncate">
              {instalacion.nombre}
            </span>
            <div className="flex items-center space-x-2 mt-1">
              <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate" title={instalacion.direccion}>
                {instalacion.direccion}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (instalacion) => {
        const cliente = clientes.find(c => c.id === instalacion.cliente_id);
        return (
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-slate-700 text-slate-200">
              {cliente?.nombre || "Sin cliente"}
            </Badge>
            <div className="text-xs text-slate-400">{instalacion.comuna}</div>
          </div>
        );
      }
    },
    {
      key: "estadisticas",
      label: "Estadísticas",
      render: (instalacion) => {
        const { guardiasCount, ppcCount } = obtenerDatosSimulados(instalacion.id);
        return (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-slate-200 border-slate-600">
              <Users className="h-3 w-3 mr-1" />
              {guardiasCount}
            </Badge>
            <Badge 
              variant={ppcCount > 2 ? "destructive" : ppcCount > 0 ? "default" : "secondary"}
              className={
                ppcCount > 2 
                  ? "bg-red-500/20 text-red-400" 
                  : ppcCount > 0 
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/20 text-emerald-400"
              }
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {ppcCount}
            </Badge>
          </div>
        );
      }
    },
    {
      key: "estado",
      label: "Estado",
      render: (instalacion) => (
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              instalacion.estado === "Activo" ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-slate-300">{instalacion.estado}</span>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (instalacion: Instalacion) => {
    const cliente = clientes.find(c => c.id === instalacion.cliente_id);
    const { guardiasCount, ppcCount } = obtenerDatosSimulados(instalacion.id);
    
    return (
      <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer hover:shadow-lg">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">{instalacion.nombre}</h3>
                  <p className="text-xs text-slate-400">ID: {instalacion.id.slice(0, 8)}</p>
                </div>
              </div>
              <div 
                className={`w-3 h-3 rounded-full ${
                  instalacion.estado === "Activo" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                  {cliente?.nombre || "Sin cliente"}
                </Badge>
              </div>
              <div className="flex items-start space-x-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{instalacion.direccion}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <span className="font-medium">Comuna:</span>
                <span>{instalacion.comuna}</span>
              </div>
            </div>
            
            <div className="flex space-x-2 pt-3 border-t border-slate-700">
              <Badge variant="outline" className="text-slate-200 border-slate-600">
                <Users className="h-3 w-3 mr-1" />
                {guardiasCount}
              </Badge>
              <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {ppcCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };



  // Filtrar instalaciones según los filtros aplicados
  const instalacionesFiltradas = instalaciones.filter(instalacion => {
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      if (!instalacion.nombre?.toLowerCase().includes(busqueda) &&
          !instalacion.cliente_nombre?.toLowerCase().includes(busqueda) &&
          !instalacion.direccion?.toLowerCase().includes(busqueda) &&
          !instalacion.comuna?.toLowerCase().includes(busqueda)) {
        return false;
      }
    }

    if (filtros.estado !== "Todos") {
      if (instalacion.estado !== filtros.estado) {
        return false;
      }
    }

    if (filtros.cliente_id) {
      if (instalacion.cliente_id !== filtros.cliente_id) {
        return false;
      }
    }

    if (showCriticas) {
      if (!esInstalacionCritica(instalacion)) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full flex flex-col"
      >
        {/* PageHeader con KPIs */}
        <PageHeader
          title="Gestión de Instalaciones"
          description="Administra las instalaciones y su estado operacional"
          actionButton={{
            label: "Nueva Instalación",
            icon: Plus,
            onClick: abrirModalNuevo
          }}
          kpis={[
            {
              label: "Total Instalaciones",
              value: kpis.totalInstalaciones,
              icon: Building2,
              variant: "default"
            },
            {
              label: "Guardias Asignados",
              value: kpis.guardiasAsignados,
              icon: Shield,
              variant: "success"
            },
            {
              label: "PPC Activos",
              value: kpis.ppcActivos,
              icon: TrendingUp,
              variant: kpis.ppcActivos > 0 ? "warning" : "success"
            },
            {
              label: "Críticas",
              value: kpis.criticas,
              icon: AlertTriangle,
              variant: kpis.criticas > 0 ? "danger" : "success"
            }
          ]}
        />

        {/* FilterBar con filtro de críticas */}
        <div className="mb-6">
          <FilterBar
            filters={filterConfigs}
            values={filtros}
            onFilterChange={handleFilterChange}
            onClearAll={clearFilters}
            searchPlaceholder="Buscar instalaciones..."
            className="mb-4"
          />
          
          {/* Filtro adicional para críticas */}
          <div className="flex justify-end">
            <Button
              variant={showCriticas ? "default" : "outline"}
              onClick={() => setShowCriticas(!showCriticas)}
              className={`
                ${showCriticas 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'border-slate-600 text-slate-200 hover:bg-slate-700'
                }
              `}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Solo críticas
            </Button>
          </div>
        </div>

        {/* DataTable */}
        <div className="flex-1 min-h-0">
          <DataTable
            data={instalacionesFiltradas}
            columns={columns}
            loading={loading}
            emptyMessage="No hay instalaciones registradas"
            emptyIcon={Building2}
            mobileCard={mobileCard}
            className="h-full"
            rowClassName="hover:shadow-lg transition-shadow duration-150 cursor-pointer"
            onRowClick={(instalacion) => {
              console.log('🔄 Navegando a instalación:', instalacion.id);
              router.push(`/instalaciones/${instalacion.id}`);
            }}
          />
        </div>
      </motion.div>

      {/* Modal para nueva/editar instalación */}
      <Modal
        isOpen={isModalOpen}
        onClose={cerrarModales}
        title={editingInstalacion ? "Editar instalación" : "Nueva instalación"}
        size="2xl"
        className="install-modal"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre de la Instalación *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre de la instalación"
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              {formErrors.nombre && (
                <p className="text-sm text-red-400">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cliente *
              </label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 ${
                  formErrors.cliente_id ? "border-red-500" : ""
                }`}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="text-sm text-red-400">{formErrors.cliente_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ciudad
              </label>
              <Input
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                placeholder="Ciudad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Comuna
              </label>
              <select
                name="comuna"
                value={formData.comuna}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
              >
                <option value="">Seleccionar comuna</option>
                {comunas.map(comuna => (
                  <option key={comuna.id} value={comuna.nombre}>
                    {comuna.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Valor Turno Extra
              </label>
              <Input
                type="number"
                name="valor_turno_extra"
                value={formData.valor_turno_extra}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className={formErrors.valor_turno_extra ? "border-red-500" : ""}
              />
              {formErrors.valor_turno_extra && (
                <p className="text-sm text-red-400">{formErrors.valor_turno_extra}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección *
            </label>
            <InputDireccion
              value={formData.direccion}
              initialLatitude={formData.latitud}
              initialLongitude={formData.longitud}
              onAddressSelect={handleAddressSelect}
              onAddressChange={handleAddressChange}
              placeholder="Buscar dirección con Google Maps..."
              showMap={true}
              showClearButton={true}
            />
            {formErrors.direccion && (
              <p className="text-sm text-red-400">{formErrors.direccion}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={cerrarModales}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarInstalacion}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingInstalacion ? "Editar" : "Crear"} Instalación
            </Button>
          </div>
        </div>
      </Modal>



      {/* Modal de confirmación */}
      <ConfirmModal />

      {/* Contenedor de toasts */}
      <ToastContainer />
    </>
  );
}

// Confirmación de navegación directa completada
console.log("✅ Navegación directa a instalaciones lista"); 