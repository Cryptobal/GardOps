'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Save,
  X
} from 'lucide-react';
import { InputDireccion, type AddressData } from '@/components/ui/input-direccion';

interface CrearClienteData {
  nombre: string;
  rut: string;
  representante_legal: string;
  rut_representante: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string;
  comuna: string;
  razon_social: string;
  estado: "Activo" | "Inactivo";
}

export default function NuevoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      ciudad: addressData.componentes?.ciudad || '',
      comuna: addressData.componentes?.comuna || '',
    }));
  };

  // Manejar cambio manual de dirección
  const handleAddressChange = (query: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: query,
      latitud: query === prev.direccion ? prev.latitud : null,
      longitud: query === prev.direccion ? prev.longitud : null,
      ciudad: query === prev.direccion ? prev.ciudad : '',
      comuna: query === prev.direccion ? prev.comuna : '',
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
      setLoading(true);
      const bodyData = prepararDatosParaEnvio(formData);

      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirigir al cliente creado
        router.push(`/clientes/${result.data.id}`);
      } else {
        console.error("Error al crear cliente:", result.error);
        // Aquí podrías mostrar un toast de error
      }
    } catch (error) {
      console.error("Error guardando cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/clientes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nuevo Cliente</h1>
            <p className="text-sm text-muted-foreground">
              Crear un nuevo cliente en el sistema
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="default">
            Nuevo
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/clientes')}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={guardarCliente}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información de la empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Información de la Empresa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Información de contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Información de Contacto</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </label>
              <Input
                name="email"
                type="email"
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
              <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Teléfono</span>
              </label>
              <Input
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Dirección</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Ciudad
                </label>
                <Input
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleInputChange}
                  placeholder="Se completa automáticamente"
                  disabled={true}
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Comuna
                </label>
                <Input
                  name="comuna"
                  value={formData.comuna}
                  onChange={handleInputChange}
                  placeholder="Se completa automáticamente"
                  disabled={true}
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => router.push('/clientes')}
        >
          Cancelar
        </Button>
        <Authorize resource="clientes" action="create" eff={effectivePermissions}>
  <GuardButton resource="clientes" action="create" eff={effectivePermissions} 
          onClick={guardarCliente}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Guardando...' : 'Crear Cliente'}
        </GuardButton>
</Authorize>
      </div>
    </div>
  );
} 