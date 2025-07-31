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
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  Phone, 
  User, 
  Eye,
  Building2,
  FileText,
  Activity,
  Settings,
  MapPin
} from "lucide-react";
import { Cliente, CrearClienteData, FiltrosCliente } from "../../lib/schemas/clientes";
// DocumentUploader eliminado - integrado en DocumentManager

// Importar componentes genéricos
import { DataTable, Column } from "../../components/ui/data-table";
import { PageHeader } from "../../components/ui/page-header";
import { FilterBar, FilterConfig } from "../../components/ui/filter-bar";
import { EntityModal } from "../../components/ui/entity-modal";
import { EntityTabs, TabConfig } from "../../components/ui/entity-tabs";
import { LocationTab } from "../../components/ui/location-tab";
import { DocumentManager } from "../../components/shared/document-manager";
import { LogViewer } from "../../components/shared/log-viewer";

import { 
  logCambioEstado, 
  logEdicionDatos, 
  logClienteCreado,
  obtenerUsuarioActual 
} from "../../lib/api/logs-clientes";

export default function ClientesPage() {
  console.log("Vista de clientes cargada correctamente");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Record<string, string>>({
    search: "",
    estado: "Todos",
    totalCount: "0",
    filteredCount: "0"
  });

  const [formData, setFormData] = useState<CrearClienteData>({
    nombre: "",
    rut: "",
    representante_legal: "",
    rut_representante: "",
    email: "",
    telefono: "",
    direccion: "",
    latitud: null,
    longitud: null,
    ciudad: "",
    comuna: "",
    razon_social: "",
    estado: "Activo",
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
        { value: "Activo", label: "Activo" },
        { value: "Inactivo", label: "Inactivo" }
      ]
    }
  ];

  // Cargar clientes al montar el componente
  useEffect(() => {
    cargarClientes();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [clientes, filtros.search, filtros.estado]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clientes");
      const result = await response.json();

      if (result.success) {
        setClientes(result.data);
        setFiltros(prev => ({
          ...prev,
          totalCount: result.data.length.toString()
        }));
      } else {
        toast.error("Error al cargar clientes");
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...clientes];

    // Filtro por búsqueda
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      filtered = filtered.filter(cliente => 
        cliente.nombre.toLowerCase().includes(busqueda) ||
        cliente.rut.includes(busqueda) ||
        (cliente.representante_legal && cliente.representante_legal.toLowerCase().includes(busqueda))
      );
    }

    // Filtro por estado
    if (filtros.estado !== "Todos") {
      filtered = filtered.filter(cliente => 
        (cliente.estado || "Activo") === filtros.estado
      );
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
      totalCount: filtros.totalCount,
      filteredCount: filtros.totalCount
    });
  };

  // Abrir modal para nuevo cliente
  const abrirModalNuevo = () => {
    setEditingCliente(null);
    setFormData({
      nombre: "",
      rut: "",
      representante_legal: "",
      rut_representante: "",
      email: "",
      telefono: "",
      direccion: "",
      latitud: null,
      longitud: null,
      ciudad: "",
      comuna: "",
      razon_social: "",
      estado: "Activo",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal de detalles del cliente
  const abrirModalDetalles = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      rut: cliente.rut,
      representante_legal: cliente.representante_legal || "",
      rut_representante: cliente.rut_representante || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      latitud: cliente.latitud || null,
      longitud: cliente.longitud || null,
      ciudad: cliente.ciudad || "",
      comuna: cliente.comuna || "",
      razon_social: cliente.razon_social || "",
      estado: (cliente.estado || "Activo") as "Activo" | "Inactivo",
    });
    setIsEditingDetails(false);
    setIsDetailModalOpen(true);
  };

  // Cerrar modales
  const cerrarModales = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setEditingCliente(null);
    setSelectedCliente(null);
    setIsEditingDetails(false);
    setFormErrors({});
  };

  // Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Manejar selección de dirección
  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      direccion: addressData.direccionCompleta,
      latitud: addressData.latitud,
      longitud: addressData.longitud,
    }));
  };

  // Manejar cambio manual de dirección
  const handleAddressChange = (query: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: query,
      latitud: query === prev.direccion ? prev.latitud : null,
      longitud: query === prev.direccion ? prev.longitud : null,
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

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio";
    }

    if (!formData.rut.trim()) {
      errors.rut = "El RUT de la empresa es obligatorio";
    } else if (!/^[0-9]+-[0-9kK]{1}$/.test(formData.rut)) {
      errors.rut = "Formato de RUT inválido (ej: 12345678-9)";
    }

    if (formData.rut_representante && !/^[0-9]+-[0-9kK]{1}$/.test(formData.rut_representante)) {
      errors.rut_representante = "Formato de RUT inválido (ej: 12345678-9)";
    }

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de email inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Preparar datos para envío
  const prepararDatosParaEnvio = (data: any) => {
    const cleanData = { ...data };
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string' && cleanData[key].trim() === '') {
        cleanData[key] = null;
      }
    });
    return cleanData;
  };

  // Guardar cliente
  const guardarCliente = async () => {
    if (!validarFormulario()) return;

    try {
      const url = "/api/clientes";
      const method = editingCliente || selectedCliente ? "PUT" : "POST";
      
      let bodyData = prepararDatosParaEnvio(formData);
      
      if (editingCliente || selectedCliente) {
        bodyData.id = (editingCliente || selectedCliente)!.id;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (result.success) {
        const isCreating = !editingCliente && !selectedCliente;
        if (isCreating) {
          await logClienteCreado(result.data.id);
        } else {
          const camposEditados = [];
          if (formData.nombre !== (editingCliente || selectedCliente)?.nombre) camposEditados.push("nombre");
          if (formData.email !== (editingCliente || selectedCliente)?.email) camposEditados.push("email");
          if (formData.telefono !== (editingCliente || selectedCliente)?.telefono) camposEditados.push("teléfono");
          if (formData.direccion !== (editingCliente || selectedCliente)?.direccion) camposEditados.push("dirección");
          
          if (camposEditados.length > 0) {
            await logEdicionDatos(result.data.id, camposEditados.join(", "));
          }
        }
        
        toast.success("Cliente guardado correctamente");
        await cargarClientes();
        if (isDetailModalOpen) {
          setSelectedCliente(result.data);
          setIsEditingDetails(false);
        } else {
          cerrarModales();
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || "Error al guardar cliente");
      }
    } catch (error) {
      console.error("Error guardando cliente:", error);
      toast.error("Error de conexión");
    }
  };

  // Cambiar estado del cliente
  const cambiarEstadoCliente = async (cliente: Cliente, nuevoEstado: boolean) => {
    const estadoTexto = nuevoEstado ? "Activo" : "Inactivo";
    
    try {
      const response = await fetch("/api/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cliente.id,
          estado: estadoTexto
        }),
      });

      const result = await response.json();

      if (result.success) {
        await logCambioEstado(cliente.id, estadoTexto);
        
        toast.success(`Cliente ${estadoTexto.toLowerCase()} correctamente`);
        await cargarClientes();
        if (selectedCliente?.id === cliente.id) {
          setSelectedCliente(result.data);
          setFormData(prev => ({ ...prev, estado: estadoTexto as "Activo" | "Inactivo" }));
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || "Error al cambiar estado del cliente");
      }
    } catch (error) {
      console.error("Error cambiando estado del cliente:", error);
      toast.error("Error de conexión");
    }
  };



  const handleUploadSuccess = async () => {
    setRefreshTrigger(prev => prev + 1);
    setShowUploadModal(false);
  };

  // Configuración de columnas para DataTable
  const columns: Column<Cliente>[] = [
    {
      key: "empresa",
      label: "Empresa",
      render: (cliente) => (
        <div>
          <div className="font-bold text-foreground">{cliente.nombre}</div>
          <div className="text-xs text-muted-foreground font-mono">{cliente.rut}</div>
        </div>
      )
    },
    {
      key: "representante",
      label: "Representante Legal",
      render: (cliente) => (
        cliente.representante_legal ? (
          <div>
            <div className="text-foreground">{cliente.representante_legal}</div>
            {cliente.rut_representante && (
              <div className="text-xs text-muted-foreground font-mono">
                {cliente.rut_representante}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Sin representante</span>
        )
      )
    },
    {
      key: "email",
      label: "Email",
      render: (cliente) => (
        cliente.email ? (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{cliente.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin email</span>
        )
      )
    },
    {
      key: "telefono",
      label: "Teléfono",
      render: (cliente) => (
        cliente.telefono ? (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span>{cliente.telefono}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin teléfono</span>
        )
      )
    },
    {
      key: "estado",
      label: "Estado",
      render: (cliente) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={cliente.estado === "Activo"}
            onCheckedChange={(checked) => cambiarEstadoCliente(cliente, checked)}
          />
          <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"}>
            {cliente.estado || "Activo"}
          </Badge>
        </div>
      )
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (cliente) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => abrirModalDetalles(cliente)}
            className="hover:bg-blue-500/10 hover:border-blue-500/30 h-7 w-7 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (cliente: Cliente) => (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{cliente.nombre}</h3>
              <p className="text-sm text-muted-foreground font-mono">{cliente.rut}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cliente.estado === "Activo"}
                onCheckedChange={(checked) => cambiarEstadoCliente(cliente, checked)}
              />
            </div>
          </div>
          
          {cliente.representante_legal && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.representante_legal}</span>
            </div>
          )}
          
          {cliente.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.email}</span>
            </div>
          )}
          
          {cliente.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cliente.telefono}</span>
            </div>
          )}
          
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
      icon: Building2,
      color: "blue",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre de la Empresa *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre de la empresa"
                className={formErrors.nombre ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.nombre && (
                <p className="text-sm text-red-400">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT de la Empresa *
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
                Razón Social
              </label>
              <Input
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                placeholder="Razón social (opcional)"
                disabled={!isEditingDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Representante Legal
              </label>
              <Input
                name="representante_legal"
                value={formData.representante_legal}
                onChange={handleInputChange}
                placeholder="Nombre del representante legal"
                disabled={!isEditingDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT Representante
              </label>
              <Input
                name="rut_representante"
                value={formData.rut_representante}
                onChange={handleInputChange}
                placeholder="12345678-9"
                className={formErrors.rut_representante ? "border-red-500" : ""}
                disabled={!isEditingDetails}
              />
              {formErrors.rut_representante && (
                <p className="text-sm text-red-400">{formErrors.rut_representante}</p>
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
                placeholder="correo@empresa.cl"
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
          </div>
        </div>
      )
    },
    {
      key: "ubicacion",
      label: "Ubicación",
      icon: MapPin,
      color: "amber",
      content: (
        <LocationTab
          direccion={formData.direccion}
          latitud={formData.latitud}
          longitud={formData.longitud}
          ciudad={formData.ciudad || ""}
          comuna={formData.comuna || ""}
          onAddressSelect={handleAddressSelect}
          onAddressChange={handleAddressChange}
          onCiudadChange={handleCiudadChange}
          onComunaChange={handleComunaChange}
          onCoordinatesChange={handleCoordinatesChange}
          onClearLocation={handleClearLocation}
          disabled={!isEditingDetails}
          isReadOnly={!isEditingDetails}
        />
      )
    },
    {
      key: "documentos",
      label: "Documentos",
      icon: FileText,
      color: "emerald",
      content: (
                        <DocumentManager
                  modulo="clientes"
                  entidadId={selectedCliente?.id || ""}
                  onDocumentDeleted={handleUploadSuccess}
                  onUploadSuccess={handleUploadSuccess}
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
          modulo="clientes"
          entidadId={selectedCliente?.id || ""}
          refreshTrigger={refreshTrigger}
        />
      )
    }
  ];

  // Filtrar clientes según los filtros aplicados
  const clientesFiltrados = clientes.filter(cliente => {
    if (filtros.search && filtros.search.trim()) {
      const busqueda = filtros.search.toLowerCase().trim();
      if (!cliente.nombre.toLowerCase().includes(busqueda) &&
          !cliente.rut.includes(busqueda) &&
          !(cliente.representante_legal && cliente.representante_legal.toLowerCase().includes(busqueda))) {
        return false;
      }
    }

    if (filtros.estado !== "Todos") {
      if ((cliente.estado || "Activo") !== filtros.estado) {
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
          title="Gestión de Clientes"
          description="Administra la información de tus clientes y sus documentos"
          actionButton={{
            label: "Nuevo Cliente",
            icon: Plus,
            onClick: abrirModalNuevo
          }}
          kpis={[
            {
              label: "Total Clientes",
              value: clientes.length,
              icon: Users,
              variant: "default"
            },
            {
              label: "Clientes Activos",
              value: clientes.filter(c => c.estado === "Activo").length,
              icon: Users,
              variant: "success"
            },
            {
              label: "Clientes Inactivos",
              value: clientes.filter(c => c.estado === "Inactivo").length,
              icon: Users,
              variant: "warning"
            }
          ]}
        />

        {/* FilterBar */}
        <FilterBar
          filters={filterConfigs}
          values={filtros}
          onFilterChange={handleFilterChange}
          onClearAll={clearFilters}
          searchPlaceholder="Buscar por nombre, RUT o representante..."
          className="mb-6"
        />

        {/* DataTable */}
        <div className="flex-1 min-h-0">
          <DataTable
            data={clientesFiltrados}
            columns={columns}
            loading={loading}
            emptyMessage="No hay clientes registrados"
            emptyIcon={Users}
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
        title="Nuevo Cliente"
        className="bg-card/95 backdrop-blur-md"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nombre de la Empresa *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ingresa el nombre de la empresa"
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              {formErrors.nombre && (
                <p className="text-sm text-red-400">{formErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT de la Empresa *
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
                Razón Social
              </label>
              <Input
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                placeholder="Razón social (opcional)"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Representante Legal
              </label>
              <Input
                name="representante_legal"
                value={formData.representante_legal}
                onChange={handleInputChange}
                placeholder="Nombre del representante legal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                RUT Representante
              </label>
              <Input
                name="rut_representante"
                value={formData.rut_representante}
                onChange={handleInputChange}
                placeholder="12345678-9"
                className={formErrors.rut_representante ? "border-red-500" : ""}
              />
              {formErrors.rut_representante && (
                <p className="text-sm text-red-400">{formErrors.rut_representante}</p>
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
                placeholder="correo@empresa.cl"
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección
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
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={cerrarModales}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarCliente}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Crear Cliente
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de detalles del cliente con EntityTabs */}
      <EntityModal
        isOpen={isDetailModalOpen}
        onClose={cerrarModales}
        title={`Detalles - ${selectedCliente?.nombre}`}
        size="2xl"
      >
        {selectedCliente && (
          <EntityTabs
            tabs={getTabsConfig()}
            showActionButtons={true}
            onCancel={cerrarModales}
            onSave={guardarCliente}
            onEdit={() => setIsEditingDetails(!isEditingDetails)}
            isReadOnly={!isEditingDetails}
          />
        )}
      </EntityModal>

      {/* Modal de confirmación */}
      <ConfirmModal />

      {/* Modal de subida de documentos - Ya no necesario, integrado en DocumentManager */}

      {/* Contenedor de toasts */}
      <ToastContainer />
    </>
  );
}

// Confirmación de auditoría completada
console.log("✅ Módulo Clientes refactorizado con componentes genéricos"); 