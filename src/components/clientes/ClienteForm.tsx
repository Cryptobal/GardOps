"use client";

import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { InputDireccion, type AddressData } from "../ui/input-direccion";
import { GoogleMap } from "../ui/google-map";
import { Building, MapPin, User, Mail, Phone, FileText, ClockIcon } from "lucide-react";
import { Cliente, CrearClienteData } from "../../lib/schemas/clientes";

interface ClienteFormProps {
  cliente?: Cliente | null;
  formData: CrearClienteData;
  isEditing: boolean;
  formErrors: Record<string, string>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onChangeEstado?: (nuevoEstado: boolean) => void;
}

export default function ClienteForm({
  cliente,
  formData,
  isEditing,
  formErrors,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  onSave,
  onCancel,
  onChangeEstado
}: ClienteFormProps) {
  const isNewCliente = !cliente;

  return (
    <div className="space-y-6">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isNewCliente ? "Nuevo Cliente" : cliente?.nombre}
          </h3>
          {cliente && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={cliente.estado === "Activo" ? "default" : "secondary"}>
                {cliente.estado}
              </Badge>
              {onChangeEstado && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cliente.estado === "Activo"}
                    onCheckedChange={onChangeEstado}
                  />
                  <span className="text-sm text-muted-foreground">
                    {cliente.estado === "Activo" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Información General */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building className="h-4 w-4" />
          Información General
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Nombre de la Empresa *
            </label>
            <Input
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Nombre de la empresa"
              className={formErrors.nombre ? "border-red-500" : ""}
            />
            {formErrors.nombre && (
              <p className="text-sm text-red-500">{formErrors.nombre}</p>
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
              placeholder="12.345.678-9"
              className={formErrors.rut ? "border-red-500" : ""}
            />
            {formErrors.rut && (
              <p className="text-sm text-red-500">{formErrors.rut}</p>
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
              placeholder="Razón social"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Estado
            </label>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.estado === "Activo"}
                onCheckedChange={(checked) => {
                  const event = {
                    target: { name: "estado", value: checked ? "Activo" : "Inactivo" }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
              />
              <span className="text-sm text-muted-foreground">
                {formData.estado === "Activo" ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Representante Legal */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          Representante Legal
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Nombre del Representante
            </label>
            <Input
              name="representante_legal"
              value={formData.representante_legal}
              onChange={handleInputChange}
              placeholder="Nombre completo"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              RUT del Representante
            </label>
            <Input
              name="rut_representante"
              value={formData.rut_representante}
              onChange={handleInputChange}
              placeholder="12.345.678-9"
            />
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Mail className="h-4 w-4" />
          Información de Contacto
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="correo@empresa.com"
              className={formErrors.email ? "border-red-500" : ""}
            />
            {formErrors.email && (
              <p className="text-sm text-red-500">{formErrors.email}</p>
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
      </div>

      {/* Dirección y Ubicación */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Dirección y Ubicación
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <InputDireccion
              value={formData.direccion || ""}
              onAddressSelect={handleAddressSelect}
              onAddressChange={handleAddressChange}
              placeholder="Buscar dirección..."
            />
          </div>

          {formData.latitud && formData.longitud && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ubicación en el Mapa
              </label>
              <div className="h-48 rounded-lg overflow-hidden border border-border">
                <GoogleMap
                  center={{ lat: formData.latitud, lng: formData.longitud }}
                  markers={[
                    {
                      position: { lat: formData.latitud, lng: formData.longitud },
                      title: formData.nombre || "Ubicación"
                    }
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          disabled={!isEditing && isNewCliente}
        >
          {isNewCliente ? "Crear Cliente" : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
} 