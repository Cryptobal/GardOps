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
  DollarSign,
  AlertTriangle
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

export default function InstalacionesPage() {
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [instalacionesFiltradas, setInstalacionesFiltradas] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingInstalacion, setEditingInstalacion] = useState<Instalacion | null>(null);
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
  }, [filtros, instalaciones]);

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
        instalacion.nombre.toLowerCase().includes(busqueda) ||
        instalacion.cliente_nombre?.toLowerCase().includes(busqueda) ||
        instalacion.direccion.toLowerCase().includes(busqueda) ||
        instalacion.comuna.toLowerCase().includes(busqueda)
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

    setInstalacionesFiltradas(filtradas);
  };

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
    setIsDetailModalOpen(true);
  };

  const cerrarModales = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setEditingInstalacion(null);
    setSelectedInstalacion(null);
    setFormErrors({});
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

  const InstalacionTableRow: React.FC<{ instalacion: Instalacion }> = ({ instalacion }) => {
    const cliente = clientes.find(c => c.id === instalacion.cliente_id);
    
          return (
        <TableRow 
          key={instalacion.id} 
          className="border-gray-700 hover:bg-gray-800/50 transition-colors cursor-pointer"
          onClick={() => abrirModalDetalles(instalacion)}
        >
        <TableCell className="text-gray-200 font-medium">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span>{instalacion.nombre}</span>
          </div>
        </TableCell>
        <TableCell className="text-gray-300">
          {cliente?.nombre || "Cliente no encontrado"}
        </TableCell>
        <TableCell className="text-gray-300">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="max-w-[200px] truncate">{instalacion.direccion}</span>
          </div>
        </TableCell>
        <TableCell className="text-gray-300">
          {instalacion.comuna}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            0 {/* TODO: Implementar conteo de guardias */}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            0 {/* TODO: Implementar conteo de PPC */}
          </Badge>
        </TableCell>
        <TableCell>
          <div 
            className={`w-3 h-3 rounded-full ${
              instalacion.estado === "Activo" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </TableCell>
      </TableRow>
    );
  };

  const InstalacionCard: React.FC<{ instalacion: Instalacion }> = ({ instalacion }) => {
    const cliente = clientes.find(c => c.id === instalacion.cliente_id);
    
    return (
      <Card 
        key={instalacion.id} 
        className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
        onClick={() => abrirModalDetalles(instalacion)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-gray-200 text-lg">{instalacion.nombre}</CardTitle>
            </div>
            <div 
              className={`w-3 h-3 rounded-full mt-1 ${
                instalacion.estado === "Activo" ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span className="font-medium">Cliente:</span>
              <span>{cliente?.nombre || "No encontrado"}</span>
            </div>
            <div className="flex items-start space-x-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{instalacion.direccion}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span className="font-medium">Comuna:</span>
              <span>{instalacion.comuna}</span>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2 border-t border-gray-700">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              0 guardias
            </Badge>
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              0 PPC
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">


        {/* Filtros */}
        <div className="sticky top-0 z-10 bg-gray-900 pb-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar instalaciones..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                    className="pl-10 bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                  />
                </div>
                
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>

                <select
                  value={filtros.cliente_id}
                  onChange={(e) => setFiltros(prev => ({ ...prev, cliente_id: e.target.value }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                >
                  <option value="">Todos los clientes</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>

                <Button
                  onClick={abrirModalNuevo}
                  className="bg-blue-600 hover:bg-blue-700 text-white ml-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva instalación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : instalacionesFiltradas.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No hay instalaciones</h3>
              <p className="text-gray-400 mb-6">
                {filtros.busqueda || filtros.estado !== "Todos" || filtros.cliente_id
                  ? "No se encontraron instalaciones con los filtros aplicados"
                  : "Comienza creando tu primera instalación"}
              </p>
              {!filtros.busqueda && filtros.estado === "Todos" && !filtros.cliente_id && (
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
            <div className="hidden md:block">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Nombre</TableHead>
                        <TableHead className="text-gray-300">Cliente</TableHead>
                        <TableHead className="text-gray-300">Dirección</TableHead>
                        <TableHead className="text-gray-300">Comuna</TableHead>
                        <TableHead className="text-gray-300">Guardias</TableHead>
                        <TableHead className="text-gray-300">PPC</TableHead>
                        <TableHead className="text-gray-300">Estado</TableHead>
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

            {/* Vista de tarjetas para mobile */}
            <div className="md:hidden">
              <div className="grid grid-cols-1 gap-4">
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
        size="xl"
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

      {/* Modal de detalles */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={cerrarModales}
        title={`Detalles de instalación: ${selectedInstalacion?.nombre}`}
        size="xl"
      >
        {selectedInstalacion && (
          <InstalacionTabs
            instalacionId={selectedInstalacion.id}
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
            clientes={clientes}
            comunas={comunas}
            showActionButtons={false}
          />
        )}
      </Modal>

      <ConfirmModal />
      <ToastContainer />
    </div>
  );
} 