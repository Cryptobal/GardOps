"use client";

import { useState } from "react";
import { FileText, ClockIcon, Building, MapPin, Edit, X, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { InputDireccion, type AddressData } from "./ui/input-direccion";
import { GoogleMap } from "./ui/google-map";
import DocumentListTabs from "./DocumentListTabs";
import LogsCliente from "./LogsCliente";
import InstalacionesCliente from "./InstalacionesCliente";
import { Cliente, CrearClienteData } from "../lib/schemas/clientes";

interface ClienteTabsProps {
  clienteId: string;
  onDocumentDeleted?: () => void;
  onUploadClick?: () => void;
  refreshTrigger?: number;
  selectedCliente: Cliente | null;
  formData: CrearClienteData;
  isEditingDetails: boolean;
  setIsEditingDetails: (editing: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  formErrors: Record<string, string>;
  guardarCliente: () => void;
  cambiarEstadoCliente: (cliente: Cliente, nuevoEstado: boolean) => void;
}

export default function ClienteTabs({ 
  clienteId, 
  onDocumentDeleted, 
  onUploadClick, 
  refreshTrigger,
  selectedCliente,
  formData,
  isEditingDetails,
  setIsEditingDetails,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  formErrors,
  guardarCliente,
  cambiarEstadoCliente
}: ClienteTabsProps) {
  const [tabActivo, setTabActivo] = useState<"informacion" | "instalaciones" | "documentos" | "logs">("informacion");

  const tabs = [
    {
      id: "informacion" as const,
      label: "Información",
      icon: Building
    },
    {
      id: "instalaciones" as const,
      label: "Instalaciones",
      icon: MapPin
    },
    {
      id: "documentos" as const,
      label: "Documentos",
      icon: FileText
    },
    {
      id: "logs" as const,
      label: "Logs",
      icon: ClockIcon
    }
  ];

  if (!selectedCliente) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-medium">Error: No hay cliente seleccionado</p>
        <p className="text-sm text-muted-foreground">Cliente ID: {clienteId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navegación de tabs */}
      <div className="flex space-x-1 bg-muted/20 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id)}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all
                ${
                  tabActivo === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white hover:bg-muted/40'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de tabs */}
      <div className="mt-4 min-h-[400px]">
        {tabActivo === "informacion" && (
          <div className="space-y-6">
            {/* Datos del cliente */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Datos
                </h3>
                <div className="flex gap-2">
                  {!isEditingDetails ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDetails(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedCliente.estado === "Activo"}
                          onCheckedChange={(checked) => cambiarEstadoCliente(selectedCliente, checked)}
                        />
                        <span className="text-sm font-medium">
                          {selectedCliente.estado === "Activo" ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDetails(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={guardarCliente}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditingDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Formulario de edición */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Nombre de la Empresa *
                    </label>
                    <Input
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
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
                      className={formErrors.rut ? "border-red-500" : ""}
                    />
                    {formErrors.rut && (
                      <p className="text-sm text-red-400">{formErrors.rut}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Representante Legal
                    </label>
                    <Input
                      name="representante_legal"
                      value={formData.representante_legal}
                      onChange={handleInputChange}
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
                      className={formErrors.rut_representante ? "border-red-500" : ""}
                    />
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
                      className={formErrors.email ? "border-red-500" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Teléfono
                    </label>
                    <Input
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Dirección
                    </label>
                    <InputDireccion
                      value={formData.direccion}
                      initialLatitude={formData.latitud}
                      initialLongitude={formData.longitud}
                      onAddressSelect={handleAddressSelect}
                      onAddressChange={handleAddressChange}
                      showMap={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                      <p className="text-foreground font-semibold">{selectedCliente.nombre}</p>
                      <p className="text-sm text-muted-foreground font-mono">{selectedCliente.rut}</p>
                    </div>
                    
                    {selectedCliente.representante_legal && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Representante Legal</label>
                        <p className="text-foreground">{selectedCliente.representante_legal}</p>
                        {selectedCliente.rut_representante && (
                          <p className="text-sm text-muted-foreground font-mono">{selectedCliente.rut_representante}</p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="mt-1">
                        <Badge variant={selectedCliente.estado === "Activo" ? "default" : "secondary"}>
                          {selectedCliente.estado || "Activo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-foreground">{selectedCliente.email || "Sin email"}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                      <p className="text-foreground">{selectedCliente.telefono || "Sin teléfono"}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                      <p className="text-foreground mb-3">{selectedCliente.direccion || "Sin dirección"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mapa grande en la parte inferior */}
            {selectedCliente.direccion && selectedCliente.latitud && selectedCliente.longitud && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span className="text-lg font-medium">Ubicación del Cliente</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCliente.direccion}
                  </p>
                </div>
                <GoogleMap
                  center={{
                    lat: selectedCliente.latitud,
                    lng: selectedCliente.longitud
                  }}
                  zoom={15}
                  markers={[{
                    position: {
                      lat: selectedCliente.latitud,
                      lng: selectedCliente.longitud
                    },
                    title: selectedCliente.nombre,
                    info: selectedCliente.direccion
                  }]}
                  height="400px"
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {tabActivo === "instalaciones" && (
          <div className="min-h-[400px]">
            <div className="bg-card/50 border border-border/50 rounded-lg p-6">
              <InstalacionesCliente 
                clienteId={clienteId}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}

        {tabActivo === "documentos" && (
          <div className="min-h-[400px]">
          <DocumentListTabs 
            modulo="clientes"
            entidadId={clienteId}
            onDocumentDeleted={onDocumentDeleted}
            onUploadClick={onUploadClick}
            refreshTrigger={refreshTrigger}
          />
          </div>
        )}
        
        {tabActivo === "logs" && (
          <div className="min-h-[400px] bg-card/50 border border-border/50 rounded-lg p-6">
            <LogsCliente 
              clienteId={clienteId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}
      </div>
    </div>
  );
} 