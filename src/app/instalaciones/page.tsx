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
  Edit, 
  MapPin, 
  Users, 
  Search,
  Filter,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Instalacion, CrearInstalacionData, FiltrosInstalacion } from "../../lib/schemas/instalaciones";
import DocumentUploader from "../../components/DocumentUploader";
import DocumentListTabs from "../../components/DocumentListTabs";
import InstalacionTabs from "../../components/instalaciones/InstalacionTabs";

export default function InstalacionesPage() {
  console.log("Vista de instalaciones cargada correctamente");

  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [instalacionesFiltradas, setInstalacionesFiltradas] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingInstalacion, setEditingInstalacion] = useState<Instalacion | null>(null);
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null);
  const [documentosInstalacion, setDocumentosInstalacion] = useState<any[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [comunas, setComunas] = useState<{ id: string; nombre: string }[]>([]);
  
  // Estados para búsqueda y filtros
  const [filtros, setFiltros] = useState<FiltrosInstalacion>({
    busqueda: "",
    cliente: "Todos",
    comuna: "Todas"
  });

  const [formData, setFormData] = useState<CrearInstalacionData>({
    nombre: "",
    cliente_id: "",
    direccion: "",
    latitud: null,
    longitud: null,
    region: "",
    ciudad: "",
    comuna: "",
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

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarInstalaciones();
    cargarClientes();
    cargarComunas();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [instalaciones, filtros]);

  const cargarInstalaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/instalaciones");
      const result = await response.json();

      if (result.success) {
        setInstalaciones(result.data);
      } else {
        toast.error("Error al cargar instalaciones");
      }
    } catch (error) {
      console.error("Error cargando instalaciones:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await fetch("/api/clientes");
      const result = await response.json();
      if (result.success) {
        setClientes(result.data.map((c: any) => ({ id: c.id, nombre: c.nombre })));
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  const cargarComunas = async () => {
    try {
      const response = await fetch("/api/instalaciones/comunas");
      const result = await response.json();
      if (result.success) {
        setComunas(result.data.map((c: string, index: number) => ({ id: c, nombre: c })));
      }
    } catch (error) {
      console.error("Error cargando comunas:", error);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...instalaciones];

    // Filtro por búsqueda (startsWith)
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase().trim();
      filtered = filtered.filter(instalacion => 
        instalacion.nombre.toLowerCase().startsWith(busqueda) ||
        (instalacion.cliente_nombre || "").toLowerCase().startsWith(busqueda)
      );
    }

    // Filtro por cliente
    if (filtros.cliente !== "Todos") {
      filtered = filtered.filter(instalacion => 
        instalacion.cliente_id === filtros.cliente
      );
    }

    // Filtro por comuna
    if (filtros.comuna !== "Todas") {
      filtered = filtered.filter(instalacion => 
        instalacion.comuna === filtros.comuna
      );
    }

    setInstalacionesFiltradas(filtered);
  };

  const cargarDocumentosInstalacion = async (instalacionId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/documentos-instalaciones?instalacion_id=${instalacionId}`);
      const result = await response.json();
      
      if (result.success) {
        setDocumentosInstalacion(result.data);
      } else {
        console.error("Error cargando documentos:", result.error);
        setDocumentosInstalacion([]);
      }
    } catch (error) {
      console.error("Error cargando documentos:", error);
      setDocumentosInstalacion([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Función para manejar logs
  const logInstalacionCreada = async (instalacionId: string, nombre: string) => {
    try {
      // Implementar logging mediante API call en lugar de importación directa
      await fetch('/api/logs-instalaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          tipo_evento: 'INSTALACION_CREADA',
          descripcion: `Instalación "${nombre}" creada correctamente`
        })
      });
    } catch (error) {
      console.error('Error registrando log:', error);
    }
  };

  const logEdicionDatos = async (instalacionId: string, descripcion: string) => {
    try {
      await fetch('/api/logs-instalaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          tipo_evento: 'DATOS_EDITADOS',
          descripcion
        })
      });
    } catch (error) {
      console.error('Error registrando log:', error);
    }
  };

  const logCambioEstado = async (instalacionId: string, nuevoEstado: string, estadoAnterior: string) => {
    try {
      await fetch('/api/logs-instalaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          tipo_evento: 'CAMBIO_ESTADO',
          descripcion: `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}"`
        })
      });
    } catch (error) {
      console.error('Error registrando log:', error);
    }
  };

  // Abrir modal para nueva instalación
  const abrirModalNuevo = () => {
    setEditingInstalacion(null);
    setFormData({
      nombre: "",
      cliente_id: "",
      direccion: "",
      latitud: null,
      longitud: null,
      region: "",
      ciudad: "",
      comuna: "",
      estado: "Activo",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Abrir modal de detalles de la instalación
  const abrirModalDetalles = (instalacion: Instalacion) => {
    setSelectedInstalacion(instalacion);
    setFormData({
      nombre: instalacion.nombre,
      cliente_id: instalacion.cliente_id,
      direccion: instalacion.direccion || "",
      latitud: instalacion.latitud || null,
      longitud: instalacion.longitud || null,
      region: instalacion.region || "",
      ciudad: instalacion.ciudad || "",
      comuna: instalacion.comuna || "",
      estado: (instalacion.estado || "Activo") as "Activo" | "Inactivo",
    });
    setIsDetailModalOpen(true);
    setIsEditingDetails(false);
    
    // Cargar documentos en segundo plano
    cargarDocumentosInstalacion(instalacion.id);
  };

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errores: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errores.nombre = "El nombre es obligatorio";
    }

    if (!formData.cliente_id) {
      errores.cliente_id = "El cliente es obligatorio";
    }

    if (!formData.direccion.trim()) {
      errores.direccion = "La dirección es obligatoria";
    }

    if (!formData.comuna.trim()) {
      errores.comuna = "La comuna es obligatoria";
    }

    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  };

  // Guardar instalación (crear o editar)
  const guardarInstalacion = async () => {
    if (!validarFormulario()) {
      toast.error("Por favor, corrige los errores en el formulario");
      return;
    }

    try {
      const url = editingInstalacion 
        ? `/api/instalaciones/${editingInstalacion.id}` 
        : "/api/instalaciones";
      
      const method = editingInstalacion ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          editingInstalacion 
            ? "Instalación actualizada correctamente" 
            : "Instalación creada correctamente"
        );

        // Registrar en logs
        if (!editingInstalacion) {
          await logInstalacionCreada(result.data.id, formData.nombre);
        } else {
          await logEdicionDatos(editingInstalacion.id, "Datos actualizados");
        }

        setIsModalOpen(false);
        cargarInstalaciones();
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(result.error || "Error al guardar instalación");
      }
    } catch (error) {
      console.error("Error guardando instalación:", error);
      toast.error("Error de conexión");
    }
  };

  // Cambiar estado de instalación
  const cambiarEstadoInstalacion = async (instalacion: Instalacion, nuevoEstado: boolean) => {
    const estadoTexto = nuevoEstado ? "Activo" : "Inactivo";
    
    const confirmado = await confirm({
      title: `${nuevoEstado ? "Activar" : "Desactivar"} instalación`,
      message: `¿Estás seguro de que deseas ${nuevoEstado ? "activar" : "desactivar"} la instalación "${instalacion.nombre}"?`,
      confirmText: nuevoEstado ? "Activar" : "Desactivar",
      type: nuevoEstado ? "info" : "danger"
    });

    if (!confirmado) return;

    try {
      const response = await fetch(`/api/instalaciones/${instalacion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...instalacion,
          estado: estadoTexto,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Instalación ${nuevoEstado ? "activada" : "desactivada"} correctamente`);
        
        // Registrar en logs
        await logCambioEstado(instalacion.id, estadoTexto, instalacion.estado || "Activo");
        
        cargarInstalaciones();
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error("Error al cambiar el estado");
      }
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error("Error de conexión");
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error si existe
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Manejar selección de dirección
  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      direccion: addressData.direccionCompleta,
      latitud: addressData.latitud,
      longitud: addressData.longitud,
      region: addressData.componentes.region || prev.region,
      ciudad: addressData.componentes.ciudad || prev.ciudad,
      comuna: addressData.componentes.comuna || prev.comuna,
    }));

    if (formErrors.direccion) {
      setFormErrors(prev => ({
        ...prev,
        direccion: ""
      }));
    }
  };

  const handleAddressChange = (query: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: query
    }));
  };

  // Función para editar instalación desde tabla
  const editarInstalacion = (instalacion: Instalacion) => {
    setEditingInstalacion(instalacion);
    setFormData({
      nombre: instalacion.nombre,
      cliente_id: instalacion.cliente_id,
      direccion: instalacion.direccion || "",
      latitud: instalacion.latitud || null,
      longitud: instalacion.longitud || null,
      region: instalacion.region || "",
      ciudad: instalacion.ciudad || "",
      comuna: instalacion.comuna || "",
      estado: (instalacion.estado || "Activo") as "Activo" | "Inactivo",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header fijo */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Instalaciones</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Barra de herramientas fija al hacer scroll */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 sticky top-24 z-30">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Búsqueda */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o cliente..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="pl-10 bg-background/50"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Cliente</label>
                        <select
                          value={filtros.cliente}
                          onChange={(e) => setFiltros(prev => ({ ...prev, cliente: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                        >
                          <option value="Todos">Todos los clientes</option>
                          {clientes.map((cliente) => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Comuna</label>
                        <select
                          value={filtros.comuna}
                          onChange={(e) => setFiltros(prev => ({ ...prev, comuna: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                        >
                          <option value="Todas">Todas las comunas</option>
                          {comunas.map((comuna) => (
                            <option key={comuna.id} value={comuna.nombre}>
                              {comuna.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Botón nueva instalación */}
            <Button onClick={abrirModalNuevo} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nueva instalación
            </Button>
          </div>
        </div>

        {/* Tabla de instalaciones */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Comuna</TableHead>
                      <TableHead>Guardias</TableHead>
                      <TableHead>Puestos</TableHead>
                      <TableHead>PPC</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instalacionesFiltradas.map((instalacion) => (
                      <TableRow 
                        key={instalacion.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => abrirModalDetalles(instalacion)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            {instalacion.nombre}
                          </div>
                        </TableCell>
                        <TableCell>{instalacion.cliente_nombre || "Sin cliente"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {instalacion.comuna || "No especificada"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {instalacion.guardias_asignados || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-green-500" />
                            {instalacion.puestos_cubiertos || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            {instalacion.puestos_por_cubrir || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={instalacion.estado === "Activo" ? "default" : "secondary"}
                            className={instalacion.estado === "Activo" ? "bg-green-600" : "bg-gray-600"}
                          >
                            {instalacion.estado || "Activo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                editarInstalacion(instalacion);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={instalacion.estado === "Activo"}
                              onCheckedChange={(checked) => {
                                cambiarEstadoInstalacion(instalacion, checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {instalacionesFiltradas.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No se encontraron instalaciones
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {filtros.busqueda || filtros.cliente !== "Todos" || filtros.comuna !== "Todas"
                        ? "Intenta ajustar los filtros de búsqueda"
                        : "Crea tu primera instalación para comenzar"
                      }
                    </p>
                    {(!filtros.busqueda && filtros.cliente === "Todos" && filtros.comuna === "Todas") && (
                      <Button onClick={abrirModalNuevo} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva instalación
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal crear/editar instalación */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingInstalacion ? "Editar Instalación" : "Nueva Instalación"}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); guardarInstalacion(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre de la instalación *
              </label>
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Edificio Corporativo"
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              {formErrors.nombre && (
                <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Cliente *
              </label>
              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-background border rounded-md ${
                  formErrors.cliente_id ? "border-red-500" : "border-border"
                }`}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="text-red-500 text-sm mt-1">{formErrors.cliente_id}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dirección *
            </label>
            <InputDireccion
              value={formData.direccion}
              onAddressSelect={handleAddressSelect}
              onAddressChange={handleAddressChange}
              placeholder="Buscar dirección..."
              initialLatitude={formData.latitud}
              initialLongitude={formData.longitud}
              className={formErrors.direccion ? "border-red-500" : ""}
            />
            {formErrors.direccion && (
              <p className="text-red-500 text-sm mt-1">{formErrors.direccion}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Región</label>
              <Input
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="Región"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ciudad</label>
              <Input
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                placeholder="Ciudad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Comuna *</label>
              <Input
                name="comuna"
                value={formData.comuna}
                onChange={handleInputChange}
                placeholder="Comuna"
                className={formErrors.comuna ? "border-red-500" : ""}
              />
              {formErrors.comuna && (
                <p className="text-red-500 text-sm mt-1">{formErrors.comuna}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          {/* Sección de documentos */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-4">Documentos Adjuntos</h3>
            <DocumentUploader 
              modulo="instalaciones"
              entidadId={editingInstalacion?.id || "nuevo"}
              onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {editingInstalacion ? "Actualizar" : "Crear"} Instalación
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal detalles instalación con tabs */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedInstalacion?.nombre || "Detalles de Instalación"}
        size="xl"
      >
        {selectedInstalacion && (
          <InstalacionTabs
            instalacionId={selectedInstalacion.id}
            onDocumentDeleted={() => cargarDocumentosInstalacion(selectedInstalacion.id)}
            onUploadClick={() => setShowUploadModal(true)}
            refreshTrigger={refreshTrigger}
            selectedInstalacion={selectedInstalacion}
            formData={formData}
            isEditingDetails={isEditingDetails}
            setIsEditingDetails={setIsEditingDetails}
            handleInputChange={handleInputChange}
            handleAddressSelect={handleAddressSelect}
            handleAddressChange={handleAddressChange}
            formErrors={formErrors}
            guardarInstalacion={guardarInstalacion}
            cambiarEstadoInstalacion={cambiarEstadoInstalacion}
          />
        )}
      </Modal>

      {/* Modal confirmación */}
      <ConfirmModal />

      {/* Contenedor de toasts */}
      <ToastContainer />
    </div>
  );
} 