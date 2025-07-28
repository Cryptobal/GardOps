"use client";

import { useState } from "react";
import { FileText, ClockIcon, Building, MapPin, Edit, X, CheckCircle, User, Mail, Phone, Users, Shield, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { InputDireccion, type AddressData } from "../ui/input-direccion";
import { GoogleMap } from "../ui/google-map";
import DocumentListTabs from "../DocumentListTabs";
import LogsInstalacion from "./LogsInstalacion";
import PuestosOperativos from "./PuestosOperativos";
import GuardiasInstalacion from "./GuardiasInstalacion";
import AlertasInstalacion from "./AlertasInstalacion";
import { Instalacion, CrearInstalacionData } from "../../lib/schemas/instalaciones";

interface InstalacionTabsProps {
  instalacionId: string;
  onDocumentDeleted?: () => void;
  onUploadClick?: () => void;
  refreshTrigger?: number;
  selectedInstalacion: Instalacion | null;
  formData: CrearInstalacionData;
  isEditingDetails: boolean;
  setIsEditingDetails: (editing: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  formErrors: Record<string, string>;
  guardarInstalacion: () => void;
  cambiarEstadoInstalacion: (instalacion: Instalacion, nuevoEstado: boolean) => void;
}

export default function InstalacionTabs({ 
  instalacionId, 
  onDocumentDeleted, 
  onUploadClick, 
  refreshTrigger,
  selectedInstalacion,
  formData,
  isEditingDetails,
  setIsEditingDetails,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  formErrors,
  guardarInstalacion,
  cambiarEstadoInstalacion
}: InstalacionTabsProps) {
  const [tabActivo, setTabActivo] = useState<"informacion" | "puestos" | "guardias" | "documentos" | "alertas" | "logs">("informacion");

  const tabs = [
    {
      id: "informacion" as const,
      label: "Información",
      icon: Building
    },
    {
      id: "puestos" as const,
      label: "Puestos Operativos",
      icon: Shield
    },
    {
      id: "guardias" as const,
      label: "Guardias",
      icon: Users
    },
    {
      id: "documentos" as const,
      label: "Documentos",
      icon: FileText
    },
    {
      id: "alertas" as const,
      label: "Alertas",
      icon: AlertTriangle
    },
    {
      id: "logs" as const,
      label: "Logs",
      icon: ClockIcon
    }
  ];

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
      <div className="min-h-[400px]">
        {tabActivo === "informacion" && (
          <div className="space-y-6">
            {/* Header con estado y acciones */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge 
                  variant={selectedInstalacion?.estado === "Activo" ? "default" : "secondary"}
                  className={selectedInstalacion?.estado === "Activo" ? "bg-green-600" : "bg-gray-600"}
                >
                  {selectedInstalacion?.estado || "Activo"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Cliente: {selectedInstalacion?.cliente_nombre || "Sin cliente"}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
                    <Switch
                      checked={selectedInstalacion?.estado === "Activo"}
                      onCheckedChange={(checked) => {
                        if (selectedInstalacion) {
                          cambiarEstadoInstalacion(selectedInstalacion, checked);
                        }
                      }}
                    />
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
                      onClick={guardarInstalacion}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Formulario de información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre de la instalación
                  </label>
                  {isEditingDetails ? (
                    <Input
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className={formErrors.nombre ? "border-red-500" : ""}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {selectedInstalacion?.nombre}
                    </p>
                  )}
                  {formErrors.nombre && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Comuna</label>
                  {isEditingDetails ? (
                    <Input
                      name="comuna"
                      value={formData.comuna}
                      onChange={handleInputChange}
                      className={formErrors.comuna ? "border-red-500" : ""}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded-md flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selectedInstalacion?.comuna || "No especificada"}
                    </p>
                  )}
                  {formErrors.comuna && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.comuna}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Región</label>
                  {isEditingDetails ? (
                    <Input
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {selectedInstalacion?.region || "No especificada"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ciudad</label>
                  {isEditingDetails ? (
                    <Input
                      name="ciudad"
                      value={formData.ciudad}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {selectedInstalacion?.ciudad || "No especificada"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Dirección</label>
                  {isEditingDetails ? (
                    <InputDireccion
                      value={formData.direccion}
                      onAddressSelect={handleAddressSelect}
                      onAddressChange={handleAddressChange}
                      initialLatitude={formData.latitud}
                      initialLongitude={formData.longitud}
                      className={formErrors.direccion ? "border-red-500" : ""}
                    />
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded-md">
                      {selectedInstalacion?.direccion || "No especificada"}
                    </p>
                  )}
                  {formErrors.direccion && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.direccion}</p>
                  )}
                </div>

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-blue-500">
                      {selectedInstalacion?.guardias_asignados || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Guardias</div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-green-500">
                      {selectedInstalacion?.puestos_cubiertos || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Cubiertos</div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-amber-500">
                      {selectedInstalacion?.puestos_por_cubrir || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">PPC</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa */}
            {selectedInstalacion?.latitud && selectedInstalacion?.longitud && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Ubicación</label>
                <div className="h-64 rounded-lg overflow-hidden border">
                  <GoogleMap
                    center={{
                      lat: selectedInstalacion.latitud,
                      lng: selectedInstalacion.longitud
                    }}
                    markers={[{
                      position: {
                        lat: selectedInstalacion.latitud,
                        lng: selectedInstalacion.longitud
                      },
                      title: selectedInstalacion.nombre,
                      info: selectedInstalacion.direccion || ""
                    }]}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {tabActivo === "puestos" && (
          <PuestosOperativos
            instalacionId={instalacionId}
            refreshTrigger={refreshTrigger}
          />
        )}

        {tabActivo === "guardias" && (
          <GuardiasInstalacion
            instalacionId={instalacionId}
            refreshTrigger={refreshTrigger}
          />
        )}

        {tabActivo === "documentos" && (
          <DocumentListTabs
            modulo="instalaciones"
            entidadId={instalacionId}
            onDocumentDeleted={onDocumentDeleted}
            onUploadClick={onUploadClick}
            refreshTrigger={refreshTrigger}
          />
        )}

        {tabActivo === "alertas" && (
          <AlertasInstalacion
            instalacionId={instalacionId}
            refreshTrigger={refreshTrigger}
          />
        )}

        {tabActivo === "logs" && (
          <LogsInstalacion
            instalacionId={instalacionId}
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
}