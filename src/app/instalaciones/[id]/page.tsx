'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Building, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { getInstalacion } from '@/lib/api/instalaciones';
import { Instalacion } from '@/lib/schemas/instalaciones';
import TurnosInstalacion from './components/TurnosInstalacion';

export default function InstalacionPage() {
  const { toast } = useToast();
  const params = useParams();
  const instalacionId = params.id as string;
  
  const [instalacion, setInstalacion] = useState<Instalacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (instalacionId) {
      cargarInstalacion();
    }
  }, [instalacionId]);

  const cargarInstalacion = async () => {
    try {
      setLoading(true);
      const data = await getInstalacion(instalacionId);
      setInstalacion(data);
    } catch (error) {
      console.error('Error cargando instalación:', error);
      toast.error('No se pudo cargar la información de la instalación', 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Instalación no encontrada</h1>
          <Link href="/instalaciones">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Instalaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instalaciones">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building className="w-8 h-8" />
              {instalacion.nombre}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              {instalacion.direccion}
            </div>
          </div>
        </div>
        <Badge variant={instalacion.estado === 'Activo' ? 'default' : 'secondary'}>
          {instalacion.estado}
        </Badge>
      </div>

      {/* Información de la Instalación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Dirección:</span>
                <p className="text-sm text-muted-foreground">{instalacion.direccion}</p>
              </div>
              <div>
                <span className="font-medium">Ciudad:</span>
                <p className="text-sm text-muted-foreground">{instalacion.ciudad}</p>
              </div>
              <div>
                <span className="font-medium">Comuna:</span>
                <p className="text-sm text-muted-foreground">{instalacion.comuna}</p>
              </div>
              {instalacion.latitud && instalacion.longitud && (
                <div>
                  <span className="font-medium">Coordenadas:</span>
                  <p className="text-sm text-muted-foreground">
                    {instalacion.latitud}, {instalacion.longitud}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Cliente:</span>
                <p className="text-sm text-muted-foreground">{instalacion.cliente_nombre || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Valor Turno Extra:</span>
                <p className="text-sm text-muted-foreground">
                  ${instalacion.valor_turno_extra?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">ID:</span>
                <p className="text-sm text-muted-foreground font-mono">{instalacion.id}</p>
              </div>
              <div>
                <span className="font-medium">Creado:</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(instalacion.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-medium">Actualizado:</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(instalacion.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Componente de Turnos */}
      <TurnosInstalacion instalacionId={instalacionId} />
    </div>
  );
} 