'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputDireccion } from '@/components/ui/input-direccion';
import { ArrowLeft, Save, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';
import type { AddressData } from '@/lib/useAddressAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { actualizarInstalacion, obtenerDatosCompletosInstalacion, obtenerClientes } from '@/lib/api/instalaciones';
import { Instalacion, Cliente } from '@/lib/schemas/instalaciones';

export default function EditarInstalacionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const instalacionId = params.id as string;
  const [instalacion, setInstalacion] = useState<Instalacion | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    cliente_id: '',
    direccion: '',
    ciudad: '',
    comuna: '',
    valor_turno_extra: 0,
    estado: 'Activo' as 'Activo' | 'Inactivo'
  });
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

  useEffect(() => {
    cargarInstalacion();
  }, [instalacionId]);

  const cargarInstalacion = async () => {
    try {
      setLoading(true);
      const datosCompletos = await obtenerDatosCompletosInstalacion(instalacionId);
      const clientesData = await obtenerClientes();
      
      setInstalacion(datosCompletos.instalacion);
      setClientes(clientesData || []);
      
      setFormData({
        nombre: datosCompletos.instalacion.nombre || '',
        cliente_id: datosCompletos.instalacion.cliente_id || '',
        direccion: datosCompletos.instalacion.direccion || '',
        ciudad: datosCompletos.instalacion.ciudad || '',
        comuna: datosCompletos.instalacion.comuna || '',
        valor_turno_extra: datosCompletos.instalacion.valor_turno_extra || 0,
        estado: datosCompletos.instalacion.estado || 'Activo'
      });
    } catch (error) {
      console.error('Error cargando instalación:', error);
      toast.error('No se pudo cargar la información de la instalación', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'valor_turno_extra') {
      // Remover separadores de miles y convertir a número
      const numericValue = value.replace(/\./g, '');
      const parsedValue = parseInt(numericValue) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: parsedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressSelect = (addressData: AddressData) => {
    setSelectedAddress(addressData);
    setFormData(prev => ({
      ...prev,
      direccion: addressData.direccionCompleta,
      ciudad: addressData.componentes.ciudad || '',
      comuna: addressData.componentes.comuna || ''
    }));
  };

  const handleAddressChange = (query: string) => {
    setFormData(prev => ({
      ...prev,
      direccion: query
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Preparar datos para enviar, incluyendo información geográfica si está disponible
      const datosParaEnviar = {
        ...formData,
        latitud: selectedAddress?.latitud || instalacion?.latitud,
        longitud: selectedAddress?.longitud || instalacion?.longitud
      };
      
      await actualizarInstalacion(instalacionId, datosParaEnviar);
      
      toast.success('Instalación actualizada correctamente', 'Éxito');
      router.push(`/instalaciones/${instalacionId}`);
    } catch (error) {
      console.error('Error guardando instalación:', error);
      toast.error('No se pudo actualizar la instalación', 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2">Cargando instalación...</span>
        </div>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Instalación no encontrada</h1>
          <p className="text-gray-600 mb-6">La instalación que buscas no existe o ha sido eliminada.</p>
          <Link href="/instalaciones">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Instalaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/instalaciones/${instalacionId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Editar Instalación
            </h1>
            <p className="text-gray-600">{instalacion.nombre}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Nombre de la Instalación *
                </label>
                <Input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ingresa el nombre de la instalación"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Cliente *
                </label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => handleSelectChange('cliente_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Ciudad
                </label>
                <Input
                  name="ciudad"
                  value={formData.ciudad}
                  readOnly
                  placeholder="Se completa automáticamente"
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Comuna
                </label>
                <Input
                  name="comuna"
                  value={formData.comuna}
                  readOnly
                  placeholder="Se completa automáticamente"
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Valor Turno Extra
                </label>
                <Input
                  type="text"
                  name="valor_turno_extra"
                  value={formData.valor_turno_extra ? Number(formData.valor_turno_extra).toLocaleString('es-CL') : '0'}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  Estado
                </label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => handleSelectChange('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Dirección *
              </label>
              <InputDireccion
                value={formData.direccion}
                initialLatitude={instalacion.latitud}
                initialLongitude={instalacion.longitud}
                onAddressSelect={handleAddressSelect}
                onAddressChange={handleAddressChange}
                placeholder="Buscar dirección con Google Maps..."
                showMap={true}
                showClearButton={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-3 justify-end">
          <Link href={`/instalaciones/${instalacionId}`}>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 