"use client";

import { useState } from "react";
import { FileText, ClockIcon, Building, MapPin, Edit, X, CheckCircle, User, Mail, Phone } from "lucide-react";
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

  return (
    <div className="space-y-4 h-full">
      {/* Navegación de tabs - Responsive */}
      <div className="flex flex-wrap gap-1 bg-muted/20 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id)}
              className={`
                flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap
                ${
                  tabActivo === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white hover:bg-muted/40'
                }
              `}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.charAt(0)}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de tabs - Con scroll mejorado */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tabActivo === "informacion" && selectedCliente && (
          <div className="space-y-6">
            {/* Datos del cliente */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">
                  Datos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {!isEditingDetails ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDetails(true)}
                        className="text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Editar
                      </Button>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedCliente.estado === "Activo"}
                          onCheckedChange={(checked) => cambiarEstadoCliente(selectedCliente, checked)}
                        />
                        <span className="text-xs sm:text-sm font-medium">
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
                        className="text-xs sm:text-sm"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={guardarCliente}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                      >
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
                      Razón Social
                    </label>
                    <Input
                      name="razon_social"
                      value={formData.razon_social}
                      onChange={handleInputChange}
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
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Información de la empresa */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Empresa</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Nombre:</span>
                        <p className="font-medium">{selectedCliente.nombre}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">RUT:</span>
                        <p className="font-mono text-sm">{selectedCliente.rut}</p>
                      </div>
                      {selectedCliente.razon_social && (
                        <div>
                          <span className="text-sm text-muted-foreground">Razón Social:</span>
                          <p className="text-sm">{selectedCliente.razon_social}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información de contacto */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Contacto</span>
                    </div>
                    <div className="space-y-2">
                      {selectedCliente.representante_legal && (
                        <div>
                          <span className="text-sm text-muted-foreground">Representante:</span>
                          <p className="text-sm">{selectedCliente.representante_legal}</p>
                          {selectedCliente.rut_representante && (
                            <p className="font-mono text-xs text-muted-foreground">{selectedCliente.rut_representante}</p>
                          )}
                        </div>
                      )}
                      {selectedCliente.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{selectedCliente.email}</span>
                        </div>
                      )}
                      {selectedCliente.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{selectedCliente.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dirección */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Dirección
                </label>
                {isEditingDetails ? (
                  <InputDireccion
                    value={formData.direccion}
                    initialLatitude={formData.latitud}
                    initialLongitude={formData.longitud}
                    onAddressSelect={handleAddressSelect}
                    onAddressChange={handleAddressChange}
                    placeholder="Buscar dirección con Google Maps..."
                    showMap={true}
                  />
                ) : (
                  <div className="space-y-2">
                    {selectedCliente.direccion ? (
                      <p className="text-sm">{selectedCliente.direccion}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin dirección registrada</p>
                    )}
                    {selectedCliente.latitud && selectedCliente.longitud && (
                      <div className="h-48 rounded-lg overflow-hidden border border-border/50">
                        <GoogleMap
                          latitude={selectedCliente.latitud}
                          longitude={selectedCliente.longitud}
                          zoom={15}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tabActivo === "instalaciones" && (
          <InstalacionesCliente clienteId={clienteId} />
        )}

        {tabActivo === "documentos" && (
          <DocumentListTabs
            modulo="clientes"
            entidadId={clienteId}
            onDocumentDeleted={onDocumentDeleted}
            onUploadClick={onUploadClick}
            refreshTrigger={refreshTrigger}
          />
        )}

        {tabActivo === "logs" && (
          <LogsCliente
            clienteId={clienteId}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
} 