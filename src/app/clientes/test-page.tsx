"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Modal } from "../../components/ui/modal";
import { useToast } from "../../components/ui/toast";
import { Plus, Eye, Mail, Phone, User } from "lucide-react";
import ErrorModal from "../../components/ui/error-modal";

interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  representante_legal?: string;
  rut_representante?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
  created_at: string;
}

export default function TestClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    representante_legal: "",
    rut_representante: "",
    email: "",
    telefono: "",
    direccion: "",
    estado: "Activo"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Cargar clientes
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

  useEffect(() => {
    cargarClientes();
  }, []);

  // Validar formulario
  const validarFormulario = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio";
    }

    if (!formData.rut.trim()) {
      errors.rut = "El RUT es obligatorio";
    } else if (!/^[0-9]+-[0-9kK]{1}$/.test(formData.rut)) {
      errors.rut = "Formato de RUT inválido (ej: 12345678-9)";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Formato de email inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar cliente
  const guardarCliente = async () => {
    if (!validarFormulario()) return;

    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Cliente creado correctamente");
        setIsModalOpen(false);
        setFormData({
          nombre: "",
          rut: "",
          representante_legal: "",
          rut_representante: "",
          email: "",
          telefono: "",
          direccion: "",
          estado: "Activo"
        });
        setFormErrors({});
        await cargarClientes();
      } else {
        toast.error(result.error || "Error al crear cliente");
        console.error("Error del servidor:", result);
      }
    } catch (error) {
      console.error("Error guardando cliente:", error);
      toast.error("Error de conexión");
    }
  };

  // Cambiar estado
  const cambiarEstado = async (cliente: Cliente, nuevoEstado: boolean) => {
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
        toast.success(`Cliente ${estadoTexto.toLowerCase()} correctamente`);
        await cargarClientes();
      } else {
        // Si es un error de instalaciones activas, mostrar el modal de error
        if (response.status === 400 && result.instalacionesActivas) {
          setErrorDetails({
            instalacionesActivas: result.instalacionesActivas,
            instalacionesInactivas: result.instalacionesInactivas || []
          });
          setShowErrorModal(true);
        } else {
          toast.error(result.error || "Error al cambiar estado");
        }
      }
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error("Error de conexión");
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Test Clientes</h1>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No hay clientes registrados</p>
          </div>
        ) : (
          clientes.map((cliente) => (
            <div 
              key={cliente.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{cliente.nombre}</h3>
                  <p className="text-sm text-gray-400 font-mono">{cliente.rut}</p>
                  {cliente.representante_legal && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="text-sm text-gray-400">{cliente.representante_legal}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 text-gray-500" />
                      <span className="text-sm text-gray-400">{cliente.email}</span>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span className="text-sm text-gray-400">{cliente.telefono}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cliente.estado === "Activo"}
                      onCheckedChange={(checked) => cambiarEstado(cliente, checked)}
                    />
                    <Badge variant={cliente.estado === "Activo" ? "success" : "inactive"}>
                      {cliente.estado || "Activo"}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de error para instalaciones activas */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="No se puede inactivar el cliente"
        message="No se puede inactivar el cliente porque tiene instalaciones activas. Primero debe inactivar todas las instalaciones asociadas."
        details={errorDetails}
      />

      {/* Modal de creación */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Cliente"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
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
              <p className="text-sm text-red-400 mt-1">{formErrors.nombre}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
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
              <p className="text-sm text-red-400 mt-1">{formErrors.rut}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Representante Legal
            </label>
            <Input
              name="representante_legal"
              value={formData.representante_legal}
              onChange={handleInputChange}
              placeholder="Nombre del representante legal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              RUT Representante
            </label>
            <Input
              name="rut_representante"
              value={formData.rut_representante}
              onChange={handleInputChange}
              placeholder="12345678-9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
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
              <p className="text-sm text-red-400 mt-1">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Teléfono
            </label>
            <Input
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              placeholder="+56 9 1234 5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Dirección
            </label>
            <Input
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Av. Principal 123, Santiago"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarCliente}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Crear Cliente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 