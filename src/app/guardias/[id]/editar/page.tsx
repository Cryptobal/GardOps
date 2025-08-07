'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputDireccion } from '@/components/ui/input-direccion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, User, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import Link from 'next/link';
import type { AddressData } from '@/lib/useAddressAutocomplete';

interface Guardia {
  id: string;
  nombre: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  estado: string;
  fecha_os10?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  created_at: string;
  updated_at: string;
}

interface Banco {
  id: string;
  nombre: string;
  codigo: string;
}

const TIPOS_CUENTA = [
  { value: 'CCT', label: 'Cuenta Corriente' },
  { value: 'CTE', label: 'Cuenta de Ahorro' },
  { value: 'CTA', label: 'Cuenta Vista' },
  { value: 'RUT', label: 'Cuenta RUT' }
];

export default function EditarGuardiaPage() {
  const params = useParams();
  const router = useRouter();
  const guardiaId = params.id as string;
  const [guardia, setGuardia] = useState<Guardia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    fecha_os10: '',
    banco_id: '',
    tipo_cuenta: '',
    numero_cuenta: ''
  });
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);

  useEffect(() => {
    cargarGuardia();
    cargarBancos();
  }, [guardiaId]);

  const cargarGuardia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/${guardiaId}`);
      if (!response.ok) {
        throw new Error('Error al cargar guardia');
      }
      const guardiaData = await response.json();
      setGuardia(guardiaData);
      setFormData({
        nombre: guardiaData.nombre || '',
        apellidos: guardiaData.apellidos || '',
        rut: guardiaData.rut || '',
        email: guardiaData.email || '',
        telefono: guardiaData.telefono || '',
        direccion: guardiaData.direccion || '',
        fecha_os10: guardiaData.fecha_os10 ? guardiaData.fecha_os10.split('T')[0] : '',
        banco_id: guardiaData.banco || '',
        tipo_cuenta: guardiaData.tipo_cuenta || '',
        numero_cuenta: guardiaData.numero_cuenta || ''
      });
    } catch (error) {
      console.error('Error cargando guardia:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarBancos = async () => {
    try {
      const response = await fetch('/api/bancos');
      if (response.ok) {
        const bancosData = await response.json();
        setBancos(bancosData.bancos || []);
      }
    } catch (error) {
      console.error('Error cargando bancos:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      direccion: addressData.direccionCompleta
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
        ciudad: selectedAddress?.componentes.ciudad || '',
        comuna: selectedAddress?.componentes.comuna || '',
        latitud: selectedAddress?.latitud || null,
        longitud: selectedAddress?.longitud || null
      };
      
      const response = await fetch(`/api/guardias/${guardiaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosParaEnviar),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar guardia');
      }

      // Redirigir de vuelta a la página de detalles
      router.push(`/guardias/${guardiaId}`);
    } catch (error) {
      console.error('Error actualizando guardia:', error);
      alert('Error al actualizar el guardia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2">Cargando guardia...</span>
        </div>
      </div>
    );
  }

  if (!guardia) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Guardia no encontrado</h1>
          <p className="text-gray-600 mb-6">El guardia que buscas no existe o ha sido eliminado.</p>
          <Link href="/guardias">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Guardias
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/guardias/${guardiaId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Editar Guardia
            </h1>
            <p className="text-gray-600">{guardia.nombre} {guardia.apellidos}</p>
          </div>
        </div>
      </div>

      {/* Formulario de edición */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Guardia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="nombre" className="text-sm font-medium text-gray-600">Nombre</label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del guardia"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="apellidos" className="text-sm font-medium text-gray-600">Apellidos</label>
                <Input
                  id="apellidos"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                  placeholder="Apellidos del guardia"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rut" className="text-sm font-medium text-gray-600">RUT</label>
                <Input
                  id="rut"
                  name="rut"
                  value={formData.rut}
                  onChange={handleInputChange}
                  placeholder="12345678-9"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-600">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="telefono" className="text-sm font-medium text-gray-600">Teléfono</label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="+56 9 1234 5678"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="direccion" className="text-sm font-medium text-gray-600">Dirección</label>
                <InputDireccion
                  value={formData.direccion}
                  onAddressSelect={handleAddressSelect}
                  onAddressChange={handleAddressChange}
                  placeholder="Buscar dirección con Google Maps..."
                  showMap={false}
                  showClearButton={true}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="fecha_os10" className="text-sm font-medium text-gray-600">Fecha Vencimiento OS10</label>
                <Input
                  id="fecha_os10"
                  name="fecha_os10"
                  type="date"
                  value={formData.fecha_os10}
                  onChange={handleInputChange}
                  placeholder="Seleccionar fecha"
                />
              </div>
            </div>

            {/* Datos Bancarios */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Datos Bancarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="banco" className="text-sm font-medium text-gray-600">Banco</label>
                  <Select
                    value={formData.banco_id}
                    onValueChange={(value) => handleSelectChange('banco_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco.id} value={banco.id}>
                          {banco.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tipo_cuenta" className="text-sm font-medium text-gray-600">Tipo de Cuenta</label>
                  <Select
                    value={formData.tipo_cuenta}
                    onValueChange={(value) => handleSelectChange('tipo_cuenta', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CUENTA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="numero_cuenta" className="text-sm font-medium text-gray-600">Número de Cuenta</label>
                  <Input
                    id="numero_cuenta"
                    name="numero_cuenta"
                    value={formData.numero_cuenta}
                    onChange={handleInputChange}
                    placeholder="Ingrese número de cuenta"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href={`/guardias/${guardiaId}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
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
        </CardContent>
      </Card>
    </div>
  );
} 