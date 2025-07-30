'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Calendar, User, Building } from 'lucide-react';

interface Guardia {
  id: string;
  nombre: string;
  apellido: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  rut: string;
  nacionalidad: string;
  sexo: string;
  direccion: string;
  ciudad: string;
  comuna: string;
  fecha_os10: string;
  activo: boolean;
  latitud?: number;
  longitud?: number;
  instalacion_id?: string;
  created_at: string;
  updated_at: string;
}

interface GuardDetailModalProps {
  guardia: Guardia | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GuardDetailModal({ guardia, isOpen, onClose }: GuardDetailModalProps) {
  if (!guardia) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRUT = (rut: string) => {
    if (!rut) return 'No disponible';
    // Formatear RUT chileno (ej: 12345678-9)
    const cleanRut = rut.replace(/[.-]/g, '');
    if (cleanRut.length < 2) return rut;
    
    const dv = cleanRut.slice(-1);
    const numero = cleanRut.slice(0, -1);
    return `${numero}-${dv}`;
  };

  const getStatusBadge = (activo: boolean) => {
    return activo ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Activo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
        Inactivo
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Guardia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Información Personal</span>
                {getStatusBadge(guardia.activo)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
                  <p className="text-lg font-semibold">
                    {guardia.nombre} {guardia.apellido_paterno} {guardia.apellido_materno}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">RUT</label>
                  <p className="text-lg">{formatRUT(guardia.rut)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nacionalidad</label>
                  <p className="text-lg">{guardia.nacionalidad || 'No especificada'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sexo</label>
                  <p className="text-lg">{guardia.sexo || 'No especificado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg">{guardia.email || 'No disponible'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Teléfono</label>
                    <p className="text-lg">{guardia.telefono || 'No disponible'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Dirección</label>
                  <p className="text-lg">{guardia.direccion || 'No disponible'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ciudad</label>
                  <p className="text-lg">{guardia.ciudad || 'No disponible'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Comuna</label>
                  <p className="text-lg">{guardia.comuna || 'No disponible'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Coordenadas</label>
                  <p className="text-lg">
                    {guardia.latitud && guardia.longitud 
                      ? `${guardia.latitud.toFixed(6)}, ${guardia.longitud.toFixed(6)}`
                      : 'No disponibles'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Información Laboral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha OS10</label>
                    <p className="text-lg">{formatDate(guardia.fecha_os10)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Instalación Asignada</label>
                  <p className="text-lg">
                    {guardia.instalacion_id ? 'Asignada' : 'No asignada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID del Guardia</label>
                  <p className="text-sm font-mono text-gray-600">{guardia.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Creado</label>
                  <p className="text-sm">{formatDate(guardia.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Última Actualización</label>
                  <p className="text-sm">{formatDate(guardia.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button>
              Editar Guardia
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 