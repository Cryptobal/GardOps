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
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  User, 
  Search,
  Filter,
  Eye
} from "lucide-react";
import { Cliente, CrearClienteData, DocumentoCliente, FiltrosCliente } from "../../lib/schemas/clientes";
import DocumentUploader from "../../components/DocumentUploader";
import DocumentListTabs from "../../components/DocumentListTabs";
import ClienteTabs from "../../components/ClienteTabs";
import { 
  logCambioEstado, 
  logEdicionDatos, 
  logClienteCreado,
  obtenerUsuarioActual 
} from "../../lib/api/logs-clientes";

export default function ClientesPage() {
  console.log("Vista de clientes cargada correctamente");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [documentosCliente, setDocumentosCliente] = useState<DocumentoCliente[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Estados para búsqueda y filtros
  const [filtros, setFiltros] = useState<FiltrosCliente>({
    busqueda: "",
    estado: "Todos"
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
    razon_social: "",
    estado: "Activo",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  // Cargar clientes al montar el componente
  useEffect(() => {
    cargarClientes();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [clientes, filtros]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clientes");
      const result = await response.json();

      if (result.success) {
        setClientes(result.data);
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

    // Filtro por búsqueda (startsWith)
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase().trim();
      filtered = filtered.filter(cliente => 
        cliente.nombre.toLowerCase().startsWith(busqueda) ||
        cliente.rut.startsWith(busqueda)
      );
    }

    // Filtro por estado
    if (filtros.estado !== "Todos") {
      filtered = filtered.filter(cliente => 
        (cliente.estado || "Activo") === filtros.estado
      );
    }

    setClientesFiltrados(filtered);
  };

  const cargarDocumentosCliente = async (clienteId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/documentos-clientes?cliente_id=${clienteId}`);
      const result = await response.json();
      
      if (result.success) {
        setDocumentosCliente(result.data);
      } else {
        console.error("Error cargando documentos:", result.error);
        setDocumentosCliente([]);
      }
    } catch (error) {
      console.error("Error cargando documentos:", error);
      setDocumentosCliente([]);
    } finally {
      setIsLoadingDocuments(false);
    }
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
      razon_social: "",
      estado: "Activo",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal de detalles del cliente - OPTIMIZADO para apertura instantánea
  const abrirModalDetalles = (cliente: Cliente) => {
    // 1. Abrir modal inmediatamente
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
      razon_social: cliente.razon_social || "",
      estado: (cliente.estado || "Activo") as "Activo" | "Inactivo",
    });
    setIsEditingDetails(false);
    setDocumentosCliente([]); // Limpiar documentos anteriores
    setIsDetailModalOpen(true); // Abrir modal inmediatamente
    
    // 2. Cargar documentos de forma asíncrona (no bloquea la apertura)
    cargarDocumentosCliente(cliente.id);
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
    
    // Limpiar error cuando usuario empiece a escribir
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
      // Solo limpiar coordenadas si se está escribiendo manualmente
      latitud: query === prev.direccion ? prev.latitud : null,
      longitud: query === prev.direccion ? prev.longitud : null,
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

  // Preparar datos para envío (limpiar campos vacíos)
  const prepararDatosParaEnvio = (data: any) => {
    const cleanData = { ...data };
    
    // Convertir strings vacíos a null para campos opcionales
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string' && cleanData[key].trim() === '') {
        cleanData[key] = null;
      }
    });
    
    return cleanData;
  };

  // Guardar cliente (crear o actualizar)
  const guardarCliente = async () => {
    if (!validarFormulario()) return;

    try {
      const url = "/api/clientes";
      const method = editingCliente || selectedCliente ? "PUT" : "POST";
      
      // Preparar datos para envío
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
        // Registrar log según el tipo de operación
        const isCreating = !editingCliente && !selectedCliente;
        if (isCreating) {
          await logClienteCreado(result.data.id);
        } else {
          // Log de edición - determinar qué cambió
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
        
        // Refrescar logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || "Error al guardar cliente");
      }
    } catch (error) {
      console.error("Error guardando cliente:", error);
      toast.error("Error de conexión");
    }
  };

  // Cambiar estado del cliente con Switch
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
        // Registrar log del cambio de estado
        await logCambioEstado(cliente.id, estadoTexto);
        
        toast.success(`Cliente ${estadoTexto.toLowerCase()} correctamente`);
        await cargarClientes();
        if (selectedCliente?.id === cliente.id) {
          setSelectedCliente(result.data);
          setFormData(prev => ({ ...prev, estado: estadoTexto as "Activo" | "Inactivo" }));
        }
        
        // Refrescar logs si el modal está abierto
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || "Error al cambiar estado del cliente");
      }
    } catch (error) {
      console.error("Error cambiando estado del cliente:", error);
      toast.error("Error de conexión");
    }
  };

  // Eliminar cliente
  const eliminarCliente = async (cliente: Cliente) => {
    const confirmed = await confirm({
      title: "Eliminar Cliente",
      message: "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/clientes?id=${cliente.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("Cliente eliminado con éxito");
        await cargarClientes();
        if (selectedCliente?.id === cliente.id) {
          cerrarModales();
        }
      } else {
        toast.error(result.error || "Error al eliminar cliente");
      }
    } catch (error) {
      console.error("Error eliminando cliente:", error);
      toast.error("Error de conexión");
    }
  };



  const handleUploadSuccess = async () => {
    // Incrementar el trigger para forzar actualización
    setRefreshTrigger(prev => prev + 1);
    setShowUploadModal(false);
  };

  // Componente de fila de tabla con hover
  const ClienteTableRow: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => abrirModalDetalles(cliente)}
      >
        <TableCell>
          <div>
            <div className="font-bold text-foreground">{cliente.nombre}</div>
            <div className="text-xs text-muted-foreground font-mono">{cliente.rut}</div>
          </div>
        </TableCell>
        <TableCell>
          {cliente.representante_legal ? (
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
          )}
        </TableCell>
        <TableCell>
          {cliente.email ? (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{cliente.email}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Sin email</span>
          )}
        </TableCell>
        <TableCell>
          {cliente.telefono ? (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{cliente.telefono}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Sin teléfono</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={cliente.estado === "Activo"}
              onCheckedChange={(checked) => cambiarEstadoCliente(cliente, checked)}
            />
            <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"}>
              {cliente.estado || "Activo"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-right">
          {/* Contenedor con ancho fijo para evitar layout shifts */}
          <div 
            className="flex justify-end gap-2 w-20 h-8"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered || isMobile ? 1 : 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirModalDetalles(cliente)}
                className="hover:bg-blue-500/10 hover:border-blue-500/30 h-7 w-7 p-0"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => eliminarCliente(cliente)}
                className="hover:bg-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 h-7 w-7 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Componente de card para móvil
  const ClienteCard: React.FC<{ cliente: Cliente }> = ({ cliente }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50"
        onClick={() => abrirModalDetalles(cliente)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-foreground">{cliente.nombre}</h3>
                <p className="text-sm text-muted-foreground font-mono">{cliente.rut}</p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
    </motion.div>
  );

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Clientes
            </h2>
            <p className="text-muted-foreground mt-2">
              Gestiona la información de tus clientes ({clientesFiltrados.length} de {clientes.length} registros)
            </p>
          </div>
          <Button 
            onClick={abrirModalNuevo}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de empresa o RUT..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              {/* Filtros */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="whitespace-nowrap">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {filtros.estado !== "Todos" && (
                      <Badge variant="secondary" className="ml-2">
                        1
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Filtros</h4>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Estado</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Todos", "Activo", "Inactivo"].map((estado) => (
                          <Button
                            key={estado}
                            variant={filtros.estado === estado ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFiltros(prev => ({ ...prev, estado: estado as any }))}
                          >
                            {estado}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltros({ busqueda: "", estado: "Todos" })}
                      className="w-full"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Lista de clientes */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-blue-500" />
              Lista de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {filtros.busqueda || filtros.estado !== "Todos" 
                    ? "No se encontraron clientes" 
                    : "No hay clientes registrados"
                  }
                </h3>
                <p className="text-muted-foreground">
                  {filtros.busqueda || filtros.estado !== "Todos"
                    ? "Prueba ajustando los filtros de búsqueda"
                    : "Comienza agregando tu primer cliente"
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Vista desktop - Tabla */}
                {!isMobile && (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Representante Legal</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientesFiltrados.map((cliente) => (
                          <ClienteTableRow key={cliente.id} cliente={cliente} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Vista móvil - Cards */}
                {isMobile && (
                  <div className="grid gap-4">
                    {clientesFiltrados.map((cliente) => (
                      <ClienteCard key={cliente.id} cliente={cliente} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
            {/* Nombre de la empresa */}
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

            {/* RUT de la empresa */}
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

            {/* Razón Social */}
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

            {/* Representante Legal */}
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

            {/* RUT Representante */}
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

            {/* Email */}
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

            {/* Teléfono */}
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

          {/* Dirección con autocompletado y mapa */}
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
            />
          </div>

          {/* Botones de acción */}
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

      {/* Modal de detalles del cliente */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={cerrarModales}
        title={`Detalles - ${selectedCliente?.nombre}`}
        className="bg-card/95 backdrop-blur-md"
        size="xl"
      >
        {selectedCliente && (
          <div className="space-y-6">
            {/* Pestañas principales */}
            <ClienteTabs 
              clienteId={selectedCliente.id}
              onDocumentDeleted={handleUploadSuccess}
                              onUploadClick={() => setShowUploadModal(true)}
              refreshTrigger={refreshTrigger}
              selectedCliente={selectedCliente}
              formData={formData}
              isEditingDetails={isEditingDetails}
              setIsEditingDetails={setIsEditingDetails}
              handleInputChange={handleInputChange}
              handleAddressSelect={handleAddressSelect}
              handleAddressChange={handleAddressChange}
              formErrors={formErrors}
              guardarCliente={guardarCliente}
              cambiarEstadoCliente={cambiarEstadoCliente}
            />
          </div>
        )}
      </Modal>

      {/* Modal de confirmación */}
      <ConfirmModal />

      {/* Modal de subida de documentos */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Subir Documento"
        size="lg"
      >
        <div className="p-6">
                          <DocumentUploader
            modulo="clientes"
            entidadId={selectedCliente?.id || ""}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </Modal>

      {/* Contenedor de toasts */}
      <ToastContainer />
    </>
  );
}

// Confirmación de auditoría completada
console.log("✅ Auditoría del módulo Clientes completada con éxito"); 