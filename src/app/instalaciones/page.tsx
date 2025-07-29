"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Modal, useConfirmModal } from "../../components/ui/modal";
import { useToast, ToastContainer } from "../../components/ui/toast";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { InputDireccion, type AddressData } from "../../components/ui/input-direccion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { 
  Building2, 
  Plus, 
  Search,
  Filter,
  MapPin,
  Users,
  AlertTriangle,
  ChevronDown,
  Edit3,
  TrendingUp,
  Shield
} from "lucide-react";
import { 
  Instalacion, 
  CrearInstalacionData, 
  FiltrosInstalacion,
  Cliente,
  Comuna
} from "../../lib/schemas/instalaciones";
import InstalacionTabs from "../../components/InstalacionTabs";
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

interface KPIData {
  totalInstalaciones: number;
  guardiasAsignados: number;
  ppcActivos: number;
  criticas: number;
}

export default function InstalacionesPage() {
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [instalacionesFiltradas, setInstalacionesFiltradas] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingInstalacion, setEditingInstalacion] = useState<Instalacion | null>(null);
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(true); // Controla si está en modo lectura o edición
  const [isMobile, setIsMobile] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCriticas, setShowCriticas] = useState(false);

  
  // Estados para búsqueda y filtros
  const [filtros, setFiltros] = useState<FiltrosInstalacion>({
    busqueda: "",
    estado: "Todos",
    cliente_id: ""
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

  // Detectar mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [filtros, instalaciones, showCriticas]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar clientes primero para debug
      const clientesData = await obtenerClientes();
      
      // Cargar instalaciones
      let instalacionesData;
      try {
        instalacionesData = await obtenerInstalaciones();
      } catch (error) {
        console.error("❌ Error cargando instalaciones:", error);
        throw error;
      }
      
      // Cargar comunas
      const comunasData = await obtenerComunas();
      
      setInstalaciones(instalacionesData);
      setClientes(clientesData);
      setComunas(comunasData);
      
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
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
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

    setInstalacionesFiltradas(filtradas);
  };

  // Función para generar datos consistentes basados en ID
  const obtenerDatosSimulados = (instalacionId: string) => {
    // Usar el ID como semilla para generar datos consistentes
    const seed = instalacionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const guardiasCount = (seed % 8) + 1; // Entre 1 y 8 guardias
    const ppcCount = Math.floor((seed * 7) % 6); // Entre 0 y 5 PPC
    
    return { guardiasCount, ppcCount };
  };

  // Función para determinar si una instalación es crítica
  const esInstalacionCritica = (instalacion: Instalacion): boolean => {
    const { guardiasCount, ppcCount } = obtenerDatosSimulados(instalacion.id);
    
    // Calcular porcentaje de PPC respecto al total de guardias
    const porcentajePPC = guardiasCount > 0 ? (ppcCount / guardiasCount) * 100 : 0;
    
    // Una instalación es crítica si:
    // 1. Está inactiva (no operativa), O
    // 2. Los PPC representan más del 20% del total de guardias asignados
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
      guardiasAsignados: instalaciones.reduce((acc, inst) => acc + Math.floor(Math.random() * 5) + 1, 0), // Simulado
      ppcActivos: Math.floor(Math.random() * 6), // Simulado
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

  const abrirModalDetalles = (instalacion: Instalacion) => {
    setSelectedInstalacion(instalacion);
    setFormData({
      nombre: instalacion.nombre || '',
      cliente_id: instalacion.cliente_id || '',
      direccion: instalacion.direccion || '',
      latitud: instalacion.latitud ? Number(instalacion.latitud) : null,
      longitud: instalacion.longitud ? Number(instalacion.longitud) : null,
      ciudad: instalacion.ciudad || '',
      comuna: instalacion.comuna || '',
      valor_turno_extra: Number(instalacion.valor_turno_extra) || 0,
      estado: instalacion.estado || 'Activo',
    });
    setFormErrors({});
    setIsEditingDetails(false);
    setIsReadOnlyMode(true); // Siempre inicia en modo readonly

    setIsDetailModalOpen(true);
  };

  // Función para activar modo edición
  const activarModoEdicion = () => {
    setIsReadOnlyMode(false);
  };

  // Función para guardar y volver a modo readonly
  const guardarYVolverAReadonly = async () => {
    await guardarInstalacion();
    setIsReadOnlyMode(true);
  };

  const cerrarModales = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setEditingInstalacion(null);
    setSelectedInstalacion(null);
    setFormErrors({});
    setIsReadOnlyMode(true); // Reset a modo readonly
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "valor_turno_extra" ? parseFloat(value) || 0 : value
    }));
    
    // Limpiar error del campo
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
        // Actualizar instalación existente
        const instalacionActualizada = await actualizarInstalacion(editingInstalacion.id, formData);
        
        setInstalaciones(prev => 
          prev.map(inst => 
            inst.id === editingInstalacion.id ? instalacionActualizada : inst
          )
        );

        await logEdicionInstalacion(editingInstalacion.id, "Datos generales actualizados");
        
        toast.success("Instalación actualizada correctamente", "Éxito");
      } else {
        // Crear nueva instalación
        const nuevaInstalacion = await crearInstalacion(formData);
        
        setInstalaciones(prev => [...prev, nuevaInstalacion]);

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
      const estadoAnterior = instalacion.estado;
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

  const eliminarInstalacionHandler = async (instalacion: Instalacion) => {
    const confirmed = await confirm({
      title: "Eliminar instalación",
      message: `¿Está seguro de que desea eliminar la instalación "${instalacion.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await eliminarInstalacion(instalacion.id);
      
      setInstalaciones(prev => prev.filter(inst => inst.id !== instalacion.id));
      
      toast.success("Instalación eliminada correctamente", "Éxito");
    } catch (error) {
      console.error("Error eliminando instalación:", error);
      toast.error("No se pudo eliminar la instalación", "Error");
    }
  };

  // Componente KPI Card
  const KPICard: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  }> = ({ label, value, icon, variant = 'default' }) => {
    const variantClasses = {
      default: 'bg-slate-800 border-slate-700 text-slate-200',
      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      danger: 'bg-red-500/10 border-red-500/20 text-red-400'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 ${variantClasses[variant]}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider opacity-80">
              {label}
            </p>
            <p className="text-3xl font-bold mt-2">
              {value.toLocaleString()}
            </p>
          </div>
          <div className="opacity-60">
            {icon}
          </div>
        </div>
      </motion.div>
    );
  };

  // Componente Dropdown personalizado
  const CustomDropdown: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    placeholder?: string;
  }> = ({ label, value, options, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="min-w-[180px] justify-between bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
        >
          <span className="truncate">
            {options.find(opt => opt.value === value)?.label || placeholder || label}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-60" />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {option.value === value && (
                  <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const InstalacionTableRow: React.FC<{ instalacion: Instalacion }> = ({ instalacion }) => {
    const cliente = clientes.find(c => c.id === instalacion.cliente_id);
    
    // Simulación de datos para guardias y PPC
    const guardiasCount = Math.floor(Math.random() * 8) + 1;
    const ppcCount = Math.floor(Math.random() * 3);
    
    return (
      <TableRow 
        key={instalacion.id} 
        className="border-muted/40 hover:bg-muted/10 transition-all duration-200 cursor-pointer"
        onClick={() => abrirModalDetalles(instalacion)}
        role="button"
        aria-label={`Ver detalles de ${instalacion.nombre}`}
      >
        <TableCell className="text-slate-200 font-medium">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold hover:text-blue-400 transition-colors">{instalacion.nombre}</p>
              <p className="text-xs text-slate-400">ID: {instalacion.id.slice(0, 8)}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="bg-slate-700 text-slate-200">
            {cliente?.nombre || "Sin cliente"}
          </Badge>
        </TableCell>
        <TableCell className="text-slate-300 max-w-[200px]">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
            <span className="truncate" title={instalacion.direccion}>
              {instalacion.direccion}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-slate-300">
          {instalacion.comuna}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-slate-200 border-slate-600">
            <Users className="h-3 w-3 mr-1" />
            {guardiasCount}
          </Badge>
        </TableCell>
        <TableCell>
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
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                instalacion.estado === "Activo" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-slate-300">{instalacion.estado}</span>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const InstalacionCard: React.FC<{ instalacion: Instalacion }> = ({ instalacion }) => {
    const cliente = clientes.find(c => c.id === instalacion.cliente_id);
    
    return (
      <Card 
        key={instalacion.id} 
        className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer hover:shadow-lg"
        onClick={() => abrirModalDetalles(instalacion)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-slate-200 text-lg">{instalacion.nombre}</CardTitle>
                <p className="text-xs text-slate-400">ID: {instalacion.id.slice(0, 8)}</p>
              </div>
            </div>
            <div 
              className={`w-3 h-3 rounded-full ${
                instalacion.estado === "Activo" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
              {Math.floor(Math.random() * 8) + 1}
            </Badge>
            <Badge variant="destructive" className="bg-red-500/20 text-red-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {Math.floor(Math.random() * 3)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Instalaciones</h1>
            <p className="text-slate-400 mt-1">Gestiona las instalaciones y su estado operacional</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Instalaciones"
            value={kpis.totalInstalaciones}
            icon={<Building2 className="h-8 w-8" />}
            variant="default"
          />
          <KPICard
            label="Guardias asignados"
            value={kpis.guardiasAsignados}
            icon={<Shield className="h-8 w-8" />}
            variant="success"
          />
          <KPICard
            label="PPC activos"
            value={kpis.ppcActivos}
            icon={<TrendingUp className="h-8 w-8" />}
            variant={kpis.ppcActivos > 0 ? "warning" : "success"}
          />
          <KPICard
            label="Críticas"
            value={kpis.criticas}
            icon={<AlertTriangle className="h-8 w-8" />}
            variant={kpis.criticas > 0 ? "danger" : "success"}
          />
        </div>

        {/* Toolbar */}
        <div className="sticky top-4 z-30 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar instalaciones..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <CustomDropdown
              label="Estado"
              value={filtros.estado}
              onChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              options={[
                { value: "Todos", label: "Todos los estados" },
                { value: "Activo", label: "Activos" },
                { value: "Inactivo", label: "Inactivos" }
              ]}
            />

            <CustomDropdown
              label="Cliente"
              value={filtros.cliente_id}
              onChange={(value) => setFiltros(prev => ({ ...prev, cliente_id: value }))}
              options={[
                { value: "", label: "Todos los clientes" },
                ...clientes.map(cliente => ({
                  value: cliente.id,
                  label: cliente.nombre
                }))
              ]}
            />

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
              <Filter className="mr-2 h-4 w-4" />
              Solo críticas
            </Button>

            <div className="ml-auto">
              <Button
                onClick={abrirModalNuevo}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva instalación
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : instalacionesFiltradas.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <Building2 className="h-20 w-20 text-slate-500 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-slate-300 mb-3">No hay instalaciones</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                {filtros.busqueda || filtros.estado !== "Todos" || filtros.cliente_id || showCriticas
                  ? "No se encontraron instalaciones con los filtros aplicados"
                  : "Comienza creando tu primera instalación para gestionar las operaciones"}
              </p>
              {!filtros.busqueda && filtros.estado === "Todos" && !filtros.cliente_id && !showCriticas && (
                <Button onClick={abrirModalNuevo} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera instalación
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vista de tabla para desktop */}
            <div className="hidden lg:block">
              <Card className="bg-slate-800 border-slate-700 overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-750">
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-300 font-semibold">Nombre</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Cliente</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Dirección</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Comuna</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Guardias</TableHead>
                        <TableHead className="text-slate-300 font-semibold">PPC</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instalacionesFiltradas.map((instalacion) => (
                        <InstalacionTableRow key={instalacion.id} instalacion={instalacion} />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Vista de tarjetas para mobile/tablet */}
            <div className="lg:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instalacionesFiltradas.map((instalacion) => (
                  <InstalacionCard key={instalacion.id} instalacion={instalacion} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal para nueva/editar instalación */}
      <Modal
        isOpen={isModalOpen}
        onClose={cerrarModales}
        title={editingInstalacion ? "Editar instalación" : "Nueva instalación"}
        size="2xl"
        className="install-modal"
      >
        <InstalacionTabs
          instalacionId={editingInstalacion?.id || ""}
          selectedInstalacion={editingInstalacion}
          formData={formData}
          isEditingDetails={false}
          setIsEditingDetails={() => {}}
          handleInputChange={handleInputChange}
          handleAddressSelect={handleAddressSelect}
          handleAddressChange={handleAddressChange}
          formErrors={formErrors}
          guardarInstalacion={guardarInstalacion}
          cambiarEstadoInstalacion={cambiarEstadoInstalacion}
          clientes={clientes}
          comunas={comunas}
          showActionButtons={true}
          onCancel={cerrarModales}
        />
      </Modal>

      {/* Modal de detalles - 100% igual al modal de crear/editar */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={cerrarModales}
        title={selectedInstalacion ? (isReadOnlyMode ? `Detalles: ${selectedInstalacion.nombre}` : `Editar ${selectedInstalacion.nombre}`) : "Detalles de instalación"}
        size="2xl"
        className="install-modal"
      >
        {selectedInstalacion && (
          <InstalacionTabs
            instalacionId={selectedInstalacion.id}
            selectedInstalacion={selectedInstalacion}
            formData={formData}
            isEditingDetails={false}
            setIsEditingDetails={() => {}}
            handleInputChange={handleInputChange}
            handleAddressSelect={handleAddressSelect}
            handleAddressChange={handleAddressChange}
            formErrors={formErrors}
            guardarInstalacion={isReadOnlyMode ? guardarYVolverAReadonly : guardarInstalacion}
            cambiarEstadoInstalacion={cambiarEstadoInstalacion}
            clientes={clientes}
            comunas={comunas}
            showActionButtons={true}
            onCancel={cerrarModales}
            isReadOnly={isReadOnlyMode}
            onEnableEdit={activarModoEdicion}
          />
        )}
      </Modal>



      <ConfirmModal />
      <ToastContainer />
    </div>
  );
} 