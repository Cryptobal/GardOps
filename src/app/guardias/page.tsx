"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Modal, useConfirmModal } from "../../components/ui/modal";
import { useToast, ToastContainer } from "../../components/ui/toast";
import { Input } from "../../components/ui/input";
import { 
  Shield, 
  Plus, 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Trash2,
  FileText,
  Activity,
  Settings,
  Building2,
  Users
} from "lucide-react";

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";
import { PageHeader } from "../../components/ui/page-header";
import { FilterBar, FilterConfig } from "../../components/ui/filter-bar";
import { EntityModal } from "../../components/ui/entity-modal";
import { EntityTabs, TabConfig } from "../../components/ui/entity-tabs";
import { DocumentManager } from "../../components/shared/document-manager";
import { LogViewer } from "../../components/shared/log-viewer";

// Interfaces para guardias
interface Guardia {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  fecha_ingreso: string;
  estado: "Activo" | "Inactivo";
  tipo_contrato: "Indefinido" | "Plazo Fijo" | "Por Obra";
  sueldo_base: number;
  instalacion_id?: string;
  instalacion_nombre?: string;
  cliente_nombre?: string;
}

interface CrearGuardiaData {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  fecha_ingreso: string;
  estado: "Activo" | "Inactivo";
  tipo_contrato: "Indefinido" | "Plazo Fijo" | "Por Obra";
  sueldo_base: number;
  instalacion_id?: string;
}

interface KPIData {
  totalGuardias: number;
  guardiasActivos: number;
  guardiasInactivos: number;
  promedioSueldo: number;
}

export default function GuardiasPage() {
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingGuardia, setEditingGuardia] = useState<Guardia | null>(null);
  const [selectedGuardia, setSelectedGuardia] = useState<Guardia | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Record<string, string>>({
    search: "",
    estado: "Todos",
    tipo_contrato: "Todos",
    totalCount: "0",
    filteredCount: "0"
  });

  const [formData, setFormData] = useState<CrearGuardiaData>({
    nombre: "",
    apellido: "",
    rut: "",
    email: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
    fecha_ingreso: "",
    estado: "Activo",
    tipo_contrato: "Indefinido",
    sueldo_base: 0,
    instalacion_id: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirmModal();

  // Configuración de filtros
  const filterConfigs: FilterConfig[] = [
    {
      key: "estado",
      label: "Estado",
      type: "select",
      options: [
        { value: "Todos", label: "Todos" },
        { value: "Activo", label: "Activos" },
        { value: "Inactivo", label: "Inactivos" }
      ]
    },
    {
      key: "tipo_contrato",
      label: "Tipo Contrato",
      type: "select",
      options: [
        { value: "Todos", label: "Todos" },
        { value: "Indefinido", label: "Indefinido" },
        { value: "Plazo Fijo", label: "Plazo Fijo" },
        { value: "Por Obra", label: "Por Obra" }
      ]
    }
  ];

  // Cargar guardias al montar el componente
  useEffect(() => {
    cargarGuardias();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [filtros.search, filtros.estado, filtros.tipo_contrato, guardias]);

  const cargarGuardias = async () => {
    try {
      setLoading(true);
      // Simular carga de datos
      const mockGuardias: Guardia[] = [
        {
          id: "1",
          nombre: "Juan",
          apellido: "Pérez",
          rut: "12345678-9",
          email: "juan.perez@email.com",
          telefono: "+56 9 1234 5678",
          direccion: "Av. Providencia 123, Santiago",
          fecha_nacimiento: "1985-03-15",
          fecha_ingreso: "2020-01-15",
          estado: "Activo",
          tipo_contrato: "Indefinido",
          sueldo_base: 450000,
          instalacion_id: "1",
          instalacion_nombre: "Edificio Corporativo",
          cliente_nombre: "Empresa ABC"
        },
        {
          id: "2",
          nombre: "María",
          apellido: "González",
          rut: "98765432-1",
          email: "maria.gonzalez@email.com",
          telefono: "+56 9 8765 4321",
          direccion: "Las Condes 456, Santiago",
          fecha_nacimiento: "1990-07-22",
          fecha_ingreso: "2021-03-10",
          estado: "Activo",
          tipo_contrato: "Plazo Fijo",
          sueldo_base: 420000,
          instalacion_id: "2",
          instalacion_nombre: "Centro Comercial",
          cliente_nombre: "Empresa XYZ"
        },
        {
          id: "3",
          nombre: "Carlos",
          apellido: "Rodríguez",
          rut: "45678912-3",
          email: "carlos.rodriguez@email.com",
          telefono: "+56 9 4567 8912",
          direccion: "Ñuñoa 789, Santiago",
          fecha_nacimiento: "1988-11-08",
          fecha_ingreso: "2019-08-20",
          estado: "Inactivo",
          tipo_contrato: "Indefinido",
          sueldo_base: 480000,
          instalacion_id: "1",
          instalacion_nombre: "Edificio Corporativo",
          cliente_nombre: "Empresa ABC"
        }
      ];
      
      setGuardias(mockGuardias);
      setFiltros(prev => ({
        ...prev,
        totalCount: mockGuardias.length.toString()
      }));
    } catch (error) {
      console.error("Error cargando guardias:", error);
      toast.error("Error al cargar guardias");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...guardias];

    // Filtro por búsqueda
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      filtered = filtered.filter(guardia => 
        guardia.nombre.toLowerCase().includes(busqueda) ||
        guardia.apellido.toLowerCase().includes(busqueda) ||
        guardia.rut.includes(busqueda) ||
        guardia.email.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por estado
    if (filtros.estado !== "Todos") {
      filtered = filtered.filter(guardia => guardia.estado === filtros.estado);
    }

    // Filtro por tipo de contrato
    if (filtros.tipo_contrato !== "Todos") {
      filtered = filtered.filter(guardia => guardia.tipo_contrato === filtros.tipo_contrato);
    }

    setFiltros(prev => ({
      ...prev,
      filteredCount: filtered.length.toString()
    }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFiltros({
      search: "",
      estado: "Todos",
      tipo_contrato: "Todos",
      totalCount: filtros.totalCount,
      filteredCount: filtros.totalCount
    });
  };

  // Abrir modal para nuevo guardia
  const abrirModalNuevo = () => {
    setEditingGuardia(null);
    setFormData({
      nombre: "",
      apellido: "",
      rut: "",
      email: "",
      telefono: "",
      direccion: "",
      fecha_nacimiento: "",
      fecha_ingreso: "",
      estado: "Activo",
      tipo_contrato: "Indefinido",
      sueldo_base: 0,
      instalacion_id: ""
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal de detalles del guardia
  const abrirModalDetalles = (guardia: Guardia) => {
    setSelectedGuardia(guardia);
    setFormData({
      nombre: guardia.nombre,
      apellido: guardia.apellido,
      rut: guardia.rut,
      email: guardia.email,
      telefono: guardia.telefono,
      direccion: guardia.direccion,
      fecha_nacimiento: guardia.fecha_nacimiento,
      fecha_ingreso: guardia.fecha_ingreso,
      estado: guardia.estado,
      tipo_contrato: guardia.tipo_contrato,
      sueldo_base: guardia.sueldo_base,
      instalacion_id: guardia.instalacion_id || ""
    });
    setIsEditingDetails(false);
    setIsDetailModalOpen(true);
  };

  // Cerrar modales
  const cerrarModales = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setEditingGuardia(null);
    setSelectedGuardia(null);
    setIsEditingDetails(false);
    setFormErrors({});
  };

  // Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === "sueldo_base" ? parseFloat(value) || 0 : value 
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio";
    }

    if (!formData.apellido.trim()) {
      errors.apellido = "El apellido es obligatorio";
    }

    if (!formData.rut.trim()) {
      errors.rut = "El RUT es obligatorio";
    } else if (!/^[0-9]+-[0-9kK]{1}$/.test(formData.rut)) {
      errors.rut = "Formato de RUT inválido (ej: 12345678-9)";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de email inválido";
    }

    if (formData.sueldo_base < 0) {
      errors.sueldo_base = "El sueldo debe ser mayor o igual a 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar guardia
  const guardarGuardia = async () => {
    if (!validarFormulario()) return;

    try {
      if (editingGuardia) {
        // Actualizar guardia existente
        const guardiaActualizado = { ...editingGuardia, ...formData };
        setGuardias(prev => 
          prev.map(g => g.id === editingGuardia.id ? guardiaActualizado : g)
        );
        toast.success("Guardia actualizado correctamente");
      } else {
        // Crear nuevo guardia
        const nuevoGuardia: Guardia = {
          id: Date.now().toString(),
          ...formData,
          instalacion_nombre: "Sin asignar",
          cliente_nombre: "Sin cliente"
        };
        setGuardias(prev => [...prev, nuevoGuardia]);
        toast.success("Guardia creado correctamente");
      }

      cerrarModales();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error guardando guardia:", error);
      toast.error("Error al guardar guardia");
    }
  };

  // Cambiar estado del guardia
  const cambiarEstadoGuardia = async (guardia: Guardia, nuevoEstado: boolean) => {
    try {
      const estadoTexto = nuevoEstado ? "Activo" : "Inactivo";
      const guardiaActualizado = { ...guardia, estado: estadoTexto as "Activo" | "Inactivo" };
      
      setGuardias(prev => 
        prev.map(g => g.id === guardia.id ? guardiaActualizado : g)
      );
      
      toast.success(`Guardia ${estadoTexto.toLowerCase()} correctamente`);
      
      if (selectedGuardia?.id === guardia.id) {
        setSelectedGuardia(guardiaActualizado);
        setFormData(prev => ({ ...prev, estado: estadoTexto as "Activo" | "Inactivo" }));
      }
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error cambiando estado del guardia:", error);
      toast.error("Error al cambiar estado");
    }
  };

  // Eliminar guardia
  const eliminarGuardia = async (guardia: Guardia) => {
    const confirmed = await confirm({
      title: "Eliminar Guardia",
      message: "¿Estás seguro de que deseas eliminar este guardia? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      setGuardias(prev => prev.filter(g => g.id !== guardia.id));
      toast.success("Guardia eliminado con éxito");
      
      if (selectedGuardia?.id === guardia.id) {
        cerrarModales();
      }
    } catch (error) {
      console.error("Error eliminando guardia:", error);
      toast.error("Error al eliminar guardia");
    }
  };

  // Calcular KPIs
  const calcularKPIs = (): KPIData => {
    const activos = guardias.filter(g => g.estado === "Activo").length;
    const inactivos = guardias.filter(g => g.estado === "Inactivo").length;
    const promedioSueldo = guardias.length > 0 
      ? guardias.reduce((acc, g) => acc + g.sueldo_base, 0) / guardias.length 
      : 0;

    return {
      totalGuardias: guardias.length,
      guardiasActivos: activos,
      guardiasInactivos: inactivos,
      promedioSueldo: Math.round(promedioSueldo)
    };
  };

  const kpis = calcularKPIs();

  // Configuración de columnas para DataTable
  const columns: Column<Guardia>[] = [
    {
      key: "nombre",
      label: "Nombre",
      render: (guardia) => (
        <div>
          <div className="font-bold text-foreground">{`${guardia.nombre} ${guardia.apellido}`}</div>
          <div className="text-xs text-muted-foreground font-mono">{guardia.rut}</div>
        </div>
      )
    },
    {
      key: "contacto",
      label: "Contacto",
      render: (guardia) => (
        <div className="space-y-1">
          {guardia.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{guardia.email}</span>
            </div>
          )}
          {guardia.telefono && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{guardia.telefono}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: "asignacion",
      label: "Asignación",
      render: (guardia) => (
        guardia.instalacion_nombre ? (
          <div>
            <div className="text-foreground">{guardia.instalacion_nombre}</div>
            <div className="text-xs text-muted-foreground">{guardia.cliente_nombre}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin asignar</span>
        )
      )
    },
    {
      key: "contrato",
      label: "Contrato",
      render: (guardia) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            {guardia.tipo_contrato}
          </Badge>
          <div className="text-xs text-muted-foreground">
            ${guardia.sueldo_base.toLocaleString()}
          </div>
        </div>
      )
    },
    {
      key: "fechas",
      label: "Fechas",
      render: (guardia) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{new Date(guardia.fecha_ingreso).toLocaleDateString()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(guardia.fecha_nacimiento).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: "estado",
      label: "Estado",
      render: (guardia) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={guardia.estado === "Activo"}
            onCheckedChange={(checked) => cambiarEstadoGuardia(guardia, checked)}
          />
          <Badge variant={guardia.estado === "Activo" ? "success" : "inactive"}>
            {guardia.estado}
          </Badge>
        </div>
      )
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (guardia) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => abrirModalDetalles(guardia)}
            className="hover:bg-blue-500/10 hover:border-blue-500/30 h-7 w-7 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => eliminarGuardia(guardia)}
            className="hover:bg-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 h-7 w-7 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (guardia: Guardia) => (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{`${guardia.nombre} ${guardia.apellido}`}</h3>
              <p className="text-sm text-muted-foreground font-mono">{guardia.rut}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={guardia.estado === "Activo"}
                onCheckedChange={(checked) => cambiarEstadoGuardia(guardia, checked)}
              />
            </div>
          </div>
          
          {guardia.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.email}</span>
            </div>
          )}
          
          {guardia.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.telefono}</span>
            </div>
          )}
          
          {guardia.instalacion_nombre && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{guardia.instalacion_nombre}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {guardia.tipo_contrato}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ${guardia.sueldo_base.toLocaleString()}
            </span>
          </div>
          
          <Button variant="outline" size="sm" className="w-full mt-2">
            Ver detalles
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Configuración de tabs para EntityTabs
  const getTabsConfig = (): TabConfig[] => [
    {
      key: "informacion",
      label: "Información",
      icon: User,
      color: "blue",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre"
                className={formErrors.nombre ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.nombre && (
                <p className="text-sm text-red-400">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Apellido *
              </label>
              <Input
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                placeholder="Ingresa el apellido"
                className={formErrors.apellido ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.apellido && (
                <p className="text-sm text-red-400">{formErrors.apellido}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT *
              </label>
              <Input
                name="rut"
                value={formData.rut}
                onChange={handleInputChange}
                placeholder="12345678-9"
                className={formErrors.rut ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.rut && (
                <p className="text-sm text-red-400">{formErrors.rut}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="correo@email.com"
                className={formErrors.email ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.email && (
                <p className="text-sm text-red-400">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Teléfono
              </label>
              <Input
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="+56 9 1234 5678"
                disabled={!isEditingDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tipo de Contrato
              </label>
              <select
                name="tipo_contrato"
                value={formData.tipo_contrato}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 ${
                  !isEditingDetails ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!isEditingDetails}
              >
                <option value="Indefinido">Indefinido</option>
                <option value="Plazo Fijo">Plazo Fijo</option>
                <option value="Por Obra">Por Obra</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Sueldo Base
              </label>
              <Input
                type="number"
                name="sueldo_base"
                value={formData.sueldo_base}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="1000"
                className={formErrors.sueldo_base ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.sueldo_base && (
                <p className="text-sm text-red-400">{formErrors.sueldo_base}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de Nacimiento
              </label>
              <Input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
                disabled={!isEditingDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de Ingreso
              </label>
              <Input
                type="date"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleInputChange}
                disabled={!isEditingDetails}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <Input
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Ingresa la dirección"
              disabled={!isEditingDetails}
            />
          </div>
        </div>
      )
    },
    {
      key: "documentos",
      label: "Documentos",
      icon: FileText,
      color: "emerald",
      content: (
        <DocumentManager
          modulo="guardias"
          entidadId={selectedGuardia?.id || ""}
          onDocumentDeleted={() => setRefreshTrigger(prev => prev + 1)}
          onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
          refreshTrigger={refreshTrigger}
        />
      )
    },
    {
      key: "logs",
      label: "Actividad",
      icon: Activity,
      color: "violet",
      content: (
        <LogViewer
          modulo="guardias"
          entidadId={selectedGuardia?.id || ""}
          refreshTrigger={refreshTrigger}
        />
      )
    }
  ];

  // Filtrar guardias según los filtros aplicados
  const guardiasFiltrados = guardias.filter(guardia => {
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      if (!guardia.nombre.toLowerCase().includes(busqueda) &&
          !guardia.apellido.toLowerCase().includes(busqueda) &&
          !guardia.rut.includes(busqueda) &&
          !guardia.email.toLowerCase().includes(busqueda)) {
        return false;
      }
    }

    if (filtros.estado !== "Todos") {
      if (guardia.estado !== filtros.estado) {
        return false;
      }
    }

    if (filtros.tipo_contrato !== "Todos") {
      if (guardia.tipo_contrato !== filtros.tipo_contrato) {
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
          title="Gestión de Guardias"
          description="Administra el personal de seguridad y sus asignaciones"
          actionButton={{
            label: "Nuevo Guardia",
            icon: Plus,
            onClick: abrirModalNuevo
          }}
          kpis={[
            {
              label: "Total Guardias",
              value: kpis.totalGuardias,
              icon: Shield,
              variant: "default"
            },
            {
              label: "Guardias Activos",
              value: kpis.guardiasActivos,
              icon: Shield,
              variant: "success"
            },
            {
              label: "Guardias Inactivos",
              value: kpis.guardiasInactivos,
              icon: Shield,
              variant: "warning"
            },
            {
              label: "Promedio Sueldo",
              value: kpis.promedioSueldo,
              icon: Users,
              variant: "default"
            }
          ]}
        />

        {/* FilterBar */}
        <FilterBar
          filters={filterConfigs}
          values={filtros}
          onFilterChange={handleFilterChange}
          onClearAll={clearFilters}
          searchPlaceholder="Buscar por nombre, apellido, RUT o email..."
          className="mb-6"
        />

        {/* DataTable */}
        <div className="flex-1 min-h-0">
          <DataTable
            data={guardiasFiltrados}
            columns={columns}
            loading={loading}
            emptyMessage="No hay guardias registrados"
            emptyIcon={Shield}
            onRowClick={abrirModalDetalles}
            mobileCard={mobileCard}
            className="h-full"
          />
        </div>
      </motion.div>

      {/* Modal de creación */}
      <Modal
        isOpen={isModalOpen}
        onClose={cerrarModales}
        title="Nuevo Guardia"
        className="bg-card/95 backdrop-blur-md"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre"
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              {formErrors.nombre && (
                <p className="text-sm text-red-400">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Apellido *
              </label>
              <Input
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                placeholder="Ingresa el apellido"
                className={formErrors.apellido ? "border-red-500" : ""}
              />
              {formErrors.apellido && (
                <p className="text-sm text-red-400">{formErrors.apellido}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT *
              </label>
              <Input
                name="rut"
                value={formData.rut}
                onChange={handleInputChange}
                placeholder="12345678-9"
                className={formErrors.rut ? "border-red-500" : ""}
              />
              {formErrors.rut && (
                <p className="text-sm text-red-400">{formErrors.rut}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="correo@email.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-sm text-red-400">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Teléfono
              </label>
              <Input
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Tipo de Contrato
              </label>
              <select
                name="tipo_contrato"
                value={formData.tipo_contrato}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200"
              >
                <option value="Indefinido">Indefinido</option>
                <option value="Plazo Fijo">Plazo Fijo</option>
                <option value="Por Obra">Por Obra</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Sueldo Base
              </label>
              <Input
                type="number"
                name="sueldo_base"
                value={formData.sueldo_base}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="1000"
                className={formErrors.sueldo_base ? "border-red-500" : ""}
              />
              {formErrors.sueldo_base && (
                <p className="text-sm text-red-400">{formErrors.sueldo_base}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de Nacimiento
              </label>
              <Input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de Ingreso
              </label>
              <Input
                type="date"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <Input
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Ingresa la dirección"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={cerrarModales}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarGuardia}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Crear Guardia
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de detalles del guardia con EntityTabs */}
      <EntityModal
        isOpen={isDetailModalOpen}
        onClose={cerrarModales}
        title={`Detalles - ${selectedGuardia?.nombre} ${selectedGuardia?.apellido}`}
        size="2xl"
      >
        {selectedGuardia && (
          <EntityTabs
            tabs={getTabsConfig()}
            showActionButtons={true}
            onCancel={cerrarModales}
            onSave={guardarGuardia}
            onEdit={() => setIsEditingDetails(!isEditingDetails)}
            isReadOnly={!isEditingDetails}
          />
        )}
      </EntityModal>

      {/* Modal de confirmación */}
      <ConfirmModal />

      {/* Contenedor de toasts */}
      <ToastContainer />
    </>
  );
}

// Confirmación de auditoría completada
console.log("✅ Módulo Guardias implementado con componentes genéricos"); 