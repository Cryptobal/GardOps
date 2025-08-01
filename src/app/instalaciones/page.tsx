"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Settings,
  X
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
  obtenerEstadisticasInstalacion,
  logInstalacionCreada,
  logEdicionInstalacion,
  logCambioEstadoInstalacion,
  obtenerDatosCompletosInstalaciones,
  obtenerDocumentosVencidosInstalaciones
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
  puestosAsignados: number;
  ppcPendientes: number;
  documentosVencidos: number;
}

export default function InstalacionesPage() {
  const router = useRouter();
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstalacion, setEditingInstalacion] = useState<Instalacion | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCriticas, setShowCriticas] = useState(false);
  const [showPPCPendientes, setShowPPCPendientes] = useState(false);
  const [showDocumentosVencidos, setShowDocumentosVencidos] = useState(false);
  const [documentosVencidos, setDocumentosVencidos] = useState<{
    instalaciones: Array<{
      instalacion_id: string;
      instalacion_nombre: string;
      documentos_vencidos: number;
    }>;
    total: number;
  }>({ instalaciones: [], total: 0 });
  
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
  }, [filtros.search, filtros.estado, filtros.cliente_id, instalaciones, showCriticas, showPPCPendientes, showDocumentosVencidos]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Usar la nueva función optimizada que obtiene todo en una sola llamada
      const datosCompletos = await obtenerDatosCompletosInstalaciones();
      
      setInstalaciones(datosCompletos.instalaciones);
      setClientes(datosCompletos.clientes);
      setComunas(datosCompletos.comunas);
      
      setFiltros(prev => ({
        ...prev,
        totalCount: datosCompletos.instalaciones.length.toString()
      }));

      // Cargar documentos vencidos
      try {
        const docsVencidos = await obtenerDocumentosVencidosInstalaciones();
        setDocumentosVencidos(docsVencidos);
      } catch (error) {
        console.error("❌ Error cargando documentos vencidos:", error);
        // No mostrar error al usuario, solo log
      }
      
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      toast.error("Error al cargar los datos", "Error");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar instalaciones usando useMemo para optimizar rendimiento
  const instalacionesFiltradas = useMemo(() => {
    let filtradas = [...instalaciones];

    // Filtro por búsqueda
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
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

    // Filtro por PPC pendientes
    if (showPPCPendientes) {
      filtradas = filtradas.filter(instalacion => {
        const { ppcPendientes } = obtenerDatosReales(instalacion.id);
        return ppcPendientes > 0;
      });
    }

    // Filtro por documentos vencidos
    if (showDocumentosVencidos) {
      const instalacionesConDocsVencidos = documentosVencidos.instalaciones.map(doc => doc.instalacion_id);
      filtradas = filtradas.filter(instalacion => 
        instalacionesConDocsVencidos.includes(instalacion.id)
      );
    }

    return filtradas;
  }, [instalaciones, filtros.search, filtros.estado, filtros.cliente_id, showCriticas, showPPCPendientes, showDocumentosVencidos, documentosVencidos]);

  const aplicarFiltros = () => {
    setFiltros(prev => ({
      ...prev,
      filteredCount: instalacionesFiltradas.length.toString()
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
    setShowPPCPendientes(false);
    setShowDocumentosVencidos(false);
  };

  // Función para obtener datos reales de estadísticas
  const obtenerDatosReales = (instalacionId: string) => {
    const instalacion = instalaciones.find(i => i.id === instalacionId);
    if (!instalacion) {
      return {
        puestosCreados: 0,
        puestosAsignados: 0,
        ppcPendientes: 0,
        ppcTotales: 0,
        puestosDisponibles: 0
      };
    }
    
    return {
      puestosCreados: instalacion.puestos_creados || 0,
      puestosAsignados: instalacion.puestos_asignados || 0,
      ppcPendientes: instalacion.ppc_pendientes || 0,
      ppcTotales: instalacion.ppc_totales || 0,
      puestosDisponibles: instalacion.puestos_disponibles || 0
    };
  };

  // Función para determinar si una instalación es crítica
  const esInstalacionCritica = (instalacion: Instalacion): boolean => {
    const { puestosCreados, puestosAsignados, ppcPendientes } = obtenerDatosReales(instalacion.id);
    const porcentajePPC = puestosCreados > 0 ? (ppcPendientes / puestosCreados) * 100 : 0;
    
    return (
      instalacion.estado === "Inactivo" ||
      porcentajePPC > 20 ||
      ppcPendientes > 3
    );
  };

  // Calcular KPIs
  const calcularKPIs = (): KPIData => {
    // Calcular totales reales usando las propiedades de las instalaciones
    const totalPuestosAsignados = instalaciones.reduce((acc, instalacion) => {
      return acc + (instalacion.puestos_asignados || 0);
    }, 0);
    
    const totalPPCActivos = instalaciones.reduce((acc, instalacion) => {
      return acc + (instalacion.ppc_pendientes || 0);
    }, 0);
    
    return {
      totalInstalaciones: instalaciones.length,
      puestosAsignados: totalPuestosAsignados,
      ppcPendientes: totalPPCActivos,
      documentosVencidos: documentosVencidos.total
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
        const { puestosCreados, ppcPendientes, ppcTotales } = obtenerDatosReales(instalacion.id);
        return (
          <div className="group relative">
            <div className="flex items-center space-x-2 cursor-help">
              <span className="text-sm text-slate-400">{puestosCreados}</span>
              <span className="text-slate-600">|</span>
              <span className="text-sm text-red-400">{ppcPendientes}</span>
            </div>
            
            {/* Tooltip hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[200px]">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Puestos:</span>
                  <span className="text-slate-200 font-medium">{puestosCreados}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">PPC Pendientes:</span>
                  <span className="text-red-400 font-medium">{ppcPendientes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">PPC Totales:</span>
                  <span className="text-orange-400 font-medium">{ppcTotales}</span>
                </div>
                <div className="border-t border-slate-700 pt-1 mt-1">
                  <span className="text-slate-400 text-xs">Haz clic para ver detalles</span>
                </div>
              </div>
              {/* Flecha del tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
            </div>
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
    const { puestosCreados, ppcPendientes, ppcTotales } = obtenerDatosReales(instalacion.id);
    
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
            
            <div className="flex items-center space-x-2 pt-3 border-t border-slate-700">
              <div className="group relative">
                <div className="flex items-center space-x-2 cursor-help">
                  <span className="text-sm text-slate-400">{puestosCreados}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sm text-red-400">{ppcPendientes}</span>
                </div>
                
                {/* Tooltip hover para móvil */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[180px]">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Puestos:</span>
                      <span className="text-slate-200 font-medium">{puestosCreados}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">PPC Pendientes:</span>
                      <span className="text-red-400 font-medium">{ppcPendientes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">PPC Totales:</span>
                      <span className="text-orange-400 font-medium">{ppcTotales}</span>
                    </div>
                  </div>
                  {/* Flecha del tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };





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
              label: "Puestos Asignados",
              value: kpis.puestosAsignados,
              icon: Shield,
              variant: "success"
            },
            {
              label: "PPC Pendientes",
              value: kpis.ppcPendientes,
              icon: AlertTriangle,
              variant: kpis.ppcPendientes > 0 ? "warning" : "success",
              onClick: () => {
                setShowPPCPendientes(true);
                setShowCriticas(false);
                setShowDocumentosVencidos(false);
                toast.success('Filtrado por PPC pendientes', 'Filtro aplicado');
              }
            },
            {
              label: "Documentos Vencidos",
              value: kpis.documentosVencidos,
              icon: FileText,
              variant: kpis.documentosVencidos > 0 ? "danger" : "success",
              onClick: () => {
                setShowDocumentosVencidos(true);
                setShowCriticas(false);
                setShowPPCPendientes(false);
                toast.success('Filtrado por documentos vencidos', 'Filtro aplicado');
              }
            }
          ]}
        />

        {/* FilterBar */}
        <div className="mb-6">
          <FilterBar
            filters={filterConfigs}
            values={filtros}
            onFilterChange={handleFilterChange}
            onClearAll={clearFilters}
            searchPlaceholder="Buscar instalaciones..."
            className="mb-4"
          />
          
          {/* Indicador de filtro activo */}
          {(showPPCPendientes || showCriticas || showDocumentosVencidos) && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPPCPendientes(false);
                  setShowCriticas(false);
                  setShowDocumentosVencidos(false);
                  toast.success('Filtros limpiados', 'Filtro aplicado');
                }}
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          )}
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